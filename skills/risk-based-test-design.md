---
title: Risk-based Test Design
slug: risk-based-test-design
category: Test Design
tags: [risk, prioritization, test-plan]
level: Intermediate
name: risk-based-test-design
description: Thiết kế và ưu tiên kiểm thử theo xác suất lỗi, mức độ ảnh hưởng và bằng chứng sẵn có. Nạp skill này khi lập test plan, rà soát phạm vi release hoặc cần quyết định kiểm thử nào nên làm trước.
---

# Risk-based Test Design

## Mục đích và phạm vi

Dùng phương pháp này để phân bổ nỗ lực kiểm thử theo rủi ro, thay vì giả định mọi luồng cần cùng độ sâu. Áp dụng khi lập hoặc cập nhật kế hoạch kiểm thử cho thay đổi, release, business flow hay tích hợp. Kết quả hỗ trợ quyết định QA; không tự nó chứng minh sản phẩm an toàn để phát hành hoặc thay thế tiêu chí go/no-go của nhóm.

## Quy trình

1. **Xác định phạm vi.** Ghi rõ thay đổi/release, luồng nghiệp vụ, thành phần hoặc tích hợp liên quan, môi trường và những gì nằm ngoài phạm vi. Dùng thông tin được cung cấp; nếu thiếu, nêu câu hỏi cần xác minh.
2. **Thu thập bằng chứng.** Xem xét yêu cầu, mô tả thay đổi, sơ đồ luồng, lịch sử lỗi và thông tin về dữ liệu, quyền truy cập, phụ thuộc, concurrency hoặc rollback nếu có. Phân biệt điều quan sát được với suy luận; gắn nguồn/ngữ cảnh cho nhận định quan trọng. Không trình bày giả định như sự kiện hay khẳng định đã chạy test nếu không có kết quả được cung cấp.
3. **Lập risk register.** Với mỗi luồng hoặc vùng rủi ro, ghi: rủi ro/sự cố có thể xảy ra, nguyên nhân hoặc tín hiệu liên quan, xác suất (P), tác động (I), điểm, bằng chứng và giả định còn mở.
4. **Chấm điểm nhất quán.** Dùng thang 1–5 cho P và I. P: 1 = ít khả năng theo bằng chứng hiện có; 3 = có thể xảy ra hoặc bằng chứng hỗn hợp; 5 = đã xảy ra lặp lại hoặc dấu hiệu mạnh cho thấy dễ xảy ra. I: 1 = bất tiện nhỏ, dễ khắc phục; 3 = làm gián đoạn chức năng chính hoặc cần khôi phục đáng kể; 5 = có thể gây mất/hỏng dữ liệu, tổn thất tài chính lớn, lộ dữ liệu hoặc vi phạm quyền nghiêm trọng. Điểm `P × I` (1–25) dùng để sắp xếp, không phải xác suất thống kê. Nếu chưa đủ dữ liệu, ghi “chưa biết” và chỉ rõ điều cần xác minh; không tạo độ chính xác giả.
5. **Ưu tiên và chọn kiểm thử.** Xếp rủi ro theo điểm; với điểm bằng nhau, ưu tiên tác động nghiêm trọng, sau đó luồng cốt lõi, bề rộng ảnh hưởng và mức bất định. Gán P0 cho rủi ro nghiêm trọng cần xác minh trước khi phát hành; P1 cho rủi ro cao cần kiểm thử trong vòng hiện tại; P2 cho rủi ro thấp hơn có thể xếp sau nếu được chấp thuận. Nêu lý do nếu ưu tiên lệch khỏi thứ tự điểm. Chọn độ sâu phù hợp: smoke, happy path, negative, boundary, integration hoặc exploratory; liên kết mỗi kiểm thử với rủi ro mà nó giảm.
6. **Ghi khoảng trống và quyết định.** Liệt kê phần chưa kiểm thử, lý do, rủi ro còn lại, người/nhóm cần quyết định và tín hiệu cần theo dõi sau phát hành. Không tự quyết định chấp nhận rủi ro thay cho người có thẩm quyền.

## Định dạng đầu ra

Trình bày ngắn gọn, tối thiểu gồm:

- **Phạm vi và cơ sở:** thay đổi được xem xét, nguồn thông tin đã có, dữ liệu còn thiếu.
- **Risk register:** rủi ro, P, I, điểm, bằng chứng/giả định và kiểm thử giảm thiểu.
- **Danh sách ưu tiên:** P0/P1/P2, mục tiêu kiểm thử và lý do xếp hạng.
- **Coverage gaps và rủi ro tồn dư:** nội dung chưa kiểm thử, lý do và điều kiện cần xác minh.
- **Theo dõi/ra quyết định:** tín hiệu sau release và quyết định cần owner có thẩm quyền đưa ra.

## Giới hạn an toàn và checklist

- Không thực hiện thao tác phá hủy, thay đổi dữ liệu, gửi giao dịch thật hoặc kiểm thử trên production nếu chưa được cho phép rõ ràng và chưa có biện pháp bảo vệ phù hợp. Không đưa dữ liệu nhạy cảm vào báo cáo; dùng mô tả đã lược bỏ thông tin nhận dạng.
- Không suy diễn rằng điểm số, test plan hay tài liệu này là kết quả kiểm thử đã thực thi. Chỉ ghi trạng thái chạy, kết quả và bằng chứng khi được cung cấp hoặc quan sát trực tiếp.
- Trước khi hoàn tất, kiểm tra: [ ] phạm vi rõ; [ ] phát hiện tách biệt với giả định; [ ] mỗi điểm rủi ro có lý do; [ ] kiểm thử gắn với rủi ro; [ ] khoảng trống, rủi ro tồn dư và quyết định cần owner được nêu rõ.

Không coi một luồng là rủi ro thấp chỉ vì ít được người dùng nhìn thấy; cân nhắc khả năng làm hỏng dữ liệu, gây tổn thất tài chính, vi phạm quyền truy cập và khó khôi phục.