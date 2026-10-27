---
title: Feature Test Case Design
slug: feature-test-case-design
category: Test Design
tags: [testcase, feature, acceptance-criteria, excel, story]
level: Intermediate
description: Chuyển story và product evidence thành test case có traceability, priority, dữ liệu và output dùng được ngay.
---

# Feature Test Case Design

## Input agent có thể nhận

Agent không bắt buộc một format duy nhất. Có thể nhận một hoặc nhiều nguồn sau:

| Input | Ví dụ | Cách sử dụng |
|---|---|---|
| User story | `As a customer, I can reset my password` | Tách actor, goal và business value |
| Acceptance criteria | Given/When/Then, bullet, checklist | Làm baseline cho expected result |
| PRD/spec | Markdown, text, PDF đã copy text | Tìm rule, dependency và out-of-scope |
| Figma/screenshot | Link public hoặc mô tả màn hình | Bổ sung UI state và validation |
| Existing Excel | `.xlsx`, CSV hoặc dán bảng | Giữ format, ID và traceability cũ |
| API/schema | OpenAPI, field list, sample payload | Bổ sung integration và data checks |
| Context | Role, environment, feature flag, locale | Xác định biến thể test cần chạy |

Nếu chỉ có title của feature, agent phải tạo **draft assumptions** và hỏi lại, không được giả định business rule là sự thật.

## Quy trình

1. Chuẩn hóa input thành feature summary, actor, precondition, state và acceptance criteria.
2. Tạo traceability map: mỗi acceptance criterion liên kết với ít nhất một test case.
3. Bổ sung happy path, validation, boundary, negative, permission, state transition, interruption và integration scenario.
4. Gán `priority` theo risk: P0 cho critical path/data loss/security, P1 cho core behavior, P2 cho polish và rare edge.
5. Khai báo test data, environment, role, dependency và expected result đủ quan sát được.
6. Kiểm tra duplicate, gap và assumption trước khi xuất kết quả.

## Output mặc định

Agent trả về cả hai dạng:

- **Markdown table** để review nhanh trong chat hoặc pull request.
- **CSV/TSV Excel-ready** với cột: `ID`, `Requirement/AC`, `Title`, `Precondition`, `Steps`, `Test Data`, `Expected Result`, `Priority`, `Type`, `Role`, `Environment`, `Automation Candidate`, `Status`.

Nếu người dùng đã có Excel template, agent giữ nguyên tên cột và thứ tự cột; chỉ thêm cột khi nói rõ lý do. Agent không tự ghi vào file hoặc repository nếu chưa có thao tác upload/write được ủy quyền.

## Khi thiếu input

- Thiếu acceptance criteria: hỏi business rule và expected result.
- Thiếu role/permission: tạo matrix role tối thiểu và đánh dấu `NEEDS_CONFIRMATION`.
- Thiếu test data: tạo data contract và placeholder có format, không dùng dữ liệu production.
- Thiếu environment: ghi assumption và đề xuất smoke matrix, không tuyên bố pass.

## Definition of ready

Một test case ready khi người khác có thể chạy mà không cần hỏi lại setup quan trọng, expected result đo được và có liên kết ngược về story/AC.
