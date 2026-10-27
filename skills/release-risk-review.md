---
title: Release Risk Review
slug: release-risk-review
category: Release
tags: [release, go-no-go, monitoring, rollback]
level: Advanced
description: Tạo quyết định go/no-go minh bạch dựa trên coverage, residual risk, monitoring và rollback.
---

# Release Risk Review

## Câu hỏi chính

- Thay đổi nào đi vào release và vùng nào bị ảnh hưởng gián tiếp?
- Test evidence nào là mới nhất, còn gap nào chưa có lời giải?
- Defect mở nào có thể ảnh hưởng revenue, data, security hoặc trust?
- Monitoring/alert đã đủ để phát hiện regression sau deploy chưa?
- Rollback có khả thi và dữ liệu có backward-compatible không?

## Decision record

Tóm tắt bằng bốn dòng: **Decision**, **Evidence**, **Residual risk**, **Owner & trigger**. Nếu go có điều kiện, viết rõ điều kiện, thời điểm kiểm tra và ai có quyền dừng rollout.

## Sau release

Theo dõi error rate, latency, conversion, failed job, support signal và business metric liên quan. So sánh với baseline trước release; đừng chỉ nhìn dashboard kỹ thuật nếu risk nằm ở hành vi người dùng.
