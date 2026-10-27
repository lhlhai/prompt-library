# E-commerce: kịch bản test case mẫu cho luồng Multi-Agent

> **Mục đích:** mẫu thực hành cách một QA coordinator chia yêu cầu e-commerce cho nhiều agent chuyên môn, sau đó đối chiếu bằng chứng và tổng hợp coverage. Đây là bộ case minh họa, không phải kết quả đã chạy trên một hệ thống thật.

## 1. Bối cảnh giả định

Hệ thống mẫu có các khả năng: khách vãng lai hoặc người dùng đăng nhập xem sản phẩm, thêm vào giỏ, nhập mã giảm giá, chọn địa chỉ giao hàng, tạo đơn bằng một phương thức thanh toán giả lập, xem trạng thái đơn. Các API minh họa là `/products`, `/cart`, `/coupons/validate`, `/checkout`, `/orders/{id}`. Tên endpoint, trạng thái HTTP, business rule và UI text phải được thay bằng contract/AC thật trước khi thực thi.

**Ràng buộc an toàn mẫu:** chỉ dùng môi trường local/test với sandbox thanh toán, dữ liệu giả lập và email/địa chỉ không thuộc người thật. Không gọi production, không dùng thẻ thật, không gửi email/SMS thật và không tạo đơn có tác động tài chính thực tế.

### Acceptance criteria giả định

- `EC-01` Trang sản phẩm hiển thị tên, giá, tình trạng còn hàng và nút thêm giỏ.
- `EC-02` Thêm số lượng hợp lệ vào giỏ cập nhật số lượng và subtotal.
- `EC-03` Số lượng phải là số nguyên dương và không vượt tồn kho.
- `EC-04` Mã giảm giá hợp lệ áp dụng theo điều kiện; mã không hợp lệ hoặc hết hạn không làm thay đổi tổng tiền.
- `EC-05` Checkout yêu cầu thông tin giao hàng bắt buộc và phương thức thanh toán được chấp nhận.
- `EC-06` Gửi checkout hợp lệ tạo đúng một đơn hàng và tổng tiền khớp giỏ sau giảm giá, thuế/phí được nêu trong contract.
- `EC-07` Retry hoặc double-click checkout không tạo đơn trùng khi cùng idempotency key/session, theo contract được xác nhận.
- `EC-08` Đơn đã tạo hiển thị trạng thái ban đầu và có thể được truy xuất bằng owner hợp lệ; user khác không đọc được đơn đó.
- `EC-09` Flow chính có thể dùng bàn phím và thông báo lỗi form được gắn với trường tương ứng.

Các AC trên chỉ là dữ liệu giả định để minh họa. Coordinator phải yêu cầu xác nhận các quy tắc còn thiếu như stacking coupon, phí vận chuyển, rounding, reservation/release tồn kho và semantics idempotency.

## 2. Chia việc cho multi-agent

### Coordinator: `multi-agent-test-orchestrator`

**Mục tiêu:** lập coverage, giao đúng người, tránh trùng lặp, tích hợp kết quả. Coordinator xác nhận agent và runtime thực sự có mặt; nếu không dispatch được, dùng `NOT_DISPATCHED` và trả kế hoạch thay thế.

| Task | Agent đề xuất | Phạm vi/đầu ra | Có thể song song? | Ranh giới |
|---|---|---|---|---|
| T0 — Risk & dependency map | `test-strategy-planner` | Ưu tiên rủi ro checkout, tiền, tồn kho, auth và retry; nêu câu hỏi blocker | Bắt đầu trước hoặc cùng lúc với phân tích read-only | Không thực thi, không kết luận production readiness |
| T1 — Manual UI cases | `feature-testcase-writer` hoặc `manual-test-execution-coach` | Case tìm sản phẩm → giỏ → coupon → checkout; expected result và evidence cần chụp | Song song với T2/T3 nếu dùng cùng spec snapshot | Chỉ thiết kế/coach, không tự tương tác ứng dụng |
| T2 — API contract matrix | `api-contract-reviewer` + `api-testcase-writer` (giao câu hỏi khác nhau) | Review schema/auth/error/idempotency; lập case API truy vết endpoint | Song song với T1/T3 | Không gửi request; không tự suy diễn contract |
| T3 — UI/a11y review | `accessibility-checker` | Checklist keyboard, focus, labels/errors, zoom cho flow checkout | Song song, read-only trên spec/markup/screenshot riêng | Không khẳng định runtime nếu chỉ có mã hoặc mockup |
| T4 — Automation mapping | `ui-automation-engineer`, `api-automation-engineer` | Đề xuất automation cho case ổn định, file ownership tách biệt | Chỉ sau khi framework/paths đã được xác định; UI/API có thể song song khi file không trùng | Chạy chỉ local/mock hoặc environment non-production đã cấp quyền |
| T5 — Release risk | `release-go-no-go` | Đánh giá evidence, defect mở, rollback/monitoring và risk residual | Sau khi worker trả kết quả | Không khuyến nghị go chỉ từ test plan hoặc case chưa chạy |

### Dependency/ownership mẫu

1. `T0` xác định AC, rủi ro và câu hỏi như coupon stacking/idempotency trước khi khóa expected result.
2. `T1`, `T2`, `T3` có thể cùng phân tích một bản spec đã chốt nhưng trả về artifact khác nhau; không cùng sửa một file.
3. `T4` chỉ bắt đầu sau khi kiểm tra stack, runner, fixtures, test base URL và file ownership. `ui-automation-engineer` sở hữu riêng `tests/ui/checkout.*`; `api-automation-engineer` sở hữu riêng `tests/api/checkout.*`. Không tạo/sửa fixture chung đồng thời; chỉ định một owner riêng hoặc xử lý tuần tự.
4. Nếu cần test cùng cart/order record, tạo dữ liệu độc lập theo worker/test case. Không dùng chung giỏ/đơn mutable cho chạy song song.
5. `T5` tổng hợp evidence thực tế. Nếu automation chưa chạy, trạng thái là `NOT_RUN`; không diễn giải “đã có test” thành “đã pass”.

### Dispatch packet mẫu

```markdown
### T2 — API Contract Matrix — api-testcase-writer
Goal: Viết test matrix cho cart, coupon, checkout và order theo contract được cấp.
Context: AC EC-02..EC-08; OpenAPI file: <path/version>; environment: thiết kế, chưa thực thi.
Allowed scope: Đọc spec, trả bảng trong chat hoặc file được giao.
Not allowed: Gọi API, dùng credential, truy cập production, tạo đơn thật.
Dependencies: Chốt semantics coupon stacking, idempotency key và inventory reservation.
Acceptance checks: Mỗi case trỏ tới operation/AC; có happy/error/auth/boundary phù hợp; expected chỉ dựa trên contract.
Return: Case ID, request synthetic, expected status/schema, evidence cần thu, assumptions/open questions, NOT_RUN.
```

## 3. Test case Manual / UI

Các case dùng placeholder như `<SKU-A>`, `<TEST_USER_A>` và `<sandbox-payment>`; thay bằng fixture được cấp trong môi trường an toàn. `NOT_RUN` là trạng thái ban đầu, không phải kết quả.

| ID | AC | Mức | Tiền điều kiện / dữ liệu | Bước thực hiện | Kết quả mong đợi | Evidence / trạng thái |
|---|---|---|---|---|---|---|
| `EC-M-001` | EC-01, EC-02 | P1 | Sản phẩm `<SKU-A>` còn hàng; giỏ trống | 1. Mở trang sản phẩm. 2. Ghi nhận giá/tồn kho. 3. Chọn quantity `1`. 4. Thêm vào giỏ. 5. Mở giỏ. | Sản phẩm và quantity `1` xuất hiện; subtotal bằng giá sản phẩm theo quy tắc rounding đã chốt; tổng số item cập nhật đúng. | Chụp product/mini-cart/cart; ghi build và SKU. `NOT_RUN` |
| `EC-M-002` | EC-03 | P1 | Product còn hàng; giỏ trống | Thử quantity `0`, `-1`, `1.5`, chuỗi chữ; thử quantity bằng tồn kho và lớn hơn tồn kho 1. | Giá trị không hợp lệ bị từ chối inline; không tạo line item sai. Tồn kho tối đa xử lý đúng theo AC/contract, thông báo rõ và giỏ không vượt mức. | Ghi từng input, thông báo và cart state. `NOT_RUN` |
| `EC-M-003` | EC-04 | P1 | Fixture coupon hợp lệ `<COUPON-VALID>` và coupon hết hạn `<COUPON-EXPIRED>` | 1. Thêm `<SKU-A>` vào giỏ. 2. Áp mã hợp lệ. 3. Ghi subtotal/discount/total. 4. Thay bằng mã hết hạn. | Coupon hợp lệ tạo discount đúng rule; mã hết hạn có lỗi rõ ràng và không xóa/đổi discount hợp lệ trừ khi AC quy định. Total phản ánh đúng trạng thái coupon hiện tại. | Ghi giá trước/sau và nội dung lỗi; không để lộ dữ liệu nhạy cảm. `NOT_RUN` |
| `EC-M-004` | EC-04 | P1 | Coupon có minimum basket `<COUPON-MIN>`; product giá thấp hơn ngưỡng | Áp coupon; tăng giỏ tới ngưỡng; giảm lại dưới ngưỡng. | Coupon chỉ áp dụng đúng ngưỡng và phản hồi giải thích được; total được tính lại sau mỗi thay đổi; không giữ discount khi điều kiện không còn thỏa, nếu rule quy định vậy. | Chụp giá trị ngưỡng và các total. `NOT_RUN` |
| `EC-M-005` | EC-05, EC-09 | P1 | Giỏ hợp lệ; checkout form có name/address/postcode/contact | Bỏ trống từng trường bắt buộc; nhập sai định dạng postcode/contact; submit bằng bàn phím. | Focus chuyển tới lỗi phù hợp; lỗi gắn với trường, có thể nhận biết không chỉ bằng màu; không phát sinh order khi input invalid. | Ghi trường, keyboard path, screenshot/DOM evidence nếu có. `NOT_RUN` |
| `EC-M-006` | EC-05, EC-06 | P0/P1 theo risk | Giỏ có 2 line items và coupon; địa chỉ test; sandbox payment success | Hoàn tất checkout một lần với dữ liệu giả lập; ghi lại tổng trước submit. | UI xác nhận order ID; order summary có đúng line items, quantity, discount và total theo quy tắc đã xác nhận; giỏ clear/giữ trạng thái đúng AC. Không coi message thành công đơn lẻ là bằng chứng order bền vững nếu chưa truy xuất lại. | Order ID test, screenshot confirmation, sanitized summary. `NOT_RUN` |
| `EC-M-007` | EC-07 | P0 | Checkout test tạo được bằng sandbox; xác nhận idempotency behavior | 1. Bấm Place Order một lần. 2. Trong thử nghiệm riêng và được phép, gửi double-click/retry với cùng session/key theo phương án an toàn. 3. Kiểm tra danh sách test orders. | Kết quả phải khớp semantics idempotency được chốt: không có duplicate order/payment intent cho cùng key hoặc retry được xử lý đúng contract. Không chạy trên production. | Request/test-run ID và số order test; mọi thao tác lặp cần sandbox. `NOT_RUN` |
| `EC-M-008` | EC-08 | P1 | Đã có order test thuộc `<TEST_USER_A>`; `<TEST_USER_B>` độc lập | A mở order detail. Sau đó thử truy cập order bằng B qua UI trong phiên hợp lệ. | A xem được order của mình; B bị từ chối/không tìm thấy theo chính sách, không lộ địa chỉ, item hoặc trạng thái thanh toán. | Chỉ dùng hai account tổng hợp được cấp; ghi response/UI state đã khử dữ liệu. `NOT_RUN` |
| `EC-M-009` | EC-01, EC-05, EC-09 | P2 | Checkout UI ở viewport desktop và hẹp; product/giỏ test | Dùng Tab/Shift+Tab đi qua product → cart → checkout; mở/đóng dialog nếu có; thử zoom 200%. | Thứ tự focus hợp lý, focus nhìn thấy, không kẹt; label điều khiển rõ; layout không làm mất hành động chính hoặc nội dung thiết yếu. | Ghi browser, viewport, zoom, bước focus; đây là smoke test, không phải chứng nhận WCAG. `NOT_RUN` |

## 4. Test case API / contract

Tất cả endpoint dưới đây là giả định minh họa. Cần thay path, field, status và schema bằng OpenAPI/contract thật. Không gửi request nếu chưa được cho phép; bảng là thiết kế test, tất cả trạng thái ban đầu `NOT_RUN`.

| ID | AC / operation giả định | Request/setup tổng hợp | Expected (cần contract xác nhận) | Risk/agent |
|---|---|---|---|---|
| `EC-A-001` | EC-01 `GET /products/{sku}` | SKU tồn tại `<SKU-A>` | Status thành công; schema gồm sku/name/price/availability; kiểu dữ liệu, currency và nullability khớp spec. | P1; API contract reviewer |
| `EC-A-002` | EC-03 `POST /cart/items` | `{"sku":"<SKU-A>","quantity":0}` | Validation error theo contract; không có line item được thêm; body lỗi ổn định và không lộ stack trace. | P1; API testcase writer |
| `EC-A-003` | EC-03 `POST /cart/items` | Quantity âm, decimal, string; và vượt stock | Từng request invalid bị từ chối đúng status/schema; không mutate cart. Tồn kho concurrency rule cần xác nhận. | P1/P0; API automation |
| `EC-A-004` | EC-04 `POST /coupons/validate` | Coupon hợp lệ, hết hạn, không tồn tại, dưới minimum; synthetic cart | Mỗi trường hợp theo contract; invalid coupon không giảm total; discount/tax rounding chính xác theo rule được công bố. | P1; API contract + testcase |
| `EC-A-005` | EC-05 `POST /checkout` | Thiếu address, payment method không hỗ trợ, cart rỗng | Validation/auth error theo spec; không tạo order hoặc payment intent; lỗi nêu trường hợp có thể khắc phục. | P0; API testcase writer |
| `EC-A-006` | EC-06 `POST /checkout` | Cart hợp lệ, sandbox payment token giả, idempotency key mới | Response order ID/status khớp contract; tổng được tính server-side từ cart/pricing, không tin client-supplied total nếu API có field đó. | P0; API automation |
| `EC-A-007` | EC-07 retry `POST /checkout` | Gửi lại cùng payload + cùng idempotency key trong sandbox | Theo contract, trả cùng logical result hoặc response retry định nghĩa; không phát sinh duplicate order/payment. Key khác nhau xử lý theo semantics đã chốt. | P0; API contract + automation |
| `EC-A-008` | EC-08 `GET /orders/{id}` | Token user A đọc order A, sau đó user B đọc cùng ID | A được phép; B không được truy cập dữ liệu order theo chính sách; phân biệt 403/404 theo contract, không suy diễn. | P0; contract/security review |
| `EC-A-009` | EC-06/08 `GET /orders/{id}` | Order vừa tạo và trạng thái ban đầu | Schema, owner, items, quantities, discount, total, currency, timestamps và status hợp lệ; eventual consistency nếu có phải được đặc tả. | P1; API testcase writer |
| `EC-A-010` | Pricing/coupon boundary | Giá trị ở min/max, discount 100%, currency decimals, giá sau discount âm | Validation và rounding tuân theo quy tắc business đã chốt; không dùng ví dụ tự đặt làm oracle cho hệ thống thật. | P0; API contract reviewer |

**Ví dụ request trong test design (không gửi tự động):**

```http
POST /checkout
Content-Type: application/json
Authorization: Bearer <TEST_TOKEN_FROM_APPROVED_SECRET_STORE>
Idempotency-Key: <UNIQUE_TEST_KEY>

{
  "cartId": "<SYNTHETIC_CART_ID>",
  "shippingAddressId": "<SYNTHETIC_ADDRESS_ID>",
  "paymentMethod": "sandbox"
}
```

Token và ID trên là placeholder. Không commit secret, không copy token thật vào báo cáo, và không gửi request tới production.

## 5. Automation candidates và ownership

| Automation ID | Gợi ý lớp | Assertion chính | Owner đề xuất | Khi nào thực thi |
|---|---|---|---|---|
| `EC-U-001` | UI / Playwright | Thêm sản phẩm vào giỏ làm cart count/subtotal đúng | `ui-automation-engineer`; file `tests/ui/cart.spec.*` | UI ổn định, app base URL là local/test |
| `EC-U-002` | UI / Playwright | Quantity invalid và lỗi checkout được gắn label/field | `ui-automation-engineer`; file `tests/ui/checkout-validation.spec.*` | Copy/role locator đã xác nhận; synthetic fixtures |
| `EC-AU-001` | API integration | Coupon valid/expired và total theo schema/contract | `api-automation-engineer`; file `tests/api/coupons.spec.*` | Local mock hoặc API test env được phép |
| `EC-AU-002` | API integration | Checkout idempotency: cùng key không tạo đơn trùng | `api-automation-engineer`; file `tests/api/checkout-idempotency.spec.*` | Chỉ sandbox; cleanup order/payment intent được xác định |
| `EC-AU-003` | API security contract | User B không đọc order user A | `api-automation-engineer`; file `tests/api/order-authorization.spec.*` | Hai identity synthetic được cấp; không thử trên dữ liệu thật |
| `EC-H-001` | Harness/fixture | Tạo cart/user/order test data cô lập, cleanup an toàn | `test-automation-framework-engineer`; một mình sở hữu fixtures | Thực hiện trước các worker API/UI nếu fixture dùng chung |

Không cho worker UI và API cùng sửa `global-setup`, fixture cart chung hoặc test config. Nếu cần fixture mới, giao cho harness engineer trước, review xong mới dispatch automation consumers.

### Pseudocode automation mẫu

```ts
// Pseudocode: adapt selectors and fixtures to the real app and local/test runner.
test("checkout retry with the same idempotency key does not duplicate an order", async ({ api }) => {
  const cart = await createSyntheticCart(api, { sku: "<SKU-A>", quantity: 1 });
  const key = `e2e-${crypto.randomUUID()}`;
  const payload = checkoutPayloadFor(cart);

  const first = await api.post("/checkout", {
    data: payload,
    headers: { "Idempotency-Key": key },
  });
  const retry = await api.post("/checkout", {
    data: payload,
    headers: { "Idempotency-Key": key },
  });

  expect(first.ok()).toBeTruthy();
  expect(retry.status()).toBe(first.status());
  expect(await logicalOrderId(retry)).toBe(await logicalOrderId(first));
  // Cleanup must use the approved sandbox fixture API, never a real order.
});
```

Đây là pseudocode, không khẳng định runner/framework cụ thể hoặc contract response. Xác nhận semantics retry, sandbox, cleanup, idempotency key và API wrapper trước khi triển khai/chạy. Nếu không xác định được cleanup an toàn, dừng ở mức thiết kế.

## 6. Tổng hợp kết quả sau dispatch

Coordinator dùng mẫu sau để tránh biến báo cáo của agent thành bằng chứng thực thi:

| Agent/task | Trạng thái dispatch | Artifact/evidence nhận được | Findings đã xác nhận | Assumptions/gaps | Test run |
|---|---|---|---|---|---|
| T0 risk map | `NOT_DISPATCHED` hoặc runtime status | <artifact/source> | <finding + evidence> | <câu hỏi> | `NOT_RUN` |
| T1 manual/UI | ... | <case IDs, screenshot/observation nếu có> | ... | ... | `NOT_RUN` nếu chỉ thiết kế |
| T2 API | ... | <spec version, matrix> | ... | ... | `NOT_RUN` nếu chưa gửi request |
| T3 accessibility | ... | <markup/screenshot/runtime source> | ... | ... | <checks not performed> |
| T4 automation | ... | <files/diff/command/result> | ... | ... | <exact status> |
| T5 release | ... | <evidence reviewed> | ... | <residual risk> | Recommendation only |

### Quy tắc kết luận

- `DISPATCHED` chỉ dùng khi host/runtime xác nhận worker đã được khởi chạy; `NOT_DISPATCHED` khi chưa có bằng chứng dispatch.
- `DESIGNED` hoặc `PLANNED` không đồng nghĩa `EXECUTED`; giữ `NOT_RUN` cho test case chưa chạy.
- `PASS` chỉ khi có expected result, actual result và evidence run hợp lệ theo môi trường đã nêu.
- `FAIL` cần reproduction/evidence; nếu chỉ thấy rủi ro trong spec thì ghi `RISK` hoặc `OPEN QUESTION`, không gọi là defect đã tái hiện.
- Release recommendation phải nêu thiếu hụt, blocker và rủi ro tồn dư; không suy ra go/no-go chỉ từ số lượng case.
