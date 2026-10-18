# Harness

## Mục tiêu
Cung cấp lớp runtime điều phối toàn bộ vòng đời request: dựng context, đăng ký tool, quản lý memory, chạy loop, kiểm tra guardrails, timeout và logging.

Harness không phải một prompt riêng; đây là lớp kiểm soát bao quanh LLM và các capability khác.

## Ví dụ: chặn thao tác xóa hàng loạt

**User request:**

```text
Xóa toàn bộ user không hoạt động.
```

**Context được dựng:**

```text
system policy: Không được xóa dữ liệu production nếu chưa có approval.
tool schema: bulk_delete_users(scope), get_inactive_users()
memory: ticket #42, actor = support-agent
```

**LLM đề xuất:**

```json
{"name":"bulk_delete_users","args":{"scope":"all"}}
```

**Harness kiểm tra:**

```text
1. Xác định tool là destructive.
2. Kiểm tra actor và approval.
3. Không có approval → block.
4. Ghi audit event.
5. Gợi ý action an toàn hơn: lấy danh sách user không hoạt động để review.
```

**Kết quả:**

```text
Không thể thực hiện xóa hàng loạt vì request chưa có approval. Tôi có thể tạo danh sách user không hoạt động để bạn review trước.
```

## Flow

```text
Build context → LLM call → validate tool/policy → allow hoặc block → execute tool → observe → LLM/final → log
```

## Các trách nhiệm thường thuộc Harness
- Quản lý system prompt, context window và tool registry.
- Kiểm tra schema, quyền, policy và approval.
- Giới hạn token, thời gian, số vòng lặp và chi phí.
- Quản lý memory/session và redaction dữ liệu nhạy cảm.
- Retry có kiểm soát, fallback, tracing và audit log.

## Nguyên tắc an toàn
Guardrail phải nằm ở lớp thực thi, không chỉ trong instruction. Nếu model trả về một tool call nguy hiểm, Harness phải có khả năng chặn độc lập trước khi tool nhận request.

## Ranh giới
Harness không thay thế chất lượng prompt, planning hay agent loop. Nó là runtime layer để các pattern đó chạy trong giới hạn có thể quan sát, kiểm soát và audit.
