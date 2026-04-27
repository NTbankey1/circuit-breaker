# backend/src/api/routes/optimize.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Dict
from src.core.entities import Order, Shipper, ShipperStatus
from src.optimizer.cluster_assign import cluster_and_assign
from src.optimizer.astar import astar_route
from src.infra.dependencies import get_prediction_service
from datetime import datetime
from src.utils.geo import haversine
from src.services.prediction_service import PredictionService

router = APIRouter(prefix="/api/v1")

class OrderSchema(BaseModel):
    order_id: str
    latitude: float
    longitude: float
    weight_kg: float

class ShipperSchema(BaseModel):
    shipper_id: str
    current_lat: float
    current_lng: float
    status: str
    max_load_kg: float

class OptimizeRequest(BaseModel):
    orders: List[OrderSchema]
    shippers: List[ShipperSchema]

class RouteResponse(BaseModel):
    shipper_id: str
    route: List[str] # List of order_ids

@router.post("/optimize_route", response_model=List[RouteResponse])
def optimize_route(
    req: OptimizeRequest,
    svc: PredictionService = Depends(get_prediction_service),
):
    if not req.orders or not req.shippers:
        return []

    # Convert schemas to domain entities
    domain_orders = [
        Order(order_id=o.order_id, latitude=o.latitude, longitude=o.longitude, placed_at=None, weight_kg=o.weight_kg)
        for o in req.orders
    ]
    domain_shippers = [
        Shipper(
            shipper_id=s.shipper_id, 
            current_lat=s.current_lat, 
            current_lng=s.current_lng, 
            status=ShipperStatus(s.status), 
            max_load_kg=s.max_load_kg
        )
        for s in req.shippers
    ]

    try:
        # Cluster orders to shippers
        clusters = cluster_and_assign(domain_orders, domain_shippers)
        
        results = []
        hour = datetime.now().hour
        
        for shipper_id, cluster_orders in clusters.items():
            if not cluster_orders:
                results.append(RouteResponse(shipper_id=shipper_id, route=[]))
                continue
            
            # Find shipper entity for start coordinates
            shipper = next(s for s in domain_shippers if s.shipper_id == shipper_id)
            
            # Define heuristic function using the optimized predict_fast
            def predict_heuristic(order, cur_lat, cur_lng):
                dist = haversine(cur_lat, cur_lng, order.latitude, order.longitude)
                # Assume traffic_level=1, stops=1 for heuristic calculation
                return svc.predict_fast(dist, 1, hour, 1)

            # Safeguard: If cluster size > 10, A* will likely timeout. 
            # Use simple greedy approach as fallback.
            if len(cluster_orders) > 10:
                # Simple Nearest Neighbor greedy approach
                path = []
                remaining = list(cluster_orders)
                curr_lat, curr_lng = shipper.current_lat, shipper.current_lng
                while remaining:
                    # Find nearest next order
                    next_idx = min(range(len(remaining)), 
                                   key=lambda i: haversine(curr_lat, curr_lng, remaining[i].latitude, remaining[i].longitude))
                    next_order = remaining.pop(next_idx)
                    path.append(next_order)
                    curr_lat, curr_lng = next_order.latitude, next_order.longitude
                optimized_path = path
            else:
                # Run A*
                optimized_path = astar_route(cluster_orders, shipper.current_lat, shipper.current_lng, predict_heuristic)
            
            results.append(RouteResponse(shipper_id=shipper_id, route=[o.order_id for o in optimized_path]))
            
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
