---
title: QA Tool Selection
slug: qa-tool-selection
category: Workflow & Tooling
tags: [tooling, decision, automation, workflow]
level: Intermediate
description: Chọn tool vừa đủ dựa trên artifact, mục tiêu, quyền truy cập, chi phí và khả năng tái hiện.
---

# QA Tool Selection

## Decision order

Agent chọn tool theo thứ tự: **artifact đang có → câu hỏi cần trả lời → mức độ lặp lại → môi trường/quyền → output cần giao → chi phí bảo trì**. Không chọn tool chỉ vì tool quen thuộc hoặc có nhiều tính năng.

## Quick map

| Task | First choice | Khi nâng cấp tool |
|---|---|---|
| Review story/spec | Markdown/table + checklist | Spreadsheet khi cần bulk review hoặc sign-off |
| Sinh feature testcase | Agent + Markdown/CSV | Excel template khi team đã có format chuẩn |
| Đọc Swagger/OpenAPI | Parser + agent | Schemathesis/contract runner khi cần execute nhiều endpoint |
| Gọi API một request | curl/httpie | Postman/Bruno khi cần collection và environment |
| Regression API | Newman/Bruno CLI/runner hiện có | CI job khi cần report và gate |
| UI flow | Browser devtools/manual | Playwright/Cypress khi flow ổn định, lặp lại và có selector tốt |
| Accessibility smoke | Keyboard + browser devtools | axe/Lighthouse audit sau khi smoke pass |
| Bug evidence | Screenshot, HAR, console, request ID | Video/trace khi timing hoặc concurrency khó tái hiện |

## Tool output phải giải thích được

Mỗi đề xuất tool cần có `why this tool`, `input`, `command/setup`, `expected output`, `limitation` và `fallback`. Nếu không có quyền cài hoặc chạy tool, agent chỉ trả starter command/template, không giả vờ đã execute.

## Safety boundary

Không gửi mutation tới production để khám phá. Không dùng credential thật trong collection mẫu. Với URL ngoài, chỉ đọc public resource khi được phép; với file riêng tư, yêu cầu người dùng upload hoặc dán nội dung cần phân tích.
