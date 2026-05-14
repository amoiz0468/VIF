"""INSEE Sirene API service for SIRET validation.

Uses the official French government database to verify shopkeeper SIRET numbers.
Implements OAuth2 Backend-to-Backend authentication via Client ID and Secret.
API docs: https://api.insee.fr/catalogue/site/themes/sirene/
"""
import logging
import os
import requests
from typing import Dict, Optional
from datetime import datetime, timedelta

log = logging.getLogger("vif.insee")

# INSEE API endpoints
TOKEN_URL = "https://api.insee.fr/auth/oauth2/access_token"
SIRENE_API_URL = "https://api.insee.fr/enterprise/sirene/v3/sirets"

# Load credentials from environment
INSEE_CLIENT_ID = os.getenv("INSEE_CLIENT_ID")
INSEE_CLIENT_SECRET = os.getenv("INSEE_CLIENT_SECRET")

# In-memory token cache (expires after 24 hours)
_token_cache = {
    "token": None,
    "expires_at": None
}

# Valid APE codes for bakeries and food shops (non-exhaustive)
VALID_APE_CODES = {
    "10.71C",  # Boulangerie et boulangerie-pâtisserie
    "10.71B",  # Pâtisserie
    "10.71A",  # Boulangerie 
    "10.71",   # Generic bakery codes
    "10.89Z",  # Fabrication d'autres produits alimentaires n.c.a.
    "47.11C",  # Supermarché de vente de produits surgelés
    "47.21Z",  # Commerce de détail de fruits et légumes
    "47.24Z",  # Commerce de détail de pain, pâtisserie et confiserie
}


def get_access_token() -> Optional[str]:
    """Get OAuth2 access token from INSEE using Client ID and Secret.
    
    Implements Backend-to-Backend authentication flow:
    - Exchanges CLIENT_ID and CLIENT_SECRET for a 24-hour access token
    - Caches token to avoid excessive API calls
    - Returns None if credentials are missing or API call fails
    """
    global _token_cache
    
    # Return cached token if still valid
    if _token_cache["token"] and _token_cache["expires_at"]:
        if datetime.utcnow() < _token_cache["expires_at"]:
            log.debug("Using cached INSEE access token")
            return _token_cache["token"]
    
    # Check if credentials are configured
    if not INSEE_CLIENT_ID or not INSEE_CLIENT_SECRET:
        log.warning("INSEE credentials not configured. Using mock mode.")
        return None
    
    try:
        log.info("Requesting new INSEE access token...")
        
        # Request token using Basic Auth (Client ID:Secret)
        response = requests.post(
            TOKEN_URL,
            auth=(INSEE_CLIENT_ID, INSEE_CLIENT_SECRET),
            data={"grant_type": "client_credentials"},
            timeout=10
        )
        
        if response.status_code != 200:
            log.error("Failed to get INSEE token: %s", response.status_code)
            return None
        
        token_data = response.json()
        access_token = token_data.get("access_token")
        expires_in = token_data.get("expires_in", 86400)  # Default 24 hours
        
        # Cache the token
        _token_cache["token"] = access_token
        _token_cache["expires_at"] = datetime.utcnow() + timedelta(seconds=expires_in - 60)  # Refresh 60s early
        
        log.info("RFC token obtained successfully (expires in %d seconds)", expires_in)
        return access_token
        
    except requests.RequestException as exc:
        log.exception("Failed to retrieve INSEE access token: %s", exc)
        return None
    except Exception as exc:
        log.exception("Unexpected error getting INSEE token: %s", exc)
        return None


def validate_siret_format(siret: str) -> bool:
    """Check if SIRET is 14 digits."""
    if not siret or not isinstance(siret, str):
        return False
    return siret.isdigit() and len(siret) == 14


def check_siret_with_insee(siret: str) -> Dict:
    """Call INSEE API to verify SIRET using OAuth2 token.
    
    Returns dict with keys:
    - valid: bool
    - reason: str (if not valid)
    - etat: str (if valid)
    - ape: str (if valid)
    """
    if not validate_siret_format(siret):
        return {"valid": False, "reason": "Invalid SIRET format. Must be 14 digits."}
    
    # Get access token (OAuth2 Backend-to-Backend flow)
    access_token = get_access_token()
    if not access_token:
        return _mock_insee_check(siret)
    
    try:
        headers = {"Authorization": f"Bearer {access_token}"}
        resp = requests.get(f"{SIRENE_API_URL}/{siret}", headers=headers, timeout=5)
        
        if resp.status_code == 404:
            return {"valid": False, "reason": "SIRET not found in INSEE database."}
        if resp.status_code == 401:
            # Clear cached token on auth failure
            global _token_cache
            _token_cache["token"] = None
            _token_cache["expires_at"] = None
            log.warning("INSEE token expired or invalid, will refresh on next request")
            return {"valid": False, "reason": "INSEE authentication failed. Please try again."}
        if resp.status_code != 200:
            log.warning("INSEE API error: %s", resp.status_code)
            return {"valid": False, "reason": "INSEE API error. Please try again later."}
        
        data = resp.json()
        siret_obj = data.get("sirets", [{}])[0] if data.get("sirets") else {}
        
        # Check if active
        if siret_obj.get("etatAdministratif") != "A":
            return {"valid": False, "reason": "SIRET is not active."}
        
        # Check APE code
        ape = siret_obj.get("activitePrincipale", "")
        if not _is_valid_ape(ape):
            return {
                "valid": False,
                "reason": f"SIRET activity code {ape} is not a bakery or food shop."
            }
        
        return {
            "valid": True,
            "etat": siret_obj.get("etatAdministratif"),
            "ape": ape,
            "nom_raison_sociale": siret_obj.get("nomUniteLegale", "")
        }
    
    except requests.RequestException as exc:
        log.exception("INSEE API call failed: %s", exc)
        return {"valid": False, "reason": "Could not reach INSEE API. Please try again later."}
    except Exception as exc:
        log.exception("Unexpected error during SIRET validation: %s", exc)
        return {"valid": False, "reason": "Validation error. Please try again."}


def _is_valid_ape(ape: str) -> bool:
    """Check if APE code is for a bakery/food shop."""
    if not ape:
        return False
    # Exact match or prefix match
    for code in VALID_APE_CODES:
        if ape.startswith(code.split(".")[0]) or ape == code or ape.startswith(code.split("Z")[0]):
            return True
    return False


def _mock_insee_check(siret: str) -> Dict:
    """Mock INSEE API response for development (no real API key).
    
    Accepts any valid 14-digit SIRET and returns a mock response.
    """
    log.info("[MOCK] INSEE validation for SIRET: %s", siret)
    return {
        "valid": True,
        "etat": "A",
        "ape": "10.71C",
        "nom_raison_sociale": "Boulangerie Mock SARL"
    }
