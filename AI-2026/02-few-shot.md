# Few-shot

## Mục tiêu
Cung cấp nhiều cặp input/output mẫu trong context để LLM bắt chước quy tắc, giọng văn hoặc format mà khó mô tả đầy đủ bằng instruction.

## Khi nên dùng
- Cần output nhất quán theo một schema hoặc phong cách cụ thể.
- Quy tắc có nhiều ngoại lệ nhỏ.
- Không muốn fine-tune model cho một biến thể task hẹp.

## Ví dụ: phân loại mức độ rủi ro

```text
Bạn là trợ lý phân loại risk cho QA.
Chỉ trả về JSON với các field: level, reason.
Các level hợp lệ: low, medium, high.

Ví dụ 1
Input: Đổi màu icon trên trang About.
Output: {"level":"low","reason":"Thay đổi hiển thị, không ảnh hưởng luồng nghiệp vụ chính."}

Ví dụ 2
Input: Thay đổi công thức tính tổng tiền trong checkout.
Output: {"level":"high","reason":"Có thể ảnh hưởng trực tiếp đến số tiền người dùng phải thanh toán."}

Ví dụ 3
Input: Thêm filter theo quốc gia trong trang danh sách user.
Output: {"level":"medium","reason":"Ảnh hưởng truy vấn và kết quả hiển thị nhưng không thay đổi dữ liệu thanh toán."}

Hãy phân loại:
Input: Cho phép đổi timezone trong phần cài đặt tài khoản.
Output:
```

## Output kỳ vọng

```json
{"level":"medium","reason":"Ảnh hưởng cách hiển thị thời gian ở nhiều màn hình nhưng không trực tiếp thay đổi dữ liệu nghiệp vụ."}
```

## Flow

```text
Examples + query → 1 LLM call → Output theo pattern của examples
```

Các ví dụ chỉ nằm trong context window; chúng không cập nhật trọng số model.

## Mẹo thiết kế examples
1. Dùng examples đại diện cho các trường hợp quan trọng, không chỉ các ca dễ.
2. Giữ format output giống hệt nhau giữa các examples.
3. Thêm một ví dụ biên nếu lỗi phân loại ở boundary là rủi ro cao.
4. Không đưa dữ liệu nhạy cảm chỉ để minh họa format.

## Ranh giới
Few-shot vẫn thường là một lần gọi LLM và không tự truy vấn nguồn dữ liệu, không giữ memory giữa các request, cũng không đảm bảo output hợp lệ nếu runtime không validate schema.
