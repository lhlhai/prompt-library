# Skill

## Mục tiêu
Đóng gói một capability có thể tái sử dụng: instructions, quy trình, examples, output contract và tham chiếu tới tool phù hợp.

Skill mô tả **cách làm một loại task**; nó không tự quyết định vòng lặp và không tự enforce quyền tool.

## Ví dụ skill: `summarize_article`

```yaml
name: summarize_article
version: 1.0.0
description: Tóm tắt một bài viết thành bản tóm tắt có cấu trúc.
inputs:
  - name: source
    type: article | url
  - name: language
    type: string
    default: vi
allowed_tools:
  - read_article
procedure:
  - Đọc toàn bộ nội dung nguồn.
  - Xác định luận đề và tối đa 5 ý chính.
  - Viết tóm tắt 120–180 từ.
  - Nêu rõ phần nào là dữ kiện và phần nào là suy luận.
output:
  format: markdown
  sections: [Tóm tắt, Ý chính, Điểm cần kiểm chứng]
```

## Cách caller sử dụng

```text
Task: Tóm tắt bài viết sample_article bằng tiếng Việt.

Caller/Agent:
1. Chọn skill summarize_article.
2. Runtime nạp instructions, examples và tool reference.
3. LLM áp dụng procedure.
4. Runtime kiểm tra quyền rồi thực thi read_article.
5. Trả output theo contract của skill.
```

## Flow

```text
Caller/Agent chọn → Runtime nạp Skill → LLM áp dụng procedure → Tool (nếu được phép) → Output chuẩn hóa
```

## Lợi ích
- Reuse quy trình thay vì chép prompt.
- Giữ format và tiêu chuẩn đầu ra nhất quán.
- Version, test và cải tiến capability độc lập.
- Có thể kết hợp với Planning, Agent hoặc Tool Use.

## Ranh giới
Danh sách `allowed_tools` trong skill chỉ là metadata/instruction. Runtime hoặc Harness phải enforce quyền thật, validate input/output và áp dụng policy. Skill cũng không mặc nhiên làm giảm số LLM call hoặc token.
