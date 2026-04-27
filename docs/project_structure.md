# Cấu Trúc Dự Án

Dự án được tổ chức theo kiến trúc **Modular Monolith**, tách biệt rõ ràng giữa Backend (ML & API) và Frontend (UI).

## 📂 Sơ đồ thư mục tổng quát

```text
smart_logistics/
├── backend/                # Source code phía Backend (Python/FastAPI)
│   ├── src/                # Logic cốt lõi của Backend
│   │   ├── api/            # Định nghĩa các REST API endpoints & schemas
│   │   ├── core/           # Domain models & Business rules (Entities)
│   │   ├── models/         # Mã nguồn huấn luyện & inference ML (AdaBoost)
│   │   ├── pipeline/       # Tiền xử lý dữ liệu & Feature Engineering
│   │   ├── optimizer/      # Thuật toán tối ưu (A*, KMeans)
│   │   ├── services/       # Lớp điều phối (Orchestration layer)
│   │   ├── infra/          # Kết nối cơ sở dữ liệu, Redis, Storage
│   │   ├── workers/        # Tác vụ chạy nền (Celery)
│   │   └── utils/          # Các hàm tiện ích (Geo, Logger)
│   ├── migrations/         # Script khởi tạo & cập nhật DB (SQL)
│   ├── scripts/            # Script hỗ trợ huấn luyện, seed dữ liệu
│   └── tests/              # Unit & Integration tests
│
├── src/                    # Source code phía Frontend (React/TypeScript)
│   ├── components/         # Các UI components dùng chung
│   ├── pages/              # Các trang giao diện chính (Dashboard, Orders,...)
│   ├── services/           # Lớp kết nối API và xử lý dữ liệu frontend
│   ├── config/             # Cấu hình môi trường và API
│   ├── assets/             # Hình ảnh, fonts và tài nguyên tĩnh
│   └── App.tsx             # File khởi tạo ứng dụng chính
│
├── docs/                   # Tài liệu hướng dẫn (Bạn đang ở đây)
├── docker-compose.yml      # Cấu hình Docker để chạy toàn bộ hệ thống
├── Dockerfile              # Cấu hình build image cho ứng dụng
├── nginx.conf              # Cấu hình web server & Reverse Proxy
└── package.json            # Quản lý dependencies cho frontend & scripts
```

## 🔍 Chi tiết các thành phần quan trọng

### 1. Backend Layer
- **`backend/src/core`**: Chứa các "Entities" - thực thể chính của hệ thống như `Order`, `Shipper`, `DeliveryRecord`. Đây là phần "tinh khiết" nhất của mã nguồn, không phụ thuộc vào các framework bên ngoài.
- **`backend/src/models`**: Nơi chứa logic của thuật toán **AdaBoost**. Bao gồm việc huấn luyện mô hình và lưu trữ các artifacts (file `.joblib`).
- **`backend/src/optimizer`**: Chứa logic thuật toán **A*** và **KMeans** để phân cụm và tìm đường đi ngắn nhất về mặt thời gian.

### 2. Frontend Layer
- **`src/pages`**: Mỗi trang trong ứng dụng tương ứng với một tính năng chính như `Optimization` (Tối ưu hóa), `Orders` (Quản lý đơn hàng).
- **`src/services/api.ts`**: Tập trung tất cả các lời gọi API tới backend, giúp dễ dàng quản lý và thay đổi cấu hình endpoint.

### 3. Cấu hình hệ thống
- **`docker-compose.yml`**: Định nghĩa cách các container (API, Postgres, Redis, Celery) hoạt động cùng nhau.
- **`nginx.conf`**: Đảm bảo các request được điều hướng đúng tới Frontend hoặc Backend API.
