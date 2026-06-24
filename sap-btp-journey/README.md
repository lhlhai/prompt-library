# Hành Trình SAP BTP - Từ 0 Đến Field Service to Cash

Chào mừng đến với repository ghi lại hành trình học **SAP Business Technology Platform (BTP)** từ con số 0, hướng tới việc tự xây dựng giải pháp **"Field Service to Cash"** (Dịch vụ Hiện trường đến Hóa đơn).

## 🎯 Mục Tiêu

- Học SAP BTP từ cơ bản đến nâng cao trong 12-16 tuần
- Xây dựng giải pháp end-to-end: Field Service → Work Order → Invoice
- Tài liệu hóa toàn bộ quá trình học và các vấn đề gặp phải
- Chia sẻ kiến thức với cộng đồng SAP Việt Nam

## 🌐 Website

Truy cập website tại: `https://YOUR_USERNAME.github.io/sap-btp-journey/`

*(Thay YOUR_USERNAME bằng GitHub username của bạn)*

## 📁 Cấu Trúc Repository

```
sap-btp-journey/
├── _config.yml              # Cấu hình Jekyll
├── _layouts/                # Templates cho pages
│   ├── default.html         # Layout mặc định
│   └── post.html            # Layout cho blog posts
├── _posts/                  # Blog posts
├── notes/index.md           # Trang danh sách ghi chú
├── index.md                 # Trang chủ
├── roadmap.md               # Lộ trình học chi tiết
├── resources.md             # Tài nguyên học tập
├── project.md               # Dự án Field Service to Cash
├── SETUP_GUIDE.md           # Hướng dẫn setup GitHub Pages
└── README.md                # File này
```

## 🚀 Quick Start

### 1. Fork/Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/sap-btp-journey.git
cd sap-btp-journey
```

### 2. Chỉnh Sửa Cấu Hình

Sửa file `_config.yml`:
```yaml
url: "https://YOUR_USERNAME.github.io"
author:
  name: "Tên Của Bạn"
  email: "your.email@example.com"
```

### 3. Deploy Lên GitHub Pages

**Option A - Upload trực tiếp:**
1. Tạo repository mới trên GitHub
2. Upload tất cả files
3. Vào Settings → Pages → Enable GitHub Pages

**Option B - Dùng Git CLI:**
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

Sau đó vào Settings → Pages để kích hoạt.

## 📖 Nội Dung Chính

### 1. Roadmap (Lộ Trình Học)
- **5 giai đoạn** chi tiết trong 12-16 tuần
- Checklist từng ngày có thể copy vào Excel
- Bao gồm: lý thuyết + thực hành + tài liệu

### 2. Tài Nguyên
- openSAP (khóa học miễn phí)
- developers.sap.com (tutorials)
- SAP Business Accelerator Hub (APIs)
- SAP BTP Trial (free tier)
- SAP Community (hỏi đáp)

### 3. Dự án Field Service to Cash
Kiến trúc giải pháp:
```
Customer Request 
    → SAP Build Apps (Mobile App)
    → SAP Build Process Automation (Workflow)
    → SAP Integration Suite (Integration)
    → SAP HANA Cloud (Database)
    → S/4HANA (Billing & Finance)
```

### 4. Ghi Chú Kỹ Thuật
Blog cá nhân về:
- Các vấn đề gặp phải khi học
- Cách giải quyết (troubleshooting)
- Tips & Tricks
- Best practices

## 🛠️ Công Nghệ Sử Dụng

- **Jekyll**: Static site generator
- **GitHub Pages**: Hosting miễn phí
- **Markdown**: Định dạng nội dung
- **Custom CSS**: Theme theo màu SAP (#0a6ed1)

## 📝 Viết Bài Mới

Để viết blog post mới:

1. Tạo file trong `_posts/` với tên: `YYYY-MM-DD-ten-bai-viet.md`
2. Thêm front matter:
```yaml
---
layout: post
title: "Tiêu đề"
date: 2024-01-22
tags: [tag1, tag2]
excerpt: "Mô tả ngắn"
---
```
3. Commit và push lên GitHub

## 🔗 Links Hữu Ích

- [SAP BTP Documentation](https://help.sap.com/docs/btp)
- [developers.sap.com](https://developers.sap.com/)
- [openSAP Courses](https://open.sap.com/)
- [SAP Community](https://community.sap.com/)
- [SAP Business Accelerator Hub](https://api.sap.com/)

## 📧 Liên Hệ

- Email: your.email@example.com
- GitHub Issues: [Create an issue](https://github.com/YOUR_USERNAME/sap-btp-journey/issues)

---

**Made with ❤️ by SAP BTP Learner**

*Đang trên hành trình chinh phục SAP BTP!*
