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

## Ví dụ Markdown theo pattern

Các file dưới đây là ví dụ độc lập để đọc và sao chép khi thiết kế prompt hoặc workflow:

| Pattern | File ví dụ |
|---|---|
| Zero / One-shot | [`01-zero-one-shot.md`](./01-zero-one-shot.md) |
| Few-shot | [`02-few-shot.md`](./02-few-shot.md) |
| Planning | [`03-planning.md`](./03-planning.md) |
| Tool Use | [`04-tool-use.md`](./04-tool-use.md) |
| Agent · ReAct | [`05-agent-react.md`](./05-agent-react.md) |
| Skill | [`06-skill.md`](./06-skill.md) |
| Harness | [`07-harness.md`](./07-harness.md) |

Mỗi ví dụ nêu mục tiêu, khi nên dùng, prompt hoặc schema mẫu, flow, guardrail và ranh giới của pattern. Khi bấm **Xem ví dụ Markdown** trong tab Theory, nội dung được fetch từ file `.md` local và render ngay trong dialog; nếu viewer không tải được, vẫn có nút mở file trực tiếp. Dữ liệu chỉ mang tính minh họa; không có file nào gọi API thật.

### Cấu hình feature

Metadata và trạng thái bật/tắt của các pattern được tập trung trong `app.js` ở hằng số `PATTERN_CONFIG`. Tất cả feature mặc định là `enabled: true`; viewer Markdown được cấu hình trong `FEATURE_CONFIG.markdownViewer`. Để tạm tắt một feature trên GitHub Pages, sửa trực tiếp giá trị trong JavaScript. Không có remote config, backend hoặc write-back dữ liệu.


## Skills: vai trò và lợi ích

**Skill** là gói capability có thể tái sử dụng, thường gồm instructions, các bước xử lý, examples và tham chiếu tới tools phù hợp. Người gọi hoặc Agent chọn Skill; Runtime/Harness nạp nội dung vào context; LLM áp dụng procedure; Tool thực hiện từng action. Skill không phải Agent tự quyết định vòng lặp, cũng không phải function thực thi. Cách đóng gói/trigger Skill có thể khác nhau tùy nền tảng.

Lợi ích là tái sử dụng quy trình thay vì chép prompt, giữ tiêu chuẩn/format nhất quán, ghép capability vào workflow khác, và version/test/bảo trì riêng. Nếu nền tảng hỗ trợ nạp Skill theo nhu cầu, việc đó có thể giảm prompt boilerplate luôn nằm trong context; không đồng nghĩa tự động giảm số model calls hoặc token.

**Ranh giới an toàn:** Skill có thể mô tả tools được phép dùng, nhưng danh sách đó không tự enforce quyền. Runtime/Harness phải kiểm tra và thực thi quyền thực tế trước khi gọi tool.
