import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Clock, 
  Sparkles, 
  ShieldCheck, 
  Flame, 
  AlertCircle, 
  CheckCircle2, 
  QrCode, 
  RefreshCw, 
  Navigation, 
  Upload, 
  Hourglass,
  Store,
  FileCheck,
  Check
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import { api } from '../api';
import SurplusRadarMap from './SurplusRadarMap';

const PARIS_ZONES = [
  { name: '40 Rue du Dr Roux (15ème)', lat: 48.8468616, lng: 2.3099973, address: '40 Rue du Docteur Roux, 75015 Paris', desc: 'Pasteur & Vaugirard' },
  { name: 'Le Marais', lat: 48.8575, lng: 2.3598, address: '26 Rue des Rosiers, 75004 Paris', desc: 'Commerces & Cafés' },
  { name: 'Sorbonne / Quartier Latin', lat: 48.8484, lng: 2.3438, address: '47 Boulevard Saint-Germain, 75005 Paris', desc: 'Universités & Écoles' },
  { name: 'Bastille / 11ème', lat: 48.8531, lng: 2.3698, address: '17 Rue Breguet, 75011 Paris', desc: 'Boulangeries Artisanales' },
  { name: 'République', lat: 48.8675, lng: 2.3638, address: '20 Rue Jean-Pierre Timbaud, 75011 Paris', desc: 'Pôle Étudiant & Métro' },
  { name: 'Montparnasse', lat: 48.8421, lng: 2.3219, address: '14 Rue du Départ, 75015 Paris', desc: 'Campus Sud' },
];

export default function StudentPortal({ user, onUserUpdate }) {
  // Location
  const [selectedZone, setSelectedZone] = useState(PARIS_ZONES[0]);
  const [coords, setCoords] = useState({ lat: PARIS_ZONES[0].lat, lng: PARIS_ZONES[0].lng });
  const [studentAddress, setStudentAddress] = useState(PARIS_ZONES[0].address);
  const [addressQuery, setAddressQuery] = useState('');
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [locating, setLocating] = useState(false);

  // Pulses feed
  const [pulses, setPulses] = useState([]);
  const [loadingPulses, setLoadingPulses] = useState(false);
  const [feedError, setFeedError] = useState(null);

  // Active claim state
  const [activeClaim, setActiveClaim] = useState(() => {
    const saved = localStorage.getItem('vif_active_claim');
    return saved ? JSON.parse(saved) : null;
  });
  const [timeRemaining, setTimeRemaining] = useState('');
  const [claimLoading, setClaimLoading] = useState(false);

  // Verification upload state
  const [uploadingId, setUploadingId] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);

  // Toast / notification
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  // Fetch nearby pulses when coordinates change
  useEffect(() => {
    fetchNearbyPulses();
  }, [coords]);

  // Reverse geocode coordinates into exact street address (e.g. "40 Rue du Docteur Roux, 75015 Paris")
  const reverseGeocode = async (lat, lng) => {
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=fr`
      );
      if (!resp.ok) return;
      const data = await resp.json();
      const addr = data.address || {};
      const num = addr.house_number || '';
      const road = addr.road || addr.pedestrian || addr.suburb || '';
      const postcode = addr.postcode || '75015';
      const city = addr.city || addr.town || 'Paris';

      let exactAddr = '';
      if (num && road) {
        exactAddr = `${num} ${road}, ${postcode} ${city}`;
      } else if (road) {
        exactAddr = `${road}, ${postcode} ${city}`;
      } else if (data.display_name) {
        exactAddr = data.display_name.split(',').slice(0, 3).join(', ');
      }
      if (exactAddr) {
        setStudentAddress(exactAddr);
      }
    } catch (e) {
      console.warn('Reverse geocoding skipped:', e);
    }
  };

  // Auto-detect exact GPS on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setCoords({ lat: latitude, lng: longitude });
          setSelectedZone({ name: 'Exact GPS Location', lat: latitude, lng: longitude });
          reverseGeocode(latitude, longitude);
        },
        () => {
          // Keep default 40 Rue du Docteur Roux, 75015 Paris if permission declined
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    }
  }, []);

  // Persist active claim
  useEffect(() => {
    if (activeClaim) {
      localStorage.setItem('vif_active_claim', JSON.stringify(activeClaim));
    } else {
      localStorage.removeItem('vif_active_claim');
    }
  }, [activeClaim]);

  // Countdown timer for active claim
  useEffect(() => {
    if (!activeClaim || !activeClaim.claim_deadline) return;

    const timer = setInterval(() => {
      const deadline = new Date(activeClaim.claim_deadline).getTime();
      const now = new Date().getTime();
      const diff = deadline - now;

      if (diff <= 0) {
        setTimeRemaining('Expired');
        clearInterval(timer);
      } else {
        const minutes = Math.floor(diff / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeRemaining(`${minutes}:${seconds < 10 ? '0' : ''}${seconds}`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [activeClaim]);

  const fetchNearbyPulses = async () => {
    setLoadingPulses(true);
    setFeedError(null);
    try {
      const data = await api.getNearbyPulses(coords.lat, coords.lng);
      setPulses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch nearby pulses from backend:', err);
      setFeedError(err.message || 'Could not connect to nearby feed.');
      setPulses([]);
    } finally {
      setLoadingPulses(false);
    }
  };

  const handleZoneSelect = (zone) => {
    setSelectedZone(zone);
    setCoords({ lat: zone.lat, lng: zone.lng });
    if (zone.address) {
      setStudentAddress(zone.address);
    } else {
      reverseGeocode(zone.lat, zone.lng);
    }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser.', 'error');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });
        setSelectedZone({ name: 'My Current Location (GPS)', lat: latitude, lng: longitude });
        await reverseGeocode(latitude, longitude);
        setLocating(false);
        showToast('Locked onto your exact GPS street address!');
      },
      (err) => {
        console.error(err);
        setLocating(false);
        showToast('Could not fetch GPS. Using 40 Rue du Docteur Roux, 75015 Paris.', 'error');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleMapLocationChange = async (lat, lng) => {
    setCoords({ lat, lng });
    setSelectedZone({ name: 'Custom Map Pin', lat, lng });
    await reverseGeocode(lat, lng);
    showToast('Student pin moved! Radar updated to new street address.');
  };

  const handleAddressSearch = async (e) => {
    e.preventDefault();
    const q = addressQuery.trim();
    if (!q) return;
    setSearchingAddress(true);
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&limit=1&accept-language=fr`
      );
      const results = await resp.json();
      if (Array.isArray(results) && results.length > 0) {
        const hit = results[0];
        const lat = parseFloat(hit.lat);
        const lng = parseFloat(hit.lon);
        setCoords({ lat, lng });
        setSelectedZone({ name: q, lat, lng });
        await reverseGeocode(lat, lng);
        setAddressQuery('');
        showToast(`Location set to ${hit.display_name.split(',').slice(0, 2).join(', ')}`);
      } else {
        showToast('Could not find that street address. Try adding "Paris".', 'error');
      }
    } catch (err) {
      console.error('Address search failed:', err);
      showToast('Error searching address.', 'error');
    } finally {
      setSearchingAddress(false);
    }
  };

  const handleClaimPulse = async (pulse) => {
    if (activeClaim) {
      showToast('You already have an active reservation! Collect it first.', 'error');
      return;
    }
    setClaimLoading(true);
    try {
      const res = await api.createClaim(pulse.pulse_id);
      setActiveClaim({
        ...res,
        shop_name: pulse.shop_name,
        shop_address: pulse.shop_address,
        item_name: pulse.item_name
      });
      showToast(`Meal reserved at ${pulse.shop_name}! Active 20-min QR challenge generated.`);
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });
      fetchNearbyPulses();
    } catch (err) {
      console.error('API createClaim error:', err);
      showToast(err.message || 'Could not create reservation.', 'error');
    } finally {
      setClaimLoading(false);
    }
  };

  const handleIdUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingId(true);
    try {
      const res = await api.verifyStudentId(file);
      setVerificationResult(res);
      if (res.verified) {
        showToast(res.message || 'Student ID verified by backend OCR! Priority window unlocked.', 'success');
        if (onUserUpdate) {
          onUserUpdate({ ...user, is_verified: true, id_verification_status: 'verified' });
        }
      } else {
        showToast(res.message || 'Card verification failed.', 'error');
        if (onUserUpdate) {
          onUserUpdate({ ...user, is_verified: false, id_verification_status: res.status });
        }
      }
      fetchNearbyPulses();
    } catch (err) {
      console.error('ID upload failed:', err);
      showToast(err.message || 'Failed to verify ID card.', 'error');
    } finally {
      setUploadingId(false);
    }
  };

  return (
    <div className="portal-container">
      {toast && (
        <div className={`toast-notification toast-${toast.type}`}>
          {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Hero Sub-header */}
      <div className="portal-header glass-panel">
        <div className="portal-header-content">
          <div className="badge badge-emerald">
            <span className="live-indicator"></span> Live Surplus Radar (&lt;1000m)
          </div>
          <h2 className="portal-title">Real-Time Bakery Meals for Students</h2>
          <p className="portal-desc">
            Boulangeries in Paris post their surplus before closing. 
            Claim a meal in one click, show your QR code within 20 minutes, and eat for free.
          </p>
        </div>

        {/* Karma Score Card */}
        <div className="karma-stat-card glass-card">
          <div className="karma-header-row">
            <span className="karma-card-title">Reliability Karma</span>
            <Flame size={18} color="#F59E0B" />
          </div>
          <div className="karma-score-number">{user?.karma_score ?? 50}<span>/100</span></div>
          <div className="karma-progress-bar">
            <div 
              className="karma-progress-fill" 
              style={{ width: `${Math.min(100, user?.karma_score ?? 50)}%` }}
            ></div>
          </div>
          <p className="karma-explanation">
            Keep karma above 30. Ghosting a reservation deducts 10 points. Timely pickups preserve access!
          </p>
        </div>
      </div>

      <div className="portal-grid">
        {/* Left Column: Nearby Pulses Feed */}
        <div className="portal-main-column">
          {/* Location Selector Bar */}
          <div className="location-toolbar glass-panel" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div className="location-toolbar-left">
                <MapPin size={18} color="#F59E0B" />
                <span className="location-label">Zone:</span>
                <div className="zone-pills">
                  {PARIS_ZONES.map((zone) => (
                    <button
                      key={zone.name}
                      className={`zone-pill-btn ${selectedZone.name === zone.name ? 'active' : ''}`}
                      onClick={() => handleZoneSelect(zone)}
                    >
                      {zone.name}
                    </button>
                  ))}
                </div>
              </div>
              <button 
                className="btn btn-outline btn-sm"
                onClick={handleUseMyLocation}
                disabled={locating}
              >
                <Navigation size={14} />
                {locating ? 'Locating...' : 'Use Live GPS'}
              </button>
            </div>

            {/* Exact Street Address Display & Search */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', paddingTop: '10px', borderTop: '1px solid #F1F5F9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.86rem', color: '#0F172A' }}>
                <span className="badge badge-indigo" style={{ padding: '3px 8px' }}>🎓 Exact Student Location</span>
                <strong>{studentAddress}</strong>
                <span style={{ color: '#64748B', fontSize: '0.76rem' }}>
                  ({coords.lat.toFixed(5)}°N, {coords.lng.toFixed(5)}°E)
                </span>
              </div>

              <form onSubmit={handleAddressSearch} style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '1', maxWidth: '340px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter exact street (e.g. 40 rue du Dr Roux, Paris)..."
                  value={addressQuery}
                  onChange={(e) => setAddressQuery(e.target.value)}
                  style={{ padding: '6px 10px', fontSize: '0.8rem', height: '32px' }}
                />
                <button type="submit" className="btn btn-primary btn-sm" disabled={searchingAddress} style={{ height: '32px', padding: '0 12px', whiteSpace: 'nowrap' }}>
                  {searchingAddress ? '...' : 'Set Address'}
                </button>
              </form>
            </div>
          </div>

          {/* Active Claim Spotlight (If present) */}
          {activeClaim && (
            <div className="active-claim-banner glass-panel">
              <div className="active-claim-header">
                <div className="badge badge-rose pulse-pill">
                  <Hourglass size={14} /> Active Reservation in Progress
                </div>
                <div className="claim-timer-box">
                  <Clock size={16} color="#F43F5E" />
                  <span className="timer-text">Pickup Window: <strong>{timeRemaining}</strong></span>
                </div>
              </div>

              <div className="active-claim-body">
                <div className="qr-code-wrapper">
                  <QRCodeSVG 
                    value={activeClaim.qr_code_token} 
                    size={160} 
                    bgColor="#FFFFFF"
                    fgColor="#070B13"
                    level="H"
                    includeMargin={true}
                  />
                  <span className="qr-token-label">Show to Baker at Checkout</span>
                  <div className="qr-token-string">{activeClaim.qr_code_token}</div>
                </div>

                <div className="claim-details-col">
                  <h3 className="claim-bakery-name">{activeClaim.shop_name || 'Boulangerie Partner'}</h3>
                  <p className="claim-bakery-addr">
                    <MapPin size={14} color="#94A3B8" /> {activeClaim.shop_address || 'Paris'}
                  </p>
                  <div className="claim-item-highlight">
                    <span className="claim-item-name">{activeClaim.item_name || 'Surplus Meal'}</span>
                  </div>

                  <div className="claim-steps-list">
                    <div className="step-item">
                      <span className="step-number">1</span>
                      <span>Walk to the bakery before the 20-min countdown expires.</span>
                    </div>
                    <div className="step-item">
                      <span className="step-number">2</span>
                      <span>Show this challenge QR token to the bakery shopkeeper.</span>
                    </div>
                    <div className="step-item">
                      <span className="step-number">3</span>
                      <span>The shopkeeper validates the QR code on their screen to complete handover.</span>
                    </div>
                  </div>

                  <div className="claim-actions-row">
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        fetchNearbyPulses();
                        showToast('Feed refreshed from backend database.');
                      }}
                    >
                      <RefreshCw size={14} /> Refresh Radar
                    </button>
                    <button 
                      className="btn btn-outline btn-sm"
                      onClick={() => {
                        setActiveClaim(null);
                        showToast('Reservation dismissed from view.');
                      }}
                    >
                      Dismiss View
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Interactive Geofence Map: Exact Locations of Student & Boulangeries */}
          <SurplusRadarMap 
            studentCoords={coords}
            studentAddress={studentAddress}
            pulses={pulses}
            selectedZoneName={selectedZone.name}
            onClaimPulse={handleClaimPulse}
            onLocationChange={handleMapLocationChange}
            activeClaim={activeClaim}
            claimLoading={claimLoading}
          />

          {/* Surplus Feed List */}
          <div className="feed-header-row">
            <h3 className="feed-title">
              Available Bakery Surplus Nearby ({pulses.length})
            </h3>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={fetchNearbyPulses}
              disabled={loadingPulses}
            >
              <RefreshCw size={14} className={loadingPulses ? 'spin' : ''} />
              Refresh Radar
            </button>
          </div>

          {loadingPulses ? (
            <div className="loading-card glass-panel">
              <RefreshCw size={28} className="spin" color="#F59E0B" />
              <p>Querying PostgreSQL PostGIS database for boulangeries within 1,000m...</p>
            </div>
          ) : feedError ? (
            <div className="empty-feed-card glass-panel">
              <AlertCircle size={36} color="#EF4444" />
              <h4>Feed Error</h4>
              <p>{feedError}</p>
            </div>
          ) : pulses.length === 0 ? (
            <div className="empty-feed-card glass-panel">
              <Store size={40} color="#64748B" />
              <h4>No Surplus Pulses in this 1 km Area Right Now</h4>
              <p>Bakeries post surplus pulses in real-time between 16:30 and 20:00. Try switching to Le Marais or another zone!</p>
            </div>
          ) : (
            <div className="pulse-cards-list">
              {pulses.map((pulse) => (
                <div key={pulse.pulse_id} className="pulse-card glass-card">
                  <div className="pulse-card-top">
                    <div className="pulse-shop-info">
                      <h4 className="pulse-shop-name">{pulse.shop_name}</h4>
                      <p className="pulse-shop-address">
                        <MapPin size={13} color="#94A3B8" /> {pulse.shop_address}
                      </p>
                    </div>
                    <div className="pulse-badges">
                      <span className="badge badge-indigo">
                        {pulse.distance_meters !== undefined ? `${Math.round(pulse.distance_meters)}m away` : '<1 km'}
                      </span>
                      {pulse.priority_window_active && (
                        <span className="badge badge-amber" title="10-minute priority window active">
                          <Sparkles size={12} /> Priority Window
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pulse-item-content">
                    <h4 className="pulse-item-title">{pulse.item_name}</h4>
                    {pulse.description && (
                      <p className="pulse-item-desc">{pulse.description}</p>
                    )}
                  </div>

                  <div className="pulse-card-footer">
                    <div className="quantity-remaining-pill">
                      <span className="qty-number">{pulse.quantity_remaining}</span>
                      <span className="qty-label">baskets available</span>
                    </div>

                    <button 
                      className="btn btn-primary"
                      onClick={() => handleClaimPulse(pulse)}
                      disabled={claimLoading || pulse.quantity_remaining <= 0 || Boolean(activeClaim)}
                    >
                      <QrCode size={16} />
                      {activeClaim ? 'Active Claim in Progress' : 'Claim Free Meal'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: ID Verification & Information */}
        <div className="portal-side-column">
          {/* Student Verification Card */}
          <div className="verification-card glass-panel">
            <div className="verification-card-header">
              <ShieldCheck size={24} color="#10B981" />
              <div>
                <h4 className="side-card-title">Student Verification</h4>
                <p className="side-card-sub">Privacy-by-Design OCR Scan</p>
              </div>
            </div>

            <p className="verification-body-text">
              Upload your student card or university certificate. Our backend scans valid keywords (<strong>ETUDIANT</strong>, <strong>IZLY</strong>, <strong>current academic year</strong>) and immediately discards the image.
            </p>

            <div className="id-status-row">
              <span className="status-label">Status:</span>
              {user?.is_verified ? (
                <span className="badge badge-emerald">
                  <CheckCircle2 size={13} /> Verified Student
                </span>
              ) : (
                <span className="badge badge-amber">Pending Verification</span>
              )}
            </div>

            <label className="upload-dropzone">
              <Upload size={22} color="#F59E0B" />
              <span className="dropzone-text">
                {uploadingId ? 'Uploading to OCR Service...' : 'Click to Upload Student Card'}
              </span>
              <span className="dropzone-hint">PNG, JPG, or PDF (instant verification)</span>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleIdUpload}
                disabled={uploadingId}
                style={{ display: 'none' }}
              />
            </label>

            {verificationResult && (
              <div className="ocr-result-box" style={{ borderColor: verificationResult.verified ? '#10B981' : '#EF4444' }}>
                {verificationResult.verified ? (
                  <FileCheck size={18} color="#10B981" />
                ) : (
                  <AlertCircle size={18} color="#EF4444" />
                )}
                <div>
                  <div className="ocr-title" style={{ color: verificationResult.verified ? '#10B981' : '#EF4444' }}>
                    {verificationResult.verified ? 'OCR Verification Successful' : 'OCR Verification Notice'}
                  </div>
                  <div className="ocr-keywords">
                    {verificationResult.message}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Legal & Safety Card */}
          <div className="safety-info-card glass-panel">
            <h4 className="side-card-title">French Food Law & Safety</h4>
            <div className="safety-points">
              <div className="safety-item">
                <CheckCircle2 size={14} color="#10B981" />
                <span>Compliant with <strong>Loi Garot</strong> against food waste.</span>
              </div>
              <div className="safety-item">
                <CheckCircle2 size={14} color="#10B981" />
                <span>Allergens and hygiene strictly meet <strong>EU Regulation 852/2004</strong>.</span>
              </div>
              <div className="safety-item">
                <CheckCircle2 size={14} color="#10B981" />
                <span>100% Free & Dignified for verified students.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
