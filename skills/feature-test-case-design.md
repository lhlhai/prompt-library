---
title: Feature Test Case Design
slug: feature-test-case-design
category: Test Design
tags: [testcase, feature, acceptance-criteria, excel, story]
level: Intermediate
name: feature-test-case-design
description: Design risk-based, traceable feature test cases from user stories, acceptance criteria, specs, UI/API evidence, and existing test templates. Use when planning or reviewing QA coverage for a feature; identify gaps and assumptions without claiming tests were executed.
---

# Feature Test Case Design

## Phạm vi và cách dùng

Dùng skill này để thiết kế hoặc rà soát test case cho một feature dựa trên tài liệu người dùng cung cấp hoặc nguồn mà phiên làm việc được phép truy cập. Tập trung vào hành vi có thể kiểm chứng, traceability và khả năng chạy lại. Không tự suy diễn business rule thành sự thật; không thực thi test, truy cập hệ thống/môi trường, sửa repository hay ghi dữ liệu nếu chưa được yêu cầu và cấp quyền rõ ràng.

Có thể làm việc với user story, acceptance criteria (AC), PRD/spec, mô tả hoặc ảnh UI, API/schema, test hiện có, template Excel/CSV và context như role, locale, feature flag, environment. Chỉ dùng nội dung thực sự đọc được; không coi link hoặc tệp không truy cập được là bằng chứng đã xem.

## Quy trình

1. **Xác định yêu cầu và đầu ra.** Tóm tắt feature, actor, phạm vi, nguồn đầu vào, format/template và những nội dung ngoài phạm vi. Giữ nguyên ID, tên cột và quy ước hiện có khi được cung cấp.
2. **Tách bằng chứng khỏi suy luận.** Ghi lại các rule/AC cùng nguồn hoặc ID. Phân loại nội dung còn thiếu là câu hỏi cần xác nhận hoặc `ASSUMPTION`; không trình bày giả định như yêu cầu đã chốt. Nếu chỉ có tên feature, tạo bản nháp giới hạn và nêu các câu hỏi then chốt.
3. **Lập coverage.** Liên kết mỗi AC có thể kiểm thử với ít nhất một test case. Đánh dấu AC mơ hồ, không đo được hoặc chưa được bao phủ; đề xuất kịch bản bổ sung theo rủi ro và đặc tính feature, chẳng hạn happy path, validation/boundary, negative, quyền truy cập, state transition, interruption, integration, locale hoặc tương thích. Không thêm mọi loại kịch bản một cách máy móc.
4. **Viết test case có thể thực hiện.** Với từng case, nêu ID, requirement/AC, tiêu đề, tiền điều kiện, các bước theo thứ tự, test data cần thiết, expected result quan sát được, priority và loại test. Thêm role/environment hoặc automation candidacy khi hữu ích; nếu chưa biết, ghi rõ `TBD`/`NEEDS_CONFIRMATION` thay vì bịa giá trị. Dùng dữ liệu giả lập hoặc placeholder, không dùng dữ liệu production nhạy cảm.
5. **Ưu tiên theo rủi ro.** Dùng thang P0–P2 nếu phù hợp với dự án: P0 cho rủi ro blocker nghiêm trọng như mất dữ liệu hoặc lỗ hổng bảo mật; P1 cho luồng cốt lõi/ảnh hưởng đáng kể; P2 cho trường hợp ít gặp hoặc ảnh hưởng thấp. Nêu lý do khi mức ưu tiên không hiển nhiên; nếu dự án có quy ước khác, theo quy ước đó.
6. **Rà soát và xuất kết quả.** Kiểm tra traceability, độ rõ của setup và expected result, tính nhất quán, trùng lặp, dữ liệu an toàn và các giả định còn mở. Mặc định trả một bảng Markdown để review; xuất CSV/TSV hoặc theo template chỉ khi được yêu cầu hay có lợi rõ ràng. Với CSV/TSV, bảo toàn cấu trúc cột hiện có và escape dấu phân cách/line break phù hợp.

## Tiêu chí chất lượng

- Người khác có thể chạy case mà không phải đoán setup quan trọng.
- Các bước cụ thể, một luồng kiểm tra rõ ràng; expected result kiểm chứng được và tương ứng với yêu cầu.
- Mỗi case truy ngược được tới story/AC hoặc được đánh dấu là exploratory/risk-based bổ sung.
- Test data, role, environment và dependency được nêu hoặc đánh dấu chưa xác nhận.
- Khoảng trống, mâu thuẫn và giả định được báo riêng, không che lấp bằng test case giả định.

Không tuyên bố đã chạy test, xác nhận defect, truy cập environment hoặc xác thực dữ liệu trừ khi có bằng chứng thực hiện tương ứng. Phân biệt rõ **evidence** (nội dung đã cung cấp/quan sát), **finding** (kết luận suy ra từ evidence) và **assumption/open question** (điều cần xác nhận).

## Đầu ra gợi ý

Dùng các cột phù hợp với yêu cầu: `ID`, `Requirement/AC`, `Title`, `Precondition`, `Steps`, `Test Data`, `Expected Result`, `Priority`, `Type`, `Role`, `Environment`, `Automation Candidate`, `Status`. Không bắt buộc giữ cột không liên quan nếu chưa có template; không gán `Pass`/`Fail` khi chưa có kết quả thực thi.

## Checklist trước khi bàn giao

- [ ] Phạm vi, nguồn và format đầu ra đã rõ hoặc được ghi là chưa xác nhận.
- [ ] Mỗi AC có thể kiểm thử được liên kết với ít nhất một case; gap được nêu rõ.
- [ ] Steps, setup, dữ liệu và expected result đủ cụ thể để chạy lại.
- [ ] Priority có căn cứ; giả định, câu hỏi mở và finding được phân biệt.
- [ ] Không chứa dữ liệu production nhạy cảm hoặc tuyên bố thực thi không có bằng chứng.
