# backend/src/utils/geo.py
import math

def haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Tính khoảng cách km giữa 2 điểm GPS (WGS-84)."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lng2 - lng1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlmb/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

def cyclic_encode(hour: int) -> tuple[float, float]:
    """
    Encode giờ thành (sin, cos) để model hiểu tính tuần hoàn.
    Tránh lỗi: giờ 23 và giờ 0 thực ra liền kề nhau.
    """
    angle = 2 * math.pi * hour / 24
    return math.sin(angle), math.cos(angle)
