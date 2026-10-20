# Vif Web Portal

A responsive web application for **Vif — The Real-Time Student Food Bridge**, built with **Vite + React** and custom **Vanilla CSS** design system.

---

## Features Implemented

### Student Portal (`StudentPortal.jsx`)
- **Paris Campus Radar & Zone Picker**: 1-click zone switcher (Sorbonne / Quartier Latin, Bastille, République, Le Marais, Montparnasse) or live browser GPS geolocation.
- **Surplus Food Feed (`GET /pulses/nearby`)**: Displays bakery surplus packages within 1,000 meters with distance calculation, remaining quantities, and active 10-minute priority windows for verified students.
- **1-Click Reservation & Live Challenge QR (`POST /claims/create`)**:
  - Ticking 20-minute reservation countdown timer.
  - Live generated SVG QR code (`qrcode.react`) with unique challenge token.
  - Anti-ghosting protection reminder.
- **Student ID Card OCR Verification (`POST /student/verify-id`)**:
  - Drag-and-drop or file upload zone with OCR simulation recognizing `ETUDIANT`, `IZLY`, and academic year tokens.
  - Instant priority status unlock.
- **Reliability Karma Meter**: Displays 0–100 reliability score (locked if below 30, penalty for ghosting).

---

### Bakery / Shopkeeper Portal (`ShopkeeperPortal.jsx`)
- **1-Click French Bakery Presets**: Instant surplus broadcasting in under 10 seconds without typing:
  - 10 Baguettes de Tradition
  - 8 Croissants & Viennoiseries
  - 5 Sandwiches & Quiches du Jour
  - 6 Pâtisseries & Tartes
- **1-Tap Surplus Broadcast (`POST /pulses`)**: Notifies all verified students within 1 km via FCM push alerts.
- **QR Handshake Validation (`POST /validate-claim`)**: Instant check-in of student QR code or challenge token, completing the pickup, preventing student karma penalties, and recording the meal into the tax ledger.
- **Cerfa n° 11580*05 Tax Deduction Engine**:
  - Live summary of meals donated, item counts, and cost-basis valuation.
  - 60% corporate tax deduction calculation under **Article 238 bis CGI**.
  - 1-click download of the official DGFiP-compliant Cerfa PDF.
- **Store & Cost Matrix (`POST /shopkeeper/inventory-costs`)**: Configure bakery address, GPS coordinates, and production cost price per item.

---

### Authentication & Quick-Test Demo Mode
- **Dual Role Selector**: Switch between Student and Boulangerie view in one click.
- **Instant Demo Pre-fill**: Quick login buttons for Student (`alexandre.dupont@epitech.eu`) and Bakery (`artisan@boulangerie-marais.fr`).
- **Academic Email Validation**: Enforces `.edu`, `.eu`, `.ac.uk`, `.univ`.
- **SIRET 14-digit Validation**: Form validation with French INSEE Sirene registry compliance.

---

## Running Locally

```bash
cd web
npm install
npm run dev
```

App runs at: **`http://127.0.0.1:5173`**
