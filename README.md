..﻿# 🚀 Genquantaa GTM OS — AI-Powered Go-To-Market Platform

> An AI-driven, multi-channel sales automation platform featuring lead discovery, voice calling (VAPI), WhatsApp messaging (Evolution API), email campaigns, and a Cashfree payment gateway.

---
..
## 📋 Table of Contents
,
1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Prerequisites](#prerequisites)
5. [Local Development Setup](#local-development-setup)
6. [Environment Variables Reference](#environment-variables-reference).
7. [Production Deployment (Azure)](#production-deployment-azure)
8. [API Endpoints Reference](#api-endpoints-reference)
9. [Troubleshooting](#troubleshooting)

---

## Project Overview

Genquantaa GTM OS is a full-stack SaaS platform for B2B sales teams. It automates:

- 🔍 **AI Lead Discovery** — finds leads from Google Maps, web search, and Apollo.io
- 📞 **Voice Campaigns** — AI voice calls via VAPI
- 💬 **WhatsApp Campaigns** — automated messaging via Evolution API
- 📧 **Email Campaigns** — SMTP-based outreach with email verification (Reacher)
- 💳 **Billing & Credits** — subscription management via Cashfree Payment Gateway
- 📊 **Dashboard & Analytics** — real-time campaign and lead analytics

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, TypeScript, TailwindCSS |
| **Backend** | Python 3.11, FastAPI, Uvicorn |
| **Database** | MongoDB (via Motor async driver) |
| **AI / LLM** | Groq (LLaMA), Hugging Face (FLUX image gen) |
| **Voice AI** | VAPI |
| **WhatsApp** | Evolution API (Docker) |
| **Email Verify** | Reacher (Docker) |
| **Payments** | Cashfree Payment Gateway (INR) |
| **Auth** | JWT, Google OAuth, LinkedIn OAuth |
| **Lead Enrichment** | Apollo.io, Google Maps API |

---

## Project Structure

```
GTM-Agent/
├── backend/
│   ├── app/
│   │   └── main.py           # FastAPI app entry point
│   ├── api/                  # All route handlers
│   │   ├── auth.py
│   │   ├── campaigns.py
│   │   ├── discovery.py
│   │   ├── leads.py
│   │   ├── contacts.py
│   │   ├── payments.py
│   │   ├── whatsapp.py
│   │   ├── integrations.py
│   │   ├── dashboard.py
│   │   ├── admin.py
│   │   └── notifications.py
│   ├── services/             # Business logic
│   │   ├── cashfree.py
│   │   └── vapi_service.py
│   ├── lead_discovery/       # AI lead discovery engine
│   ├── schemas/              # Pydantic models
│   ├── middlewares/          # Audit logging, rate limiting
│   ├── config.py             # All settings (from .env)
│   ├── database.py           # MongoDB connection
│   ├── requirements.txt
│   └── .env                  # YOU CREATE THIS (see below)
│
└── frontend/
    ├── src/
    │   ├── pages/
    │   ├── components/
    │   └── App.tsx
    ├── package.json
    └── vite.config.ts
```

---

## Prerequisites

| Tool | Version | Download |
|---|---|---|
| **Node.js** | v18+ | https://nodejs.org |
| **Python** | 3.11+ | https://python.org |
| **Docker Desktop** | Latest | https://docker.com |
| **Git** | Latest | https://git-scm.com |

---

## Local Development Setup

### Step 1 — Clone the Repository

```bash
git clone https://github.com/RaJM2004/GTM-Agent.git
cd GTM-Agent
git checkout fresh-codebase
```

---

### Step 2 — Configure Environment Variables

```bash
cd backend
copy .env.example .env
```

Open `.env` and fill in all values. See the **Environment Variables Reference** section below.

> ⚠️ Never commit the `.env` file to Git. It is already in `.gitignore`.

---

### Step 3 — Start Supporting Docker Services

Open **Terminal 1** — Reacher (Email Verification):
```bash
docker run -p 8080:8080 reacherhq/check-if-email-exists
```

Open **Terminal 2** — Evolution API (WhatsApp):
```bash
docker run -p 8082:8080 ^
  -e AUTHENTICATION_TYPE=apikey ^
  -e AUTHENTICATION_API_KEY=gtm_super_secret_global_key ^
  -e AUTHENTICATION_EXPOSE_IN_ENV=true ^
  evoapicloud/evolution-api:v1.8.2
```

Leave both terminals open and running.

---

### Step 4 — Start the Backend (FastAPI)

Open **Terminal 3**:

```bash
cd backend

# Create virtual environment (first time only)
python -m venv venv

# Activate on Windows:
.\venv\Scripts\activate

# Activate on Mac/Linux:
# source venv/bin/activate

# Install dependencies (first time only)
pip install -r requirements.txt

# Start the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- ✅ Backend API: http://localhost:8000
- 📖 Swagger Docs: http://localhost:8000/docs
- ❤️ Health Check: http://localhost:8000/health

---

### Step 5 — Start the Frontend (React/Vite)

Open **Terminal 4**:

```bash
cd frontend
npm install
npm run dev
```

✅ Frontend: http://localhost:5173

---

### Summary — All Running Services

| Terminal | Service | URL |
|---|---|---|
| Terminal 1 | Reacher (Email Verify) | http://localhost:8080 |
| Terminal 2 | Evolution API (WhatsApp) | http://localhost:8082 |
| Terminal 3 | FastAPI Backend | http://localhost:8000 |
| Terminal 4 | React Frontend | http://localhost:5173 |

---

## Environment Variables Reference

Create `backend/.env` with the following:

```env
# ─── AI / LLM ─────────────────────────────────
# Groq API Key — LLaMA-based AI features
# Get free at: https://console.groq.com
GROQ_API_KEY=your_groq_api_key_here

# Hugging Face Token — FLUX image generation
# Get free at: https://huggingface.co/settings/tokens
HF_TOKEN=your_huggingface_token_here

# ─── LEAD DISCOVERY ───────────────────────────
# Google Maps / Places API Key
# Get at: https://console.cloud.google.com → APIs & Services → Credentials
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# SerpAPI Key — Google Search scraping (optional)
# Get free at: https://serpapi.com
SERPAPI_KEY=

# Apollo.io API Key — contact enrichment
# Get at: https://app.apollo.io/#/settings/integrations/api
APOLLO_API_KEY=your_apollo_api_key_here

# ─── DATABASE ─────────────────────────────────
# MongoDB Atlas connection string
# Get at: https://cloud.mongodb.com → Cluster → Connect → Drivers
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?appName=GTM

# ─── AUTHENTICATION ───────────────────────────
JWT_SECRET_KEY=change_this_to_a_long_random_secret_string
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
RESET_TOKEN_EXPIRE_HOURS=1

# Google OAuth — https://console.cloud.google.com → APIs → Credentials
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret

# LinkedIn OAuth — https://www.linkedin.com/developers/apps
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret

# ─── SERVER ───────────────────────────────────
HOST=0.0.0.0
PORT=8000
DEBUG=true
FRONTEND_URL=http://localhost:5173

# ─── VAPI (Voice AI Calling) ──────────────────
# Get at: https://dashboard.vapi.ai → API Keys
VAPI_API_KEY=your_vapi_api_key_here
VAPI_ASSISTANT_ID=your_vapi_assistant_id_here
# For local testing, use ngrok: ngrok http 8000
VAPI_WEBHOOK_URL=https://your-ngrok-url.ngrok-free.app/vapi-webhook

# ─── EMAIL VERIFICATION (Reacher Docker) ──────
REACHER_API_URL=http://localhost:8080

# ─── PAYMENT GATEWAY (Cashfree) ───────────────
# Get at: https://merchant.cashfree.com → Developers → API Keys
CASHFREE_APP_ID=your_cashfree_app_id
CASHFREE_SECRET_KEY=your_cashfree_secret_key
# PRODUCTION for live payments | SANDBOX for testing
CASHFREE_ENVIRONMENT=PRODUCTION

# ─── WHATSAPP (Evolution API Docker) ──────────
EVOLUTION_API_URL=http://localhost:8082
EVOLUTION_API_KEY=gtm_super_secret_global_key
```

---

## Production Deployment (Azure)

### Architecture Overview

| Component | Azure Service | Notes |
|---|---|---|
| React Frontend | Azure Static Web Apps (Free) | Auto-builds from GitHub, global CDN |
| FastAPI Backend | Azure App Service (Python) | Native Python, easy SSL & scaling |
| MongoDB | MongoDB Atlas or Cosmos DB | Serverless option available |
| Reacher | Azure Container Instances (ACI) | Stateless Docker container |
| Evolution API | Azure Container Instances (ACI) | Requires persistent Azure File Share volume |

---

### Step 1 — Deploy Docker Services (ACI)

#### A. Deploy Reacher (Email Verification)

1. Azure Portal → search **Container Instances** → **Create**
2. Configure:
   - **Image**: `reacherhq/check-if-email-exists:latest`
   - **Port**: `8080`
3. Deploy. Copy the FQDN/IP — use as `REACHER_API_URL` in backend env.

#### B. Deploy Evolution API (WhatsApp)

WhatsApp sessions need persistent storage to survive restarts.

1. Create a **Storage Account** → create a **File Share** named `evolution-data`
2. Create a **Container Instance**:
   - **Image**: `evoapicloud/evolution-api:v1.8.2`
   - **Port**: `8080`
   - **Environment Variables**:
     - `AUTHENTICATION_TYPE` = `apikey`
     - `AUTHENTICATION_API_KEY` = `gtm_super_secret_global_key`
     - `AUTHENTICATION_EXPOSE_IN_ENV` = `true`
   - **Volumes (Advanced)**: Mount File Share → `/app/instances`
3. Deploy. Copy the FQDN — use as `EVOLUTION_API_URL` in backend env.

---

### Step 2 — Deploy the Database

> Skip if already using MongoDB Atlas.

1. Azure Portal → **Azure Cosmos DB for MongoDB** → Create
2. Choose **Serverless** pricing
3. After creation → **Connection Strings** → copy the Primary Connection String
4. Use as `MONGODB_URI` in backend env.

---

### Step 3 — Deploy the Backend (App Service)

1. Azure Portal → **Web App** → Create:
   - **Runtime**: Python 3.11
   - **OS**: Linux
   - **Startup command**: `uvicorn app.main:app --host 0.0.0.0 --port 8000`

2. **Settings → Configuration → Application Settings** → add all `.env` variables.  
   Update these for cloud:

   | Variable | New Cloud Value |
   |---|---|
   | `REACHER_API_URL` | `http://<reacher-aci-fqdn>:8080` |
   | `EVOLUTION_API_URL` | `http://<evo-aci-fqdn>:8080` |
   | `FRONTEND_URL` | `https://<your-app>.azurestaticapps.net` |
   | `DEBUG` | `false` |
   | `VAPI_WEBHOOK_URL` | `https://<backend>.azurewebsites.net/vapi-webhook` |

3. **Deployment Center** → link GitHub repo → branch: `fresh-codebase` → Deploy.

Backend live at: `https://<app-name>.azurewebsites.net`

---

### Step 4 — Deploy the Frontend (Static Web Apps)

1. Azure Portal → **Static Web App** → Create → **Free tier**
2. Link GitHub → select `GTM-Agent` repo
3. Build settings:
   - **App location**: `/frontend`
   - **Output location**: `dist`
   - **Build preset**: React
4. Add environment variable:
   - `VITE_API_URL` = `https://<your-backend>.azurewebsites.net`
5. Deploy. Azure creates a GitHub Action that auto-deploys on every push!

Frontend live at: `https://<name>.azurestaticapps.net`

---

### Step 5 — Update Webhooks

After deployment, update webhook URLs in external dashboards:

| Service | Dashboard | URL to Set |
|---|---|---|
| **VAPI** | https://dashboard.vapi.ai | `https://<backend>.azurewebsites.net/vapi-webhook` |
| **Cashfree** | https://merchant.cashfree.com | `https://<backend>.azurewebsites.net/api/payments/webhook` |

---

## API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check — shows configured services |
| `GET` | `/docs` | Interactive Swagger documentation |
| `POST` | `/auth/register` | Register a new user |
| `POST` | `/auth/login` | Login and get JWT tokens |
| `GET` | `/discovery/search` | Run AI lead discovery |
| `GET` | `/leads` | List all discovered leads |
| `GET` | `/campaigns` | List all campaigns |
| `POST` | `/campaigns` | Create a new campaign |
| `POST` | `/payments/create-order` | Create a Cashfree payment order (INR) |
| `POST` | `/payments/webhook` | Cashfree payment webhook |
| `GET` | `/dashboard/stats` | Dashboard analytics |
| `POST` | `/vapi-webhook` | VAPI voice call webhook |

---

## Troubleshooting

### Backend won't start
- Ensure virtual environment is activated: `.\venv\Scripts\activate`
- Ensure `.env` file exists in `backend/` folder
- Re-run: `pip install -r requirements.txt`

### Email verification fails ("Server disconnected")
- Your ISP is blocking **Port 25** — expected on home internet
- For production, host Reacher on a cloud VPS where port 25 is open (Hetzner, DigitalOcean, etc.)

### WhatsApp not connecting
- Check Evolution API Docker container is running on port `8082`
- Scan the QR code from the Evolution API dashboard to link WhatsApp

### Cashfree payments failing
- Check `CASHFREE_APP_ID` and `CASHFREE_SECRET_KEY` in `.env`
- Use `CASHFREE_ENVIRONMENT=SANDBOX` for testing, `PRODUCTION` for live
- All amounts are in **INR (₹)** — no conversion needed

### CORS errors in browser
- `FRONTEND_URL` in backend `.env` must exactly match your frontend URL
- In production, update `allow_origins` in `backend/app/main.py`

### VAPI webhook not triggering
- For local dev, use ngrok: `ngrok http 8000`
- Paste the ngrok URL into `VAPI_WEBHOOK_URL` in `.env`
- Update the webhook URL in your VAPI dashboard

---

> 💡 **Need help?** Open an issue on [GitHub](https://github.com/RaJM2004/GTM-Agent) or contact the Genquantaa team.
