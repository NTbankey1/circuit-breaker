# backend/src/services/prediction_service.py
import redis, json, hashlib
from datetime import datetime
from src.models.adaboost_trainer import AdaBoostTrainer
from src.pipeline.feature_engineering import FeatureVector
from src.pipeline.scaler_store import load_scaler
from src.utils.geo import haversine, cyclic_encode
from src.core.constants import SLA_MINUTES, CACHE_TTL

class PredictionService:
    def __init__(self, redis_client: redis.Redis, model_version: str = "v1"):
        try:
            self.model = AdaBoostTrainer.load().model
        except Exception:
            self.model = None
        try:
            self.scaler = load_scaler()
        except Exception:
            self.scaler = None
        self.redis = redis_client
        self.model_version = model_version

    def _cache_key(self, req) -> str:
        # Bao gồm model_version để invalidate khi deploy model mới
        payload = (f"{self.model_version}:{req.order_lat:.4f}:{req.order_lng:.4f}:"
                   f"{req.traffic_level}:{req.number_of_stops}")
        return "eta:" + hashlib.md5(payload.encode()).hexdigest()

    def predict(self, req) -> dict:
        key    = self._cache_key(req)
        try:
            cached = self.redis.get(key)
            if cached:
                return {**json.loads(cached), "cached": True}
        except Exception:
            pass # fallback if redis fails

        # Build feature vector
        dist = haversine(req.order_lat, req.order_lng,
                         req.warehouse_lat, req.warehouse_lng)
        hour = (req.departure_time or datetime.now()).hour
        t_sin, t_cos = cyclic_encode(hour)

        fv = FeatureVector(dist, req.traffic_level, t_sin, t_cos,
                           req.number_of_stops)
                           
        if not self.scaler or not self.model:
            # Fallback when model is not trained yet
            eta = (dist / 20.0) * 60
            result = {
                "predicted_minutes": round(eta, 1),
                "is_at_risk":        eta > SLA_MINUTES,
                "confidence_band":   [eta - 5, eta + 5],
            }
            return {**result, "cached": False}

        X  = self.scaler.transform([fv.to_array()])

        # AdaBoost inference — O(T) ≈ microseconds
        eta = float(self.model.predict(X)[0])

        # Sanity floor: tốc độ tối thiểu 20 km/h đô thị
        eta = max(eta, (dist / 20.0) * 60)

        # Uncertainty band từ staged predictions (20 stump cuối)
        staged = list(self.model.staged_predict(X))
        band = (float(min(p[0] for p in staged[-20:])),
                float(max(p[0] for p in staged[-20:])))

        result = {
            "predicted_minutes": round(eta, 1),
            "is_at_risk":        eta > SLA_MINUTES,
            "confidence_band":   band,
        }
        
        try:
            self.redis.setex(key, CACHE_TTL, json.dumps(result))
        except Exception:
            pass # ignore redis errors
            
        return {**result, "cached": False}

    def predict_fast(self, dist: float, traffic_level: int, hour: int, stops: int) -> float:
        """Optimized for internal use (e.g., in A*). Skips Redis and uncertainty bands."""
        if not self.scaler or not self.model:
            return (dist / 20.0) * 60

        t_sin, t_cos = cyclic_encode(hour)
        X = self.scaler.transform([[dist, traffic_level, t_sin, t_cos, stops]])
        eta = float(self.model.predict(X)[0])
        return max(eta, (dist / 20.0) * 60)
