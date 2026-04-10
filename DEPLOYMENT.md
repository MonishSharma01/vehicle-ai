# Vehicle AI — Backend Deployment Guide

## Architecture Overview

```
OBD2 / Simulator → TrackingAgent (monitor loop every 5 s)
                         │
                    MasterAgent orchestrates:
                         │
              ┌──────────▼──────────────────┐
              │       PredictionAgent        │  ← ML black box (sklearn)
              └──────────┬──────────────────┘
                         │
              ┌──────────▼──────────────────┐
              │         RiskAgent           │  urgency scoring
              └──────────┬──────────────────┘
                         │
              ┌──────────▼──────────────────┐
              │       DecisionAgent         │  service type
              └──────────┬──────────────────┘
                         │
              ┌──────────▼──────────────────┐
              │        PricingAgent         │  cost comparison
              └──────────┬──────────────────┘
                         │
              ┌──────────▼──────────────────┐
              │      SchedulingAgent        │  garage selection
              └──────────┬──────────────────┘
                         │
              ┌──────────▼──────────────────┐
              │       FeedbackAgent         │  2-stage gate (garage → user)
              └──────────┬──────────────────┘
                         │
              ┌──────────▼──────────────────┐
              │    booking_service           │  CREATE booking
              └──────────┬──────────────────┘
                         │
              ┌──────────▼──────────────────┐
              │      InsightsAgent          │  analytics
              │      AnomalyAgent           │  anomaly detection
              └─────────────────────────────┘
                         │
              ┌──────────▼──────────────────┐
              │    Supabase (PostgreSQL)     │  persistent storage
              └─────────────────────────────┘
```

---

## Prerequisites

- Python 3.11+
- Node.js 18+ (for frontends)
- Supabase account (free tier works)

---

## Step 1 — Set Up Supabase

1. Open [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `bxxmpuqwsubggmdciefe`
3. Go to **SQL Editor → New Query**
4. Paste the entire contents of `backend/db/schema.sql`
5. Click **Run**

All tables, indexes, RLS policies, and seed data are created in one shot.

---

## Step 2 — Install Backend Dependencies

```bash
cd d:\vehicle-ai\backend
pip install -r requirements.txt
```

---

## Step 3 — Train the ML Model (if not already trained)

```bash
cd d:\vehicle-ai\ml
python generate_data.py   # creates data/vehicle_telemetry.csv
python train_model.py     # saves saved_models/vehicle_failure_model.pkl
```

Then copy the model to where the backend expects it:

```bash
# Windows PowerShell
Copy-Item d:\vehicle-ai\ml\saved_models\vehicle_failure_model.pkl `
          d:\vehicle-ai\backend\ml\vehicle_failure_model.pkl
Copy-Item d:\vehicle-ai\ml\saved_models\label_encoder.pkl `
          d:\vehicle-ai\backend\ml\label_encoder.pkl
```

---

## Step 4 — Run the Backend

```bash
cd d:\vehicle-ai\backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend is live at: **http://localhost:8000**

Interactive docs: **http://localhost:8000/docs**

---

## Step 5 — Run the Frontends

### Garage Dashboard (Next.js)
```bash
cd d:\vehicle-ai\frontend\garage-dashboard
npm install
npm run dev
# → http://localhost:3000
```

### Admin Panel (Vite + React)
```bash
cd d:\vehicle-ai\frontend\admin-panel
npm install
npm run dev
# → http://localhost:5173
```

### User App (Expo)
```bash
cd d:\vehicle-ai\frontend\user-app\vehicle-app
npm install
npx expo start --web --port 8081
# → http://localhost:8081
```

---

## Environment Variables (Optional — Production Only)

Create `backend/.env`:

```env
SUPABASE_URL=https://bxxmpuqwsubggmdciefe.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> **Note:** If not set, the backend reads from the hard-coded defaults in  
> `backend/db/supabase_client.py`. In-memory DB is always primary — the  
> system works fully even if Supabase is unreachable.

---

## API Reference

### Core REST

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/status` | System summary |
| GET | `/vehicles` | List all vehicles |
| GET | `/garages` | List all garages |
| GET | `/requests` | List service requests |
| GET | `/bookings` | List all bookings |

### Simulation

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/simulate/force-issue/{vehicle_id}/{issue_type}` | Force ML prediction |
| DELETE | `/simulate/force-issue/{vehicle_id}` | Clear forced issue |
| POST | `/simulate/reset` | Reset in-memory DB |

Valid `issue_type` values: `battery_failure`, `engine_overheat`, `low_oil_life`, `normal`

### Garage Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/garages/{garage_id}/stats` | Daily stats |
| GET | `/garages/{garage_id}/bookings` | All garage bookings |
| GET | `/garages/{garage_id}/pending` | Next actionable booking |
| POST | `/bookings/{booking_id}/start` | Garage accepts booking |
| POST | `/bookings/{booking_id}/complete` | Mark service complete |
| POST | `/bookings/{booking_id}/cancel` | Garage rejects booking |

### User App

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/user/{vehicle_id}/status` | Full vehicle state (poll every 3 s) |
| POST | `/requests/{request_id}/user-accept` | User accepts service offer |
| POST | `/requests/{request_id}/user-decline` | User rejects service offer |
| POST | `/requests/{request_id}/rebook` | Rebook after declining |

### Feedback

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/bookings/{booking_id}/feedback` | Submit rating (1–5) + comment |
| GET | `/bookings/{booking_id}/feedback` | Get feedback for booking |

### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/insights` | Fleet analytics snapshot |
| GET | `/anomalies` | Detected system anomalies |
| GET | `/pricing/{issue_type}?urgency=HIGH` | Garage pricing comparison |

### WebSocket

| Endpoint | Protocol | Description |
|----------|----------|-------------|
| `/ws/vehicle/{vehicle_id}` | WS | User-app real-time feed (3 s interval) |
| `/ws/garage/{garage_id}` | WS | Garage dashboard feed (5 s interval) |
| `/ws/admin` | WS | Admin fleet overview (5 s interval) |

**WebSocket usage example (JavaScript):**
```js
const ws = new WebSocket("ws://localhost:8000/ws/vehicle/V001");
ws.onmessage = (e) => console.log(JSON.parse(e.data));
```

---

## Database Schema

See `backend/db/schema.sql` for the full schema.

### Tables

| Table | Description |
|-------|-------------|
| `vehicles` | Vehicle + owner info |
| `garages` | Garage info + specializations |
| `garage_pricing` | Per-garage service costs |
| `telemetry_logs` | Every telemetry reading (append-only) |
| `issues` | Service requests created by DecisionAgent |
| `bookings` | Confirmed bookings with status lifecycle |
| `booking_status` | Audit trail of status transitions |
| `feedback` | User star ratings |
| `insights` | Generated analytics snapshots |
| `agent_logs` | Agent audit trail |

---

## Complete Workflow (12 Steps)

1. **Telemetry** — Simulator/OBD2 sends data every 5 s  
2. **Prediction** — ML model predicts failure + confidence  
3. **Risk** — RiskAgent assigns urgency (CRITICAL/HIGH/MEDIUM)  
4. **Decision** — DecisionAgent determines service type  
5. **Pricing** — PricingAgent compares garage costs + urgency  
6. **Scheduling** — SchedulingAgent selects ranked garage  
7. **Garage notified** — PENDING_GARAGE; garage ACCEPT/REJECT  
   - REJECT → auto-try next ranked garage  
8. **User notified** — AWAITING_USER; user ACCEPT/REJECT  
   - REJECT → message with future cost warning + rebook option  
9. **Booking created** — Stored in-memory + Supabase  
10. **Tracking** — `PENDING_GARAGE → IN_PROGRESS → COMPLETED`  
11. **Feedback** — User submits 1–5 star rating  
12. **Insights** — InsightsAgent generates fleet analytics  

---

## Production Deployment (Railway / Render / Fly.io)

### Railway (recommended)

1. Push repo to GitHub
2. Create new Railway project → Deploy from GitHub
3. Set root directory to `backend/`
4. Set start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`

### Docker

A minimal `Dockerfile` for the backend:

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Build and run:
```bash
docker build -t vehicle-ai-backend .
docker run -p 8000:8000 \
  -e SUPABASE_URL=https://bxxmpuqwsubggmdciefe.supabase.co \
  -e SUPABASE_ANON_KEY=<your-key> \
  vehicle-ai-backend
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `ModuleNotFoundError: supabase` | `pip install supabase` |
| `Model not found at backend/ml/` | Run ML training steps (Step 3) |
| Supabase writes failing silently | Check RLS policies in Supabase dashboard |
| WebSocket disconnects | Ensure CORS `allow_origins=["*"]` in main.py |
| `uvicorn: command not found` | `pip install uvicorn[standard]` |
