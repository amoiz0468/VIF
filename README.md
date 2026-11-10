# Vif — The Real-Time Student Food Bridge

> **Connecting French artisan bakeries with university students to turn end-of-day surplus into free, dignified meals — while rewarding bakeries with corporate tax deductions under French law.**

**EPITECH Capstone / Innovative Project (Paris, France)**

---

## 🥖 Overview

**Vif** is a dual-sided digital platform designed to simultaneously tackle two pressing systemic crises in France:

1. **Student Food Insecurity**: Over 20% of university students in France regularly skip meals due to acute financial hardship. Existing traditional food aid options often suffer from restrictive collection hours, rigid locations, and social stigma.
2. **Artisan Bakery Food Waste**: French boulangeries bake fresh bread, viennoiseries, and savoury foods every afternoon, discarding unsold edible surplus at closing time due to strict freshness policies.

**Vif provides the real-time bridge**:
- **Boulangeries** broadcast surplus packs in **under 10 seconds** using 1-click French bakery presets.
- **Verified students within 1,000 meters** receive real-time push alerts, reserve meals for **100% free**, and follow live walking/cycling street routes to pick them up within a 20-minute window.
- **Secure Handshake**: A dynamic challenge QR code is scanned via a **live camera scanner** at the counter.
- **Fiscal Reward**: The bakery automatically generates official **Cerfa n° 11580\*05** tax receipt PDFs claiming a **60% corporate tax reduction** (*Article 238 bis du CGI*) on the production cost of every meal donated.

---

## 🌟 Key Features & Modular Architecture

### 🎓 1. Student Portal (`/student/*`)
* **Surplus Radar (`/student/radar`)**: Real-time radar feed filtering active bakery pulses within a strict 1 km radius. Includes 1-click Paris zone shortcuts (*40 Rue du Dr Roux 15ème, Sorbonne / Quartier Latin, Le Marais, Bastille, République, Montparnasse*) and live GPS browser location.
* **Live Street Map & Route Preview (`/student/map`)**: Interactive Leaflet / OpenStreetMap view displaying strictly registered partner boulangeries, exact student location, and dynamic green road route previews with walking (`🚶`) and cycling (`🚲`) ETAs.
* **1-Click Free Reservation & Live QR**: Generates an anti-fraud challenge SVG QR code with an active 20-minute pickup countdown timer.
* **Privacy-by-Design ID Verification (`/student/verification`)**: High-speed OCR engine extracting student status (`ÉTUDIANT`, `IZLY`, academic term validity) while discarding the uploaded ID image immediately after extraction.
* **Student History & Impact Dossier (`/student/history`)**: Tracks total meals claimed, kilograms of food waste prevented, money saved in euros, and pickup reliability records.
* **Student Profile (`/student/profile`)**: Manage university affiliation, study level, dietary requirements/allergens, default Paris street address, and contact information.
* **Reliability Karma Engine**: 0–100 karma rating incentivising punctuality. No-shows/ghosting deduct 10 karma points, while timely pickups unlock priority access.

---

### 🥐 2. Artisan Bakery Portal (`/bakery/*`)
* **1-Click French Bakery Presets (`/bakery/pulse`)**: Instant broadcast of surplus batches with zero manual typing required before closing:
  * 🥖 *10 Baguettes de Tradition*
  * 🥐 *8 Croissants & Viennoiseries*
  * 🥪 *5 Sandwiches & Quiches du Jour*
  * 🍰 *6 Pâtisseries & Tartes*
* **Inventory & Items Management (`/bakery/items`)**: Dedicated inventory control page allowing bakers to edit surplus item titles, descriptions, total and remaining stock, extend expiration windows (+30m, +1h, +2h, +24h), and trigger 1-click deletion.
* **🔒 Internal Cerfa Tax Unit Pricing**: Bakers can configure the internal production cost price (`€ / unit`) for each item. This value is strictly hidden from students (meals remain 100% free) and feeds directly into the bakery's Cerfa tax receipts.
* **Live Camera QR Code Scanner (`/bakery/validate`)**: Instant in-browser webcam / mobile camera scanner that automatically detects and validates student QR codes upon presentation, with fallbacks for QR image file uploads and manual UUID verification.
* **Bakery Claim & Surplus History (`/bakery/history`)**: Real-time ledger of pending student pickups, historical claims, and active surplus pulses.
* **Automated Cerfa n° 11580\*05 Documents (`/bakery/tax`)**: Generates official DGFiP-compliant donation receipts in PDF format (*Article 238 bis CGI*), itemising monthly quantities, cost-basis valuations, and total 60% tax deduction credits.
* **Bakery Profile & Location Matrix (`/bakery/profile`)**: Manage commercial name (synced to the header brand badge), manager contact info, Paris street address, WGS84 coordinates (with OpenStreetMap Nominatim auto-geocoding), and default production cost matrices.

---

### 📱 3. Mobile-First Responsive Experience
* **Floating Glass Bottom Dock**: On mobile viewports (`<= 768px`), page navigation moves into an iOS/modern app floating bottom dock with quick tabs, active indicators, and prominent action buttons (*Scan QR* for bakeries, *Map & Routes* for students).
* **Compact Header**: Dynamic top bar highlighting the active bakery name, karma scores, and instant sign-out.
* **Adaptive Grid Layouts**: Full touch-friendly responsive design across all forms, tables, radar feeds, and dialog modals.

---

## 🛠️ Technology Stack

```
┌─────────────────────────────────────────────────────────────┐
│                       VIF PLATFORM                          │
├──────────────────────────────┬──────────────────────────────┤
│  Frontend (Web Portal)       │  Backend API Engine          │
│  • React 19 + Vite           │  • FastAPI (Python 3.13)     │
│  • Custom Responsive CSS     │  • SQLAlchemy 2.0 ORM        │
│  • Leaflet & OpenStreetMap   │  • Pydantic v2 Validation    │
│  • jsQR Live Camera Scanner  │  • JWT + OAuth2 Security     │
│  • QRCode.react SVG          │  • ReportLab PDF (Cerfa)     │
├──────────────────────────────┼──────────────────────────────┤
│  Database & Geospatial       │  DevOps & Continuous Delivery│
│  • PostgreSQL + PostGIS      │  • Docker & Docker Compose   │
│  • Spatial Radius (<1000m)   │  • GitHub Actions CI         │
│  • SQLite Local Test Engine  │  • Automated Mirror Workflow │
└──────────────────────────────┴──────────────────────────────┘
```

---

## ⚖️ Legal & Regulatory Compliance

Vif operates in full conformity with French and European statutory frameworks:

| Regulation | Purpose & Implementation |
|---|---|
| **Article 238 bis du CGI** | 60% corporate tax deduction on food donation cost price for participating bakeries. |
| **Loi n° 2016-138 ("Loi Garot")** | National legislation combating food waste and promoting commercial surplus donation. |
| **Cerfa n° 11580\*05** | Official French fiscal receipt generated automatically by Vif's backend engine. |
| **GDPR & CNIL Guidance** | Privacy-by-design architecture: student identity card images are discarded immediately after OCR. |
| **Regulation (EC) 852/2004 & EU 1169/2011** | Strict adherence to food hygiene standards, allergen warnings, and transport time limits (20-min window). |

---

## 📂 Project Structure

```
.
├── backend/                        # FastAPI Application & Business Logic
│   ├── app/
│   │   ├── main.py                 # FastAPI application factory & lifespan hooks
│   │   ├── auth.py                 # JWT token generation & role validation
│   │   ├── database.py             # SQLAlchemy session management (PostgreSQL / SQLite)
│   │   ├── models.py               # ORM database models (User, Shop, Pulse, Claim, etc.)
│   │   ├── schemas.py              # Pydantic request & response schemas
│   │   ├── routers/
│   │   │   ├── shopkeeper.py       # Bakery API endpoints (pulses, claims, tax reports)
│   │   │   └── student_portal.py   # Student API endpoints (radar feed, claims, OCR)
│   │   └── services/
│   │       ├── shopkeeper.py       # Inventory, Cerfa PDF compiler, pulse lifecycle
│   │       ├── student_portal.py   # Nearby pulse geospatial queries & seeded shops
│   │       ├── karma_engine.py     # Reliability rating & ghosting penalty tasks
│   │       └── insee.py            # French SIRET 14-digit verification
│   ├── migrations/                 # Database schema migrations
│   └── tests/                      # Automated pytest test suite
│
├── web/                            # React + Vite Web Application
│   ├── src/
│   │   ├── pages/
│   │   │   ├── student/            # Student Portal Pages (Radar, Map, ID, History, Profile)
│   │   │   └── bakery/             # Bakery Portal Pages (Pulse, Items, QR, History, Tax, Profile)
│   │   ├── components/             # Reusable UI components (Navbar, Maps, Modals, Footer)
│   │   ├── api.js                  # Centralized Axios/Fetch API client
│   │   └── index.css               # Warm-light modern responsive design system
│   └── index.html                  # HTML entry point with Leaflet & jsQR CDN hooks
│
├── frontend/                       # Mobile Application (React Native / Expo)
├── Documentation/                  # Comprehensive Capstone Academic Documentation
└── .github/workflows/              # CI/CD and repository mirroring pipelines
```

---

## 🚀 Quick Start & Local Setup

### Prerequisites
- **Python**: `>= 3.11` (Python 3.13 recommended)
- **Node.js**: `>= 18.0.0`
- **npm**: `>= 9.0.0`
- **Git**

---

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI development server
uvicorn app.main:app --reload --port 8000
```

* API server runs at: **`http://localhost:8000`**
* Interactive Swagger Docs: **`http://localhost:8000/docs`**
* Alternative ReDoc: **`http://localhost:8000/redoc`**

Run unit tests:
```bash
pytest tests/
```

---

### 2. Frontend Web Setup

```bash
# Open a new terminal and navigate to web directory
cd web

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

* Web application runs at: **`http://localhost:5173`**
* Build for production:
```bash
npm run build
```

---

### 3. Docker Compose Setup (Optional)

To launch the full stack (PostgreSQL database, backend API, and services) with Docker:

```bash
docker-compose up --build
```

---

## 🔑 Demo Test Accounts

The database includes pre-seeded partner boulangeries in Paris and student test accounts for rapid evaluation:

| Role | Email | Password | Details |
|---|---|---|---|
| **Artisan Baker** | `thierrymarx.vaugirard@vif-bakery.fr` | `password123` | Boulangerie Thierry Marx (51 Rue de Vaugirard, 75015 Paris) |
| **Artisan Baker** | `moulin.volontaires@vif-bakery.fr` | `password123` | Le Moulin de la Vierge Volontaires (105 Rue de Vaugirard, 75015 Paris) |
| **Student** | `alexandre.dupont@epitech.eu` | `password123` | Verified Student Profile (Paris 15ème) |

*You can also click **Register** to create any new Student (using `.edu`, `.eu`, `.ac.uk`, or `.univ` emails) or Bakery account with a valid 14-digit French SIRET number.*

---

## 📚 Complete Project Documentation

The repository's [`Documentation/`](./Documentation) directory contains the exhaustive academic and technical deliverable library:

* **Management & Strategy**: Project Charter, Sprint Milestones 1–3, Final Capstone Report, Risk Register, Communication Plan.
* **Technical Architecture**: API Specification, Database Schema & Data Dictionary, Functional Specification (SRS), Test Strategy & QA Plan, Threat Model & Security Audit.
* **Legal & Ethics**: Legal Compliance Agreements, GDPR Privacy Analysis, Terms of Use.
* **User Experience**: User Personas, Student & Shopkeeper Journey Maps, Documentation Master Index.

---

## 👥 Engineering Team

Delivered as an **EPITECH MSc Pro Capstone Project**:
- **Abdul Moiz** — Full-Stack Architecture, Backend Services & DevOps
- Supported by the EPITECH Capstone Engineering Group.

---

## 📄 License

This project is developed for academic and demonstration purposes as part of the **EPITECH Master of Science** curriculum.
