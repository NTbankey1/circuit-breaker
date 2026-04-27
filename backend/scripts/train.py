# backend/scripts/train.py
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.infra.database import get_records
from src.pipeline.feature_engineering import DataPipeline
from src.models.adaboost_trainer import AdaBoostTrainer
from src.pipeline.scaler_store import save_scaler

def main():
    records  = get_records(limit=50_000)           # lấy từ DB
    pipeline = DataPipeline()
    try:
        X_train, X_val, y_train, y_val = pipeline.build_dataset(records)
        save_scaler(pipeline.scaler)                   # lưu scaler riêng!

        trainer = AdaBoostTrainer(n_estimators=100)
        metrics = trainer.train(X_train, y_train, X_val, y_val)
        trainer.save()

        if metrics["mae"] > 15.0:                      # SLA gate
            raise RuntimeError(f"Model quality below threshold: MAE={metrics['mae']:.2f}")
    except ValueError as e:
        print(f"Skipping training (likely empty DB mock): {e}")

if __name__ == "__main__":
    main()
