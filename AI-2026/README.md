# AI Pattern Lab

Ứng dụng web tương tác để phân biệt bảy pattern AI: Zero/One-shot, Few-shot, Planning, Tool Use, Agent, Skill và Harness.

## Chạy

Mở trực tiếp `index.html` trong trình duyệt hiện đại. Chỉ dùng HTML, CSS, SVG inline và vanilla JavaScript; không cần npm, build step, server hay API. Tất cả dữ liệu của simulation và Playground đều là mock.

## GitHub Pages

Trong repository `prompt-library`, thư mục này được phục vụ tại:

```text
https://lhlhai.github.io/prompt-library/AI-2026/
```

Trang About có liên kết về landing ở `../index.html`. Có thể tùy chỉnh các ví dụ và quiz trong `app.js`, nội dung/diagram trong `index.html`, và màu sắc/layout trong `style.css`.


## Skills: vai trò và lợi ích

**Skill** là gói capability có thể tái sử dụng, thường gồm instructions, các bước xử lý, examples và tham chiếu tới tools phù hợp. Người gọi hoặc Agent chọn Skill; Runtime/Harness nạp nội dung vào context; LLM áp dụng procedure; Tool thực hiện từng action. Skill không phải Agent tự quyết định vòng lặp, cũng không phải function thực thi. Cách đóng gói/trigger Skill có thể khác nhau tùy nền tảng.

Lợi ích là tái sử dụng quy trình thay vì chép prompt, giữ tiêu chuẩn/format nhất quán, ghép capability vào workflow khác, và version/test/bảo trì riêng. Nếu nền tảng hỗ trợ nạp Skill theo nhu cầu, việc đó có thể giảm prompt boilerplate luôn nằm trong context; không đồng nghĩa tự động giảm số model calls hoặc token.

**Ranh giới an toàn:** Skill có thể mô tả tools được phép dùng, nhưng danh sách đó không tự enforce quyền. Runtime/Harness phải kiểm tra và thực thi quyền thực tế trước khi gọi tool.
