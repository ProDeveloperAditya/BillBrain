# BillBrain AI

**AI-powered personal-finance intelligence.** Upload your bank statements and BillBrain maps your
spending, hunts down forgotten subscriptions, detects six patterns of avoidable "money leaks," and
answers plain-English questions about your money — grounded in your real transaction data.

> Built with Next.js 16 (App Router), TypeScript, PostgreSQL + Prisma, Auth.js v5, and a pluggable
> AI layer (OpenAI / Groq / offline demo). Indigo-violet "neobank" dark UI.

---

## ✨ Features

| Module | What it does |
| --- | --- |
| **Dashboard** | KPIs (total spend, MoM trend, avoidable spend, savings score), spend-trend area chart, category donut, weekly pattern. |
| **Subscription Hunter** | Detects every recurring charge with a 100-point confidence score; flags price hikes and dormant ("forgotten") subscriptions. |
| **Money-Leak Detector** | Six behavioural patterns: late-night food delivery, convenience clusters, subscription stacks, category spikes, duplicate payments, impulse e-commerce — each annualised and ranked. |
| **AI Assistant** | RAG-grounded chat over your own transactions. Pluggable providers (OpenAI / Groq / demo) with automatic fallback. |
| **Multi-format Import** | Parses CSV, PDF, SMS alerts and email receipts → normalises merchants → auto-tags categories → detects duplicates. |
| **Insights** | Rule-based weekly digest, anomalies, savings opportunities and category-spike alerts. |

## 🧱 Tech Stack

- **Framework:** Next.js 16 (App Router, Server Components, Server Actions) + TypeScript
- **UI:** Tailwind CSS v4, shadcn/ui (`@base-ui`), Recharts, Framer Motion, IBM Plex Sans
- **Data:** PostgreSQL + Prisma ORM (18 models)
- **Auth:** Auth.js v5 (credentials, JWT sessions)
- **AI:** OpenAI / Groq SDKs with a demo provider fallback + RAG context builder

---

## 🚀 Deploy for free (always-on, $0, no credit card)

This stack costs nothing and stays online:

| Concern | Service | Free? |
| --- | --- | --- |
| Hosting | **Vercel** (Hobby) | ✅ no card, always-on serverless |
| Database | **Neon** Postgres | ✅ no card, auto-resumes on each request |
| AI (optional) | **Groq** | ✅ genuinely free tier, no card |

### 1. Database — Neon (2 min)
1. Sign up at **https://neon.tech** → create a project (region closest to you).
2. Open **Connection Details** and copy the **Direct connection** string (host does **not**
   contain `-pooler`). Ensure it ends with `?sslmode=require`.

### 2. Push the repo to GitHub
```bash
git add -A && git commit -m "BillBrain: deploy-ready"
gh repo create billbrain --public --source=. --push     # or create the repo in the GitHub UI
```

### 3. Deploy — Vercel (3 min)
1. Sign up at **https://vercel.com** with GitHub → **Add New… → Project** → import the repo.
2. Before clicking Deploy, add **Environment Variables**:

   | Name | Value |
   | --- | --- |
   | `DATABASE_URL` | your Neon direct connection string |
   | `AUTH_SECRET` | run `npx auth secret` or `openssl rand -base64 32` |
   | `NEXTAUTH_SECRET` | same value as `AUTH_SECRET` |
   | `AI_PROVIDER` | `demo` (or `groq` if you add a key below) |
   | `GROQ_API_KEY` | *(optional)* free key from https://console.groq.com/keys |

3. Click **Deploy**. Vercel runs `vercel-build`, which auto-generates the Prisma client and applies
   migrations (`prisma migrate deploy`) to your Neon DB.

### 4. Seed the demo data (1 min, one time)
From your machine, point at the same Neon DB and seed:
```bash
# .env (local) — set DATABASE_URL to the Neon string, then:
npm install
npm run db:seed
```
This creates the demo account below with 4 months of realistic transactions.

### 5. Log in
Open your Vercel URL and sign in:

> **Email:** `demo@billbrain.ai`  **Password:** `demo1234`

…or click **Get Started** to create your own account (it begins empty, then walks you through
onboarding — you can import a CSV or start with sample data).

> **Note on Neon free tier:** the database compute auto-suspends after a few minutes idle and
> auto-resumes on the next request (~0.5 s cold start). It is always reachable — there is nothing to
> keep awake and nothing to pay.

---

## 🛠️ Local development

```bash
cp .env.example .env          # fill in DATABASE_URL + AUTH_SECRET (Neon works locally too)
npm install
npm run db:migrate            # apply schema to your DB
npm run db:seed               # load demo data (optional)
npm run dev                   # http://localhost:3000
```

### Useful scripts
| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build (local; no DB needed) |
| `npm run db:migrate` | Apply migrations (`prisma migrate deploy`) |
| `npm run db:seed` | Load the demo dataset |
| `npm run db:reset` | Drop + re-create + re-seed (destructive) |

---

## 🔌 AI providers

The assistant works with **zero configuration** in demo mode (canned, structured responses — no key,
no cost). To enable real AI for free, add a `GROQ_API_KEY` and set `AI_PROVIDER=groq`. OpenAI is also
supported via `OPENAI_API_KEY`. The provider factory auto-selects the first available key.

## 📁 Project structure
```
app/            App Router routes (auth, onboarding, dashboard, assistant, imports, …)
  (app)/        Authenticated route group (AppShell)
  actions/      Server actions (auth, imports, onboarding, settings)
  api/          Route handlers (chat, import, export, insights)
components/     UI primitives + per-feature client components
lib/
  analytics/    Dashboard, leak detector, recurring detector, insight generator
  parsers/      CSV / PDF / SMS / email parsers
  normalization/Merchant + category + duplicate pipeline
  ai/           Provider factory (OpenAI / Groq / demo)
  rag/          Retrieval context builder for the assistant
prisma/         Schema, migrations, demo seed
```

---

_BillBrain provides informational insights only, not professional financial advice._
