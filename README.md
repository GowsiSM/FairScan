# FairScan

**Detect and fix bias in AI decision making datasets. No machine learning knowledge required.**

> Built for Google Solution Challenge 2026 · Unbiased AI Decision track  
> Team: **Roller Skates** 

---

## What is FairScan?

AI systems decide who gets hired, who gets a loan, who receives medical care. When these systems are trained on historically unfair data, they silently repeat and amplify discrimination.

Tools that detect this bias like IBM AIF360 require deep ML expertise. A hiring manager or compliance officer cannot use them.

**FairScan is the accessibility layer.** Upload a CSV, get a plain English bias report, fix it in one click.

---

## How It Works

```
Upload CSV  ->  Configure columns  ->  Detect bias  ->  View report  ->  Fix and download
```

**Step 1: Upload**
Drop any CSV dataset. Hiring decisions, loan approvals, or healthcare records. Pick a demo dataset to try instantly without uploading anything.

**Step 2: Configure**
Select your sensitive attribute (e.g. gender, race), outcome column (e.g. hired), and group values. Gemini AI auto-suggests the right columns for you.

**Step 3: Detect**
The backend computes three fairness metrics using IBM AIF360 and translates them into plain English. Example: *"Women are 36% less likely to be hired."* A Fairness Score (0 to 100) summarizes the result. Gemini generates a full explanation of root causes.

**Step 4: Fix**
One click applies the Reweighing algorithm. A before and after comparison shows the improvement. Download the corrected dataset, ready for fairer model training.

---

## Features

- **CSV Upload + Column Mapping** — upload any dataset, or use preloaded demos for Hiring, Lending, and Healthcare
- **Fairness Score 0 to 100** — animated ring, color coded red/yellow/green, one number anyone understands
- **Three Fairness Metrics** — Disparate Impact, Statistical Parity, Equal Opportunity, each explained as a human sentence
- **Gemini AI Explanation** — domain specific plain English analysis of why the bias exists and what drives it
- **One Click Bias Fix** — IBM AIF360 Reweighing applied automatically, before and after comparison shown
- **Download Debiased Dataset** — CSV with `reweighing_weight` column, use as `sample_weight` in model training
- **Firebase Report History** — sign in with Google, save reports to Firestore, revisit past scans anytime
- **Bias Certification Badge** — datasets that pass the fairness threshold receive a certification badge
- **Training Data + Model Predictions** — analyze raw historical data or analyze what a trained model actually predicts
- **Domain Presets** — Hiring, Lending, Healthcare with context aware metric explanations and regulatory references

---

## Tech Stack

| Layer | Tools |
|---|---|
| Frontend | React + TypeScript + Vite |
| Backend | FastAPI + Python |
| Bias Detection | IBM AI Fairness 360 (AIF360) |
| AI Explanation | Gemini 2.0 Flash via OpenRouter |
| Auth + Storage | Firebase Authentication + Cloud Firestore |
| Frontend Hosting | Firebase Hosting |
| Backend Hosting | Render |

---

## Project Structure

```
FairScan/
├── frontend/
│   ├── src/
│   │   ├── pages/             # Landing, Upload, Report
│   │   ├── components/        # BiasScore, MetricCard, GroupChart,
│   │   │                      # FixPanel, AiExplainer, CertBadge,
│   │   │                      # BiasContributors, HistorySidebar, Navbar
│   │   ├── lib/               # api.ts, types.ts, firebase.ts, firestore.ts
│   │   └── contexts/          # AuthContext (Firebase Auth)
│   └── public/
│       └── demo-datasets/     # Hiring, Lending, Healthcare sample CSVs
│
├── backend/
│   ├── routes/                # /columns /analyze /fix /download
│   │                          # /explain-bias /presets /demo /ai
│   ├── services/              # bias_engine.py scorer.py explainer.py
│   ├── demo_datasets/         # Sample CSVs served from backend
│   └── store.py               # In-memory session store
│
├── firebase.json
└── README.md
```

---

## Running Locally

### Backend

```bash
cd backend

# Install dependencies
uv sync

# Or using pip
pip install -r requirements.txt

# Start the server
uvicorn main:app --reload
```

Runs on `http://localhost:8000`
API docs available at `http://localhost:8000/docs`

Create a `backend/.env` file with:

```
OPENROUTER_API_KEY=your_key_here
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Runs on `http://localhost:5173`

Fill in `frontend/.env.local`:

```
VITE_API_URL=http://localhost:8000
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

### Run frontend without backend

Set `VITE_MOCK=true` in `.env.local` and run `npm run dev`. Uses mock data with realistic delays.

---

## Testing with Sample Data

Demo datasets are included in `frontend/public/demo-datasets/` and `backend/demo_datasets/`.

| Dataset | Sensitive Attribute | Outcome Column | Privileged | Unprivileged | Positive Label |
|---|---|---|---|---|---|
| `hiring.csv` | `gender` | `hired` | `1` (Male) | `0` (Female) | `1` |
| `lending.csv` | `race` | `approved` | `1` | `0` | `1` |
| `healthcare.csv` | `gender` | `treated` | `1` | `0` | `1` |

On the live app, click any demo chip on the upload page to load them instantly.

---

## How the Bias Detection Works

FairScan uses three standard fairness metrics from IBM AIF360:

| Metric | What it measures | Biased if... |
|---|---|---|
| **Disparate Impact** | Ratio of positive outcomes between groups | Below 0.8 (violates the legal 80% rule) |
| **Statistical Parity** | Gap in outcome rates between groups | More than 10% difference |
| **Equal Opportunity** | Gap among equally qualified candidates | More than 10% difference |

The **Fairness Score (0 to 100)** is a weighted composite of all three metrics with heavier weight on Disparate Impact since it carries legal precedent.

The fix applies IBM AIF360 Reweighing. It adds a `reweighing_weight` column to your CSV. Training a model with these weights as `sample_weight` produces fairer predictions without altering historical records.

---

## Architecture

```
Browser (React)
      |
      |-- Firebase Auth (Google Sign-in)
      |-- Firestore (save and load reports)
      |
      +-- FastAPI Backend (Render)
                |
                |-- IBM AIF360 (bias metrics + Reweighing)
                |-- Gemini 2.0 Flash via OpenRouter (AI explanation)
                +-- In-memory session store (UUID keyed)
```

---

## Acknowledgements

- [IBM AI Fairness 360](https://aif360.readthedocs.io/) — bias detection and mitigation
- [Gemini 2.0 Flash](https://deepmind.google/technologies/gemini/) via [OpenRouter](https://openrouter.ai/) — AI explanation layer
- Google Solution Challenge 2026
