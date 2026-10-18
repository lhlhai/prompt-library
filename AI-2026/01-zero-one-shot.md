# Zero / One-shot

## Mục tiêu
Yêu cầu LLM xử lý một task trực tiếp, không cung cấp ví dụ mẫu hoặc chỉ cung cấp **một** ví dụ ngắn để định hướng format.

## Khi nên dùng
- Task đơn giản, phổ biến và dễ mô tả bằng instruction.
- Không cần state, tool, memory hoặc vòng lặp.
- Muốn giảm độ dài context và giữ flow dễ kiểm soát.

## Ví dụ zero-shot

**Bối cảnh:** Viết lại tiêu đề bug report cho rõ ràng hơn.

```text
Bạn là QA Lead.
Viết lại tiêu đề bug sau theo format: [Module] Hành vi lỗi ngắn gọn.
Không thêm giải thích.

Bug hiện tại: Nút Export không phản hồi khi danh sách có hơn 10.000 bản ghi.
```

**Output kỳ vọng:**

```text
[Report] Nút Export không phản hồi với danh sách trên 10.000 bản ghi
```

## Ví dụ one-shot

```text
Hãy chuyển câu mô tả thành acceptance criteria dạng Given/When/Then.

Ví dụ:
Input: Người dùng đăng nhập bằng tài khoản hợp lệ.
Output: Given tài khoản hợp lệ, When người dùng nhập đúng thông tin và gửi form, Then hệ thống hiển thị trang Dashboard.

Input: Người dùng lọc danh sách theo trạng thái "Failed".
Output:
```

## Flow

```text
Prompt + instruction (+ 1 example) → 1 LLM call → Output
```

## Ranh giới
Zero/One-shot không tự kiểm chứng sự thật, không gọi tool và không tự chia task thành nhiều bước. Nếu output cần quy trình nhiều bước, dữ liệu bên ngoài hoặc retry có điều kiện, hãy cân nhắc Planning, Tool Use, Agent hoặc Harness.
