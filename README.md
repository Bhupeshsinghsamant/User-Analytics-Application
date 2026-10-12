# User Analyser

A modern, high-performance, full-stack web analytics and session intelligence platform. User Analyser provides end-to-end visibility into user interactions through privacy-first client tracking, low-latency event ingestion, persistent session mapping, and interactive click heatmaps.

---

## Overview & Problem Statement

Modern digital products often struggle with web analytics solutions that are either overly complex, slow, invasive to user privacy, or prohibitively expensive for early-stage teams. Traditional analytics suites inject heavy tracking scripts that impact Core Web Vitals, sample event data unpredictably, and obscure raw interaction coordinates behind opaque metrics.

**User Analyser** solves this by providing a lightweight, transparent, full-stack analytics pipeline:
- **Zero-Dependency Client SDK**: Ultra-compact vanilla JavaScript tracker (`tracker.js`) that captures session journeys and click coordinates without degrading page performance.
- **High-Throughput Validation API**: Python Flask REST backend enforcing strict schema validation and batch ingestion.
- **Scalable Document Persistence**: MongoDB Atlas free-tier (M0) compatible cluster with optimized compound indexing.
- **Actionable Visual Dashboard**: React + Vite interface offering real-time metric counters, granular session inspection, and normalized HTML5 Canvas click heatmaps.

---

## Technology Stack

| Layer | Technologies | Key Capabilities |
|---|---|---|
| **Client SDK** | Vanilla JavaScript (ES6+) | Zero external dependencies, non-blocking, ~7 KB, sessionStorage session persistence, automatic PII masking |
| **Backend API** | Python 3.10+, Flask 3.1, PyMongo 4.11 | RESTful design, strict schema validation, CORS configuration, batch processing, TLS database connection |
| **Database** | MongoDB Atlas (Cloud M0 / Local 7.0+) | Document storage, compound indexes on `(sessionId, timestamp)` and `(pageUrl, eventType)`, aggregation pipelines |
| **Frontend Dashboard** | React 19, Vite, Lucide Icons, CSS3 | Real-time KPI cards, searchable sessions table, chronological journey inspector, interactive HTML5 Canvas heatmap |
| **Testing & Tooling** | pytest, Vite build engine, Git | 12 automated unit and integration tests, production build verification |

---

## Architecture & Data Flow

```text
┌────────────────────────────────────────────────────────┐
│             Client Website / Web Application           │
│         (HTML Page + Embedded tracker.js SDK)          │
└───────────────────────────┬────────────────────────────┘
                            │
                            │ POST /api/events (page_view, click + coordinates)
                            ▼
┌────────────────────────────────────────────────────────┐
│              Flask REST API (Python 3.10+)             │
│    - JSON Schema Validation                            │
│    - PII & Sensitive Input Masking Guard               │
│    - CORS & Batch Event Processing                     │
└───────────────────────────┬────────────────────────────┘
                            │
                            │ PyMongo Driver (TLS / certifi)
                            ▼
┌────────────────────────────────────────────────────────┐
│              MongoDB Atlas Cloud Cluster               │
│    - 'events' Collection (Indexed by session, time)    │
│    - 'sessions' Aggregation Pipeline                   │
└───────────────────────────┬────────────────────────────┘
                            │
                            │ GET /api/sessions, /api/events/clicks, /api/stats/overview
                            ▼
┌────────────────────────────────────────────────────────┐
│            React + Vite Analytics Dashboard            │
│    - Overview Metric KPI Cards                         │
│    - Filterable Active Sessions Table                  │
│    - Chronological User Journey Timeline               │
│    - Resolution-Normalized HTML5 Canvas Click Heatmap  │
└────────────────────────────────────────────────────────┘
```

---

## How It Works (Step-by-Step Flow)

1. **Client-Side Tracking**:
   The lightweight tracker script (`tracker.js`) is embedded onto any webpage before `</body>`. On page load, it checks `sessionStorage` for an existing session or generates a unique `sessionId` (e.g., `sess_...`). It automatically records a `page_view` event.
2. **Interaction Capture & Coordinate Normalization**:
   When visitors interact with buttons, links, or navigation items, a global listener captures exact `(x, y)` document coordinates and viewport dimensions (`width`, `height`). Form fields containing sensitive values (passwords, tokens) are automatically ignored.
3. **Event Ingestion & Validation**:
   Events are posted asynchronously to the Flask backend (`POST /api/events`). The API validates the JSON payload structure against required schemas and returns HTTP 201.
4. **Cloud Persistence (MongoDB Atlas)**:
   Validated events are saved in the `events` collection. Compound database indexes (`sessionId` + `timestamp` and `pageUrl` + `eventType`) ensure fast query execution.
5. **Session Aggregation**:
   The backend aggregates raw events by `sessionId`, computing total interactions, click counts, entry points, and latest activity timestamps.
6. **Live Visualization (React Dashboard)**:
   The React dashboard polls aggregated data from the Flask API:
   - **Overview KPI Cards**: Displays real-time counts for active sessions, total events, page views, and clicks.
   - **Session Journey Inspector**: Clicking **Inspect** on any session opens a drawer detailing the visitor's chronological path.
   - **Click Heatmap Canvas**: Renders high-density click clusters and pinpoints directly onto page wireframes with hover tooltips and normalized coordinate scaling.

---

## Core Features

- **Full Data Ownership**: Complete control of your interaction data with direct database access and zero vendor lock-in.
- **Privacy-Preserving Tracking SDK**: Automatically ignores input fields with sensitive types (e.g., passwords, authorization tokens) and isolates tracking errors so host applications never crash.
- **Session Continuity**: Retains unique session tokens across internal page navigations via `sessionStorage` with automatic deduplication.
- **Precision Normalized Heatmaps**: Captures both viewport dimensions and page coordinates, calculating relative percentages (`0.0` - `1.0`) so clicks align across diverse screen resolutions.
- **Chronological Session Inspector**: Inspects visitor paths, viewing the sequence of visited pages and clicked elements in real time.
- **Live Health Monitoring**: Instant database connectivity checks with automatic status polling.

---

## Project Structure

```text
User Analytics Application/
├── backend/
│   ├── app/
│   │   ├── __init__.py          # Flask application factory with CORS configuration
│   │   ├── config.py            # Environment configuration loader
│   │   ├── db.py                # MongoDB Atlas connection manager & auto-indexing
│   │   ├── models.py            # Event schema validation & BSON serialization
│   │   └── routes.py            # REST API endpoints (/api/events, /api/sessions, /api/health)
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── test_api.py          # 10 unit tests for schema validation & endpoints
│   │   └── test_integration.py  # End-to-end integration test with live Atlas cluster
│   ├── test_connection.py       # Diagnostic script for MongoDB Atlas connectivity
│   ├── requirements.txt         # Python backend dependencies
│   ├── run.py                   # Flask server entry point
│   └── .env.example             # Backend environment template
├── frontend/
│   ├── public/
│   │   ├── favicon.svg          # Application favicon
│   │   └── tracker.js           # Public tracking SDK asset
│   ├── src/
│   │   ├── components/
│   │   │   ├── MetricCards.jsx      # Overview statistics cards
│   │   │   ├── SessionsTable.jsx    # Filterable session list table
│   │   │   ├── SessionTimeline.jsx  # Chronological user journey inspector
│   │   │   └── ClickHeatmap.jsx     # Canvas click heatmap with hover tooltips
│   │   ├── services/
│   │   │   └── api.js               # Centralized fetch API client
│   │   ├── App.jsx                  # Main dashboard layout
│   │   ├── index.css                # Modern responsive SaaS stylesheet
│   │   └── main.jsx                 # React root mount
│   ├── package.json             # Frontend dependencies & scripts
│   └── vite.config.js           # Vite build configuration
├── tracker/
│   ├── tracker.js               # Standalone Vanilla JS SDK source
│   └── demo.html                # Standalone interactive test page
├── demo-site/
│   ├── index.html               # Multi-feature demo website (Home)
│   └── pricing.html             # Multi-page navigation demo (Pricing)
├── .env.example                 # Root environment template
├── .gitignore                   # Excludes .env, venv/, node_modules/, dist/
├── LICENSE                      # MIT Open Source License
└── README.md                    # Project documentation
```

---

## Prerequisites

- **Python**: 3.10+ (tested on Python 3.14.7)
- **Node.js**: v18+ (tested on Node.js v24.21.0 & npm 11.19.0)
- **MongoDB Atlas**: Free M0 Sandbox Cluster (₹0 / Free Tier) or local MongoDB 7.0+

---

## Environment Setup & Configuration

### 1. MongoDB Atlas Free Tier Setup
1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Deploy a free **M0 Sandbox** cluster (no credit card required).
3. Under **Database Access**, create a database user with **Read and write to any database** permissions.
4. Under **Network Access**, click **Add IP Address** and choose `0.0.0.0/0` (Allow Access from Anywhere) to permit local development access.
5. In **Database Deployments**, click **Connect** -> **Drivers** -> **Python** and copy your connection string.

### 2. Environment Configuration
Create a `.env` file in `backend/` or the project root (use `.env.example` as a template):

```env
# MongoDB Atlas Connection URI
# Note: If password contains special characters like '@', percent-encode as '%40'
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/user_analytics?retryWrites=true&w=majority
MONGODB_DB_NAME=user_analytics

# Flask Configuration
FLASK_ENV=development
FLASK_PORT=5000
FLASK_DEBUG=True
```

> **Security Note:** Real `.env` files are excluded by `.gitignore` and must never be committed to Git.

---

## How to Run & Activate (Backend & Frontend)

To run the complete platform, start the backend and frontend in **two separate terminal windows**:

### Step 1: Activate & Run the Backend (Flask Server)

Open **Terminal 1** in the project root:

```powershell
# 1. Navigate to backend directory
cd backend

# 2. Create virtual environment (if not already created)
python -m venv venv

# 3. Activate virtual environment
# Windows PowerShell:
.\venv\Scripts\Activate.ps1
# Windows Command Prompt:
.\venv\Scripts\activate.bat

# 4. Install dependencies
pip install -r requirements.txt

# 5. Verify database connection with MongoDB Atlas
python test_connection.py

# 6. Start the Flask server
python run.py
```

- **Backend Address**: `http://127.0.0.1:5000`
- **Verify Backend is Active**: Open `http://127.0.0.1:5000/api/health` in your browser. You should receive:
  ```json
  {
    "status": "healthy",
    "database": "connected",
    "message": "Connected successfully to MongoDB Atlas."
  }
  ```

---

### Step 2: Activate & Run the Frontend (React Dashboard)

Open **Terminal 2** in the project root:

```powershell
# 1. Navigate to frontend directory
cd frontend

# 2. Install dependencies (first time only)
npm install

# 3. Start Vite development server
npm run dev
```

- **Frontend Dashboard Address**: `http://localhost:5173`
- **Verify Frontend is Active**: Open `http://localhost:5173` in your browser. You will see the live **User Analyser** dashboard with real-time KPI metrics, the sessions table, and the click heatmap canvas.

---

### Step 3: Run the Interactive Demo Website (Generate Test Events)

To generate live clicks and session journeys across pages:

```powershell
# In project root, run Python's built-in HTTP server:
python -m http.server 5500
```
- Open `http://127.0.0.1:5500/demo-site/index.html` in your browser.
- Click buttons, switch showcase tabs, or navigate to `pricing.html`.
- Watch real-time events immediately populate on your React dashboard at `http://localhost:5173`!

---

## Coordinate System & Heatmap Alignment

To ensure click heatmaps remain aligned across different screen resolutions and window resizes, the tracker captures:
- `clickCoordinates: { x, y }` — Document-relative coordinates (`pageX`, `pageY`).
- `viewport: { width, height }` — Browser window dimensions at the time of click.
- `normalizedCoordinates: { x, y }` — Proportional values computed as `x / viewport.width` and `y / viewport.height` (bounded between `0.0` and `1.0`).

On the React Heatmap Canvas:
- `display_x = normalized_x * canvas_width`
- `display_y = normalized_y * canvas_height`

This ensures that clicks recorded on varying displays (e.g., 1920×1080 or 1366×768) scale accurately to match the corresponding UI elements on the dashboard preview canvas.

---

## REST API Reference

### 1. Ingest Event
- **Endpoint**: `POST /api/events` (alias: `/api/track`)
- **Request Body**:
```json
{
  "sessionId": "sess_user_123",
  "eventType": "click",
  "pageUrl": "http://127.0.0.1:5500/demo-site/index.html",
  "clickCoordinates": { "x": 485.5, "y": 270.0 },
  "viewport": { "width": 1440, "height": 900 },
  "targetTag": "BUTTON",
  "targetText": "Start Free Trial"
}
```
- **Response** (`201 Created`):
```json
{
  "success": true,
  "processedCount": 1,
  "eventIds": ["670a59b208fa..."]
}
```

### 2. List Sessions
- **Endpoint**: `GET /api/sessions?limit=50&skip=0`
- **Response** (`200 OK`):
```json
{
  "success": true,
  "total": 12,
  "count": 12,
  "sessions": [
    {
      "sessionId": "sess_user_123",
      "eventCount": 6,
      "clickCount": 4,
      "pageViewCount": 2,
      "firstPageUrl": "http://127.0.0.1:5500/demo-site/index.html",
      "lastActive": "2026-10-12T14:58:30Z"
    }
  ]
}
```

### 3. Session Event History
- **Endpoint**: `GET /api/sessions/<sessionId>/events`
- **Response** (`200 OK`):
```json
{
  "success": true,
  "sessionId": "sess_user_123",
  "count": 2,
  "events": [
    {
      "eventType": "page_view",
      "pageUrl": "http://127.0.0.1:5500/demo-site/index.html",
      "timestamp": "2026-10-12T14:58:00Z"
    },
    {
      "eventType": "click",
      "pageUrl": "http://127.0.0.1:5500/demo-site/index.html",
      "clickCoordinates": { "x": 485.5, "y": 270.0 },
      "timestamp": "2026-10-12T14:58:15Z"
    }
  ]
}
```

### 4. Page Click Coordinates (Heatmap)
- **Endpoint**: `GET /api/events/clicks?page_url=<encoded_url>`
- **Response** (`200 OK`):
```json
{
  "success": true,
  "pageUrl": "http://127.0.0.1:5500/demo-site/index.html",
  "count": 1,
  "clicks": [
    {
      "clickCoordinates": { "x": 485.5, "y": 270.0 },
      "normalizedCoordinates": { "x": 0.3372, "y": 0.3000 },
      "targetTag": "BUTTON",
      "targetText": "Start Free Trial",
      "timestamp": "2026-10-12T14:58:15Z"
    }
  ]
}
```

### 5. Health Check
- **Endpoint**: `GET /api/health`
- **Response** (`200 OK`):
```json
{
  "status": "healthy",
  "database": "connected",
  "message": "Connected successfully to MongoDB Atlas.",
  "timestamp": "2026-10-12T15:00:00Z"
}
```

---

## Automated Testing & Verification

### Backend Test Suite (pytest)
Run the full pytest suite inside the Python virtual environment:

```powershell
cd backend
.\venv\Scripts\python.exe -m pytest -v
```

**Actual Verified Results**:
```text
test_connection.py::test_mongodb_connection PASSED                       [  8%]
tests/test_api.py::test_validate_page_view_success PASSED                [ 16%]
tests/test_api.py::test_validate_click_with_coords_success PASSED        [ 25%]
tests/test_api.py::test_validate_click_missing_coords_fails PASSED       [ 33%]
tests/test_api.py::test_validate_click_invalid_coords_fails PASSED       [ 41%]
tests/test_api.py::test_validate_invalid_event_type_fails PASSED         [ 50%]
tests/test_api.py::test_validate_missing_session_id_fails PASSED         [ 58%]
tests/test_api.py::test_serialize_doc PASSED                             [ 66%]
tests/test_api.py::test_health_endpoint PASSED                           [ 75%]
tests/test_api.py::test_track_invalid_body PASSED                        [ 83%]
tests/test_api.py::test_404_handler PASSED                               [ 91%]
tests/test_integration.py::test_live_integration_pipeline PASSED         [100%]

======================== 12 passed in 6.41s ========================
```

### Frontend Production Build
Verify the production build using Vite:

```powershell
cd frontend
npm run build
```

**Actual Verified Results**:
```text
vite v8.3.4 building client environment for production...
transforming...
✓ 1912 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.48 kB │ gzip:  0.31 kB
dist/assets/index-r6Hif0un.css    8.63 kB │ gzip:  2.43 kB
dist/assets/index-Bsh1v1dX.js   248.80 kB │ gzip: 77.46 kB
✓ built in 1.43s
```

---

## Embedding the SDK in Any Website

Add this single `<script>` tag before the closing `</body>` tag of any HTML page:

```html
<script 
    src="http://127.0.0.1:5000/tracker/tracker.js" 
    data-api-url="http://127.0.0.1:5000/api">
</script>
```

The script automatically initializes, manages session state, captures page views, and streams click interactions asynchronously without slowing down your page.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
