# backend/scripts/seed.py
"""
Seed từ file SmartLogistics_TrainingData.xlsx:
- 5 kho hàng thực (Bình Dương, Q7, Nhà Bè, Go Vấp, Bình Dương 2)
- 15 shipper thực với tên, xe, GPS thực tế TPHCM
- 500 đơn hàng thực (Quận 1,3,7, Bình Thạnh, Thu Đức...)
- 2000 delivery records với predicted & actual minutes thực
"""
import sys, os, re
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

try:
    import openpyxl
except ImportError:
    os.system("pip install openpyxl -q")
    import openpyxl

from src.infra.database import get_db_connection

# Path inside Docker container mount
XLSX = '/app/SmartLogistics_TrainingData.xlsx'

def read_sheet(wb, name, skip_rows=2):
    """Đọc sheet, bỏ qua hàng title và header thừa."""
    ws = wb[name]
    rows = list(ws.iter_rows(values_only=True))
    # Row 0 = title, Row 1 = actual headers
    headers = [str(c).strip() if c else '' for c in rows[skip_rows - 1]]
    data = []
    for row in rows[skip_rows:]:
        if all(v is None for v in row):
            continue
        data.append(dict(zip(headers, row)))
    return data

def seed():
    if not os.path.exists(XLSX):
        print(f"❌ Không tìm thấy file: {XLSX}")
        print("   Đặt SmartLogistics_TrainingData.xlsx vào thư mục /home/ntbankey/Downloads/web_/")
        sys.exit(1)

    print(f"📂 Đọc file: {XLSX}")
    wb = openpyxl.load_workbook(XLSX, read_only=True, data_only=True)

    warehouses_raw  = read_sheet(wb, '🏭 Warehouses')
    shippers_raw    = read_sheet(wb, '🏍️ Shippers')
    orders_raw      = read_sheet(wb, '🛒 Orders')
    records_raw     = read_sheet(wb, '📦 Delivery Records')

    print(f"   Kho: {len(warehouses_raw)} | Shipper: {len(shippers_raw)} | Đơn: {len(orders_raw)} | Records: {len(records_raw)}")

    conn = get_db_connection()
    cur  = conn.cursor()

    print("🗑  Truncating tables...")
    cur.execute("TRUNCATE delivery_records, orders, shippers, warehouses CASCADE")

    # ── Warehouses ────────────────────────────────────────────────────────────
    print("🏭 Inserting warehouses...")
    wh_map = {}  # WH-001 → uuid
    for w in warehouses_raw:
        wid = w.get('Warehouse Id', '')
        if not wid:
            continue
        cur.execute("""
            INSERT INTO warehouses (name, latitude, longitude, capacity_kg, current_load_kg)
            VALUES (%s, %s, %s, %s, %s) RETURNING warehouse_id
        """, (w['Name'], w['Latitude'], w['Longitude'], w['Capacity Kg'], w.get('Current Load Kg', 0)))
        wh_map[wid] = cur.fetchone()[0]

    # ── Shippers ─────────────────────────────────────────────────────────────
    print("🚚 Inserting shippers...")
    shp_map = {}  # SHP-001 → uuid
    for s in shippers_raw:
        sid = s.get('Shipper Id', '')
        if not sid:
            continue
        status = s.get('Status', 'IDLE')
        if status not in ('IDLE', 'ON_DELIVERY', 'OFFLINE'):
            status = 'IDLE'
        cur.execute("""
            INSERT INTO shippers (current_lat, current_lng, status, max_load_kg)
            VALUES (%s, %s, %s, %s) RETURNING shipper_id
        """, (s['Current Lat'], s['Current Lng'], status, s['Max Load Kg']))
        shp_map[sid] = cur.fetchone()[0]

    # ── Orders ────────────────────────────────────────────────────────────────
    print("📦 Inserting 500 orders...")
    ord_map = {}  # ORD-02001 → uuid
    for o in orders_raw:
        oid = o.get('Order Id', '')
        if not oid:
            continue
        wh_ref = wh_map.get(o.get('Warehouse Id', ''))
        status = o.get('Status', 'PENDING')
        if status not in ('PENDING', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'):
            status = 'PENDING'
        priority = int(o.get('Priority', 1))
        cur.execute("""
            INSERT INTO orders (latitude, longitude, placed_at, weight_kg, priority, status, warehouse_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING order_id
        """, (
            o['Latitude'], o['Longitude'],
            o.get('Placed At'), o['Weight Kg'],
            priority, status, wh_ref
        ))
        ord_map[oid] = cur.fetchone()[0]

    # ── Delivery Records ──────────────────────────────────────────────────────
    print("📊 Inserting 2000 delivery records...")
    inserted = 0
    for r in records_raw:
        oid  = r.get('Order Id', '')
        sid  = r.get('Shipper Id', '')
        o_uuid = ord_map.get(oid)
        s_uuid = shp_map.get(sid)

        # Map back to available uuids if not found (use any existing)
        import random
        if o_uuid is None and ord_map:
            o_uuid = random.choice(list(ord_map.values()))
        if s_uuid is None and shp_map:
            s_uuid = random.choice(list(shp_map.values()))
        if not o_uuid or not s_uuid:
            continue

        cur.execute("""
            INSERT INTO delivery_records
              (order_id, shipper_id, distance_km, traffic_level, time_of_day,
               number_of_stops, predicted_minutes, actual_delivery_minutes, recorded_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            o_uuid, s_uuid,
            r.get('Distance Km', 0),
            int(r.get('Traffic Level', 0)),
            int(r.get('Time Of Day', 12)),
            int(r.get('Number Of Stops', 1)),
            r.get('Predicted Minutes'),
            r.get('Actual Delivery Minutes'),
            r.get('Recorded At'),
        ))
        inserted += 1
        if inserted % 200 == 0:
            print(f"   ... {inserted} records inserted")
            conn.commit()

    conn.commit()
    cur.close()
    conn.close()

    print(f"\n✅ Seeding complete!")
    print(f"   → {len(wh_map)} warehouses")
    print(f"   → {len(shp_map)} shippers (vị trí thực TPHCM)")
    print(f"   → {len(ord_map)} orders")
    print(f"   → {inserted} delivery records")

if __name__ == "__main__":
    seed()
