# backend/src/optimizer/astar.py
import heapq
from dataclasses import dataclass, field
from typing import Callable
from src.core.entities import Order

@dataclass(order=True)
class AStarNode:
    f_score:   float
    g_score:   float         = field(compare=False)
    path:      list[Order]   = field(compare=False)
    remaining: frozenset     = field(compare=False)


def astar_route(
    orders:     list[Order],
    start_lat:  float,
    start_lng:  float,
    predict_fn: Callable[[Order, float, float], float],
) -> list[Order]:
    """
    Tìm thứ tự giao hàng tối ưu bằng A*.

    Args:
        predict_fn: (order, cur_lat, cur_lng) -> minutes
                    Đây là AdaBoost ETA — heuristic h(n).
    
    Quan trọng: Dùng KMeans để giảm N xuống ≤ 8 trước khi gọi hàm này.
    """
    if not orders:
        return []
    if len(orders) == 1:
        return orders

    all_orders = frozenset(o.order_id for o in orders)
    order_map  = {o.order_id: o for o in orders}

    heap: list[AStarNode] = []
    heapq.heappush(heap, AStarNode(
        f_score=0, g_score=0, path=[], remaining=all_orders
    ))

    # closed_set: tránh expand cùng state 2 lần — BUG phổ biến nếu thiếu!
    closed_set: set[tuple] = set()
    best_cost = float("inf")
    best_path: list[Order] = list(orders)

    while heap:
        node = heapq.heappop(heap)

        last_id   = node.path[-1].order_id if node.path else "__start__"
        state_key = (last_id, node.remaining)
        if state_key in closed_set:
            continue
        closed_set.add(state_key)

        if not node.remaining:
            if node.g_score < best_cost:
                best_cost = node.g_score
                best_path = node.path
            continue

        # Pruning: bỏ nhánh tệ hơn best hiện tại
        if node.g_score >= best_cost:
            continue

        cur_lat = node.path[-1].latitude  if node.path else start_lat
        cur_lng = node.path[-1].longitude if node.path else start_lng

        for oid in node.remaining:
            next_order = order_map[oid]

            travel_time = predict_fn(next_order, cur_lat, cur_lng)
            g_new       = node.g_score + travel_time

            remaining_after = node.remaining - {oid}
            h_new = sum(
                predict_fn(order_map[rid], next_order.latitude, next_order.longitude)
                for rid in remaining_after
            )

            heapq.heappush(heap, AStarNode(
                f_score   = g_new + h_new,
                g_score   = g_new,
                path      = node.path + [next_order],
                remaining = remaining_after,
            ))

    return best_path
