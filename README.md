# FairScan ⚖️

**Detect and fix bias in AI decision-making datasets — no machine learning knowledge required.**

Built for Google Solution Challenge 2026 · Unbiased AI Decision track

---

## The Problem

AI systems are making life-changing decisions — who gets hired, who gets a loan, who receives medical care. But if these systems are trained on historically unfair data, they silently repeat and amplify the same discrimination.

The tools that detect this bias (like IBM AIF360) exist — but they require deep technical expertise. A hiring manager or compliance officer can't use them.

**FairScan is the accessibility layer.**

---

## What It Does

1. **Upload** a CSV dataset (hiring, lending, healthcare, or any decision data)
2. **Detect** — FairScan measures three fairness metrics and explains them in plain English
3. **Fix** — one click rebalances your dataset using IBM's Reweighing algorithm
4. **Download** the corrected dataset, ready for fairer model training

---

## Demo

> Try it live:

Sample datasets included — no upload needed to explore:

- `hiring.csv` : job application decisions
- `lending.csv` : loan approvals
- `healthcare.csv` : treatment allocation

---

## Example Output

```
Scan complete
Women are 36% less likely to be hired.

Fairness Score: 34 / 100  →  High bias detected

Disparate Impact:      0.64   (threshold: 0.8)
Statistical Parity:   -0.32   (threshold: 0)
Equal Opportunity:    -0.19   (threshold: 0)

After fix → Fairness Score: 99 / 100
```

---

## Tech Stack

| Layer          | Tools                                 |
| -------------- | ------------------------------------- |
| Frontend       | React + TypeScript + Vite             |
| Backend        | FastAPI + Python                      |
| Bias Detection | IBM AI Fairness 360 (AIF360)          |
| Deployment     | Vercel (frontend) · Railway (backend) |

---

## Project Structure

```
fairscan/
├── frontend/                  # React app
│   ├── src/
│   │   ├── pages/             # Landing, Upload, Report
│   │   ├── components/        # BiasScore, MetricCard, GroupChart, FixPanel
│   │   └── lib/               # API calls, types, mock data
│   └── public/
│       └── demo-datasets/     # Sample CSVs for judges
│
├── backend/                   # FastAPI server
│   ├── routes/                # /columns, /analyze, /fix, /download
│   ├── services/              # bias_engine, explainer, scorer
│   └── demo_datasets/         # Same sample CSVs served by backend
│
└── README.md
```

---

## Running Locally

**Backend**

```bash
cd backend
touch .env
> Then add: GEMINI_API_KEY=your_actual_api_key_here
uvicorn main:app --reload
# Runs on http://localhost:8000
# API docs at http://localhost:8000/docs
```

**Frontend**

```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

**Frontend without backend (mock mode)**

```bash
# In .env.local set:
VITE_MOCK=true
npm run dev
```

---

## How the Bias Detection Works

FairScan uses three standard fairness metrics from IBM AIF360:

| Metric             | What it measures                          | Flag if...                     |
| ------------------ | ----------------------------------------- | ------------------------------ |
| Disparate Impact   | Ratio of positive outcomes between groups | Below 0.8 (the legal 80% rule) |
| Statistical Parity | Gap in outcome rates between groups       | More than ±10%                 |
| Equal Opportunity  | Gap among equally qualified candidates    | More than ±10%                 |

The **fix** applies Reweighing — it adds a `reweighing_weight` column to your dataset. When you train a model using these weights as `sample_weight`, the model learns fairer patterns without changing historical records.

---

## Acknowledgements

- [IBM AI Fairness 360](https://aif360.readthedocs.io/) — bias detection and mitigation library
- Google Solution Challenge 2026
