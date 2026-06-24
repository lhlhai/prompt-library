# SAP BTP Journey - GitHub Pages Setup Guide

Hướng dẫn từng bước để tạo và deploy trang web GitHub Pages cho hành trình học SAP BTP.

## 📋 Tổng Quan

Trang web này được xây dựng với:
- **Jekyll**: Static site generator
- **GitHub Pages**: Hosting miễn phí
- **Markdown**: Định dạng nội dung
- **Custom layout**: Giao diện tùy chỉnh theo theme SAP

---

## 🚀 Các Bước Setup

### Bước 1: Tạo GitHub Repository

1. Đăng nhập vào GitHub
2. Click vào dấu **+** ở góc phải → **New repository**
3. Điền thông tin:
   - **Repository name**: `sap-btp-journey` (hoặc tên bạn muốn)
   - **Description**: "Hành trình học SAP BTP từ 0 đến Field Service to Cash"
   - **Visibility**: Public (để GitHub Pages hoạt động)
   - **Initialize with README**: ✅ Checked
4. Click **Create repository**

### Bước 2: Upload Files Lên GitHub

#### Option A: Sử dụng Git Command Line (Recommended)

```bash
# Clone repository về máy
git clone https://github.com/YOUR_USERNAME/sap-btp-journey.git
cd sap-btp-journey

# Copy toàn bộ files từ thư mục này vào repository
# (Copy tất cả files từ /workspace/sap-btp-journey/)

# Add, commit và push
git add .
git commit -m "Initial commit: SAP BTP Journey website"
git push origin main
```

#### Option B: Upload qua GitHub Web Interface

1. Vào repository vừa tạo
2. Click **Add file** → **Upload files**
3. Drag & drop toàn bộ files từ thư mục `/workspace/sap-btp-journey/`
4. Điền commit message: "Initial commit"
5. Click **Commit changes**

### Bước 3: Kích Hoạt GitHub Pages

1. Vào repository trên GitHub
2. Click vào tab **Settings**
3. Scroll xuống phần **Pages** (ở sidebar bên trái)
4. Cấu hình:
   - **Source**: Deploy from a branch
   - **Branch**: Chọn `main` hoặc `master`
   - **Folder**: `/ (root)`
5. Click **Save**

### Bước 4: Chờ Build và Truy Cập

1. GitHub sẽ tự động build site (khoảng 1-2 phút)
2. Refresh trang Settings → Pages
3. Bạn sẽ thấy link truy cập: `https://YOUR_USERNAME.github.io/sap-btp-journey/`

---

## ⚙️ Cấu Hình _config.yml

Trước khi push, hãy chỉnh sửa file `_config.yml`:

```yaml
title: "Hành Trình SAP BTP - Từ 0 Đến Field Service to Cash"
description: "Ghi lại lộ trình học SAP BTP và xây dựng giải pháp Field Service to Cash từ con số 0"
baseurl: "/sap-btp-journey" # Thay bằng tên repository của bạn
url: "https://yourusername.github.io" # Thay bằng username GitHub của bạn
theme: minima

# Tác giả
author:
  name: "Your Name"
  email: "your.email@example.com"
```

**Lưu ý quan trọng:**
- `baseurl`: Phải trùng với tên repository
- `url`: Replace `yourusername` bằng GitHub username của bạn
- `author.name`: Tên hiển thị trên website

---

## 📁 Cấu Trúc Thư Mục

```
sap-btp-journey/
├── _config.yml              # File cấu hình Jekyll
├── _layouts/
│   ├── default.html         # Layout chính cho tất cả pages
│   └── post.html            # Layout cho blog posts
├── _includes/               # (Optional) Các partial templates
├── _posts/                  # Thư mục chứa blog posts
│   └── 2024-01-15-tuan-1-bat-dau-voi-sap-btp.md
├── assets/
│   └── css/                 # (Optional) Custom CSS
├── notes/
│   └── index.md             # Trang danh sách bài viết
├── index.md                 # Trang chủ
├── roadmap.md               # Trang lộ trình học
├── resources.md             # Trang tài nguyên
├── project.md               # Trang dự án FSC
└── SETUP_GUIDE.md           # Hướng dẫn setup
```

---

## 🔧 Troubleshooting

### Problem 1: Site không build thành công

**Triệu chứng:** Trong Settings → Pages hiện error

**Nguyên nhân có thể:**
- Lỗi syntax trong YAML front matter (phần `---` ở đầu file)
- File `_config.yml` không đúng format
- Theme chưa được cài đặt đúng

**Giải pháp:**
1. Kiểm tra logs trong tab **Actions**
2. Validate YAML syntax tại: https://www.yamllint.com/
3. Đảm bảo tất cả markdown files có front matter hợp lệ

### Problem 2: CSS không load

**Triệu chứng:** Trang web hiển thị nhưng không có style

**Giải pháp:**
- Kiểm tra path đến CSS file trong layout
- Đảm bảo file CSS tồn tại trong `assets/css/`
- Clear browser cache và reload

### Problem 3: Links bị gãy

**Triệu chứng:** Click vào menu không chuyển trang

**Nguyên nhân:** `baseurl` trong `_config.yml` không đúng

**Giải pháp:**
```yaml
# Nếu repository tên là: sap-btp-journey
baseurl: "/sap-btp-journey"

# Nếu dùng custom domain hoặc user.github.io repository
baseurl: ""
```

### Problem 4: Blog posts không hiển thị

**Triệu chứng:** Trang /notes/ báo không có bài viết

**Kiểm tra:**
1. File post phải trong thư mục `_posts/` (root level)
2. Filename phải đúng format: `YYYY-MM-DD-slug.md`
3. Front matter phải có `layout: post`
4. `_config.yml` phải có defaults cho `_posts`

---

## 🎨 Customization Tips

### Thay đổi màu sắc

Sửa file `_layouts/default.html`, tìm section `<style>` và thay đổi:

```css
header {
  background: #0a6ed1; /* Đổi màu header */
}

h1, h2, h3 {
  color: #0a6ed1; /* Đổi màu headings */
}
```

### Thêm trang mới

1. Tạo file `.md` mới ở root directory
2. Thêm front matter:
```yaml
---
layout: default
title: "Tên Trang"
---
```
3. Thêm link vào menu trong `_config.yml`:
```yaml
nav:
  - name: "Trang Mới"
    link: "/ten-trang.html"
```

### Thêm Google Analytics

Thêm vào `_layouts/default.html` trước thẻ `</head>`:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

---

## 📝 Cách Viết Blog Post Mới

1. Tạo file mới trong `_posts/` (ở root directory)
2. Đặt tên theo format: `YYYY-MM-DD-ten-bai-viet.md`
3. Nội dung mẫu:

```markdown
---
layout: post
title: "Tên Bài Viết"
date: 2024-01-22
tags: [sap-btp, tutorial]
excerpt: "Mô tả ngắn về bài viết"
---

# Tiêu Đề Bài Viết

Nội dung bài viết ở đây...

## Subheading

More content...

### Code blocks

```javascript
// Code example
console.log("Hello SAP BTP!");
```

### Images

![Alt text](/assets/images/image-name.png)

```

4. Commit và push lên GitHub
5. Chờ GitHub build (1-2 phút)
6. Bài viết sẽ tự động xuất hiện trên trang Notes (/notes/)

---

## 🔗 Additional Resources

- [Jekyll Documentation](https://jekyllrb.com/docs/)
- [GitHub Pages Guide](https://pages.github.com/)
- [Markdown Cheat Sheet](https://www.markdownguide.org/cheat-sheet/)
- [SAP Developers](https://developers.sap.com/)

---

## ✅ Checklist Sau Khi Deploy

- [ ] Website accessible qua GitHub Pages URL
- [ ] Tất cả links trong menu hoạt động
- [ ] Roadmap page hiển thị đúng checklist
- [ ] Resources page có đầy đủ links
- [ ] Project page render đúng diagrams
- [ ] Notes page listing blog posts
- [ ] Mobile responsive (test trên điện thoại)
- [ ] Update _config.yml với thông tin cá nhân

---

**Chúc bạn thành công với hành trình học SAP BTP! 🚀**

Nếu gặp vấn đề, hãy check:
1. GitHub Actions logs
2. Jekyll build errors
3. Browser console errors
