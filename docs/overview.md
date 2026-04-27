# Tổng Quan Dự Án LogiSense AI (Smart Logistics)

**LogiSense AI** là một hệ thống quản lý logistics thông minh, kết hợp giữa trí tuệ nhân tạo (Machine Learning) và các thuật toán tối ưu hóa để giải quyết bài toán giao hàng hiệu quả.

## 🎯 Mục tiêu dự án
- **Dự đoán thời gian giao hàng (ETA):** Sử dụng mô hình **AdaBoost** để dự đoán chính xác thời gian giao hàng dựa trên khoảng cách, mật độ giao thông, thời gian trong ngày và số điểm dừng.
- **Tối ưu hóa lộ trình:** Kết hợp thuật toán **A*** với heuristic từ mô hình AdaBoost để tìm ra lộ trình nhanh nhất (về mặt thời gian) cho shipper.
- **Quản lý vận hành:** Theo dõi đơn hàng, shipper và hiệu suất hệ thống trong thời gian thực.

## 🛠️ Công nghệ cốt lõi

### Backend
- **Framework:** FastAPI (Python 3.12) - Hiệu năng cao, hỗ trợ async.
- **Machine Learning:** Scikit-learn (AdaBoost Regressor).
- **Database:** PostgreSQL (Lưu trữ dữ liệu nghiệp vụ).
- **Caching:** Redis (Cache kết quả dự đoán ETA).
- **Task Queue:** Celery + Redis (Xử lý các tác vụ huấn luyện lại mô hình định kỳ).
- **Model Tracking:** MLflow (Quản lý các phiên bản mô hình).

### Frontend
- **Framework:** React + TypeScript.
- **Build Tool:** Vite.
- **Styling:** CSS hiện đại, thiết kế premium.
- **Data Fetching:** Axios (Kết nối với REST API).

### DevOps & Infrastructure
- **Containerization:** Docker & Docker Compose.
- **Proxy/Web Server:** Nginx.
- **CI/CD Ready:** Cấu trúc module dễ dàng mở rộng và triển khai.

## 🚀 Các tính năng chính
1. **Dashboard:** Tổng quan về hiệu suất, số lượng đơn hàng và trạng thái shipper.
2. **Quản lý Đơn hàng:** Tạo mới, theo dõi và tối ưu hóa lộ trình cho từng đơn hàng.
3. **Tối ưu hóa lộ trình:** Phân cụm đơn hàng (KMeans) và gán cho shipper, sau đó tìm lộ trình tối ưu bằng A*.
4. **Giám sát thời gian thực:** Hiển thị vị trí shipper và dự đoán thời gian đến trên bản đồ.
