---
title: Release Risk Review
slug: release-risk-review
category: Release
tags: [release, go-no-go, monitoring, rollback]
level: Advanced
name: release-risk-review
description: Review rủi ro release theo bằng chứng kiểm thử, phạm vi ảnh hưởng, defect, monitoring và rollback; nạp skill này khi cần đánh giá readiness hoặc đưa ra khuyến nghị go/no-go cho thay đổi sắp phát hành.
---

# Release Risk Review

## Phạm vi và cách dùng

Dùng skill này để đánh giá rủi ro của một thay đổi sắp phát hành và lập khuyến nghị QA có căn cứ. Xem xét nội dung thay đổi, vùng ảnh hưởng trực tiếp/gián tiếp, bằng chứng kiểm thử, defect còn mở, khả năng phát hiện sự cố và phương án phục hồi. Nếu thiếu thông tin, nêu rõ phần chưa thể đánh giá; không suy diễn thành đã kiểm chứng.

## Quy trình

1. **Xác định phạm vi.** Tóm tắt thay đổi, thành phần và luồng người dùng bị ảnh hưởng, phụ thuộc hoặc tích hợp liên quan, đối tượng triển khai và rollout dự kiến. Phân biệt điều đọc được từ diff/tài liệu với thông tin do người yêu cầu cung cấp.
2. **Rà bằng chứng kiểm thử.** Đối chiếu test liên quan với phạm vi thay đổi; ghi tên/kết quả/thời điểm của bằng chứng hiện có và các vùng chưa được kiểm tra. Chỉ nói test đã chạy khi có kết quả quan sát được trong phiên hoặc được cung cấp; nếu không, ghi “chưa có bằng chứng”.
3. **Đánh giá defect và hậu quả.** Ghi defect mở có căn cứ, mức độ ảnh hưởng có thể xảy ra tới dữ liệu, bảo mật, doanh thu, tính sẵn sàng hoặc niềm tin người dùng, cùng mức độ chắc chắn. Tách phát hiện xác nhận được khỏi rủi ro/giả định cần xác minh.
4. **Kiểm tra kiểm soát sau triển khai.** Xác định tín hiệu monitoring/alert phù hợp với rủi ro, baseline để so sánh, người chịu trách nhiệm theo dõi và ngưỡng/trigger để dừng hoặc rollback. Nếu không có thông tin, ghi rõ khoảng trống thay vì khẳng định kiểm soát tồn tại.
5. **Đánh giá phục hồi và tương thích dữ liệu.** Tìm bằng chứng về rollback/roll-forward, tính tương thích ngược của schema/dữ liệu và ảnh hưởng của thao tác phục hồi. Nêu các bước chưa được chứng minh hoặc phụ thuộc cần xác nhận.
6. **Đưa khuyến nghị.** Chọn **Go**, **Conditional go** hoặc **No-go** dựa trên bằng chứng và mức độ rủi ro còn lại. Ghi điều kiện, thời điểm kiểm tra, người chịu trách nhiệm và ai có quyền dừng rollout. Đây là khuyến nghị QA; quyết định phát hành thuộc người có thẩm quyền.

## Định dạng đầu ra

- **Decision:** Go / Conditional go / No-go; nêu lý do ngắn.
- **Scope:** Thay đổi và vùng ảnh hưởng đã xác định.
- **Evidence:** Bằng chứng kiểm thử/kiểm soát có nguồn hoặc kết quả cụ thể; ghi rõ điều chưa có.
- **Findings:** Rủi ro hoặc defect, hậu quả, mức độ chắc chắn và căn cứ. Đánh dấu rõ **Confirmed** hoặc **Assumption / needs verification**.
- **Residual risk:** Rủi ro còn lại sau các kiểm soát đã xác nhận.
- **Owner & trigger:** Người phụ trách, điều kiện theo dõi/dừng, thời điểm kiểm tra và người có quyền dừng rollout.
- **Recovery:** Bằng chứng rollback/phục hồi và giới hạn chưa xác minh.

Sau release, nếu được yêu cầu đánh giá kế hoạch theo dõi, đề xuất so sánh error rate, latency, conversion, failed job, tín hiệu hỗ trợ và business metric liên quan với baseline trước release. Chọn chỉ số phù hợp với rủi ro cụ thể; không coi dashboard kỹ thuật là đủ nếu rủi ro nằm ở hành vi hoặc kết quả người dùng.

## Checklist

- [ ] Phạm vi và vùng ảnh hưởng được nêu rõ.
- [ ] Bằng chứng và khoảng trống kiểm thử được phân biệt; không tuyên bố đã chạy nếu không có kết quả.
- [ ] Defect, tác động, giả định và residual risk được ghi nhận.
- [ ] Monitoring, trigger, owner và phương án phục hồi được xác minh hoặc đánh dấu chưa biết.
- [ ] Khuyến nghị có căn cứ, điều kiện rõ ràng và không thay thế quyết định của release owner.

## Giới hạn an toàn

Chỉ sử dụng diff, tài liệu, kết quả test và thông tin được cung cấp hoặc có sẵn trong workspace được phép. Không giả vờ đã truy cập CI, monitoring, production hay hệ thống bên ngoài. Không triển khai, thay đổi cấu hình production, thực hiện rollback hoặc chạy lệnh phá hủy; chỉ thực hiện các hành động đó khi có ủy quyền rõ ràng và đúng quy trình. Không hạ tiêu chuẩn kiểm thử hoặc che giấu bằng chứng bất lợi để đạt quyết định Go.
