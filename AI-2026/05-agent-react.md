# Agent · ReAct

## Mục tiêu
Cho phép hệ thống lặp qua các vòng **thought → action → observation** để tự điều chỉnh kế hoạch dựa trên kết quả mới.

## Khi nên dùng
- Goal không biết trước chính xác cần bao nhiêu bước.
- Kết quả của action quyết định action tiếp theo.
- Có nhiều tool và cần phối hợp chúng để hoàn thành task.

## Ví dụ: kiểm tra trạng thái đơn hàng

```text
Bạn là support agent.
Mục tiêu: trả lời trạng thái đơn hàng #42.

Được phép dùng:
- search_orders(order_id)
- track_shipment(tracking_id)

Quy tắc:
- Chỉ kết luận sau khi có dữ liệu từ tool.
- Nếu không tìm thấy đơn, nói rõ không đủ dữ liệu.
- Dừng ngay khi đã có trạng thái vận chuyển cuối cùng.
```

## Trace mẫu

```text
Thought 1: Cần tìm đơn hàng #42.
Action 1: search_orders({"order_id":"#42"})
Observation 1: Đơn tồn tại, tracking_id = VN123.

Thought 2: Cần dùng tracking_id để biết trạng thái hiện tại.
Action 2: track_shipment({"tracking_id":"VN123"})
Observation 2: Đang giao, cập nhật lúc 10:30.

Thought 3: Đã đủ dữ kiện để trả lời.
Final: Đơn #42 đang được giao; lần cập nhật gần nhất là 10:30.
```

## Flow

```text
Goal → LLM thought → tool action → observation → LLM thought → ... → final
```

## Guardrail đề xuất
- `max_iterations` và timeout.
- Allowlist tool, schema validation và quyền theo user.
- Dừng khi đạt goal, gặp lỗi không thể khôi phục hoặc thiếu dữ liệu.
- Lưu trace cần thiết để audit nhưng không log secret hoặc dữ liệu nhạy cảm.

## Ranh giới
Agent không nên được hiểu là “LLM có toàn quyền”. Loop chỉ là cơ chế điều phối; quyền thực tế, sandbox, approval và policy phải nằm ở runtime/Harness.
