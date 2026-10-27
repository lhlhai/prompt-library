---
title: API Contract Testing
slug: api-contract-testing
category: API & Integration
tags: [api, contract, schema, integration]
level: Intermediate
name: api-contract-testing
description: Kiểm tra contract API về request/response, schema, lỗi, xác thực và tương thích; nạp skill này khi lập kế hoạch hoặc rà soát kiểm thử API trước khi consumer phụ thuộc vào endpoint.
---

# API Contract Testing

Hướng dẫn QA kiểm tra sự phù hợp giữa hành vi API và contract/spec được cung cấp. Chỉ kết luận dựa trên bằng chứng quan sát được; không tự suy diễn quy tắc nghiệp vụ còn thiếu.

## Phạm vi và thời điểm dùng

Dùng khi rà soát endpoint, thiết kế test case hoặc phân tích mismatch giữa API với OpenAPI/spec, tài liệu hay contract do người dùng cung cấp. Tập trung vào method/path, request và response, status code, schema, lỗi, xác thực/phân quyền và khả năng tương thích.

Không coi skill này là bằng chứng rằng test đã chạy. Nếu không có spec, môi trường hoặc quyền truy cập cần thiết, hãy lập kế hoạch kiểm tra và nêu rõ thiếu gì thay vì khẳng định kết quả.

## Quy trình

1. **Xác định căn cứ.** Ghi rõ nguồn contract, phiên bản nếu có, endpoint/method, môi trường và consumer liên quan. Tách yêu cầu được tài liệu xác nhận khỏi giả định hoặc câu hỏi chưa được trả lời.
2. **Lập bảng kiểm theo endpoint.** Kiểm tra method/path, tham số và kiểu dữ liệu, trường bắt buộc/tùy chọn, enum, nullable, định dạng và giới hạn; auth scheme và quyền; status code; response/error schema; pagination nếu áp dụng.
3. **Thiết kế trường hợp kiểm tra.** Bao gồm đường đi thành công; thiếu trường bắt buộc, sai kiểu và giá trị biên; dữ liệu không hợp lệ; auth thiếu/sai và role không đủ quyền; resource không tồn tại. Với thao tác ghi, xem xét retry, gửi trùng, idempotency và đọc lại sau ghi theo contract. Bỏ qua trường hợp không áp dụng và ghi lý do.
4. **Thực thi chỉ khi được phép và có bằng chứng đầu vào.** Dùng đúng môi trường được chỉ định, dữ liệu thử nghiệm và thông tin xác thực được cấp. Mặc định không gửi thao tác ghi hoặc tạo side effect nếu chưa được cho phép. Không dùng production, dữ liệu cá nhân thật hay bí mật không được ủy quyền; không tự tạo hoặc đoán credential. Nếu thiếu quyền/môi trường, dừng ở kế hoạch và nêu giới hạn.
5. **Đối chiếu và phân loại.** So sánh request/response quan sát được với contract cùng phiên bản. Phân biệt mismatch đã tái hiện với giả định, thiếu thông tin và vấn đề có khả năng xảy ra. Đánh giá thay đổi theo hành vi consumer và quy tắc tương thích đã nêu; không mặc định mọi trường mới đều breaking nếu contract cho phép consumer bỏ qua trường đó.
6. **Báo cáo kết quả.** Với mỗi phát hiện, nêu endpoint, điều kiện tái hiện tối thiểu, kỳ vọng và thực tế, bằng chứng (request/response đã khử dữ liệu nhạy cảm, status/header, correlation ID nếu có), môi trường/phiên bản, mức ảnh hưởng và trạng thái: đã xác nhận, chưa xác nhận hoặc giả định. Không tuyên bố test pass/fail nếu chưa có kết quả chạy tương ứng.

## Tiêu chí chất lượng

- Mỗi test case gắn với điều khoản contract hoặc được đánh dấu rõ là câu hỏi/giả định.
- Kỳ vọng đo được; không dùng nhận xét mơ hồ như “hoạt động đúng”.
- Bao phủ cả thành công và lỗi phù hợp với endpoint, tránh lặp test không tạo thêm giá trị.
- Báo cáo tái hiện được, không làm lộ token, mật khẩu, dữ liệu cá nhân hoặc bí mật trong log/ảnh chụp.
- Nêu rõ giới hạn kiểm thử, dữ liệu chưa kiểm tra và các quyết định cần chủ sở hữu API xác nhận.

## Checklist bàn giao

- [ ] Đã nêu contract/spec và phiên bản làm căn cứ, hoặc ghi rõ là chưa có.
- [ ] Test matrix bao phủ schema, status, lỗi và auth/quyền phù hợp.
- [ ] Thao tác có side effect chỉ được thực hiện khi có ủy quyền và dữ liệu thử nghiệm an toàn.
- [ ] Mỗi phát hiện phân biệt bằng chứng, giả định và câu hỏi còn mở.
- [ ] Kết quả không hàm ý đã chạy test hay truy cập hệ thống khi chưa thực sự có bằng chứng.
