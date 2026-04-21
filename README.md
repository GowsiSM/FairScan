# FairScan

Bias detection and mitigation tool for non-technical users.

Upload a dataset, detect hidden bias in hiring, loan, or healthcare decisions, and fix it — no ML knowledge required.

---

## Problem

AI systems trained on historical data inherit historical discrimination. Tools like IBM AIF360 exist but require deep ML expertise. FairScan makes bias detection accessible to HR teams, compliance officers, and NGO workers.

---

## Solution

- Upload a CSV dataset
- Select the sensitive attribute (e.g., gender) and target column (e.g., hired)
- Get a plain-English bias report with visual charts
- Apply a one-click fix and download the debiased dataset

---

## Tech Stack

**Frontend** — React + TypeScript + TailwindCSS + Recharts  
**Backend** — FastAPI + AIF360 + Pandas

---

## Project Structure

```
fairscan/
├── frontend/       # React app
├── backend/        # FastAPI + AIF360
├── demo-datasets/  # Sample CSVs for judges
│   ├── hiring_biased.csv
│   ├── loan_approval.csv
│   └── healthcare.csv
├── .env.example
└── README.md
```

---

## Getting Started

**Backend**

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

**Frontend**

```bash
cd frontend
npm install
npm run dev
```

## Built for

Google Solution Challenge 2026 — Unbiased AI Decision track
