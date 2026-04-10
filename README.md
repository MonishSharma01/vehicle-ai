# Vehicle AI — Run Guide

## Prerequisites

- Python 3.10+
- Node.js 18+
- npm
- Expo CLI (`npm install -g expo-cli`)

---

## 1. Backend (FastAPI)

```bash
cd d:\vehicle-ai\backend
pip install -r requirements.txt
python main.py
```

Runs on **http://localhost:8000**

---

## 2. Admin Panel (Vite + React)

```bash
cd d:\vehicle-ai\frontend\admin-panel
npm install
npm run dev
```

Runs on **http://localhost:3000**

---

## 3. Garage Dashboard (Next.js)

```bash
cd d:\vehicle-ai\frontend\garage-dashboard
npm install
npm run dev -- -p 3003
```

Runs on **http://localhost:3003**

---

## 4. User App (Expo React Native — Web)

```bash
cd d:\vehicle-ai\frontend\user-app\vehicle-app
npm install
npx expo start --web --port 8081
```

Runs on **http://localhost:8081**

---

## Demo Data (run after backend starts)

Open a terminal and run:

```powershell
Invoke-RestMethod -Method POST -Uri "http://localhost:8000/simulate/reset"
Invoke-RestMethod -Method POST -Uri "http://localhost:8000/admin/demo-seed"
```

Or with curl:

```bash
curl -X POST http://localhost:8000/simulate/reset
curl -X POST http://localhost:8000/admin/demo-seed
```

---

## All Four — Quick Start (4 separate terminals)

| Terminal | Command |
|----------|---------|
| 1 | `cd backend && python main.py` |
| 2 | `cd frontend/admin-panel && npm run dev` |
| 3 | `cd frontend/garage-dashboard && npm run dev -- -p 3003` |
| 4 | `cd frontend/user-app/vehicle-app && npx expo start --web --port 8081` |

---

## Default Ports

| Service | URL |
|---------|-----|
| Backend API | http://localhost:8000 |
| Admin Panel | http://localhost:3000 |
| Garage Dashboard | http://localhost:3003 |
| User App | http://localhost:8081 |
