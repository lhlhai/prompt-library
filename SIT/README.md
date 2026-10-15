# Test Scope Lab — IT · ST · SIT

Ứng dụng học tập tương tác giúp phân biệt **Integration Test (IT)**, **System Test (ST)** và **System Integration Test (SIT)** qua sơ đồ SVG có animation, phần lý thuyết, bảng so sánh và quiz.

## Vị trí trong repository

```text
prompt-library/
└── SIT/
    ├── index.html
    ├── style.css
    ├── app.js
    └── README.md
```

## Chạy tại máy

Không cần cài đặt, npm, máy chủ hay build step. Mở trực tiếp `SIT/index.html` bằng trình duyệt hiện đại; các đường dẫn CSS và JavaScript đều tương đối trong thư mục này.

## Truy cập qua GitHub Pages

Khi GitHub Pages của repository `prompt-library` đã được bật và xuất bản từ thư mục gốc của nhánh `main`, ứng dụng trong thư mục con này sẽ ở địa chỉ:

```text
https://<username>.github.io/prompt-library/SIT/
```

Nếu Pages của repository đang dùng GitHub Actions hoặc một nhánh/thư mục nguồn khác, giữ nguyên cấu hình hiện tại và bảo đảm thư mục `SIT/` được đưa vào artifact xuất bản. Không cần chuyển các tệp này ra thư mục gốc.

## Phạm vi khái niệm

- **IT:** kiểm tra các interface giữa module trong cùng hệ thống, ví dụ UI ↔ Auth hoặc Payment ↔ Database.
- **ST:** kiểm tra toàn bộ hệ thống như một black-box theo requirement; không tập trung vào cấu trúc module bên trong.
- **SIT:** kiểm tra luồng tích hợp giữa các subsystem/service độc lập qua API, message queue hoặc network.

Ranh giới phân biệt cốt lõi là đối tượng và phạm vi kiểm thử, không chỉ là số lượng thành phần.
