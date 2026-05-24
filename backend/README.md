# ViF Backend API - Smart Marketplace

A FastAPI-based food redistribution marketplace backend with built-in student portal, shopkeeper management, and spatial-aware pulse (food donation) filtering.

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Setup & Installation](#setup--installation)
- [Running the Server](#running-the-server)
- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
- [Student Portal Features](#student-portal-features)
- [Database](#database)
- [Business Logic](#business-logic)
- [Frontend Integration Guide](#frontend-integration-guide)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Set up environment variables
cp .env.example .env
# Edit .env with your database URL and secret key

# 3. Run database migrations
python migrations/manage_migrations.py

# 4. Start the server
uvicorn app.main:app --reload
```

Server runs at `http://127.0.0.1:8000`  
API docs available at `http://127.0.0.1:8000/docs`

---

## 🏗️ Architecture

```
backend/
├── app/
│   ├── main.py                 # FastAPI app initialization, startup hooks
│   ├── auth.py                 # JWT authentication, role-based access
│   ├── models.py               # SQLAlchemy ORM models (User, Pulse, Claim, Shop, etc)
│   ├── schemas.py              # Pydantic request/response schemas
│   ├── crud.py                 # Database CRUD operations
│   ├── database.py             # SQLAlchemy setup, session management
│   ├── routers/
│   │   ├── shopkeeper.py       # Shopkeeper endpoints (inventory, pulse validation)
│   │   └── student_portal.py   # Student endpoints (feed, claims, verification)
│   └── services/
│       ├── student_portal.py   # Student portal business logic
│       ├── shopkeeper.py       # Shopkeeper business logic
│       ├── karma_engine.py     # Delayed penalty scheduling for ghosted claims
│       ├── insee.py            # INSEE integration (business registration)
│       └── fcm_service.py      # Firebase Cloud Messaging (notifications)
├── migrations/
│   ├── manage_migrations.py    # Migration management tool
│   └── versions/               # SQL migration files
└── tests/
    ├── test_student_portal.py  # Unit tests for student portal
    └── conftest.py             # Pytest configuration
```

### Key Technologies

- **FastAPI**: Modern async web framework
- **SQLAlchemy**: ORM for database operations
- **PostgreSQL**: Primary database (with PostGIS for spatial queries)
- **SQLite**: Local development fallback
- **JWT**: Secure token-based authentication
- **PostGIS**: Spatial distance calculations (1000m radius feed filtering)

---

## 🔧 Setup & Installation

### Requirements

- Python 3.13+
- PostgreSQL 12+ (with PostGIS extension for production)
- pip or conda

### Step 1: Clone & Navigate

```bash
cd backend
```

### Step 2: Create Virtual Environment

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### Step 3: Install Dependencies

```bash
pip install -r requirements.txt
```

### Step 4: Environment Configuration

Create `.env` file in the backend directory:

```env
DATABASE_URL=postgresql://user:password@localhost/vif_db
SECRET_KEY=your-super-secret-key-change-in-production
DEBUG=True
```

For local development, SQLite is used by default:
```env
DATABASE_URL=sqlite:///./sql_app.db
SECRET_KEY=dev-secret-key
DEBUG=True
```

### Step 5: Database Setup

```bash
# Run migrations
python migrations/manage_migrations.py

# Or reset database (removes all data)
bash migrations/reset_database.sh
```

---

## ▶️ Running the Server

### Development Mode (with auto-reload)

```bash
uvicorn app.main:app --reload
```

URL: `http://127.0.0.1:8000`

### Production Mode

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Interactive API Documentation

Once server is running:
- Swagger UI: http://127.0.0.1:8000/docs
- ReDoc: http://127.0.0.1:8000/redoc

---

## 🔐 Authentication

### JWT Token Flow

1. **User Registration**: `POST /auth/register`
2. **User Login**: `POST /token` → Returns access token
3. **Use Token**: Include in requests: `Authorization: Bearer <token>`

### Token Structure

```javascript
{
  "sub": "email@example.com",  // User email (subject)
  "role": "student",            // "student", "shopkeeper", or "admin"
  "exp": 1779626513             // Expiration timestamp
}
```

### Roles

- **student**: Can view pulses, create claims, verify identity
- **shopkeeper**: Can create/manage pulses, validate claims
- **admin**: Full system access (future)

### Protected Routes

Most endpoints require a valid JWT token in the `Authorization` header:

```bash
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  http://127.0.0.1:8000/pulses/nearby?lat=48.8566&lng=2.3522
```

---

## 📡 API Endpoints

### Authentication

#### Register User
```
POST /auth/register
Content-Type: application/json

{
  "email": "alice@student.edu",
  "password": "securepassword123",
  "role": "student"
}

Response: 200 OK
{
  "email": "alice@student.edu",
  "role": "student",
  "id": "uuid..."
}
```

#### Login (Get Token)
```
POST /token
Content-Type: application/x-www-form-urlencoded

username=alice@student.edu&password=securepassword123

Response: 200 OK
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer"
}
```

#### Get Current User Info
```
GET /users/me
Authorization: Bearer <token>

Response: 200 OK
{
  "id": "uuid",
  "email": "alice@student.edu",
  "role": "student",
  "karma_score": 50,
  "is_verified": true,
  "id_verification_status": "verified"
}
```

---

### Student Portal Endpoints

#### Get Nearby Pulses (Feed)
Fetches food donations within 1000m radius, filtered by verification status.

```
GET /pulses/nearby?lat=48.8566&lng=2.3522
Authorization: Bearer <student_token>

Query Parameters:
  - lat (float): Student's latitude
  - lng (float): Student's longitude

Response: 200 OK
[
  {
    "pulse_id": "uuid-1",
    "shop_id": "uuid-shop",
    "shop_name": "Boulangerie Paris",
    "shop_address": "123 Rue de Rivoli, 75001",
    "item_name": "Baguettes",
    "description": "Day-old baguettes, still fresh",
    "quantity_remaining": 10,
    "distance_meters": 245.5,
    "created_at": "2026-05-24T12:30:00Z",
    "expires_at": "2026-05-24T14:30:00Z",
    "priority_window_active": false
  }
]
```

**Priority Window Logic:**
- Pulses created < 10 minutes ago are hidden from unverified students
- After 10 minutes, all verified students can see them
- Unverified students get full access after identity verification

#### Create a Claim
Student claims a pulse and reserves the food.

```
POST /claims/create
Authorization: Bearer <student_token>
Content-Type: application/json

{
  "pulse_id": "uuid-1"
}

Response: 200 OK
{
  "id": "claim-uuid",
  "pulse_id": "uuid-1",
  "shop_id": "shop-uuid",
  "student_user_id": "student-uuid",
  "qr_code_token": "a1b2c3d4-e5f6-47a8-9b10-c11d21e3f4g5",
  "status": "pending",
  "claimed_at": "2026-05-24T12:35:00Z",
  "claim_deadline": "2026-05-24T12:55:00Z",
  "quantity": 1
}
```

**Business Rules:**
- Returns **400 Bad Request** if student already has an active pending claim
- Returns **409 Conflict** if student already collected from this pulse
- Returns **403 Forbidden** if student has karma score < 30 (ghosting penalty)
- Returns **410 Gone** if pulse has expired
- Returns **409 Conflict** if pulse quantity exhausted
- Claim is valid for 20 minutes (claim window)
- After 20 minutes without collection, claim is ghosted and karma score reduced by 10

#### Verify Student Identity
Uploads student ID photo for verification.

```
POST /student/verify-id
Authorization: Bearer <student_token>
Content-Type: multipart/form-data

Multipart form:
  - upload: <image_file> (JPG, PNG only)

Response: 200 OK
{
  "verified": true,
  "status": "verified",
  "manual_review": false,
  "message": "ID verified successfully"
}
```

**Supported Formats:** JPG, PNG (max 5MB recommended)

**Current Behavior:** Auto-verifies on any valid image upload (temporary)

---

### Shopkeeper Endpoints

#### Create a Pulse
List food donation/sale.

```
POST /pulses/create
Authorization: Bearer <shopkeeper_token>
Content-Type: application/json

{
  "item_name": "Baguettes",
  "description": "Day-old baguettes",
  "quantity": 10,
  "type": "donation",
  "expires_at": "2026-05-24T14:30:00Z"
}

Response: 201 Created
{
  "id": "pulse-uuid",
  "shop_id": "shop-uuid",
  "item_name": "Baguettes",
  "quantity": 10,
  "quantity_remaining": 10,
  "created_at": "2026-05-24T12:30:00Z",
  "expires_at": "2026-05-24T14:30:00Z"
}
```

#### Validate Claim (Check QR Code)
Shopkeeper scans student's QR code to collect the food.

```
POST /validate-claim
Authorization: Bearer <shopkeeper_token>
Content-Type: application/json

{
  "qr_code_token": "a1b2c3d4-e5f6-47a8-9b10-c11d21e3f4g5",
  "pulse_id": "pulse-uuid"
}

Response: 200 OK
{
  "id": "claim-uuid",
  "status": "collected",
  "collected_at": "2026-05-24T12:40:00Z",
  "message": "Claim validated successfully"
}

Response on Duplicate Scan: 409 Conflict
{
  "detail": "Claim already processed. Cannot validate same claim twice."
}
```

**One-Time Use Guarantee:**
- First validation: 200 OK, claim marked as COLLECTED
- All subsequent validations: 409 Conflict (prevents double-collection)

---

## 🎯 Student Portal Features

### Feature 1: Spatial Feed Filtering
- **Distance**: Pulses within 1000 meters
- **Sorting**: By distance (nearest first)
- **Timezone**: All timestamps in UTC

### Feature 2: Priority Window (Fairness)
- **Duration**: First 10 minutes after pulse creation
- **Rule**: Only verified students can see new pulses during first 10 minutes
- **Goal**: Give verified students priority on fresh donations

### Feature 3: Karma System
- **Starting Score**: 50
- **Ghosting Penalty**: -10 (for missing a claim deadline)
- **Lockout Threshold**: < 30 (student blocked from new claims)
- **Recovery**: No automatic recovery; require admin intervention

### Feature 4: One-Time QR Validation
- **Format**: UUID string (e.g., `a1b2c3d4-e5f6-47a8-9b10-c11d21e3f4g5`)
- **Uniqueness**: Each claim gets a unique token
- **Enforcement**: Stored in both `qr_token` (legacy) and `qr_code_token` (current)
- **Protection**: Second scan returns 409 Conflict

### Feature 5: Claim Window (20 Minutes)
- **Duration**: Student has 20 minutes from claim creation to collect
- **Expiration**: After 20 minutes, claim auto-ghosts (penalty applied)
- **Notification**: Shopkeeper sees expired claims marked as GHOSTED

---

## 💾 Database

### Core Models

#### User
```python
id: UUID (Primary Key)
email: String (Unique)
hashed_password: String
role: String ("student", "shopkeeper", "admin")
karma_score: Integer (default: 50)
is_verified: Boolean (default: False)
id_verification_status: String ("pending", "manual_review", "verified")
created_at: DateTime
```

#### Pulse (Food Donation/Sale)
```python
id: UUID (Primary Key)
shop_id: UUID (FK → Shop)
item_name: String
description: String (nullable)
type: String ("donation", "sale")
quantity: Integer
quantity_remaining: Integer (atomically decremented per claim)
location: Point (PostGIS) # Shop location for spatial queries
created_at: DateTime
expires_at: DateTime
```

#### Claim (Student's Reservation)
```python
id: UUID (Primary Key)
pulse_id: UUID (FK → Pulse)
student_user_id: UUID (FK → User)
shop_id: UUID (FK → Shop)
qr_token: String (legacy)
qr_code_token: String (current, indexed)
status: String ("pending", "collected", "ghosted")
claimed_at: DateTime
claim_deadline: DateTime (triggers ghosting check)
collected_at: DateTime (nullable)
quantity: Integer
```

#### Shop (Shopkeeper's Store)
```python
id: UUID (Primary Key)
owner_user_id: UUID (FK → User)
name: String
address: String
location: Point (PostGIS)
siret: String (French business ID)
```

### Migrations

Run migrations to update schema:

```bash
python migrations/manage_migrations.py
```

Auto-migration at startup ensures schema compatibility even with old databases:

```python
# In app/main.py
ensure_student_portal_schema()
```

---

## 🧠 Business Logic

### Claim Creation Flow

```
1. Validate student authorization (JWT)
2. Check karma score (must be ≥ 30)
3. Acquire FOR UPDATE locks on:
   - User (prevent concurrent claim creation by same student)
   - Pulse (prevent overclaiming)
   - Active claim check (max 1 pending per student)
4. Check for already collected claim (prevent pulse re-claiming)
5. Verify pulse hasn't expired
6. Verify pulse has quantity remaining
7. Generate unique UUID as QR code token
8. Decrement pulse.quantity_remaining
9. Create claim record with 20-minute deadline
10. Commit transaction (all-or-nothing)
11. Schedule delayed penalty task if deadline passes
```

### Ghosting Penalty Flow

```
1. Claim created with deadline = now + 20 minutes
2. Background task scheduled via asyncio
3. When deadline passes:
   - Acquire FOR UPDATE locks
   - Check claim status (if still "pending"):
     - Update claim status to "ghosted"
     - Restore pulse.quantity_remaining
     - Decrement user.karma_score by 10
   - Commit changes
4. If app restarts before deadline:
   - bootstrap_pending_claim_tasks() reschedules all pending claims
   - Ensures ghosting happens even across server restarts
```

**Note:** Current implementation uses in-memory asyncio tasks. For production, consider database-backed task queue (Celery, APScheduler) for true persistence.

### One-Time QR Validation

```
First Scan:
1. Query claim by qr_code_token
2. Check status == "pending"
3. Update status to "collected"
4. Set collected_at timestamp
5. Return 200 OK

Second Scan:
1. Query claim by qr_code_token
2. Check status == "collected" (no longer pending)
3. Return 409 Conflict "already processed"
```

---

## 🔗 Frontend Integration Guide

### Required Headers

All authenticated requests must include:
```javascript
headers: {
  "Authorization": `Bearer ${token}`,
  "Content-Type": "application/json"
}
```

### Example Integration: React

```javascript
// 1. Login and get token
const loginResponse = await fetch("http://localhost:8000/token", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    username: "alice@student.edu",
    password: "password123"
  })
});

const { access_token } = await loginResponse.json();
localStorage.setItem("token", access_token);

// 2. Fetch nearby pulses
const token = localStorage.getItem("token");
const response = await fetch(
  `http://localhost:8000/pulses/nearby?lat=48.8566&lng=2.3522`,
  {
    headers: { "Authorization": `Bearer ${token}` }
  }
);

const pulses = await response.json();

// 3. Create claim
const claimResponse = await fetch(
  "http://localhost:8000/claims/create",
  {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ pulse_id: "uuid-1" })
  }
);

const claim = await claimResponse.json();
// Display QR code with claim.qr_code_token
```

### CORS Configuration

Backend is configured for CORS. Adjust origins in `app/main.py` if needed:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Error Handling

Common HTTP status codes:

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Process response |
| 201 | Created | Resource created |
| 400 | Bad Request | Check request body |
| 401 | Unauthorized | Token missing/invalid, redirect to login |
| 403 | Forbidden | Role/permission denied, show error |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate action/state conflict, retry not recommended |
| 410 | Gone | Resource expired |

---

## 🧪 Testing

### Run All Tests

```bash
python -m pytest tests/ -v
```

### Run Specific Test

```bash
python -m pytest tests/test_student_portal.py::StudentPortalServiceTests::test_create_claim_decrements_quantity_and_schedules_penalty -v
```

### Test Coverage

Current test suite (12 tests):

- ✅ Feed filtering (priority window)
- ✅ Claim creation (quantity decrement)
- ✅ Claim atomicity (FOR UPDATE locks)
- ✅ Karma lockout (< 30)
- ✅ Duplicate pending claims prevention
- ✅ Duplicate pulse collection prevention (new)
- ✅ Ghosting penalty worker
- ✅ Startup bootstrap of pending claims
- ✅ Student ID verification
- ✅ Route wiring validation
- ✅ Error handling (non-image uploads)

### Manual Testing with cURL

```bash
# Get token
TOKEN=$(curl -s -X POST http://localhost:8000/token \
  -d "username=alice@student.edu&password=test" | jq -r .access_token)

# Fetch nearby pulses
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/pulses/nearby?lat=48.8566&lng=2.3522"

# Create claim
curl -X POST http://localhost:8000/claims/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"pulse_id": "uuid"}'
```

---

## 🐛 Troubleshooting

### Issue: "401 Unauthorized"

**Cause**: Invalid or missing token  
**Solution**:
1. Token may have expired (30-min expiry)
2. Check `Authorization: Bearer <token>` format
3. Re-login to get new token

### Issue: "Pulse not found" (404)

**Cause**: Pulse ID doesn't exist or has expired  
**Solution**:
1. Verify pulse_id UUID is correct
2. Fetch /pulses/nearby to see available pulses
3. Check pulse hasn't passed expires_at

### Issue: "Only one active reservation allowed" (400)

**Cause**: Student already has a pending claim  
**Solution**:
1. Wait for claim deadline to pass (ghosting auto-expires after 20 min)
2. Collect the existing claim (scan QR)
3. Or contact admin to manually clear

### Issue: "Account locked due to ghosting" (403)

**Cause**: Student's karma_score < 30  
**Solution**:
1. Admin must manually reset karma_score
2. Run SQL: `UPDATE users SET karma_score = 50 WHERE email = 'student@email.edu'`

### Issue: Column doesn't exist (500 on startup)

**Cause**: Database schema out of sync  
**Solution**:
1. Auto-migration runs at startup (see ensure_student_portal_schema())
2. If persists, manually run: `python migrations/manage_migrations.py`
3. Or reset database: `bash migrations/reset_database.sh`

### Issue: PostGIS not available (production)

**Cause**: PostgreSQL missing PostGIS extension  
**Solution**:

```sql
-- Connect to PostgreSQL
CREATE EXTENSION postgis;
```

### Issue: QR code token appears multiple times

**Cause**: Claim has both qr_token (legacy) and qr_code_token (current)  
**Solution**:
1. Both are synced automatically on startup
2. Use qr_code_token in any new code
3. validate-claim endpoint accepts both for backward compat

---

## 📞 Support & Resources

- **API Docs**: http://localhost:8000/docs
- **Git Repo**: `git log --oneline` for commit history
- **Tests**: `pytest tests/ -v --tb=short`
- **Database**: Connect to `DATABASE_URL` with your DB client

---

## 📝 Version History

**v1.0** (May 2026)
- Student portal with feed filtering, claims, and verification
- Shopkeeper pulse creation and claim validation
- Karma system with ghosting penalties
- One-time QR code validation
- Comprehensive test suite (12 tests)
