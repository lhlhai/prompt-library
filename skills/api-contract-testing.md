---
title: API Contract Testing
slug: api-contract-testing
category: API & Integration
tags: [api, contract, schema, integration]
level: Intermediate
description: Kiểm tra API ở lớp contract, validation, auth và compatibility trước khi phụ thuộc vào UI.
---

# API Contract Testing

## Contract checklist

- Method, path, auth scheme và permission đúng với spec.
- Status code ổn định cho success, validation, not found và forbidden.
- Response schema: required field, type, enum, nullable và pagination.
- Error body có code máy đọc được và message đủ hữu ích.
- Idempotency, retry và duplicate request có behavior rõ ràng.
- Timestamp, timezone, currency và encoding nhất quán.

## Test matrix

Với mỗi endpoint, tạo ít nhất một happy path, một request thiếu field, một field sai type, boundary value, invalid auth, role không đủ quyền và resource không tồn tại. Với endpoint ghi dữ liệu, kiểm tra retry, duplicate submit và read-after-write.

## Khi phát hiện mismatch

Ghi lại request tối thiểu có thể tái hiện, response headers/body, correlation ID, environment và contract version. Phân biệt breaking change với additive change; không đánh dấu fail chỉ vì field mới nếu consumer được phép bỏ qua field đó.
