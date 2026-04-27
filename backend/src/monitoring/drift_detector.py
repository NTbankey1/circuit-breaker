# backend/src/monitoring/drift_detector.py
import numpy as np
from src.infra.database import get_recent_records

class DriftDetector:
    """
    PSI (Population Stability Index) — tiêu chuẩn industry.
    PSI < 0.1  : stable
    PSI 0.1–0.25: monitor chặt
    PSI > 0.25 : retrain ngay
    """
    PSI_THRESHOLD = 0.20
    MAE_THRESHOLD = 15.0      # phút

    def compute_psi(self, expected: np.ndarray, actual: np.ndarray,
                    n_bins: int = 10) -> float:
        if len(expected) == 0 or len(actual) == 0:
            return 0.0
        bins = np.linspace(
            min(expected.min(), actual.min()),
            max(expected.max(), actual.max()),
            n_bins + 1
        )
        exp_pct = np.histogram(expected, bins)[0] / len(expected)
        act_pct = np.histogram(actual,   bins)[0] / len(actual)
        # Tránh log(0)
        exp_pct = np.where(exp_pct == 0, 1e-4, exp_pct)
        act_pct = np.where(act_pct == 0, 1e-4, act_pct)
        return float(np.sum((act_pct - exp_pct) * np.log(act_pct / exp_pct)))

    def check(self) -> dict:
        records = get_recent_records(days=7)
        errors  = np.array([
            r.actual_delivery_minutes - r.predicted_minutes
            for r in records if r.actual_delivery_minutes is not None and r.predicted_minutes is not None
        ])
        if len(errors) == 0:
            return {"psi": 0, "mae_7d": 0, "needs_retrain": False, "n_samples": 0}

        baseline = np.zeros(len(errors))
        psi = self.compute_psi(baseline, errors)
        mae = float(np.abs(errors).mean())

        return {
            "psi":          round(psi, 4),
            "mae_7d":       round(mae, 2),
            "needs_retrain": psi > self.PSI_THRESHOLD or mae > self.MAE_THRESHOLD,
            "n_samples":    len(errors),
        }
