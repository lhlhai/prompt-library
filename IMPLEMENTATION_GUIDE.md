# Hướng Dẫn Triển Khai Kỹ Thuật: Harness Chatbot Agent Flow

Tài liệu này cung cấp cái nhìn sâu sắc về mặt kỹ thuật, gợi ý Tech Stack, các thư viện cần thiết và hướng đi cụ thể cho từng Phase trong luồng xử lý của Harness Chatbot (QA/Dev Tool). Mục tiêu là giúp đội ngũ phát triển có một bản đồ rõ ràng trước khi bắt tay vào viết code.

---

## 🏗️ Tech Stack Đề Xuất (Tổng Quan)

Để xây dựng một hệ thống Agentic Chatbot có khả năng xử lý luồng phức tạp và streaming real-time, dưới đây là Tech Stack được khuyến nghị:

| Thành phần | Công nghệ / Thư viện đề xuất | Lý do lựa chọn |
| :--- | :--- | :--- |
| **Backend Framework** | FastAPI (Python) hoặc Express/NestJS (Node.js) | Hỗ trợ tốt Async/Await, dễ dàng triển khai Server-Sent Events (SSE) hoặc WebSockets. Python có lợi thế lớn về hệ sinh thái AI. |
| **LLM Orchestration** | LangChain, LlamaIndex, hoặc Semantic Kernel | Cung cấp sẵn các abstraction cho Agent, Tool Calling, Memory và RAG. |
| **LLM Provider** | OpenAI (GPT-4o), Anthropic (Claude 3.5 Sonnet) | Khả năng Function Calling/Tool Use xuất sắc, suy luận logic tốt cho các tác vụ lập trình/QA. |
| **Vector Database** | Pinecone, Qdrant, hoặc Milvus | Tốc độ truy xuất nhanh, dễ tích hợp, hỗ trợ hybrid search (keyword + vector). |
| **State Management** | Redis | Lưu trữ Session State, Chat History, và Pending Data với tốc độ cao. |
| **Streaming Protocol** | Server-Sent Events (SSE) | Phù hợp cho luồng dữ liệu một chiều từ Server về Client (như text generation), dễ triển khai hơn WebSocket nếu không cần Client gửi dữ liệu liên tục. |

---

## 🚀 Chi Tiết Triển Khai Từng Phase

### 1. Khởi tạo & Quản lý Session (Trước Phase 1)

**Mục tiêu:** Nhận request, xác định người dùng đang ở bước nào trong luồng hội thoại và chuẩn bị Context.

**Kiến thức & Hướng đi:**
- **State Machine:** Sử dụng mô hình State Machine (FSM) để quản lý trạng thái của phiên (ví dụ: `IDLE`, `AWAITING_INPUT`, `PROCESSING`).
- **Redis Caching:** Khi nhận request, dùng `session_id` để query Redis lấy ra `role`, `chat_history`, và `current_step`.
- **Intent Classification:** Dùng một LLM call nhỏ (nhanh, rẻ như GPT-4o-mini) hoặc Rule-based (Regex) để phân loại ý định người dùng: Họ đang trả lời câu hỏi của bot hay đang yêu cầu một tác vụ mới?

**Code Snippet Gợi ý (Python/FastAPI):**
```python
# Sử dụng Redis để lưu state
session_data = await redis.hgetall(f"session:{session_id}")
if not session_data:
    session_data = init_new_session(role)
```

---

### Phase 1: Planning (Lập kế hoạch)

**Mục tiêu:** Phân rã yêu cầu phức tạp của người dùng thành các bước nhỏ (Sub-tasks) có thể thực thi được.

**Kiến thức & Hướng đi:**
- **Prompt Engineering:** Viết System Prompt ép LLM trả về định dạng JSON (Structured Output). Ví dụ: `{"plan": [{"step": 1, "action": "search_docs", "desc": "..."}]}`.
- **Structured Outputs:** Sử dụng tính năng `response_format={ "type": "json_object" }` của OpenAI hoặc Pydantic models trong LangChain/Instructor để đảm bảo output luôn đúng format.
- **Streaming Event:** Ngay khi parse được JSON, gửi event `plan` qua SSE về Client.

**Thư viện:** `pydantic` (để validate JSON), `instructor` (patch OpenAI client để trả về Pydantic model).

---

### Phase 2: Retrieval / Search Data (Truy xuất dữ liệu)

**Mục tiêu:** Lấy bối cảnh (Context) cần thiết từ cơ sở dữ liệu nội bộ (Tài liệu, Testcase cũ, API Spec).

**Kiến thức & Hướng đi:**
- **RAG (Retrieval-Augmented Generation):**
  - **Embedding:** Dùng mô hình embedding (như `text-embedding-3-small`) để chuyển đổi câu query thành vector.
  - **Vector Search:** Query Vector DB để lấy top K tài liệu liên quan nhất.
- **Hybrid Search:** Kết hợp Vector Search (tìm theo ngữ nghĩa) và Keyword Search (BM25 - tìm theo từ khóa chính xác) để tăng độ chính xác, đặc biệt với các mã lỗi hoặc tên biến cụ thể.
- **Document Chunking:** Đảm bảo tài liệu đã được cắt nhỏ (chunking) hợp lý trước khi lưu vào Vector DB để tránh vượt quá Context Window của LLM.

**Thư viện:** `langchain-community` (Vectorstores), `qdrant-client` hoặc `pinecone-client`.

---

### Phase 3: Tool Calling (Thực thi công cụ)

**Mục tiêu:** Cho phép Agent tương tác với thế giới bên ngoài (đọc file, gọi API Jira, chạy script).

**Kiến thức & Hướng đi:**
- **Function Calling API:** Định nghĩa các tools dưới dạng JSON Schema (OpenAI spec).
  - *Dev Tool:* `read_file(path)`, `run_bash_command(cmd)`, `git_diff()`.
  - *QA Tool:* `get_api_schema(endpoint)`, `query_test_db(sql)`.
- **Agent Loop (ReAct Pattern):** 
  1. Gửi Context + Tools cho LLM.
  2. LLM trả về yêu cầu gọi Tool A.
  3. Server thực thi Tool A (chạy code Python/Node.js tương ứng).
  4. Server gửi kết quả Tool A lại cho LLM.
  5. Lặp lại cho đến khi LLM quyết định đã đủ thông tin.
- **Security & Sandboxing:** **Rất quan trọng!** Nếu cho phép chạy code hoặc bash command, phải chạy trong môi trường cô lập (Docker container, gVisor, hoặc Firecracker microVM) để tránh bị tấn công RCE (Remote Code Execution).

**Thư viện:** `langchain.agents` (AgentExecutor), `docker` (Python SDK để quản lý sandbox).

---

### Phase 4: Thinking / Reasoning (Suy luận & Streaming)

**Mục tiêu:** Tổng hợp toàn bộ Context (từ Phase 2 và 3) để sinh ra câu trả lời cuối cùng (Code, Testcase) và stream từng chữ về Client.

**Kiến thức & Hướng đi:**
- **Context Assembly:** Ghép nối System Prompt + Chat History + Retrieved Docs + Tool Results thành một Prompt hoàn chỉnh.
- **Streaming API:** Gọi LLM API với tham số `stream=True`.
- **Server-Sent Events (SSE):** Sử dụng `StreamingResponse` (trong FastAPI) để yield từng chunk dữ liệu nhận được từ LLM về Client theo chuẩn SSE (`data: {chunk}\n\n`).
- **Token Management:** Theo dõi số lượng token (dùng thư viện `tiktoken`) để tránh vượt quá giới hạn Context Window. Nếu quá dài, cần có cơ chế tóm tắt (Summarize) lịch sử cũ.

**Code Snippet Gợi ý (FastAPI SSE):**
```python
from fastapi.responses import StreamingResponse

async def generate_response():
    async for chunk in llm.astream(prompt):
        yield f"event: thinking\ndata: {chunk.content}\n\n"

return StreamingResponse(generate_response(), media_type="text/event-stream")
```

---

### Phase 5: Finalize & Validate (Kiểm tra & Kết thúc)

**Mục tiêu:** Đảm bảo output cuối cùng đạt chất lượng trước khi lưu lại và đóng luồng.

**Kiến thức & Hướng đi:**
- **Output Parsing:** Nếu output yêu cầu định dạng cụ thể (ví dụ: Markdown chứa code block), dùng Regex để bóc tách phần code ra.
- **Validation (Tùy chọn):**
  - *Với Code:* Chạy thử linter (như `flake8`, `eslint`) hoặc chạy Unit Test ngầm. Nếu lỗi, tự động trigger lại Phase 3 để LLM tự sửa lỗi (Self-Correction).
  - *Với Testcase:* Kiểm tra xem có đủ các trường bắt buộc không.
- **State Update:** Lưu toàn bộ hội thoại (bao gồm câu trả lời cuối) vào Redis/DB. Cập nhật `current_step` về `IDLE`.
- **Gửi Event Done:** Gửi event `done` để Client biết luồng đã kết thúc và đóng kết nối SSE.

---

## 💡 Tóm Lược Luồng Dữ Liệu (Data Flow)

1. **Client** `POST /api/chat` (Kèm SessionID, Message).
2. **Server** trả về HTTP 200 OK kèm theo một `stream_id` hoặc Client kết nối trực tiếp qua `GET /api/stream?session_id=...`.
3. **Server** chạy Background Task (Agent Loop).
4. Trong lúc chạy, **Server** liên tục `yield` các SSE events: `plan` -> `progress` -> `tool_call` -> `thinking` -> `done`.
5. **Client** lắng nghe `EventSource`, parse JSON và cập nhật UI tương ứng.
