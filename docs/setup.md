# Hướng Dẫn Cài Đặt & Khởi Chạy

Dự án LogiSense AI được thiết kế để triển khai dễ dàng bằng Docker.

## 📋 Yêu cầu hệ thống
- **Docker** và **Docker Compose**.
- **Node.js** (Nếu muốn chạy frontend local không qua Docker).
- **Python 3.12+** (Nếu muốn chạy backend local không qua Docker).

## 🚀 Khởi chạy nhanh với Docker (Khuyên dùng)

1. **Chuẩn bị môi trường:**
   Sao chép file cấu hình mẫu:
   ```bash
   cp .env.example .env
   ```

2. **Khởi chạy toàn bộ hệ thống:**
   ```bash
   docker-compose up --build -d
   ```

3. **Truy cập ứng dụng:**
   - **Frontend:** [http://localhost:3000](http://localhost:3000)
   - **Backend API (Swagger):** [http://localhost:8000/docs](http://localhost:8000/docs)
   - **MLflow UI:** [http://localhost:5000](http://localhost:5000)

## 🛠️ Chạy trong môi trường phát triển (Local Development)

### 1. Backend (FastAPI)
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Trên Windows: venv\Scripts\activate
pip install -r requirements.txt
python src/api/main.py
```

### 2. Frontend (React + Vite)
```bash
npm install
npm run dev
```

## 📊 Huấn luyện mô hình Machine Learning

Để huấn luyện lại mô hình AdaBoost với dữ liệu mới:
```bash
docker-compose exec backend python scripts/train.py
```
Sau khi chạy, file mô hình mới sẽ được lưu vào thư mục `artifacts/models/` và MLflow sẽ ghi lại các chỉ số đánh giá.

## 🧪 Chạy Tests
```bash
# Backend tests
docker-compose exec backend pytest

# Frontend lints
npm run lint
```

## ⚠️ Lưu ý quan trọng
- Đảm bảo các cổng `3000`, `8000`, `5432` (Postgres), và `6379` (Redis) không bị chiếm dụng bởi ứng dụng khác.
- Trong môi trường Production, hãy đổi các mật khẩu mặc định trong file `.env`.
