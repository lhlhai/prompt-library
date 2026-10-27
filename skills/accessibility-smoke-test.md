---
title: Accessibility Smoke Test
slug: accessibility-smoke-test
category: Quality Attributes
tags: [a11y, keyboard, screen-reader, wcag]
level: Beginner
description: Một vòng smoke test accessibility nhanh cho mỗi feature trước khi chạy audit sâu.
---

# Accessibility Smoke Test

## Vòng kiểm tra 10 phút

- Điều hướng toàn bộ flow bằng keyboard: Tab, Shift+Tab, Enter, Space và Escape.
- Focus luôn nhìn thấy và thứ tự focus khớp với thứ tự đọc.
- Dialog, menu và popover đóng/mở được bằng keyboard; focus không rơi ra sau overlay.
- Form field có label, error message liên kết được và trạng thái disabled/read-only rõ ràng.
- Nội dung không bị mất khi zoom 200% hoặc viewport hẹp.
- Màu không phải tín hiệu duy nhất; text và icon có contrast hợp lý.
- Hình ảnh có alt text phù hợp; icon button có accessible name.

## Evidence

Ghi lại URL/flow, browser, bước thao tác keyboard, screenshot focus state và các lỗi có ảnh hưởng cụ thể đến người dùng.

## Không kết luận quá sớm

Smoke pass không thay thế audit WCAG, screen reader test hoặc kiểm tra chuyên sâu theo component. Hãy dùng nó như quality gate sớm để tránh đẩy lỗi cơ bản sang cuối sprint.
