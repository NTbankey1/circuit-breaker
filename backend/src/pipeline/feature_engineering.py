# backend/src/pipeline/feature_engineering.py
import numpy as np
from sklearn.preprocessing import StandardScaler
from dataclasses import dataclass
from src.core.entities import DeliveryRecord
from src.utils.geo import cyclic_encode

@dataclass
class FeatureVector:
    distance_km:    float
    traffic_level:  int
    time_sin:       float
    time_cos:       float
    number_of_stops: int

    @classmethod
    def from_record(cls, rec: DeliveryRecord) -> "FeatureVector":
        time_sin, time_cos = cyclic_encode(rec.time_of_day)
        return cls(
            distance_km=rec.distance_km,
            traffic_level=rec.traffic_level,
            time_sin=time_sin,
            time_cos=time_cos,
            number_of_stops=rec.number_of_stops,
        )

    def to_array(self) -> list[float]:
        return [self.distance_km, self.traffic_level,
                self.time_sin, self.time_cos, self.number_of_stops]


class DataPipeline:
    def __init__(self):
        self.scaler = StandardScaler()

    def build_dataset(self, records: list[DeliveryRecord]):
        X = [FeatureVector.from_record(r).to_array() for r in records]
        y = [r.actual_delivery_minutes for r in records]

        # Loại outlier bằng IQR method (3x IQR)
        y_arr = np.array(y)
        q1, q3 = np.percentile(y_arr, 25), np.percentile(y_arr, 75)
        iqr = q3 - q1
        mask = (y_arr >= q1 - 3*iqr) & (y_arr <= q3 + 3*iqr)
        X_clean = np.array(X)[mask]
        y_clean = y_arr[mask]

        # Train/val split 80/20 — không shuffle (time-series data)
        split = int(len(X_clean) * 0.8)
        X_train, X_val = X_clean[:split], X_clean[split:]
        y_train, y_val = y_clean[:split], y_clean[split:]

        # QUAN TRỌNG: fit scaler chỉ trên training set
        X_train = self.scaler.fit_transform(X_train)
        X_val   = self.scaler.transform(X_val)    # Không fit lại!

        return X_train, X_val, y_train, y_val
