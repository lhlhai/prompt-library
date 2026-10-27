---
title: Swagger / OpenAPI Test Case Design
slug: swagger-api-test-design
category: API & Integration
tags: [swagger, openapi, api, testcase, json, yaml]
level: Advanced
description: Chuẩn hóa Swagger/OpenAPI từ URL, JSON, YAML hoặc fragment rồi sinh API test matrix và runnable starter.
---

# Swagger / OpenAPI Test Case Design

## Input được hỗ trợ

### 1. Public URL

Nhận URL tới `openapi.json`, `swagger.json`, YAML hoặc Swagger UI. Nếu URL là Swagger UI, agent tìm spec URL trong config page hoặc yêu cầu người dùng cung cấp raw spec. Chỉ fetch URL public; không đoán token, không bypass auth và không gửi request mutation chỉ để “thử”.

### 2. File hoặc JSON/YAML đầy đủ

Nhận nội dung dán trực tiếp, file JSON/YAML hoặc link raw. Agent detect OpenAPI 2.0, OpenAPI 3.x hoặc Swagger 2.0, sau đó normalize thành endpoint/method/parameter/request body/response/security.

### 3. Một đoạn spec

Có thể nhận riêng một `paths` object, một endpoint, schema request/response hoặc curl mẫu. Khi fragment thiếu `servers`, auth hoặc response code, agent phải ghi `PARTIAL_SPEC` và chỉ tạo case trong phạm vi quan sát được.

## Matrix tối thiểu cho mỗi endpoint

- Happy path theo từng success response.
- Required field missing, wrong type, null, empty và malformed format.
- Boundary của string/number/array, enum, pagination và date/time.
- Auth missing, token expired, role forbidden và object-level authorization.
- Resource not found, conflict, duplicate/idempotency và retry.
- Contract: status code, headers, content type, schema, nullable và error body.
- Với mutation: data side effect, read-after-write, rollback/partial failure và cleanup.

## Tool selection

| Tình huống | Tool đề xuất | Output |
|---|---|---|
| Chỉ cần đọc spec và sinh matrix | Parser OpenAPI + agent | Markdown/CSV test cases |
| Muốn chạy request thủ công | curl/httpie | Request mẫu và evidence |
| Team dùng collection | Postman/Insomnia/Bruno | Collection + environment template |
| Có Newman collection | Newman CLI | CLI command, report và CI suggestion |
| Contract/property-based | Schemathesis hoặc tương đương | Generated checks, không thay thế risk cases |
| API có auth flow phức tạp | Playwright/API client hoặc runner hiện có | Setup sequence + secret placeholders |

Tool chỉ là đề xuất theo artifact và hệ sinh thái team; agent không tự cài package, gọi production endpoint hoặc dùng secret trong output.

## Output contract

Trả về: `Input interpretation`, `Assumptions`, `Endpoint inventory`, `Test case matrix`, `Auth/data setup`, `Runnable examples`, `Coverage gaps` và `Next questions`. Mỗi case có `TC-ID`, `Endpoint`, `Method`, `Setup`, `Request`, `Expected status`, `Expected schema`, `Priority`, `Risk` và `Cleanup`.

## Guardrails

Không coi Swagger UI là contract đầy đủ nếu thiếu raw spec. Không coi response example là rule duy nhất. Phân biệt `spec says`, `observed from sample` và `needs confirmation`. Mask API key, cookie, PII và dữ liệu production trước khi copy vào testcase.
