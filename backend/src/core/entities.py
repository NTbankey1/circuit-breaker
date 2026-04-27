from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum

class ShipperStatus(str, Enum):
    IDLE        = "IDLE"
    ON_DELIVERY = "ON_DELIVERY"
    OFFLINE     = "OFFLINE"

@dataclass
class Order:
    order_id:   str
    latitude:   float
    longitude:  float
    placed_at:  datetime
    weight_kg:  float
    priority:   int = 1     # 1=normal, 2=high, 3=urgent

@dataclass
class Shipper:
    shipper_id:    str
    current_lat:   float
    current_lng:   float
    status:        ShipperStatus
    max_load_kg:   float
    active_orders: list[str] = field(default_factory=list)

@dataclass
class DeliveryRecord:
    record_id:                str
    distance_km:              float
    traffic_level:            int       # 0–3
    time_of_day:              int       # 0–23
    number_of_stops:          int
    actual_delivery_minutes:  float     # label y
    predicted_minutes:        float | None = None
    recorded_at:              datetime  = field(default_factory=datetime.now)
