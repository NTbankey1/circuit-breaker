# backend/src/infra/dependencies.py
from fastapi import Request
from src.services.prediction_service import PredictionService
from src.infra.redis_client import get_redis_client

# Factory cho dependencies (có thể thêm logic db session ở đây)
# Singleton instance
_prediction_service = None

def get_prediction_service() -> PredictionService:
    global _prediction_service
    if _prediction_service is None:
        redis_client = get_redis_client()
        _prediction_service = PredictionService(redis_client=redis_client, model_version="v1")
    return _prediction_service
