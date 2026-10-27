---
title: QA Tool Selection
slug: qa-tool-selection
category: Workflow & Tooling
tags: [tooling, decision, automation, workflow]
level: Intermediate
name: qa-tool-selection
description: Chọn công cụ và cách kiểm thử QA phù hợp với artifact, mục tiêu, khả năng tái hiện, quyền truy cập và chi phí. Nạp skill này khi cần đề xuất hoặc chuẩn bị công cụ cho review spec, testcase, API, UI, accessibility, regression hay thu thập bug evidence.
---

# QA Tool Selection

Hướng dẫn chọn cách làm và công cụ QA vừa đủ. Không thay thế yêu cầu sản phẩm, chính sách bảo mật, hay quy trình phê duyệt của dự án.

## Quy trình lựa chọn

1. **Xác định đầu vào và câu hỏi.** Ghi rõ artifact có sẵn (spec, OpenAPI, ứng dụng, log...), điều cần xác minh và kết quả cần bàn giao. Nếu thiếu thông tin thiết yếu, nêu điều cần có thay vì đoán.
2. **Kiểm tra quyền và rủi ro.** Xác nhận môi trường, quyền truy cập, dữ liệu được phép dùng, và liệu thao tác có làm thay đổi trạng thái hay không. Không tự suy ra quyền từ việc URL hoặc hệ thống truy cập được.
3. **Chọn cách đơn giản nhất đủ dùng.** Cân nhắc khả năng tái hiện, quy mô, độ ổn định, định dạng đầu ra và công cụ đã có trong dự án. Chỉ nâng cấp khi lựa chọn hiện tại không đáp ứng yêu cầu; tính cả chi phí cài đặt, bảo trì và đọc kết quả.
4. **Đề xuất cách chạy có thể kiểm chứng.** Nêu công cụ/lý do, đầu vào, lệnh hoặc bước thao tác, kết quả mong đợi, giới hạn và phương án dự phòng. Nếu chưa có môi trường hoặc quyền chạy, chỉ đưa hướng dẫn/template và nói rõ chưa thực thi.
5. **Báo cáo bằng chứng.** Phân biệt phát hiện đã quan sát được với giả định hoặc điều chưa xác minh. Ghi nguồn bằng chứng liên quan (artifact, log, ảnh chụp, request ID, phiên bản hoặc lệnh/kết quả nếu có); không tuyên bố đã chạy test nếu không có kết quả thực tế.

## Bản đồ lựa chọn nhanh

| Công việc | Bắt đầu với | Chỉ nâng cấp khi |
|---|---|---|
| Review story/spec | Markdown/bảng và checklist | Cần review hàng loạt, theo dõi trạng thái hoặc sign-off; dùng spreadsheet nếu phù hợp quy trình nhóm. |
| Sinh feature testcase | Agent và Markdown/CSV | Nhóm có template Excel chuẩn hoặc cần quản lý testcase theo cấu trúc đó. |
| Đọc Swagger/OpenAPI | Parser và review có hướng dẫn | Cần thực thi lặp lại trên nhiều endpoint; cân nhắc Schemathesis hoặc contract runner sẵn có. |
| Gọi API một request | curl/httpie | Cần quản lý collection, environment hoặc chia sẻ request; cân nhắc Postman/Bruno. |
| Regression API | Newman, Bruno CLI hoặc runner hiện có | Cần chạy tự động, lưu report hoặc gate; dùng CI job khi đã được phê duyệt. |
| UI flow | Thao tác thủ công và browser devtools | Flow ổn định, lặp lại và có selector đáng tin cậy; cân nhắc Playwright/Cypress. |
| Accessibility smoke | Bàn phím và browser devtools | Sau smoke, cần kiểm tra tự động bổ sung; cân nhắc axe/Lighthouse. Công cụ tự động không thay thế đánh giá thủ công. |
| Bug evidence | Screenshot, HAR, console và request ID tùy lỗi | Timing/concurrency khó tái hiện; cân nhắc video/trace nếu được phép và cần thiết. |

## Giới hạn an toàn

- Không khám phá bằng thao tác ghi/xóa hoặc mutation trên production. Chỉ chạy thao tác thay đổi trạng thái trong môi trường được phép, với dữ liệu thử nghiệm và phê duyệt cần thiết.
- Không đưa credential thật, token, dữ liệu cá nhân hay bí mật vào ví dụ, collection, log hoặc báo cáo. Che/redact dữ liệu nhạy cảm trước khi chia sẻ.
- Chỉ truy cập tài nguyên và chạy kiểm thử trong phạm vi được ủy quyền. Với URL bên ngoài hoặc file riêng tư, xác nhận quyền và đầu vào được cung cấp; không vượt cơ chế kiểm soát truy cập.
- Không cài dependency hoặc gửi dữ liệu tới dịch vụ bên ngoài nếu chưa cần thiết và chưa được phép. Ưu tiên công cụ hiện có trong dự án.

## Checklist bàn giao

- [ ] Mục tiêu, artifact và môi trường/phạm vi đã rõ; thiếu sót được nêu cụ thể.
- [ ] Lựa chọn tương ứng với độ lặp lại, quyền, rủi ro và chi phí; có lý do cùng phương án dự phòng.
- [ ] Hướng dẫn có đầu vào, lệnh/bước chạy và kết quả mong đợi; giới hạn được nêu.
- [ ] Phát hiện, giả định và việc chưa xác minh được tách biệt; không khẳng định đã chạy khi chưa có bằng chứng.
- [ ] Không để lộ bí mật hoặc thực hiện thao tác ngoài phạm vi được phép.
