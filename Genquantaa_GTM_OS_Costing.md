# Genquantaa GTM OS — Complete Product & SaaS Costing Document

> **Prepared**: October 2026
> **Version**: 1.0
> **Based on**: Full codebase audit of [backend](file:///d:/Zerokost/GTM-Agent/backend), [frontend](file:///d:/Zerokost/GTM-Agent/frontend), and [deployment config](file:///d:/Zerokost/GTM-Agent/azure_deployment_guide.md)

---

## Table of Contents

1. [Platform Feature Inventory](#1-platform-feature-inventory)
2. [Technology and Third-Party Service Map](#2-technology-and-third-party-service-map)
3. [Option A — One-Time Product Purchase](#3-option-a--one-time-product-purchase-white-label--self-hosted)
4. [Option B — SaaS Subscription Model](#4-option-b--saas-subscription-model-hosted-by-genquantaa)
5. [Variable Usage Costs (Per-Action)](#5-variable-usage-costs-per-action)
6. [Cloud Infrastructure Costs (Azure)](#6-cloud-infrastructure-costs-azure)
7. [Revenue Projections and Unit Economics](#7-revenue-projections-and-unit-economics)
8. [Comparison Summary Table](#8-comparison-summary-table)

---

## 1. Platform Feature Inventory

The following modules were identified from the complete codebase analysis:

| # | Module | Source Files | Description |
|---|--------|-------------|-------------|
| 1 | **AI Lead Discovery** | [discovery.py](file:///d:/Zerokost/GTM-Agent/backend/api/discovery.py), [discovery_engine.py](file:///d:/Zerokost/GTM-Agent/backend/lead_discovery/discovery_engine.py) | Natural-language-driven lead scraping from Google, Google Maps, company websites + ICP scoring |
| 2 | **Lead Enrichment (Apollo)** | [apollo_enrichment.py](file:///d:/Zerokost/GTM-Agent/backend/lead_discovery/apollo_enrichment.py) | Verified email/phone lookup via Apollo.io API |
| 3 | **Email Verification** | [email_finder.py](file:///d:/Zerokost/GTM-Agent/backend/lead_discovery/email_finder.py) | Self-hosted Reacher for SMTP-level email validation |
| 4 | **AI Content Generation** | [campaigns.py](file:///d:/Zerokost/GTM-Agent/backend/api/campaigns.py) | GPT-4o-mini powered content for Email, LinkedIn, WhatsApp, SMS, Voice |
| 5 | **AI Image Generation** | [image_gen.py](file:///d:/Zerokost/GTM-Agent/backend/services/image_gen.py) | HuggingFace FLUX.1-schnell for AI campaign poster generation |
| 6 | **Email Campaigns** | [campaigns.py](file:///d:/Zerokost/GTM-Agent/backend/api/campaigns.py), [email_sender.py](file:///d:/Zerokost/GTM-Agent/backend/services/email_sender.py) | Bulk personalized email campaigns via SMTP/Gmail/Outlook |
| 7 | **AI Email Personalization** | [personalization.py](file:///d:/Zerokost/GTM-Agent/backend/services/personalization.py) | GPT-4o-mini dynamic personalization per lead |
| 8 | **Email Reply Sentiment** | [sentiment.py](file:///d:/Zerokost/GTM-Agent/backend/services/sentiment.py) | AI classification of inbound replies (Positive/Negative/Neutral) |
| 9 | **Smart Inbox** | [Inbox.tsx](file:///d:/Zerokost/GTM-Agent/frontend/src/pages/app/Inbox.tsx), [email_fetcher.py](file:///d:/Zerokost/GTM-Agent/backend/services/email_fetcher.py) | Unified inbox with real-time email polling + AI sentiment tagging |
| 10 | **SMS/MMS Campaigns** | [sms_sender.py](file:///d:/Zerokost/GTM-Agent/backend/services/sms_sender.py) | Twilio-powered bulk SMS/MMS with media support |
| 11 | **AI Voice Calling** | [vapi_service.py](file:///d:/Zerokost/GTM-Agent/backend/services/vapi_service.py), [Calls.tsx](file:///d:/Zerokost/GTM-Agent/frontend/src/pages/app/Calls.tsx) | VAPI voice AI outbound calls with Twilio + transcript processing |
| 12 | **WhatsApp Bulk Campaigns** | [whatsapp.py](file:///d:/Zerokost/GTM-Agent/backend/api/whatsapp.py), [WhatsAppLogs.tsx](file:///d:/Zerokost/GTM-Agent/frontend/src/pages/app/WhatsAppLogs.tsx) | Evolution API bulk messaging with QR code connection |
| 13 | **WhatsApp Bot (24/7 Auto-Responder)** | [whatsapp_bot.py](file:///d:/Zerokost/GTM-Agent/backend/api/whatsapp_bot.py), [WhatsAppBot.tsx](file:///d:/Zerokost/GTM-Agent/frontend/src/pages/app/WhatsAppBot.tsx) | Inbound message automation with decision tree (Welcome > Yes/No > Thank You) |
| 14 | **LinkedIn Campaigns** | [campaigns.py](file:///d:/Zerokost/GTM-Agent/backend/api/campaigns.py) | AI-generated LinkedIn posts and DMs |
| 15 | **Lead Management (CRM)** | [leads.py](file:///d:/Zerokost/GTM-Agent/backend/api/leads.py), [Leads.tsx](file:///d:/Zerokost/GTM-Agent/frontend/src/pages/app/Leads.tsx) | Full lead database with status, tags, enrichment |
| 16 | **Contact Management** | [contacts.py](file:///d:/Zerokost/GTM-Agent/backend/api/contacts.py) | Separate contacts database |
| 17 | **Analytics Dashboard** | [dashboard.py](file:///d:/Zerokost/GTM-Agent/backend/api/dashboard.py), [Dashboard.tsx](file:///d:/Zerokost/GTM-Agent/frontend/src/pages/app/Dashboard.tsx) | Campaign performance, lead funnel analytics |
| 18 | **Integrations Hub** | [integrations.py](file:///d:/Zerokost/GTM-Agent/backend/api/integrations.py) | SMTP, Gmail, Outlook, LinkedIn OAuth, Twilio, WhatsApp |
| 19 | **Token-Based Billing** | [billing.py](file:///d:/Zerokost/GTM-Agent/backend/services/billing.py), [payments.py](file:///d:/Zerokost/GTM-Agent/backend/api/payments.py) | Credit system + Cashfree payment gateway |
| 20 | **Admin Panel** | [admin.py](file:///d:/Zerokost/GTM-Agent/backend/api/admin.py) | User management, integration monitoring |
| 21 | **Auth (JWT + Google SSO)** | [auth.py](file:///d:/Zerokost/GTM-Agent/backend/api/auth.py) | Registration, login, password reset, Google OAuth |
| 22 | **Background Poller (24/7)** | [background_poller.py](file:///d:/Zerokost/GTM-Agent/backend/services/background_poller.py) | Continuous email and WhatsApp message polling daemon |
| 23 | **Notifications System** | [notifications.py](file:///d:/Zerokost/GTM-Agent/backend/api/notifications.py) | In-app real-time notification system |
| 24 | **Rate Limiting and Audit Logs** | [middlewares/](file:///d:/Zerokost/GTM-Agent/backend/middlewares) | SlowAPI rate limiter + audit trail middleware |

**Total Features**: 24 distinct production-grade modules

---

## 2. Technology and Third-Party Service Map

### A. Third-Party APIs (Variable Cost — Pay Per Use)

> **Exchange Rate Used**: 1 USD = Rs 96.10 INR

| Service | Used For | Pricing Model | Estimated Cost (INR) |
|---------|----------|---------------|---------------------|
| **OpenAI GPT-4o-mini** | Content gen, personalization, sentiment, ICP scoring, prompt parsing | ~$0.15 / 1M input tokens, ~$0.60 / 1M output tokens | ~Rs 0.05 - Rs 0.30 per AI call |
| **OpenAI GPT-4o** | VAPI Voice AI assistant brain | ~$2.50 / 1M input, ~$10 / 1M output | ~Rs 1 - Rs 5 per voice call transcript |
| **VAPI.ai** | Voice call orchestration (Platform fee) | $0.05/min platform + provider pass-through | ~Rs 4.80/min (platform only) |
| **Sarvam AI (Bulbul V3)** | Indian-language TTS for voice bots | Rs 30 / 10,000 characters | ~Rs 0.003 per character |
| **Vobiz** | India cloud telephony (TRAI-compliant DIDs) | Rs 0.45 - Rs 0.65/min (INR billing, no FX risk) | ~Rs 0.45 - Rs 0.65/min |
| **Twilio** | SMS/MMS + Voice telephony (Global) | SMS: $0.0079/msg, Voice India: Rs 0.65-1.50/min | ~Rs 0.76/SMS, Rs 0.65-1.50/min |
| **Apollo.io** | Lead enrichment (email/phone lookup) | Free: 50/mo, Basic: $49/mo (5K credits) | ~Rs 0.94 per enrichment |
| **HuggingFace Inference** | AI Image Generation (FLUX.1-schnell) | Free tier: 1000 requests/day; Pro: $9/mo | Rs 0 - Rs 865/mo |
| **Google Maps API** | Place search, business discovery | $2.83 per 1000 requests (India) | ~Rs 0.27 per search |
| **Cashfree** | Payment gateway (INR) | 1.90% + Rs 3 per transaction | Per-transaction |
| **Google OAuth** | SSO Login | Free | Rs 0 |

### A.1 Voice AI Stack — Detailed Pricing Comparison

Two telephony stack options are available depending on the target market:

#### Option 1: VAPI + Twilio + ElevenLabs (Current — Global/International)

| Component | Provider | Rate | INR Equivalent |
|-----------|----------|------|---------------|
| Platform Orchestration | VAPI.ai | $0.05/min | Rs 4.81/min |
| Speech-to-Text (STT) | Deepgram (via VAPI) | ~$0.0095/min | Rs 0.91/min |
| LLM Intelligence | OpenAI GPT-4o | ~$0.03/min (avg tokens) | Rs 2.88/min |
| Text-to-Speech (TTS) | ElevenLabs (via VAPI) | ~$0.02/min | Rs 1.92/min |
| Telephony (India calls) | Twilio | Rs 0.65 - Rs 1.50/min | Rs 0.65 - Rs 1.50/min |
| Phone Number Rental | Twilio | ~$2/mo per number | Rs 192/mo per number |
| **Total Per Minute** | | | **Rs 11.17 - Rs 12.02/min** |

#### Option 2: Sarvam AI + Vobiz (Recommended — India-First, Lower Cost)

| Component | Provider | Rate | INR Equivalent |
|-----------|----------|------|---------------|
| TTS (Indian Languages) | Sarvam AI Bulbul V3 | Rs 30/10K chars (~150 chars/sec speech) | ~Rs 1.20/min |
| STT (Indian Languages) | Sarvam AI Saarika V2 | Rs 24/hour | ~Rs 0.40/min |
| LLM Intelligence | OpenAI GPT-4o-mini | ~$0.005/min | Rs 0.48/min |
| Telephony (India calls) | Vobiz | Rs 0.45 - Rs 0.65/min | Rs 0.45 - Rs 0.65/min |
| Phone Number (Indian DID) | Vobiz | Rs 200 - Rs 500/mo | Rs 200 - Rs 500/mo |
| **Total Per Minute** | | | **Rs 2.53 - Rs 2.73/min** |

> [!TIP]
> **Sarvam + Vobiz stack is 4-5x cheaper than VAPI + Twilio** for India-focused calling and supports 11+ Indian languages natively.

### A.2 Call Recording Storage Costs

> [!WARNING]
> **Call recordings are currently NOT being stored persistently.** The VAPI webhook at [campaigns.py:L1158](file:///d:/Zerokost/GTM-Agent/backend/api/campaigns.py#L1158) captures `recordingUrl` from VAPI, but this URL is a temporary VAPI-hosted link that expires after 14-30 days (depending on VAPI plan). **No download-and-store pipeline exists yet.** This must be implemented before going live with paying clients.

| Storage Option | Provider | Pricing | Notes |
|---------------|----------|---------|-------|
| **VAPI Temporary** | VAPI.ai | Free (included) | Auto-expires: 14 days (free), 30 days (Core $29/mo), 180 days (Pro $999/mo) |
| **Twilio Recording Storage** | Twilio | Free first 10K mins/mo; then $0.0005/min/mo (Rs 0.048/min/mo) | Recording creation fee: $0.0025/min (Rs 0.24/min) |
| **Azure Blob Storage** (Recommended) | Azure | Rs 1.50/GB/mo (Hot tier) | 1 min MP3 ~ 1 MB. 10K recordings/mo = ~10 GB = Rs 15/mo |
| **AWS S3** | AWS | Rs 2.30/GB/mo (Standard) | Alternative to Azure Blob |

**Recommended Architecture for Production:**
1. VAPI webhook delivers `recordingUrl` after call ends
2. Backend downloads recording from VAPI URL immediately
3. Upload to Azure Blob Storage with path: `recordings/{user_id}/{call_id}.mp3`
4. Store blob URL in MongoDB `call_logs.recording_blob_url`
5. Estimated cost: **Rs 15 - Rs 150/mo** for 1K-10K calls/month

### B. Self-Hosted Services (Fixed Cost — Infrastructure)

| Service | Docker Image | Purpose | Azure Cost |
|---------|-------------|---------|------------|
| **Evolution API** | `evoapicloud/evolution-api:v1.8.2` | WhatsApp connection and messaging | Part of Container Apps |
| **PostgreSQL 16** | `postgres:16-alpine` | Evolution API session storage | Part of Container Apps |
| **Reacher** | `reacherhq/check-if-email-exists` | Email SMTP verification | Part of Container Apps |

### C. Cloud Infrastructure (Fixed Monthly)

| Component | Azure Service | Recommended Tier | Monthly Cost (INR) |
|-----------|--------------|-------------------|-------------------|
| **Frontend** | Azure Static Web Apps | Free Tier | **Rs 0** |
| **Backend (FastAPI)** | Azure App Service (B1) | Basic B1 (1.75 GB RAM) | **Rs 1,100** |
| **Database** | Azure Cosmos DB (MongoDB API) | Serverless (400 RU/s) | **Rs 1,500 - Rs 4,000** |
| **WhatsApp + Reacher Containers** | Azure Container Apps | 1 vCPU, 2 GB each | **Rs 2,500** |
| **Domain + SSL** | Azure DNS + Let's Encrypt | — | **Rs 100** |
| **Blob Storage** (images, audio) | Azure Blob Storage | Hot tier, 10 GB | **Rs 50** |

> **Total Base Infrastructure: Rs 5,250 - Rs 7,750/month** (approx $55 - $81/month at Rs 96.10/USD)

---

## 3. Option A — One-Time Product Purchase (White-Label / Self-Hosted)

> **Client buys the entire codebase, deploys it on their own infrastructure, owns it forever.**

### Development Valuation

| Category | Details | Estimated Value (INR) |
|----------|---------|----------------------|
| **Backend (Python/FastAPI)** | 13 API modules, 14 services, discovery engine (8 files), ~250K+ lines of production code | Rs 8,00,000 |
| **Frontend (React/Vite/TailwindCSS)** | 15 full pages, layouts, responsive design, premium UI/UX | Rs 5,00,000 |
| **AI/ML Pipeline** | GPT integration, sentiment analysis, ICP scoring, prompt parsing, voice AI | Rs 4,00,000 |
| **WhatsApp Automation** | Evolution API integration, QR login, bulk campaigns, 24/7 bot engine, LID resolution | Rs 3,50,000 |
| **Voice AI System** | VAPI integration, Twilio telephony, transcript processing, AI prompt refinement | Rs 2,50,000 |
| **Auth and Admin** | JWT, Google SSO, role-based access, admin panel, rate limiting, audit logs | Rs 1,50,000 |
| **Payment System** | Cashfree integration, token economy, billing system | Rs 1,00,000 |
| **DevOps and Deployment** | Docker Compose, Azure deployment guide, CI/CD ready | Rs 50,000 |
| **Documentation and Training** | Setup guide, API docs, architecture walkthrough | Rs 50,000 |

### Pricing Tiers for Product Purchase

| Tier | What's Included | Price (INR) | Price (USD) @ Rs 96.10 |
|------|----------------|-------------|-------------|
| **Starter License** | Core platform (Discovery + Email + CRM + Dashboard). No Voice AI, no WhatsApp, no SMS. Single tenant. | **Rs 8,00,000** | **$8,325** |
| **Professional License** | Full platform including WhatsApp, SMS, Voice AI. Multi-tenant ready. 1 year of free updates. | **Rs 15,00,000** | **$15,609** |
| **Enterprise License** | Full platform + white-labeling + custom branding + source code ownership + 6 months support + training | **Rs 25,00,000** | **$26,015** |

> [!NOTE]
> Product purchase does NOT include third-party API costs. Client must bring their own OpenAI, VAPI, Twilio, and Apollo API keys.

### Recurring Costs for Self-Hosted Client

| Item | Monthly Cost (INR) |
|------|-------------------|
| Azure / AWS Infrastructure | Rs 5,000 - Rs 15,000 |
| OpenAI API (based on usage) | Rs 2,000 - Rs 20,000 |
| VAPI + Twilio (voice calls) — **OR** — Sarvam + Vobiz | Rs 2,500 - Rs 50,000 |
| Sarvam AI TTS (if using India voice stack) | Rs 500 - Rs 5,000 |
| Vobiz Telephony (if using India voice stack) | Rs 500 - Rs 10,000 |
| Apollo.io (enrichment) | Rs 0 - Rs 4,000 |
| Call Recording Storage (Azure Blob) | Rs 15 - Rs 150 |
| **Total Self-Hosted Running Cost** | **Rs 10,515 - Rs 1,04,150/mo** |

---

## 4. Option B — SaaS Subscription Model (Hosted by Genquantaa)

> **Client uses the platform as a cloud service. No deployment hassle. Pay monthly.**

### SaaS Pricing Plans

| Feature | **Starter** | **Growth** | **Pro** | **Enterprise** |
|---------|:---------:|:-------:|:----:|:----------:|
| **Monthly Price** | **Rs 2,999/mo** | **Rs 7,999/mo** | **Rs 14,999/mo** | **Rs 29,999/mo** |
| **Annual Price** (20% off) | Rs 28,790/yr | Rs 76,790/yr | Rs 1,43,990/yr | Rs 2,87,990/yr |
| AI Credits Included | 10,000 | 50,000 | 2,00,000 | Unlimited* |
| AI Lead Discovery | 500 leads/mo | 2,500 leads/mo | 10,000 leads/mo | Unlimited |
| Email Campaigns | 1,000 emails/mo | 10,000 emails/mo | 50,000 emails/mo | Unlimited |
| WhatsApp Bulk Messaging | No | 1,000 msgs/mo | 10,000 msgs/mo | Unlimited |
| WhatsApp Bot (24/7) | No | 1 bot flow | 5 bot flows | Unlimited |
| AI Voice Calls | No | No | 100 mins/mo | 500 mins/mo |
| SMS Campaigns | No | 500 SMS/mo | 5,000 SMS/mo | Unlimited |
| AI Image Generation | 20 images/mo | 100 images/mo | 500 images/mo | Unlimited |
| Smart Inbox | Yes | Yes | Yes | Yes |
| LinkedIn Campaigns | Yes | Yes | Yes | Yes |
| Lead Enrichment (Apollo) | No | 200 credits | 1,000 credits | 5,000 credits |
| Team Members | 1 user | 3 users | 10 users | Unlimited |
| Priority Support | No | Email | Email + Chat | Dedicated Manager |
| Custom Branding | No | No | No | Yes |
| API Access | No | No | Yes | Yes |
| SLA Uptime | 99% | 99.5% | 99.9% | 99.95% |

> *Unlimited = Fair usage policy applies (e.g., 1M credits/mo cap)

### Token Economy (Pay-As-You-Go Add-On)

From [billing.py](file:///d:/Zerokost/GTM-Agent/backend/services/billing.py):

| Action | Tokens Consumed | Token Price (Rs) |
|--------|:--------------:|:---------------:|
| Lead Discovery (per lead) | 1 | Rs 0.10 |
| Web Enrichment (per lead) | 3 | Rs 0.30 |
| AI Email Generation | 2 | Rs 0.20 |
| AI SMS Generation | 1 | Rs 0.10 |
| AI LinkedIn Content | 2 | Rs 0.20 |
| AI Voice Prompt | 1 | Rs 0.10 |
| Email Send | 0 (free) | Rs 0 |
| Voice Call (per minute) | 15 | Rs 1.50 |
| AI Inbox Reply | 1 | Rs 0.10 |
| AI Image Generation | 5 | Rs 0.50 |
| LinkedIn Post | 2 | Rs 0.20 |
| SMS Send | 1 | Rs 0.10 |

### Token Bundles (Top-Up Packs)

From [payments.py](file:///d:/Zerokost/GTM-Agent/backend/api/payments.py):

| Bundle | Tokens | Price (INR) | Per Token |
|--------|--------|-------------|-----------|
| **Starter Pack** | 10,00,000 (10 Lakh) | Rs 1,000 | Rs 0.001 |
| **Growth Pack** | 50,00,000 (50 Lakh) | Rs 4,000 | Rs 0.0008 |

---

## 5. Variable Usage Costs (Per-Action Breakdown)

### What Genquantaa Pays (Cost Price) vs. What User Pays (Selling Price)

| Action | Our Cost (INR) | User Pays (INR) | Gross Margin |
|--------|:--------------:|:---------------:|:-----------:|
| AI Content Generation (GPT-4o-mini) | ~Rs 0.04 | Rs 0.20 | **80%** |
| AI Email Personalization | ~Rs 0.06 | Rs 0.20 | **70%** |
| Email Sentiment Analysis | ~Rs 0.04 | Rs 0.10 | **60%** |
| ICP Lead Scoring | ~Rs 0.08 | Rs 0.30 | **73%** |
| AI Image Generation (HF) | ~Rs 0.00 (free tier) | Rs 0.50 | **100%** |
| WhatsApp Message (Evolution API) | ~Rs 0.00 (self-hosted) | Rs 0.10 | **100%** |
| Voice Call — VAPI + Twilio stack | ~Rs 11.50/min | Rs 20.00/min | **43%** |
| Voice Call — Sarvam + Vobiz stack | ~Rs 2.60/min | Rs 8.00/min | **68%** |
| Sarvam TTS (per 10K chars) | Rs 30.00 | Rs 60.00 | **50%** |
| SMS (Twilio) | ~Rs 0.76 | Rs 1.50 | **49%** |
| Apollo Enrichment | ~Rs 0.94 | Rs 2.00 | **53%** |
| Email Verification (Reacher) | ~Rs 0.00 (self-hosted) | Rs 0.10 | **100%** |
| Call Recording Storage (per call) | ~Rs 0.015 | Rs 0.50 | **97%** |

---

## 6. Cloud Infrastructure Costs (Azure)

### Monthly Infrastructure Budget (For SaaS Operator)

```
+-------------------------------------------------------------+
|                  AZURE MONTHLY COSTS                        |
+-------------------------------------------------------------+
|                                                             |
|  Frontend (Static Web Apps)          Rs      0   (Free)     |
|  Backend (App Service B1)            Rs  1,100              |
|  Database (Cosmos DB Serverless)     Rs  2,500              |
|  Container Apps (Evo API + Reacher)  Rs  2,500              |
|  Blob Storage (media/images)         Rs     50              |
|  DNS + SSL                           Rs    100              |
|  Monitoring (App Insights)           Rs    200              |
|                                                             |
|  ---------------------------------------------------       |
|  TOTAL (Low Usage / Startup)         Rs  6,450/mo           |
|                                                             |
|  ---------------------------------------------------       |
|  TOTAL (Medium / 100 Users)          Rs 12,000/mo           |
|  (B2 App Service + S1 Cosmos)                               |
|                                                             |
|  ---------------------------------------------------       |
|  TOTAL (High / 500+ Users)           Rs 35,000/mo           |
|  (P1v2 App Service + autoscale)                             |
|                                                             |
+-------------------------------------------------------------+
```

### Scaling Estimates

| Users | Monthly Infra Cost | API Costs (est.) | Total COGS | Revenue (avg) | Net Margin |
|-------|-------------------|------------------|-----------|---------------|------------|
| **10** | Rs 6,450 | Rs 2,000 | Rs 8,450 | Rs 29,990 | **72%** |
| **50** | Rs 8,000 | Rs 15,000 | Rs 23,000 | Rs 1,49,950 | **85%** |
| **100** | Rs 12,000 | Rs 40,000 | Rs 52,000 | Rs 2,99,900 | **83%** |
| **500** | Rs 35,000 | Rs 2,00,000 | Rs 2,35,000 | Rs 14,99,500 | **84%** |

---

## 7. Revenue Projections and Unit Economics

### Year 1 SaaS Revenue Projection (Conservative)

| Quarter | New Users | Cumulative Users | MRR (INR) | ARR (INR) |
|---------|-----------|-----------------|-----------|-----------|
| Q1 | 15 | 15 | Rs 44,985 | Rs 5,39,820 |
| Q2 | 25 | 40 | Rs 1,19,960 | Rs 14,39,520 |
| Q3 | 40 | 80 | Rs 2,39,920 | Rs 28,79,040 |
| Q4 | 50 | 130 | Rs 3,89,870 | Rs 46,78,440 |

> Assumes average revenue per user (ARPU) of ~Rs 2,999/mo (Starter plan)

### Year 1 Product Sale Revenue Projection

| Quarter | Licenses Sold | Revenue (INR) |
|---------|--------------|---------------|
| Q1 | 1 Professional | Rs 15,00,000 |
| Q2 | 1 Enterprise | Rs 25,00,000 |
| Q3 | 2 Professional | Rs 30,00,000 |
| Q4 | 1 Enterprise + 1 Starter | Rs 33,00,000 |
| **Year Total** | **6 licenses** | **Rs 1,03,00,000** |

---

## 8. Comparison Summary Table

| Criteria | Product Purchase | SaaS Subscription |
|----------|:-------------------:|:-------------------:|
| **Upfront Cost** | Rs 8L - Rs 25L | Rs 0 |
| **Monthly Cost** | Rs 12K - Rs 89K (self-hosted + APIs) | Rs 2,999 - Rs 29,999 |
| **Time to Deploy** | 2-4 weeks (client deploys) | Instant (sign up and go) |
| **Customization** | Full source code access | Limited to config |
| **Updates** | Manual / Annual license | Automatic, always latest |
| **Support** | Limited (6-12 months) | Included in plan |
| **Data Ownership** | 100% client-owned | On Genquantaa servers |
| **Scalability** | Client manages | Auto-managed |
| **Best For** | Enterprises, agencies, tech-savvy teams | SMBs, startups, non-tech teams |

---

> [!IMPORTANT]
> ### Key Pricing Notes
> 1. All prices are in **INR (Rs)** unless otherwise noted. **USD conversion at Rs 96.10** (as of October 2026).
> 2. Third-party API costs (OpenAI, VAPI, Sarvam, Vobiz, Twilio, Apollo) are **variable** and depend entirely on usage volume.
> 3. WhatsApp messaging via Evolution API is **zero marginal cost** (self-hosted), making it the most profitable channel.
> 4. AI Image Generation via HuggingFace free tier has **zero API cost** up to 1,000 images/day.
> 5. The token economy creates a **built-in upsell mechanism** — users naturally buy more credits as their outreach scales.
> 6. **Sarvam + Vobiz** is the recommended voice stack for India-focused clients (4-5x cheaper, TRAI-compliant, 11+ Indian languages).
> 7. **VAPI + Twilio** is recommended for international/global calling use cases.

> [!WARNING]
> ### Action Required — Call Recording Storage
> Call recordings are **NOT currently being persisted**. The VAPI webhook captures a temporary `recordingUrl` but it expires in 14-30 days. Before going live, implement a download-and-store pipeline to Azure Blob Storage. Estimated development effort: 4-6 hours. See Section 2.A.2 for storage cost details.

> [!TIP]
> ### Recommended Client Pitch
> - **For startups/SMBs**: Push the **Growth SaaS plan** at Rs 7,999/mo — it includes WhatsApp + Email + SMS + CRM, covers 90% of use cases.
> - **For agencies**: Pitch the **Enterprise License** at Rs 25L — they white-label it and resell to their own clients at 5-10x markup.
> - **For funded companies**: Offer **Pro SaaS** at Rs 14,999/mo — the AI Voice Calling + WhatsApp Bot combo is a unique differentiator no competitor offers at this price.
> - **For India-only clients**: Highlight the **Sarvam + Vobiz voice stack** — INR billing, no forex risk, TRAI-compliant DIDs, and Rs 2.60/min vs Rs 11.50/min with VAPI+Twilio.
