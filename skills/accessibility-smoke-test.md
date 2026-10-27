---
title: Accessibility Smoke Test
slug: accessibility-smoke-test
category: Quality Attributes
tags: [a11y, keyboard, screen-reader, wcag]
level: Beginner
name: accessibility-smoke-test
description: Run a focused keyboard, focus, form, responsive-layout, and basic visual accessibility smoke test for a feature flow. Load when QA needs an early accessibility check before deeper WCAG or assistive-technology testing.
---

# Accessibility Smoke Test

## Phạm vi và khi dùng

Dùng checklist này như bước QA nhanh cho một feature/flow trước audit accessibility chuyên sâu. Tập trung vào lỗi cơ bản có thể quan sát và tái hiện; đây không phải chứng nhận tuân thủ WCAG, đánh giá đầy đủ screen reader hay thay thế kiểm thử chuyên biệt.

Chỉ kiểm tra môi trường và flow được giao. Không sửa mã, cấu hình hoặc dữ liệu; không gửi biểu mẫu hay kích hoạt hành động có hậu quả thực tế nếu chưa được cho phép. Nếu không thể truy cập ứng dụng hoặc thiếu thông tin để kiểm tra, ghi rõ giới hạn thay vì suy đoán.

## Các bước

1. **Ghi phạm vi trước khi bắt đầu.** Nêu feature/URL hoặc tên flow, môi trường, browser, viewport/zoom nếu biết, và điểm bắt đầu. Nếu giá trị nào chưa biết, đánh dấu là chưa xác nhận.
2. **Thực hành điều hướng chỉ bằng bàn phím.** Từ điểm bắt đầu, dùng `Tab`/`Shift+Tab` để đi qua các điều khiển; dùng `Enter` hoặc `Space` theo chức năng; dùng `Escape` để đóng overlay nếu phù hợp. Kiểm tra thứ tự focus có hợp lý, focus luôn nhìn thấy, và không bị kẹt hoặc mất.
3. **Kiểm tra thành phần tương tác.** Mở/đóng dialog, menu hoặc popover bằng bàn phím. Khi mở, xác nhận focus vào vùng phù hợp và không thể vô tình thao tác nội dung nền; khi đóng, xác nhận focus trở về vị trí hợp lý. Nếu hành vi không thể quan sát hoặc không thuộc flow, ghi “chưa kiểm tra”.
4. **Kiểm tra biểu mẫu và tên điều khiển.** Xác nhận trường có nhãn nhận biết được; lỗi hiển thị gắn với trường liên quan và có thể nhận biết; trạng thái disabled/read-only không chỉ dựa vào màu sắc. Kiểm tra icon button có tên truy cập được nếu có cách quan sát trong công cụ sẵn dùng; nếu không, ghi rõ chưa xác minh, không kết luận chỉ từ hình ảnh.
5. **Kiểm tra hiển thị cơ bản.** Tăng zoom lên 200% và/hoặc thu hẹp viewport khi có thể; ghi kích thước đã dùng. Kiểm tra nội dung/chức năng không bị cắt hoặc mất, không phát sinh cuộn ngang bất hợp lý trong flow. Xác nhận màu không phải tín hiệu duy nhất và văn bản/icon có thể phân biệt rõ; không khẳng định đạt tỷ lệ tương phản nếu chưa đo bằng phương pháp phù hợp.
6. **Kiểm tra nội dung hình ảnh.** Với hình ảnh có ý nghĩa, xác minh có mô tả thay thế phù hợp; với hình trang trí, kiểm tra không làm nhiễu nội dung. Nếu chỉ nhìn screenshot mà không thể xác minh thuộc tính hoặc tên truy cập, ghi là chưa xác nhận.
7. **Ghi kết quả ngay sau mỗi bước.** Phân loại từng mục là `Pass`, `Fail`, `Not checked` hoặc `Blocked`. Với `Fail`, ghi bước tái hiện, kết quả mong đợi và thực tế, cùng ảnh chụp/trích dẫn hoặc bằng chứng quan sát được nếu có. Tách rõ phát hiện trực tiếp khỏi giả định; không suy ra nguyên nhân kỹ thuật khi chưa có bằng chứng.

## Checklist hoàn tất

- [ ] Phạm vi, browser/môi trường và viewport/zoom được ghi hoặc đánh dấu chưa xác nhận.
- [ ] Flow được thử bằng bàn phím; focus, thứ tự điều hướng và overlay được kiểm tra khi có trong phạm vi.
- [ ] Nhãn, thông báo lỗi, trạng thái điều khiển và tên truy cập được xem xét khi có thể xác minh.
- [ ] Zoom/viewport, phụ thuộc màu và hình ảnh được kiểm tra hoặc đánh dấu chưa kiểm tra.
- [ ] Mỗi phát hiện có bằng chứng/tình huống tái hiện; giả định và giới hạn được ghi riêng.
- [ ] Kết luận nêu rõ smoke test không thay thế audit WCAG hoặc kiểm thử screen reader.

## Đầu ra ngắn gọn

Báo cáo gồm: phạm vi và môi trường; các mục `Pass`/`Fail`/`Not checked`/`Blocked`; phát hiện có bước tái hiện và bằng chứng; giả định/giới hạn; đề xuất bước kiểm tra tiếp theo nếu cần. Không ghi “đã kiểm tra” cho thao tác chưa thực hiện và không gọi smoke pass là chứng nhận accessibility.
