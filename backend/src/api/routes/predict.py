# backend/src/api/routes/predict.py
from fastapi import APIRouter, Depends
from src.api.schemas import ETARequest, ETAResponse
from src.services.prediction_service import PredictionService
from src.infra.dependencies import get_prediction_service
from src.infra import database

router = APIRouter(prefix="/api/v1")

@router.post("/predict_eta", response_model=ETAResponse)
def predict_eta(
    req: ETARequest,
    svc: PredictionService = Depends(get_prediction_service),
):
    """Dự đoán ETA cho một đơn hàng. Latency target: p99 < 100ms."""
    result = svc.predict(req)
    return ETAResponse(**result)

@router.get("/orders")
def get_orders():
    return database.get_orders()

@router.get("/shippers")
def get_shippers():
    return database.get_shippers()

@router.get("/stats")
def get_stats():
    """Tổng hợp số liệu KPI cho Dashboard."""
    return database.get_stats()

@router.get("/recent_incidents")
def get_recent_incidents():
    """Lấy danh sách các sự cố giao hàng bị trễ gần nhất."""
    return database.get_recent_incidents()
