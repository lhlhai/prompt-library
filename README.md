# AI Field Notes · Prompt Library

Repository này giữ ứng dụng Prompt Library hiện có và bổ sung landing page cùng hai mô phỏng học tập tương tác. Root `index.html` là landing; ứng dụng Prompt Library cũ vẫn dùng được tại `prompts.html`.

## Hai mô phỏng học tập

- **[SIT vs ST vs IT](https://lhlhai.github.io/prompt-library/SIT/)** — phân biệt Integration Test, System Test và System Integration Test bằng animation, ví dụ và quiz.
- **[AI Pattern Lab](https://lhlhai.github.io/prompt-library/AI-2026/)** — trực quan hóa bảy pattern; nhấn rõ Skill giúp tái sử dụng quy trình, tăng tính nhất quán của output và được Agent/Runtime sử dụng thế nào. Có Playground mock, lý thuyết, bảng so sánh, decision tree và 9 câu quiz.

Hai app nằm trong thư mục riêng (`SIT/`, `AI-2026/`) và chạy bằng HTML/CSS/vanilla JavaScript, không cần framework, npm, build step hoặc API. Các phản hồi trong AI Pattern Lab là dữ liệu minh họa, không phải kết quả từ model thật.

**[Mở landing page](https://lhlhai.github.io/prompt-library/)** · **[Mở Prompt Library](https://lhlhai.github.io/prompt-library/prompts.html)**

## ✨ Tính Năng

### 🔍 Tìm Kiếm Nâng Cao
- **Tìm kiếm toàn văn bản**: Tìm kiếm trong tên, mô tả, prompt content, và hướng dẫn sử dụng
- **Fuzzy Search**: Hỗ trợ tìm kiếm gần đúng, không cần nhập chính xác từng ký tự
- **Debounce Search**: Tối ưu hiệu năng, giảm lag khi gõ
- **Highlight Kết Quả**: Từ khóa tìm kiếm được highlight trong kết quả

### 📂 Lọc Theo Category
- **Lọc theo Label**: Dễ dàng lọc prompts theo danh mục (Meta, Test Architect Level, Senior QA Level, v.v.)
- **Hiển thị Số Lượng**: Mỗi category hiển thị số lượng prompt có sẵn
- **Kết Hợp Tìm Kiếm**: Có thể kết hợp tìm kiếm và lọc cùng lúc

### 📋 Quản Lý Prompts
- **Copy Nhanh**: Copy prompt vào clipboard chỉ với một click
- **Xem Chi Tiết**: Xem toàn bộ prompt trong modal với định dạng dễ đọc
- **Tải Xuống**: Tải prompt dưới dạng file `.txt` để sử dụng offline
- **Thống Kê**: Hiển thị tổng số prompts, số prompts hoạt động, và số kết quả tìm kiếm

## 🚀 Cách Sử Dụng

### Truy Cập Thư Viện
Thư viện được host trên GitHub Pages. Truy cập tại:
```
https://lhlhai.github.io/prompt-library/prompts.html
```

### Tìm Kiếm Prompt
1. Nhập từ khóa vào ô tìm kiếm
2. Kết quả sẽ được cập nhật tự động
3. Từ khóa sẽ được highlight trong kết quả

### Lọc Theo Category
1. Nhấp vào các nút category ở phía trên
2. Chỉ prompts thuộc category đó sẽ được hiển thị
3. Có thể chọn nhiều categories cùng lúc

### Copy Prompt
1. Nhấp nút "📋 Copy" trên card
2. Prompt sẽ được copy vào clipboard
3. Một thông báo sẽ xuất hiện để xác nhận

### Xem Chi Tiết
1. Nhấp nút "👁️ View Full" để xem toàn bộ prompt
2. Modal sẽ hiển thị:
   - Prompt đầy đủ
   - Hướng dẫn "When to use"
   - Hướng dẫn "How to use"
3. Có thể copy hoặc tải xuống từ modal

## 📝 Cấu Trúc Dự Án

```
prompt-library/
├── index.html              # Landing page cho hai mô phỏng
├── prompts.html            # Prompt Library hiện có
├── README.md
├── SIT/                    # Mô phỏng IT / ST / SIT
└── AI-2026/                # Mô phỏng bảy AI pattern
```
Các tài sản CSS, JavaScript và dữ liệu ở root vẫn được giữ cho Prompt Library cùng các trang khác trong repository.

## 🔧 Cải Tiến Gần Đây (v2.0)

### Issue #1: Optimize Search ✅
- Thêm **Fuzzy Search** để tìm kiếm gần đúng
- Thêm **Debounce** để tối ưu performance (300ms delay)
- Thêm **Highlight** từ khóa trong kết quả tìm kiếm
- Tìm kiếm trong tất cả các field: name, label, description, prompt, when_to_use, how_to_use

### Issue #2: Category Filter ✅
- Thêm **Thanh lọc Category** ở phía trên grid
- Hiển thị **số lượng prompts** trong mỗi category
- Hỗ trợ **chọn nhiều categories** cùng lúc
- Có thể **kết hợp tìm kiếm và lọc**

## 🛠️ Hướng Dẫn Phát Triển

### Thêm Prompt Mới
1. Mở file `prompts.html`
2. Tìm mảng `PROMPTS` (khoảng dòng 358)
3. Thêm object mới theo schema:

```javascript
{
  "number": 18,                           // ID duy nhất
  "name": "Tên Prompt",                   // Tên hiển thị
  "label": "Category/Level",              // Danh mục
  "prompt": "Nội dung prompt...",         // Prompt chính
  "description": "Mô tả ngắn",            // Mô tả
  "when_to_use": "Khi nào sử dụng",       // Hướng dẫn khi nào dùng
  "how_to_use": "Cách sử dụng",           // Hướng dẫn cách dùng
  "disabled": false,                      // Có hoạt động không
  "created_at": "2026-04-02T10:00:00Z",   // Ngày tạo
  "updated_at": "2026-04-02T10:00:00Z"    // Ngày cập nhật
}
```

4. Lưu file và commit lên GitHub

### Chỉnh Sửa Prompt Hiện Có
1. Tìm prompt cần sửa trong mảng `PROMPTS`
2. Cập nhật các field cần thiết
3. Cập nhật `updated_at` thành thời gian hiện tại
4. Lưu file và commit

### Vô Hiệu Hóa Prompt
Đặt `"disabled": true` để ẩn prompt khỏi danh sách (nhưng vẫn giữ lại dữ liệu)

## 📊 Danh Sách Prompts Hiện Có

| # | Tên | Category | Mô Tả |
|---|-----|----------|-------|
| 0 | QA Workflow Orchestrator | Meta | Tự động đề xuất chuỗi prompt phù hợp |
| 1 | Spec Review | Test Architect Level | Đánh giá chất lượng spec |
| 2 | Spec Gap Analysis | Senior QA Level | So sánh Requirement vs Spec |
| 3 | Risk Analysis | Test Architect Level | Phân tích rủi ro hệ thống |
| 4 | Critical Path Analysis | Test Architect Level | Xác định Critical User Flow |

*Xem file `prompts.html` để tìm kiếm và sử dụng thư viện đầy đủ.*

## 🤝 Đóng Góp

Chúng tôi hoan nghênh các đóng góp từ cộng đồng! Để đóng góp:

1. **Fork** repository này
2. **Tạo branch** mới cho feature của bạn (`git checkout -b feature/your-feature`)
3. **Commit** thay đổi (`git commit -m 'Add your feature'`)
4. **Push** lên branch (`git push origin feature/your-feature`)
5. **Tạo Pull Request**

### Hướng Dẫn Đóng Góp Prompts
- Prompts nên được viết bởi các chuyên gia hoặc dựa trên best practices
- Mỗi prompt phải có mô tả rõ ràng về khi nào sử dụng
- Hướng dẫn sử dụng phải cụ thể và dễ hiểu
- Tên prompt phải ngắn gọn, mô tả rõ ràng

## 🐛 Báo Cáo Bug

Nếu bạn phát hiện bug hoặc có gợi ý cải thiện, vui lòng:
1. Mở [GitHub Issues](https://github.com/lhlhai/prompt-library/issues)
2. Mô tả chi tiết vấn đề hoặc gợi ý
3. Cung cấp ảnh chụp nếu có

## 📋 Roadmap

### Sắp Tới
- [ ] **Dark Mode** (Issue #3): Hỗ trợ giao diện tối
- [ ] **Favorites** (Issue #4): Lưu prompts yêu thích vào localStorage
- [ ] **Refactoring** (Issue #5): Tách CSS/JS ra file riêng

### Tương Lai
- [ ] Hỗ trợ multiple languages
- [ ] Export prompts dưới dạng JSON
- [ ] Tích hợp với các AI tools
- [ ] Phiên bản mobile app

## 📄 License

Dự án này được cấp phép dưới [MIT License](LICENSE)

## 👤 Tác Giả

**Lê Hải** - QA Architect

- GitHub: [@lhlhai](https://github.com/lhlhai)

## 🙏 Cảm Ơn

Cảm ơn tất cả những người đã đóng góp ý tưởng, feedback, và prompts cho dự án này!

---

**Phiên bản hiện tại**: v2.0  
**Cập nhật lần cuối**: 02/04/2026  
**Status**: ✅ Đang phát triển tích cực
