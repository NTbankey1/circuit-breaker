# backend/src/infra/database.py
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from src.core.entities import DeliveryRecord, Order, Shipper, ShipperStatus

from psycopg2 import pool

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://admin:adminpassword@localhost/logistics")

# Initialize connection pool
try:
    # Use ThreadedConnectionPool for thread safety in FastAPI
    db_pool = pool.ThreadedConnectionPool(1, 20, DATABASE_URL)
except Exception as e:
    print(f"Error creating connection pool: {e}")
    db_pool = None

def get_db_connection():
    if db_pool:
        return db_pool.getconn()
    return psycopg2.connect(DATABASE_URL, connect_timeout=5)

def release_db_connection(conn):
    if db_pool:
        db_pool.putconn(conn)
    else:
        conn.close()

def get_records(limit: int = 50_000) -> list[DeliveryRecord]:
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT distance_km, traffic_level, time_of_day, number_of_stops, 
                       actual_delivery_minutes, recorded_at
                FROM delivery_records 
                WHERE actual_delivery_minutes IS NOT NULL 
                LIMIT %s
            """, (limit,))
            rows = cur.fetchall()
            return [DeliveryRecord(**row) for row in rows]
    finally:
        release_db_connection(conn)

def get_recent_records(days: int = 7) -> list[DeliveryRecord]:
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT distance_km, traffic_level, time_of_day, number_of_stops, 
                       actual_delivery_minutes, recorded_at
                FROM delivery_records 
                WHERE recorded_at > NOW() - INTERVAL '%s days'
                AND actual_delivery_minutes IS NOT NULL
            """, (days,))
            rows = cur.fetchall()
            return [DeliveryRecord(**row) for row in rows]
    finally:
        release_db_connection(conn)

def get_orders() -> list[Order]:
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT order_id, latitude, longitude, placed_at, weight_kg FROM orders WHERE status = 'PENDING'")
            rows = cur.fetchall()
            return [Order(**row) for row in rows]
    except Exception:
        return []
    finally:
        if conn:
            release_db_connection(conn)

def get_shippers() -> list[Shipper]:
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT shipper_id, current_lat, current_lng, status, max_load_kg FROM shippers")
            rows = cur.fetchall()
            return [
                Shipper(
                    shipper_id=row['shipper_id'],
                    current_lat=row['current_lat'],
                    current_lng=row['current_lng'],
                    status=ShipperStatus(row['status']),
                    max_load_kg=row['max_load_kg']
                ) for row in rows
            ]
    except Exception:
        return []
    finally:
        if conn:
            release_db_connection(conn)

def get_stats() -> dict:
    """Tổng hợp số liệu KPI cho dashboard."""
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT COUNT(*) as total FROM orders")
            total_orders = cur.fetchone()['total']

            cur.execute("SELECT COUNT(*) as total FROM orders WHERE status = 'PENDING'")
            pending_orders = cur.fetchone()['total']

            cur.execute("SELECT COUNT(*) as total FROM shippers")
            total_shippers = cur.fetchone()['total']

            cur.execute("SELECT COUNT(*) as total FROM shippers WHERE status = 'IDLE'")
            idle_shippers = cur.fetchone()['total']

            cur.execute("SELECT COUNT(*) as total FROM delivery_records")
            total_deliveries = cur.fetchone()['total']

            cur.execute("""
                SELECT AVG(actual_delivery_minutes) as avg_minutes 
                FROM delivery_records 
                WHERE actual_delivery_minutes IS NOT NULL
            """)
            row = cur.fetchone()
            avg_minutes = round(row['avg_minutes'], 1) if row['avg_minutes'] else 0

            cur.execute("""
                SELECT COUNT(*) as at_risk
                FROM delivery_records
                WHERE actual_delivery_minutes IS NOT NULL
                AND actual_delivery_minutes > (predicted_minutes * 1.2)
            """)
            at_risk = cur.fetchone()['at_risk']
            on_time_rate = round((1 - at_risk / max(total_deliveries, 1)) * 100, 1)

            return {
                "total_orders": total_orders,
                "pending_orders": pending_orders,
                "total_shippers": total_shippers,
                "idle_shippers": idle_shippers,
                "total_deliveries": total_deliveries,
                "avg_delivery_minutes": avg_minutes,
                "on_time_rate": on_time_rate,
            }
    except Exception as e:
        return {
            "total_orders": 0, "pending_orders": 0,
            "total_shippers": 0, "idle_shippers": 0,
            "total_deliveries": 0, "avg_delivery_minutes": 0, "on_time_rate": 0,
        }
    finally:
        if conn:
            release_db_connection(conn)

def get_recent_incidents(limit: int = 10) -> list:
    """Lấy các giao hàng bị trễ (actual > predicted * 1.15)."""
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT 
                    dr.record_id,
                    dr.order_id,
                    dr.shipper_id,
                    dr.traffic_level,
                    dr.actual_delivery_minutes,
                    dr.predicted_minutes,
                    dr.recorded_at,
                    ROUND((dr.actual_delivery_minutes - dr.predicted_minutes)::numeric, 1) as delay_minutes
                FROM delivery_records dr
                WHERE dr.actual_delivery_minutes IS NOT NULL
                AND dr.actual_delivery_minutes > dr.predicted_minutes * 1.15
                ORDER BY dr.recorded_at DESC
                LIMIT %s
            """, (limit,))
            rows = cur.fetchall()
            return [dict(r) for r in rows]
    except Exception:
        return []
    finally:
        if conn:
            release_db_connection(conn)
