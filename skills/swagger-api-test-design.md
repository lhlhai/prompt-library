---
title: Swagger / OpenAPI Test Case Design
slug: swagger-api-test-design
category: API & Integration
tags: [swagger, openapi, api, testcase, json, yaml]
level: Advanced
name: swagger-api-test-design
description: Thiết kế ma trận kiểm thử API từ Swagger/OpenAPI, JSON/YAML hoặc spec fragment; nạp khi cần phân tích contract, xác định coverage và soạn test case hoặc request mẫu an toàn.
---

# Swagger / OpenAPI Test Design

## Phạm vi và cách dùng

Dùng kỹ năng này khi được yêu cầu phân tích Swagger/OpenAPI hoặc thiết kế kiểm thử API. Đầu vào có thể là URL tới spec/UI, file hoặc nội dung JSON/YAML, `paths`/schema fragment, hay request mẫu. Chỉ phân tích tài liệu và bằng chứng được cung cấp hoặc được phép truy cập; không khẳng định đã chạy test, xác minh endpoint hay truy cập hệ thống nếu chưa có bằng chứng thực tế.

Hỗ trợ OpenAPI 2.0/3.x và Swagger 2.0 khi định dạng có thể nhận diện. Nếu chỉ có fragment hoặc thông tin thiếu, đánh dấu `PARTIAL_SPEC`, nêu phần còn thiếu và giới hạn kết luận vào những gì quan sát được. Swagger UI hoặc ví dụ response không mặc nhiên là contract đầy đủ.

## Quy trình

1. **Xác định đầu vào:** ghi rõ loại tài liệu, phạm vi endpoint, phiên bản spec nếu nhận diện được và nguồn/bằng chứng đã cung cấp. Với URL, chỉ đọc tài nguyên công khai hoặc được cho phép; nếu không lấy được raw spec, yêu cầu người dùng cung cấp.
2. **Trích xuất contract:** lập inventory theo endpoint và method; ghi parameters, required/optional, kiểu, constraints, request body, success/error responses, headers, security scheme và server/base URL khi có. Không suy diễn trường hoặc hành vi không nêu trong spec.
3. **Ghi nhận thiếu hụt:** tách biệt `Spec states` (được khai báo), `Observed` (có bằng chứng mẫu/response) và `Assumption / needs confirmation`. Nêu các thiếu hụt ảnh hưởng thiết kế test, chẳng hạn auth, status code, schema hoặc quy tắc dữ liệu.
4. **Thiết kế test theo rủi ro:** bắt đầu với happy path cho từng success response đã khai báo; bổ sung các nhóm phù hợp dưới đây. Không tạo case vô nghĩa cho đặc tính endpoint không sử dụng.
5. **Soạn đầu ra:** xuất matrix Markdown hoặc CSV theo yêu cầu. Thêm request mẫu chỉ khi đủ thông tin và đánh dấu placeholder cho base URL, token, ID và dữ liệu chưa biết. Không chạy request trừ khi người dùng yêu cầu rõ ràng, có môi trường/ủy quyền phù hợp và công cụ thực thi được cung cấp.
6. **Rà soát:** kiểm tra từng expected result có căn cứ từ spec hoặc được gắn rõ là giả định/cần xác nhận; nêu coverage gaps và câu hỏi cần trả lời trước khi thực thi.

## Coverage gợi ý

Chọn các kiểm tra thích hợp với contract và rủi ro:

- Happy path; từng success response, status, header, content type và schema được khai báo.
- Required field bị thiếu; kiểu sai; `null`, rỗng, sai định dạng; ranh giới string/number/array; enum; date/time; pagination.
- Authentication thiếu/sai/hết hạn, role không đủ quyền và object-level authorization khi có security/access rules liên quan.
- Not found, conflict, duplicate/idempotency và retry nếu API có ngữ nghĩa tương ứng.
- Với mutation: kiểm tra side effect và read-after-write; cân nhắc rollback/partial failure, idempotency và cleanup theo thiết kế môi trường test.
- Error response: status, header, content type, schema và error body theo contract.

Không giả định lỗi, mã trạng thái hay hành vi retry nếu spec không quy định; ghi thành câu hỏi cần xác nhận.

## Định dạng đầu ra

Trình bày theo các mục phù hợp: `Input interpretation`, `Assumptions / needs confirmation`, `Endpoint inventory`, `Test case matrix`, `Auth/data setup`, `Runnable examples` (nếu được yêu cầu và đủ dữ liệu), `Coverage gaps`, `Next questions`.

Mỗi test case nên có: `TC-ID`, `Endpoint`, `Method`, `Scenario`, `Setup`, `Request`, `Expected status`, `Expected schema/behavior`, `Priority`, `Risk` và `Cleanup`. Với expected result chưa được contract xác định, ghi rõ `needs confirmation`, không trình bày như kết quả đã xác minh.

## Giới hạn an toàn và chất lượng

- Không đoán hoặc làm lộ token, API key, cookie, PII hay dữ liệu production; dùng placeholder và che thông tin nhạy cảm trong ví dụ.
- Không bypass authentication, dò quyền trái phép, gửi request mutation để “thử”, hoặc tự ý gọi production endpoint. Chỉ đề xuất test execution khi có môi trường được phép và phạm vi rõ ràng.
- Không cài package, tạo tài khoản, dùng secret, hoặc tuyên bố đã chạy test nếu không được yêu cầu/ủy quyền và không có bằng chứng tương ứng.
- Không coi response example là quy tắc duy nhất; phân biệt contract, quan sát và giả định.

### Checklist

- [ ] Đã xác định phạm vi và ghi rõ spec đầy đủ hay `PARTIAL_SPEC`.
- [ ] Mỗi case có expected result truy nguyên được về contract hoặc được đánh dấu cần xác nhận.
- [ ] Coverage được chọn theo endpoint/rủi ro, không áp dụng máy móc.
- [ ] Ví dụ dùng placeholder; không có hành động thực thi hoặc dữ liệu nhạy cảm không được phép.
- [ ] Đã nêu coverage gaps, giới hạn bằng chứng và câu hỏi còn mở.
