# backend/src/workers/online_update_task.py
import numpy as np
from src.core.entities import DeliveryRecord
from src.pipeline.feature_engineering import FeatureVector

THRESHOLD_MINUTES = 15.0

def online_update(model, scaler, record: DeliveryRecord):
    """
    Cập nhật online khi sai số lớn hơn threshold.
    Dùng Poisson resampling (Online Bagging).
    """
    fv      = FeatureVector.from_record(record)
    X       = scaler.transform([fv.to_array()])
    y_pred  = model.predict(X)[0]
    y_actual = record.actual_delivery_minutes
    error   = abs(y_actual - y_pred)

    if error > THRESHOLD_MINUTES:
        k = np.random.poisson(lam=1)
        for _ in range(k):
            # scikit-learn AdaBoost không hỗ trợ partial_fit
            # → Dùng warm_start hoặc chuyển sang SGD-based model cho online layer
            pass

    return model
