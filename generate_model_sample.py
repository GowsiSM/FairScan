"""
generate_model_sample.py
────────────────────────
Generates a hiring_with_predictions.csv file suitable for testing
FairScan's "Model Predictions" analysis mode.

Usage:
    python generate_model_sample.py

Output:
    hiring_with_predictions.csv  (same directory as this script)

Then in FairScan:
  Step 01  →  Hiring
  Step 02  →  Model Predictions
  Step 03  →  Upload hiring_with_predictions.csv
  Step 04  →  Configure:
                Sensitive attribute   : gender
                Ground truth column  : hired
                Prediction column    : predicted_hired
                Privileged group     : 1   (Male)
                Unprivileged group   : 0   (Female)
                Positive outcome     : 1
"""

import pathlib
import numpy as np
import pandas as pd

DEMO_CSV = pathlib.Path(__file__).parent / "backend" / "demo_datasets" / "hiring.csv"
OUT_CSV  = pathlib.Path(__file__).parent / "hiring_with_predictions.csv"


def main() -> None:
    df = pd.read_csv(DEMO_CSV)

    # gender: 1.0 = Male, 0.0 = Female
    # hired:  1 = hired,  0 = not hired

    rng = np.random.default_rng(seed=42)

    def biased_predict(row: pd.Series) -> int:
        """
        Simulate a biased model:
        - Male (gender == 1)   → hired prediction with 70% probability
        - Female (gender == 0) → hired prediction with 35% probability
        This deliberately exceeds the 80% disparate impact threshold.
        """
        prob = 0.70 if row["gender"] == 1.0 else 0.35
        return int(rng.random() < prob)

    df["predicted_hired"] = df.apply(biased_predict, axis=1)

    df.to_csv(OUT_CSV, index=False)

    # Summary stats
    total  = len(df)
    male   = df[df["gender"] == 1.0]
    female = df[df["gender"] == 0.0]

    print(f"✓ Saved {total} rows → {OUT_CSV.name}")
    print()
    print("Ground truth (actual hired):")
    print(f"  Male   ({len(male):>3}) : {male['hired'].mean()*100:.1f}% hired")
    print(f"  Female ({len(female):>3}) : {female['hired'].mean()*100:.1f}% hired")
    print()
    print("Model predictions (predicted_hired):")
    print(f"  Male   ({len(male):>3}) : {male['predicted_hired'].mean()*100:.1f}% predicted hired")
    print(f"  Female ({len(female):>3}) : {female['predicted_hired'].mean()*100:.1f}% predicted hired")

    di = female["predicted_hired"].mean() / male["predicted_hired"].mean()
    print()
    print(f"Disparate Impact (Female/Male): {di:.3f}")
    if di < 0.8:
        print("⚠️  Below 0.8 threshold — bias detected ✓")
    else:
        print("✓  Above 0.8 threshold — no flagged bias")


if __name__ == "__main__":
    main()
