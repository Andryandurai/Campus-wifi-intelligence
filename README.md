# Campus Wi-Fi Intelligence System
> **Data-Driven Network Usage Analytics, Peak Detection, Anomaly Detection, Location Clustering, Congestion Prediction & 3D Campus Heatmap**  
> *Principles of Data Science (PDS) — Rajalakshmi Engineering College (REC)*

---

## 1. Executive Summary & One-Line Pitch

> **"A data-science system that learns how our campus uses Wi-Fi, spots trouble before students notice it, and tells the IT team exactly where and when to act — using only anonymized, aggregated data."**

The **Campus Wi-Fi Intelligence System** shifts campus network management from reactive troubleshooting (waiting for complaints) to proactive, evidence-based planning.

---

## 2. Core Modules & Data Science Techniques

| # | Module | Type | Primary Techniques & Models |
|---|---|---|---|
| **1** | **Campus Wi-Fi Usage Analytics** | Core | Exploratory Data Analysis (EDA), Descriptive Statistics (Mean, Median, Std, P90), Pearson Correlation Matrix, Hourly Heatmap |
| **2** | **Peak Usage Detection** | Core | Time-series aggregation, Percentile Thresholding (P90 & Util ≥ 80%), Recurrence Ranking across weeks |
| **3** | **3-Way Anomaly Detection** | Core | Contextual Z-Score ($|z| > 3.0$), Contextual IQR Fencing, Multivariate Isolation Forest, 3-method Ensemble Voting & Precision/Recall vs ground truth |
| **4** | **Location Clustering** | Core | Feature Scaling (StandardScaler), K-Means ($k=4$), Silhouette Score ($0.49$), 3D PCA Projection in Three.js |
| **5** | **Congestion Prediction** | Core | Supervised Classification: Random Forest (150 trees) vs Logistic Regression baseline, 15-min ahead forecast, ROC-AUC ($0.941$), Feature Importances |
| **6** | **Campus Heatmap & 3D Twin** | Core | Interactive **Three.js 3D Campus Digital Twin** + 2D Spatial Schematic (Figure 4) with AP drill-down |
| **7** | **Network Health Index** | Supporting | Explainable composite formula: $\text{Health} = 0.30 \cdot U + 0.25 \cdot L + 0.20 \cdot P + 0.15 \cdot A + 0.10 \cdot C$ |
| **8** | **IT Recommendation Engine** | Supporting | Rule-based prescriptive actions with interactive workflow status (*Pending*, *In Progress*, *Applied*) |

---

## 3. Technology Stack

- **Backend**: Python 3.14 / Flask, Pandas, NumPy, Scikit-learn, Joblib
- **Database**: SQLite (`campus_wifi.db`) with WAL mode and parameterized queries
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons
- **State & Data Fetching**: TanStack React Query v5, Axios with JWT request interceptors
- **3D Visualization**: **Three.js** (3D Architectural Campus Digital Twin with pulsing Wi-Fi radiation waves & 3D PCA Scatter Plot)
- **Design & Theme**: Minimalist White & Muted White (`#FAFAFA`, `#FFFFFF`, `#F8FAFC`), Black text (`#09090B`), subtle borders (`#E2E8F0`), and **Roboto** typography.

---

## 4. Built-In Security Features

1. **Authentication & Authorization**:
   - JWT (JSON Web Tokens) with HS256 signature and 24-hour expiration.
   - Salted password hashing via `werkzeug.security` (`generate_password_hash` & `check_password_hash`).
   - Role-Based Access Control (`admin`, `network_engineer`, `viewer`).
2. **Sliding-Window Rate Limiting**:
   - In-memory rate limiter restricting requests per IP (default 200 req/min) to prevent brute-force and DoS.
3. **SQL Injection Prevention**:
   - All database queries use parameterized SQL execution (`?` placeholders).
4. **Privacy-by-Design Verification**:
   - Automated validator ensuring telemetry datasets never contain personally identifiable data (MAC addresses, individual user IPs, student IDs, emails).
5. **Security Response Headers**:
   - `Content-Security-Policy` (CSP)
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: DENY`
   - `X-XSS-Protection: 1; mode=block`
   - `Referrer-Policy: strict-origin-when-cross-origin`
6. **Cross-Origin Resource Sharing (CORS)**:
   - Configured origin matching and credential support.

---

## 5. One-Click Quickstart Guide

### Option A: Automated Single Script (Recommended)
From the `campus-wifi-intelligence` directory, run:
```bash
./start.sh
```
This automatically starts:
- Flask Backend at `http://127.0.0.1:5000`
- Vite React Frontend at `http://localhost:5173`

---

### Option B: Manual Step-by-Step

#### 1. Backend Setup:
```bash
cd backend
source venv/bin/activate
python app.py
```
*(On first startup, the application automatically bootstraps and populates the SQLite database with 39,000+ realistic 15-minute telemetry records and executes the data pipeline).*

#### 2. Run Backend Unit Tests:
```bash
cd backend
./venv/bin/python -m unittest tests/test_api.py
```

#### 3. Frontend Setup:
```bash
cd frontend
export PATH="/home/chandhru/.nvm/versions/node/v24.14.0/bin:$PATH"
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 6. Demo Evaluator Credentials

You can log in directly using the "One-Click Evaluator Access" buttons in the Sign In modal or with:

| Role | Username | Password | Permissions |
|---|---|---|---|
| **Campus IT Director** | `admin` | `AdminPass2026!` | Full Admin & Pipeline Execution |
| **NOC Network Engineer** | `operator` | `NetworkOps2026!` | Model Retraining & Recommendation Updates |
| **Academic Reviewer** | `viewer` | `ViewerREC2026!` | Read-only analytics & 3D views |

---

## 7. Project Structure

```
campus-wifi-intelligence/
├── backend/
│   ├── app.py                      # Main Flask application & REST endpoints
│   ├── config.py                   # System configuration & security thresholds
│   ├── database.py                 # SQLite schema & database initialization
│   ├── security.py                 # JWT, password hashing, rate limiting, privacy checks
│   ├── campus_layout.json          # 3D block coordinates and physical dimensions
│   ├── requirements.txt            # Python dependencies
│   ├── services/
│   │   ├── data_generator.py       # Realistic campus dataset & ground-truth anomalies
│   │   ├── analytics_service.py    # EDA, descriptive stats, correlations, hourly matrix
│   │   ├── peaks_service.py        # Peak usage detection & recurrence ranking
│   │   ├── anomaly_service.py      # Z-Score, IQR, Isolation Forest, ensemble voting
│   │   ├── clustering_service.py   # K-Means, 4 zones, 3D PCA projection
│   │   ├── prediction_service.py   # Random Forest & Logistic Regression classification
│   │   ├── health_service.py       # 5-factor Network Health Index formula
│   │   └── recommendation_service.py # Rule-based actionable IT advice
│   └── tests/
│       └── test_api.py             # Unit tests for health, KPIs, auth, privacy, 3D layout
├── frontend/
│   ├── index.html                  # HTML template with Roboto & Roboto Mono fonts
│   ├── package.json                # React, Vite, TanStack Query, Axios, Three.js
│   ├── tailwind.config.js          # White / muted white theme styling
│   └── src/
│       ├── components/
│       │   ├── ThreeCampusViewer.tsx  # 3D Campus Digital Twin in Three.js
│       │   ├── ThreeClusterViewer.tsx # 3D PCA K-Means cluster scatter in Three.js
│       │   ├── Navbar.tsx             # Header with health score & tabs
│       │   ├── KpiCard.tsx            # Clean metric card
│       │   ├── HealthScoreWidget.tsx  # 5-factor explainable health breakdown
│       │   ├── AuthModal.tsx          # JWT login & quick demo access
│       │   └── ui/                    # shadcn-style Card, Badge, Button, Tabs, Modal, etc.
│       ├── pages/
│       │   ├── OverviewPage.tsx       # Executive dashboard with embedded 3D twin
│       │   ├── AnalyticsPage.tsx      # Time x Location matrix & Pearson correlations
│       │   ├── PeakAnalysisPage.tsx   # Peak windows & recurrence ranking
│       │   ├── AnomaliesPage.tsx      # 3-method anomaly detection & evaluation
│       │   ├── ClusteringPage.tsx     # 4 Campus zones & 3D PCA scatter
│       │   ├── CongestionPredictionPage.tsx # RF vs LogReg metrics & 15-min forecast
│       │   ├── CampusHeatmapPage.tsx  # 3D & 2D spatial heatmap with AP drill-down
│       │   └── RecommendationsPage.tsx# Actionable IT advice & status workflow
│       ├── services/api.ts            # Axios instance with JWT interceptor
│       ├── context/AuthContext.tsx    # User session management
│       ├── types/index.ts             # TypeScript interfaces
│       ├── App.tsx                    # Root React component
│       ├── main.tsx                   # React DOM entry point
│       └── index.css                  # Tailwind styles
├── start.sh                        # One-command dual server launcher
└── README.md                       # Comprehensive documentation
```

