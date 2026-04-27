# backend/src/pipeline/scaler_store.py
import joblib
from pathlib import Path
from sklearn.preprocessing import StandardScaler

SCALER_PATH = Path("artifacts/models/scaler_v1.joblib")

def save_scaler(scaler: StandardScaler, path: Path = SCALER_PATH):
    path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(scaler, path)
    print(f"[Saved] Scaler → {path}")

def load_scaler(path: Path = SCALER_PATH) -> StandardScaler:
    return joblib.load(path)
