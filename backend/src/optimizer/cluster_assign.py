# backend/src/optimizer/cluster_assign.py
import numpy as np
from sklearn.cluster import KMeans
from src.core.entities import Order, Shipper

def cluster_and_assign(
    orders:   list[Order],
    shippers: list[Shipper],
) -> dict[str, list[Order]]:
    """
    1. KMeans cluster orders theo số lượng shipper available.
    2. Assign cluster gần nhất cho mỗi shipper (greedy, không trùng).
    3. Return: {shipper_id: [Order, ...]}.
    """
    n = len([s for s in shippers if s.status != "OFFLINE"])
    if n == 0:
        raise RuntimeError("No available shippers")

    coords = np.array([[o.latitude, o.longitude] for o in orders])
    km     = KMeans(n_clusters=min(n, len(orders)), random_state=42, n_init=10)
    labels = km.fit_predict(coords)
    centers = km.cluster_centers_

    available = [s for s in shippers if s.status != "OFFLINE"]
    assigned_shippers: set[str]  = set()
    cluster_to_shipper: dict[int, str] = {}

    for cluster_id in range(km.n_clusters):
        c_lat, c_lng = centers[cluster_id]
        best = min(
            (s for s in available if s.shipper_id not in assigned_shippers),
            key=lambda s: (s.current_lat - c_lat)**2 + (s.current_lng - c_lng)**2,
            default=None
        )
        if best:
            cluster_to_shipper[cluster_id] = best.shipper_id
            assigned_shippers.add(best.shipper_id)

    result: dict[str, list[Order]] = {s.shipper_id: [] for s in available}
    for order, label in zip(orders, labels):
        if label in cluster_to_shipper:
            result[cluster_to_shipper[label]].append(order)

    return result
