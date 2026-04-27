# Kiến Trúc Hệ Thống & Thuật Toán

LogiSense AI không chỉ sử dụng các thuật toán truyền thống mà còn kết hợp Machine Learning để tối ưu hóa hiệu quả thực tế.

## 🧠 Sự kết hợp giữa AdaBoost và A*

Một bài toán khó trong logistics là: **Đường ngắn nhất chưa chắc đã là đường nhanh nhất.** (Do kẹt xe, số điểm dừng, v.v.)

### 1. Dự đoán ETA với AdaBoost
Chúng tôi sử dụng **AdaBoost Regressor** vì:
- **Xử lý phi tuyến tính:** Mối quan hệ giữa (Khoảng cách × Giao thông) và (Thời gian) là không tuyến tính.
- **Tốc độ inference cực nhanh:** Chỉ mất vài microsecond để đưa ra kết quả, cực kỳ phù hợp cho các bài toán thời gian thực.
- **Hiệu quả với dữ liệu trung bình:** Hoạt động tốt ngay cả khi tập dữ liệu không quá lớn (10k - 50k bản ghi).

**Input:** Khoảng cách, Mức độ giao thông (0-3), Giờ trong ngày (cyclic encoded), Số điểm dừng.  
**Output:** Thời gian dự kiến hoàn thành giao hàng (phút).

### 2. Tối ưu lộ trình với A*
Thay vì dùng hàm Heuristic truyền thống (khoảng cách chim bay), chúng tôi sử dụng kết quả từ AdaBoost làm Heuristic cho thuật toán A*.

- **g(n):** Thời gian thực tế đã đi qua các điểm trước đó.
- **h(n):** Thời gian dự kiến (ETA) từ điểm hiện tại đến các điểm còn lại (do AdaBoost cung cấp).
- **f(n) = g(n) + h(n):** Tìm lộ trình có tổng thời gian dự kiến thấp nhất.

## 🔄 Luồng dữ liệu (Data Flow)

1. **Thu thập dữ liệu:** GPS, Traffic API, Dữ liệu đơn hàng.
2. **Tiền xử lý:** Feature Engineering (Chuyển đổi tọa độ, encoding thời gian tuần hoàn).
3. **Huấn luyện mô hình:** AdaBoost học từ dữ liệu lịch sử để hiểu các pattern giao thông.
4. **API Request:** Khi có đơn hàng mới, hệ thống gọi API `/predict_eta` hoặc `/optimize_route`.
5. **Thực thi tối ưu:**
    - Bước 1: Dùng **KMeans** để phân nhóm các đơn hàng cho từng shipper.
    - Bước 2: Dùng **A* + AdaBoost** để sắp xếp thứ tự giao hàng cho mỗi cụm.
6. **Phản hồi:** Cập nhật kết quả lên Dashboard và gửi lộ trình cho shipper.

## 🛠️ Hạ tầng kỹ thuật (Infrastructure)

- **PostgreSQL:** Lưu trữ trạng thái bền vững.
- **Redis:** Lưu trữ tạm thời (Cache) các dự đoán ETA để tăng tốc độ phản hồi cho các tọa độ lân cận.
- **Celery:** Chạy các job huấn luyện lại (Retrain) mô hình mỗi đêm để cập nhật các biến đổi mới nhất về giao thông.
- **MLflow:** Theo dõi chỉ số MAE (Mean Absolute Error) để đảm bảo mô hình mới luôn tốt hơn mô hình cũ trước khi được triển khai chính thức.
