# Automation Tester Agent Kit for GitHub Copilot SDK

Bộ này gồm một coordinator và ba specialist độc lập: **Automation Test Orchestrator**, **UI Automation Engineer**, **API Automation Engineer**, và **Test Automation Framework Engineer**. Coordinator chia yêu cầu thành task có owner/phạm vi tệp riêng, chỉ chạy song song khi không có phụ thuộc hoặc file conflict, rồi tổng hợp bằng chứng và kết quả. Ba specialist có thể được chọn riêng cho từng loại công việc.

| Agent | Phạm vi | Tool set nguồn SDK |
|---|---|---|
| `automation-test-orchestrator` | Phân rã yêu cầu, giao việc, kiểm soát phụ thuộc/file ownership và tổng hợp | `view`, `grep`, `glob`, `edit`, `task` |
| `ui-automation-engineer` | Browser/UI/E2E automation | `view`, `grep`, `glob`, `edit`, `bash` |
| `api-automation-engineer` | API/contract/integration automation | `view`, `grep`, `glob`, `edit`, `bash` |
| `test-automation-framework-engineer` | Runner, fixtures, mocks, test data, CI test jobs và reporting | `view`, `grep`, `glob`, `edit`, `bash` |

## Nạp các agent vào Copilot SDK

Tài liệu Copilot SDK cho phép nạp Markdown custom-agent definitions qua `agentDirectories` và skills qua `skillDirectories`. Các profile nguồn nằm trong `agents/`; ví dụ sau chọn coordinator làm agent đầu phiên. Đường dẫn `./agents` sẽ phát hiện các Markdown agent đang có trong thư viện này, không chỉ bốn profile Automation Tester. Nếu muốn cô lập đúng bộ bốn, hãy đặt bản sao của bốn file vào một thư mục riêng, ví dụ `./custom-agents/automation-tester`, rồi đổi `agentDirectories` sang thư mục đó.

```ts
import { CopilotClient } from "@github/copilot-sdk";

const client = new CopilotClient();
await client.start();

const session = await client.createSession({
  agentDirectories: ["./agents"],
  skillDirectories: ["./skills"],
  agent: "automation-test-orchestrator",
  // Cấu hình permission handler theo chính sách của ứng dụng.
  // Không tự động approve mọi yêu cầu edit hoặc chạy lệnh.
});
```

## Chạy ba nhánh độc lập với Fleet mode

Định nghĩa profile và việc nạp subagents chưa tự khởi chạy parallel work. Theo tài liệu Fleet mode, ứng dụng host cần gọi `session.rpc.fleet.start()` để yêu cầu runtime tách các task độc lập, điều phối worker và trả kết quả về phiên cha. Coordinator phải kiểm tra framework, phụ thuộc và file ownership trước; nếu cần sửa framework dùng chung trước, hãy chạy nhánh đó tuần tự thay vì để các worker cùng sửa một file.

```ts
const result = await session.rpc.fleet.start({
  prompt: [
    "Automation task: <mô tả yêu cầu và acceptance criteria>",
    "Dùng automation-test-orchestrator làm coordinator.",
    "Nếu repository đã có framework ổn định và phạm vi không chồng lấn, chia độc lập: UI/E2E cho ui-automation-engineer; API/contract cho api-automation-engineer; runner/fixtures/CI test-only cho test-automation-framework-engineer.",
    "Mỗi worker phải có phạm vi file riêng, đầu vào đầy đủ, acceptance checks và báo cáo file/command/result. Không cho hai worker sửa cùng file.",
    "Nếu có dependency hoặc file conflict, tuần tự hóa task liên quan; không giả định đã chạy test.",
    "Chỉ chạy test trên local/mock hoặc môi trường non-production được ủy quyền; không dùng credential hay customer data thật."
  ].join("\n")
});

if (!result.started) {
  throw new Error("Fleet mode did not start; do not claim that parallel workers ran.");
}
```

Trong TypeScript SDK, Fleet API hiện được tài liệu ghi nhận qua generated RPC surface và có trạng thái experimental; pin phiên bản Copilot SDK và Copilot CLI runtime nếu dựa vào hành vi này. Bản thân `.agent.md` chỉ định nghĩa agent, tool permissions và prompt; việc có chạy song song hay không phụ thuộc host/runtime.

## Dùng từng specialist

- Chọn `ui-automation-engineer` khi yêu cầu tập trung vào browser flow, UI regression, locator, hoặc E2E.
- Chọn `api-automation-engineer` khi có API contract/spec hoặc cần tạo/sửa test tích hợp API.
- Chọn `test-automation-framework-engineer` khi cần fixture, mock, runner, test-data builder, CI test job, hoặc reporting.
- Dùng coordinator khi công việc băng qua nhiều nhánh; nếu chỉ một nhánh, gọi trực tiếp specialist để giảm overhead.

Các profile có quyền `edit` vì chúng cần tạo/cập nhật test artefact. `bash` chỉ được cấp cho specialist để kiểm tra test có giới hạn; prompt cấm production, deploy và request từ xa ngoài phạm vi được ủy quyền. Coordinator có `task` để delegate nhưng không có `bash`. Trong nút **Copy for VS Code**, tool names được chuyển thành alias tương thích profile VS Code/Copilot (`view` → `read`, `grep`/`glob` → `search`, `bash` → `execute`, `task` → `agent`). `edit` là quyền tạo/chỉnh sửa file (bao gồm khả năng Write trong alias map của GitHub Copilot), không phải quyền chạy test.

## Tài liệu chính thức

- [Custom agents and sub-agent orchestration — Copilot SDK](https://docs.github.com/en/copilot/how-tos/copilot-sdk/features/custom-agents)
- [Fleet mode — Copilot SDK](https://docs.github.com/en/copilot/how-tos/copilot-sdk/features/fleet-mode)
- [Customization discovery locations — Copilot SDK](https://docs.github.com/en/copilot/how-tos/copilot-sdk/features/customization-locations)
- [Custom agents configuration — GitHub Copilot](https://docs.github.com/en/copilot/reference/custom-agents-configuration)
- [Custom agent file reference — VS Code](https://code.visualstudio.com/docs/agents/reference/custom-agent-file-reference)
