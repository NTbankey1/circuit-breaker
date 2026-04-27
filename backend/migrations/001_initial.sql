-- backend/migrations/001_initial.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Kho hàng
CREATE TABLE warehouses (
    warehouse_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name           VARCHAR(100) NOT NULL,
    latitude       DOUBLE PRECISION NOT NULL,
    longitude      DOUBLE PRECISION NOT NULL,
    capacity_kg    REAL NOT NULL,
    current_load_kg REAL NOT NULL DEFAULT 0
);

-- Đơn hàng
CREATE TABLE orders (
    order_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    latitude      DOUBLE PRECISION NOT NULL,
    longitude     DOUBLE PRECISION NOT NULL,
    placed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    weight_kg     REAL NOT NULL CHECK (weight_kg > 0),
    volume_m3     REAL,
    priority      SMALLINT NOT NULL DEFAULT 1 CHECK (priority BETWEEN 1 AND 3),
    status        VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    warehouse_id  UUID REFERENCES warehouses(warehouse_id)
);

CREATE INDEX idx_orders_status    ON orders(status);
CREATE INDEX idx_orders_placed_at ON orders(placed_at DESC);
CREATE INDEX idx_orders_priority  ON orders(priority DESC, placed_at);

-- Shipper
CREATE TABLE shippers (
    shipper_id  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    current_lat DOUBLE PRECISION,
    current_lng DOUBLE PRECISION,
    status      VARCHAR(20) NOT NULL DEFAULT 'IDLE',
    max_load_kg REAL NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shippers_status ON shippers(status);

-- Lịch sử giao hàng (nguồn dữ liệu training)
CREATE TABLE delivery_records (
    record_id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id                 UUID REFERENCES orders(order_id),
    shipper_id               UUID REFERENCES shippers(shipper_id),
    distance_km              REAL NOT NULL,
    traffic_level            SMALLINT NOT NULL CHECK (traffic_level BETWEEN 0 AND 3),
    time_of_day              SMALLINT NOT NULL CHECK (time_of_day BETWEEN 0 AND 23),
    number_of_stops          SMALLINT NOT NULL,
    predicted_minutes        REAL,           -- ETA từ model lúc giao
    actual_delivery_minutes  REAL,           -- Ground truth (điền sau khi xong)
    recorded_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index cho training query (lấy 90 ngày gần nhất)
CREATE INDEX idx_records_recorded_at ON delivery_records(recorded_at DESC);

-- Index cho drift detection (query error distribution)
CREATE INDEX idx_records_error ON delivery_records(
    (actual_delivery_minutes - predicted_minutes)
) WHERE actual_delivery_minutes IS NOT NULL;
