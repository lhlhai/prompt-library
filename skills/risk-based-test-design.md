---
title: Risk-based Test Design
slug: risk-based-test-design
category: Test Design
tags: [risk, prioritization, test-plan]
level: Intermediate
description: Chuyển product risk thành danh sách test ưu tiên, có lý do và phạm vi rõ ràng.
---

# Risk-based Test Design

## Mục tiêu

Thiết kế một test plan tập trung vào nơi có xác suất lỗi và impact cao nhất, thay vì cố gắng kiểm thử mọi thứ với cùng một mức độ.

## Quy trình

1. Liệt kê các **business flow**, integration point và vùng thay đổi trong release.
2. Với mỗi vùng, ước lượng `probability` và `impact` theo thang 1–5.
3. Ghi nhận các yếu tố làm tăng rủi ro: code churn, dependency bên ngoài, dữ liệu nhạy cảm, permission, concurrency và lịch sử defect.
4. Xếp hạng theo `risk score = probability × impact`.
5. Chọn test depth tương ứng: smoke, happy path, negative path, boundary, integration hoặc exploratory.
6. Nêu rõ phần chưa test, lý do chấp nhận rủi ro và tín hiệu cần theo dõi sau release.

## Output tối thiểu

- Risk register có owner và score.
- Danh sách test ưu tiên theo P0/P1/P2.
- Assumption và dependency cần xác minh.
- Coverage gap và quyết định go/no-go.

## Heuristic

Không gọi một flow là “low risk” chỉ vì nó ít được người dùng nhìn thấy. Hãy xem cả khả năng làm hỏng dữ liệu, mất tiền, vi phạm quyền truy cập và khả năng rollback.
