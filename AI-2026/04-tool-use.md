# Tool Use

## Mục tiêu
Cho phép LLM đề xuất một lời gọi tool có cấu trúc; runtime thực thi tool rồi đưa kết quả về cho LLM để tạo câu trả lời cuối.

## Khi nên dùng
- Cần dữ liệu thời gian thực hoặc dữ liệu nằm ngoài context.
- Có một hoặc vài action rõ ràng, không cần loop tự trị.
- Muốn tách phần suy luận ngôn ngữ khỏi phần thực thi API/database.

## Ví dụ: tra cứu thời tiết

**Tool schema:**

```json
{
  "name": "weather",
  "description": "Tra cứu thời tiết hiện tại của một thành phố",
  "parameters": {
    "type": "object",
    "properties": {"city": {"type": "string"}},
    "required": ["city"]
  }
}
```

**Prompt:**

```text
Bạn là trợ lý thời tiết.
Nếu câu hỏi cần dữ liệu hiện tại, hãy gọi tool weather.
Không tự bịa nhiệt độ. Sau khi nhận tool result, trả lời bằng tiếng Việt trong một câu.

Người dùng: Thời tiết Hà Nội hôm nay thế nào?
```

**Function call do model đề xuất:**

```json
{"name":"weather","args":{"city":"Hanoi"}}
```

**Tool result mock:**

```json
{"city":"Hanoi","temperature_c":28,"condition":"partly cloudy"}
```

**Output cuối:** `Hà Nội hiện 28°C, trời có mây rải rác.`

## Flow

```text
Prompt → LLM (tool call) → runtime/tool → tool result → LLM → final answer
```

## Quy tắc an toàn
- Validate tên tool và schema argument trước khi gọi.
- Phân biệt tool đọc dữ liệu với tool ghi/xóa dữ liệu.
- Timeout và xử lý lỗi tool phải do runtime đảm nhiệm.
- Không để model tự quyết định quyền truy cập chỉ bằng text trong prompt.

## Ranh giới
Tool Use đơn giản thường xử lý một lời gọi tool. Nếu cần nhiều vòng suy nghĩ–hành động–quan sát, dùng Agent; nếu cần policy, logging, approval và giới hạn quyền ở cấp runtime, cần Harness.
