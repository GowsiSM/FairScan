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
3. **Understand** — See *why* bias exists: which features contribute most, AI-generated root cause analysis
4. **Fix** — one click rebalances your dataset using IBM's Reweighing algorithm
5. **Certify** — Get a FairScan Certification Badge (Fair / Needs Review / Not Fair)
6. **Download** the corrected dataset, ready for fairer model training

---

## Key Features

| Feature | Description |
|---------|-------------|
| 🔍 **Bias Root Cause Analysis** | Identifies which dataset features (e.g., experience, education, location) contribute most to the detected bias — answering *why* bias exists, not just *that* it exists |
| 🧠 **AI Explanation Layer** | One-click Gemini-powered plain-English explanation of the bias, its probable causes, real-world impact, and recommended next steps |
| ⚖️ **Certification Badge** | Visual pass/review/fail badge: ✅ FairScan Certified (score ≥ 70), ⚠️ Needs Review (40–69), ❌ Not Fair (< 40) |
| 📊 **Before vs After Visualization** | Animated comparison showing group outcome rates shifting after the fix is applied |
| 🧠 **Domain-Aware Metric Guide** | Recommends the most relevant fairness metric based on your domain (Hiring → Equal Opportunity, Lending → Disparate Impact, Healthcare → Equalized Odds) |
| 🔐 **Privacy-First Design** | All data processed in-memory, never stored. "Data not stored" badge displayed on every scan |

---

## Design Decisions

> **FairScan currently uses in-memory processing for speed and privacy. In production, we would add secure audit logging for compliance tracking.**

This is a conscious design decision — we prioritize user trust and data privacy over audit trail persistence. For enterprise deployments, a secure logging layer would be added to meet regulatory compliance requirements.

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
❌ Not Fair

Disparate Impact:      0.64   (threshold: 0.8)
Statistical Parity:   -0.32   (threshold: 0)
Equal Opportunity:    -0.19   (threshold: 0)

Top bias contributors:
  Experience: 42%
  Education:  28%
  Location:   18%

After fix → Fairness Score: 99 / 100
✅ FairScan Certified
```

---

## Tech Stack

| Layer          | Tools                                 |
| -------------- | ------------------------------------- |
| Frontend       | React + TypeScript + Vite             |
| Backend        | FastAPI + Python                      |
| Bias Detection | IBM AI Fairness 360 (AIF360)          |
| AI Layer       | Google Gemini (column mapping + bias explanation) |
| Deployment     | Vercel (frontend) · Railway (backend) |

---

## Project Structure

```
fairscan/
├── frontend/                  # React app
│   ├── src/
│   │   ├── pages/             # Landing, Upload, Report
│   │   ├── components/        # BiasScore, MetricCard, GroupChart, FixPanel,
│   │   │                      # BiasContributors, CertBadge, MetricGuide, AiExplainer
│   │   └── lib/               # API calls, types, mock data
│   └── public/
│       └── demo-datasets/     # Sample CSVs for judges
│
├── backend/                   # FastAPI server
│   ├── routes/                # /columns, /analyze, /fix, /download, /explain-bias
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

### Bias Root Cause Analysis

Beyond just detecting bias, FairScan identifies *which features* in your dataset contribute most to the gap. It uses logistic regression feature importances correlated with the sensitive attribute to surface proxy variables — features that may seem neutral but act as stand-ins for protected characteristics.

---

## Privacy

🔐 **We do not store your data.** All uploaded datasets are processed entirely in-memory and discarded after analysis. No data is written to disk, logged, or transmitted to third parties. This matters for sensitive domains like healthcare and HR datasets.

---

## Acknowledgements

- [IBM AI Fairness 360](https://aif360.readthedocs.io/) — bias detection and mitigation library
- [Google Gemini](https://ai.google.dev/) — AI-powered column mapping and bias explanation
- Google Solution Challenge 2026
