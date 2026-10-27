---
title: Structured Exploratory Testing
slug: exploratory-testing
category: Test Execution
tags: [exploratory, charter, heuristics]
level: Intermediate
description: Tổ chức exploratory testing thành các charter có mục tiêu, timebox, heuristic và evidence.
---

# Structured Exploratory Testing

## Test charter

Viết charter theo mẫu: **Explore [area] with [data/heuristic] to discover [risk] within [timebox].** Một charter tốt đủ mở để khám phá nhưng đủ hẹp để biết khi nào đã đi quá xa.

## Session flow

1. Chuẩn bị build, tài khoản, dữ liệu và baseline cần thiết.
2. Chọn một charter duy nhất cho mỗi session 30–60 phút.
3. Trong lúc test, ghi lại action, observation, question, anomaly và ý tưởng follow-up.
4. Khi gặp lỗi, dừng việc khám phá ngẫu nhiên để tái hiện, cô lập và chụp evidence.
5. Kết thúc bằng debrief: đã cover gì, còn câu hỏi gì, risk nào mới xuất hiện.

## Heuristics gợi ý

- CRUD tour và golden path.
- Boundary tour: empty, min/max, Unicode, timezone, retry.
- Consistency tour giữa UI, API, notification và audit log.
- Interruption tour: refresh, back, timeout, duplicate submit.
- Permission tour giữa role khác nhau.

## Evidence chuẩn

Mỗi finding cần có session time, build/version, seed data, bước tái hiện, expected/actual và mức độ tự tin.
