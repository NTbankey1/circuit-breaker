# backend/src/api/schemas.py
from pydantic import BaseModel, Field
from datetime import datetime

class ETARequest(BaseModel):
    order_lat:      float = Field(..., ge=-90, le=90)
    order_lng:      float = Field(..., ge=-180, le=180)
    warehouse_lat:  float
    warehouse_lng:  float
    traffic_level:  int   = Field(..., ge=0, le=3)
    number_of_stops: int  = Field(..., ge=0)
    departure_time: datetime | None = None    # None = sử dụng giờ hiện tại

class ETAResponse(BaseModel):
    predicted_minutes: float
    is_at_risk:        bool                   # True nếu > SLA_MINUTES
    confidence_band:   tuple[float, float]    # [p10, p90]
    cached:            bool
