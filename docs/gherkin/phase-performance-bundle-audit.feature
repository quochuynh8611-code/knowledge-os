# language: vi
Tính năng: Tối Ưu Hóa Kích Thước Bundle & Phân Đoạn Mã Nguồn (Phase Performance-Bundle-Audit)

  Bối cảnh:
    Cho rằng ứng dụng Không Gian Nghiên Cứu được xây dựng ở chế độ production thông qua Vite

  Kịch bản: 1. Initial Bundle Chunk không vượt quá ngưỡng cảnh báo 500 kB
    Khi tiến hành build production với lệnh npm run build
    Thì kích thước của initial entry chunk phải nhỏ hơn 500 kB sau khi minification
    Và không xuất hiện cảnh báo "Some chunks are larger than 500 kB"

  Kịch bản: 2. Các màn hình chuyên sâu và nặng được tải không đồng bộ (On-Demand)
    Khi người dùng mở ứng dụng tại trang Dashboard
    Thì các module chuyên sâu (Knowledge Graph, Ma trận, Thư viện Biểu đồ Recharts, AI Studio) chưa được nạp ngay lập tức
    Và các module này chỉ được tải về khi người dùng chuyển sang tab tương ứng

  Kịch bản: 3. Tách biệt Vendor Chunks để tối ưu hóa bộ nhớ đệm trình duyệt
    Khi trình duyệt tải ứng dụng
    Thì các thư viện bên thứ 3 (React, Recharts, Lucide Icons) được chia thành các tệp vendor chunk riêng biệt
    Và việc cập nhật mã nguồn ứng dụng không làm mất hiệu lực bộ nhớ đệm của các vendor chunk không đổi

  Kịch bản: 4. Bảo toàn tính toàn vẹn và trải nghiệm người dùng
    Khi chuyển đổi giữa tất cả 11 tabs và mở các modal tích hợp
    Thì giao diện hiển thị mượt mà với loading fallback phù hợp
    Và không phát sinh lỗi trắng màn hình hoặc sai lệch hành vi nghiệp vụ
