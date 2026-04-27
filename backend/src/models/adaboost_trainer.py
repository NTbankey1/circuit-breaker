# backend/src/models/adaboost_trainer.py
import joblib
import numpy as np
import mlflow
from sklearn.ensemble import AdaBoostRegressor
from sklearn.tree import DecisionTreeRegressor
from sklearn.metrics import mean_absolute_error, root_mean_squared_error
from pathlib import Path

MODEL_DIR = Path("artifacts/models")

class AdaBoostTrainer:
    def __init__(self, n_estimators: int = 100, learning_rate: float = 0.1):
        self.model = AdaBoostRegressor(
            estimator=DecisionTreeRegressor(max_depth=1),   # decision stump
            n_estimators=n_estimators,
            learning_rate=learning_rate,
            loss="linear",          # robust hơn "exponential" với outlier
            random_state=42,
        )
        self.n_estimators = n_estimators

    def train(self, X_train, y_train, X_val, y_val,
              experiment_name: str = "smart_logistics") -> dict:

        mlflow.set_experiment(experiment_name)
        with mlflow.start_run():
            self.model.fit(X_train, y_train)

            y_pred = self.model.predict(X_val)
            mae  = mean_absolute_error(y_val, y_pred)
            rmse = root_mean_squared_error(y_val, y_pred)

            mlflow.log_params({"n_estimators": self.n_estimators, "max_depth": 1})
            mlflow.log_metrics({"val_mae": mae, "val_rmse": rmse})
            mlflow.sklearn.log_model(self.model, "adaboost_model")

            print(f"[Training] MAE={mae:.2f} min | RMSE={rmse:.2f} min")
            return {"mae": mae, "rmse": rmse}

    def save(self, path: Path = MODEL_DIR / "adaboost_v1.joblib"):
        path.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(self.model, path)
        print(f"[Saved] Model → {path}")

    @classmethod
    def load(cls, path: Path = MODEL_DIR / "adaboost_v1.joblib") -> "AdaBoostTrainer":
        instance = cls()
        instance.model = joblib.load(path)
        return instance
