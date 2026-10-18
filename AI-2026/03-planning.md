# Planning

## Mục tiêu
Tách một task thành các bước có thứ tự trước khi thực thi, giúp LLM xử lý bài toán nhiều phần thay vì trả lời ngay một lần.

## Khi nên dùng
- Task có dependency rõ giữa các bước.
- Cần checklist để giảm bỏ sót.
- Muốn review hoặc chỉnh plan trước khi chạy.

## Ví dụ: lập kế hoạch kiểm thử tính năng checkout

```text
Bạn là Test Architect.
Lập kế hoạch kiểm thử cho tính năng checkout của cửa hàng online.

Bối cảnh:
- Người dùng có thể thanh toán bằng thẻ hoặc ví điện tử.
- Có mã giảm giá theo phần trăm.
- Đơn hàng có thể chứa sản phẩm hết hàng.

Yêu cầu:
1. Chia công việc thành các bước có thứ tự.
2. Nêu dependency và dữ liệu cần chuẩn bị.
3. Không thực thi test, chỉ trả về plan.
4. Kết thúc bằng danh sách rủi ro cần ưu tiên.
```

## Plan mẫu

```text
1. Phân tích rule giá, tồn kho, mã giảm giá và payment.
2. Liệt kê các biến đầu vào và test data đại diện.
3. Kiểm thử happy path cho thẻ và ví điện tử.
4. Kiểm thử boundary: mã giảm giá 0%, 100%, hết hạn và sản phẩm hết hàng.
5. Kiểm thử lỗi payment, retry và trạng thái đơn hàng.
6. Tổng hợp coverage, dependency và rủi ro còn lại.
```

## Flow

```text
Task → LLM tạo plan → thực thi step 1 → step 2 → ... → tổng hợp output
```

Mỗi step có thể dùng cùng một LLM hoặc một workflow runner khác. Planning tự nó không đồng nghĩa với Agent: plan có thể cố định và không tự đổi hướng theo observation.

## Guardrail đề xuất
- Giới hạn số bước tối đa.
- Yêu cầu mỗi bước có input và output rõ ràng.
- Cho phép người dùng approve plan trước khi thực thi.
- Không coi plan do model tạo là bằng chứng đã hoàn tất công việc.

## Ranh giới
Nếu cần tự quan sát kết quả, chọn action tiếp theo và lặp cho tới khi đạt mục tiêu, hãy dùng Agent. Nếu có tool hoặc quyền nhạy cảm, Harness vẫn phải validate trước khi thực thi.
