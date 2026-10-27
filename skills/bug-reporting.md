---
title: High-signal Bug Reporting
slug: bug-reporting
category: Communication
tags: [bug, evidence, triage, severity]
level: Beginner
description: Viết bug report ngắn, tái hiện được và giúp team ra quyết định nhanh hơn.
---

# High-signal Bug Reporting

## Tiêu đề

Dùng công thức: **[Area] [action] causes [observable impact] when [condition]**. Tránh tiêu đề kiểu “Không hoạt động” hoặc mô tả giải pháp thay cho triệu chứng.

## Nội dung bắt buộc

1. Environment: build, browser/device, account role, feature flag và data setup.
2. Preconditions nếu có.
3. Steps tối thiểu để tái hiện.
4. Expected result và actual result tách biệt.
5. Evidence: screenshot/video, request ID, console log hoặc response.
6. Frequency và workaround.

## Severity vs priority

Severity mô tả mức độ thiệt hại của lỗi; priority mô tả thứ tự team cần xử lý. Một lỗi typo có priority cao trước chiến dịch marketing, trong khi một lỗi hiếm gặp có severity cao nhưng cần thêm dữ liệu để triage.

## Quality bar

Người khác phải có thể tái hiện mà không cần hỏi lại những thông tin quan trọng. Nếu chưa chắc root cause, mô tả observation và hypothesis riêng biệt.
