import os
import pandas as pd
import numpy as np

os.makedirs('demo_datasets', exist_ok=True)

np.random.seed(42)
gender_m = np.ones(40)
gender_f = np.zeros(40)
hired_m = np.random.choice([0, 1], size=40, p=[0.3, 0.7])
hired_f = np.random.choice([0, 1], size=40, p=[0.7, 0.3])
df_hiring = pd.DataFrame({
    'age': np.random.randint(22, 50, 80),
    'education': np.random.randint(1, 4, 80),
    'experience': np.random.randint(1, 15, 80),
    'gender': np.concatenate([gender_m, gender_f]),
    'hired': np.concatenate([hired_m, hired_f])
})
df_hiring = df_hiring.sample(frac=1).reset_index(drop=True)
df_hiring.to_csv('demo_datasets/hiring.csv', index=False)

race_nm = np.ones(40)
race_m = np.zeros(40)
app_nm = np.random.choice([0, 1], size=40, p=[0.25, 0.75])
app_m = np.random.choice([0, 1], size=40, p=[0.65, 0.35])
df_lending = pd.DataFrame({
    'age': np.random.randint(25, 65, 80),
    'income': np.random.randint(30000, 120000, 80),
    'credit_score': np.random.randint(550, 800, 80),
    'race': np.concatenate([race_nm, race_m]),
    'approved': np.concatenate([app_nm, app_m])
})
df_lending = df_lending.sample(frac=1).reset_index(drop=True)
df_lending.to_csv('demo_datasets/lending.csv', index=False)

age_plus = np.ones(40)
age_under = np.zeros(40)
treat_plus = np.random.choice([0, 1], size=40, p=[0.2, 0.8])
treat_under = np.random.choice([0, 1], size=40, p=[0.6, 0.4])
df_health = pd.DataFrame({
    'age': np.concatenate([np.random.randint(40, 80, 40), np.random.randint(18, 39, 40)]),
    'comorbidities': np.random.randint(0, 4, 80),
    'bmi': np.random.uniform(18.5, 35.0, 80).round(1),
    'age_group': np.concatenate([age_plus, age_under]),
    'treated': np.concatenate([treat_plus, treat_under])
})
df_health = df_health.sample(frac=1).reset_index(drop=True)
df_health.to_csv('demo_datasets/healthcare.csv', index=False)
print("Demo datasets generated successfully.")
