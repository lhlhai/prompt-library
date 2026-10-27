# Automation Tester Agent Kit for GitHub Copilot SDK

Bộ này có bốn agent phối hợp cho kiểm thử tự động: một coordinator và ba specialist. Repo hiện có thêm mười agent QA cho manual testing, API, triage, risk và orchestration đa miền. Mapping của từng profile nằm trong frontmatter `skills` tại `agents/<agent>.md`; đây là nguồn cần giữ nhất quán với cấu hình runtime.

| Agent | Phạm vi | Tool set nguồn | Skills được preload |
|---|---|---|---|
| `automation-test-orchestrator` | Phân rã yêu cầu, giao việc, kiểm soát phụ thuộc/file ownership và tổng hợp | `view`, `grep`, `glob`, `edit`, `task` | `qa-tool-selection`, `risk-based-test-design`, `feature-test-case-design`, `api-contract-testing` |
| `ui-automation-engineer` | Browser/UI/E2E automation | `view`, `grep`, `glob`, `edit`, `bash` | `feature-test-case-design`, `risk-based-test-design`, `accessibility-smoke-test` |
| `api-automation-engineer` | API/contract/integration automation | `view`, `grep`, `glob`, `edit`, `bash` | `api-contract-testing`, `swagger-api-test-design`, `risk-based-test-design` |
| `test-automation-framework-engineer` | Runner, fixtures, mocks, test data, CI test jobs và reporting | `view`, `grep`, `glob`, `edit`, `bash` | `qa-tool-selection`, `risk-based-test-design`, `api-contract-testing` |

## Nạp skill và agent trong Copilot SDK

SDK nhận `skillDirectories` ở cấp session để tìm skill, nhưng việc preload instruction phải được khai báo trong trường `skills` của **từng custom agent**. Skill được nêu ở coordinator không tự truyền sang sub-agent. Ví dụ dưới đây đọc danh mục đã build từ source Markdown, rồi đưa mapping của từng profile vào `customAgents`.

Các file nguồn trong `skills/` là dạng phẳng (`skills/<name>.md`), trong khi SDK mong thư mục skill có cấu trúc `<skill-directory>/SKILL.md`. Chuẩn bị bản SDK-compatible trước khi khởi tạo session:

```sh
node build-skills-agents.mjs
node prepare-copilot-sdk.mjs
```

Script thứ hai tạo `.copilot-sdk/skills/<skill-name>/SKILL.md` cho toàn bộ skill trong repo và kiểm tra tên trong frontmatter. Thư mục `.copilot-sdk/skills` là output được tạo lại từ nguồn, không chỉnh sửa trực tiếp.

```ts
import { readFile } from "node:fs/promises";
import { CopilotClient } from "@github/copilot-sdk";

const { items: profiles } = JSON.parse(
  await readFile("./data/agents.json", "utf8"),
);
const customAgents = profiles.map((profile) => ({
  name: profile.name || profile.slug,
  description: profile.description,
  tools: profile.tools ?? [],
  prompt: profile.content,
  // Bắt buộc khai báo riêng cho từng agent; không dựa vào kế thừa.
  skills: profile.skills ?? [],
}));

const client = new CopilotClient();
await client.start();
const session = await client.createSession({
  customAgents,
  skillDirectories: ["./.copilot-sdk/skills"],
  agent: "automation-test-orchestrator",
  // Áp dụng permission handler theo chính sách host; không auto-approve rộng.
});
```

`build-skills-agents.mjs` cần chạy sau khi sửa agent/skill để cập nhật `data/agents.json` và `data/skills.json`. Khi thay đổi skill trong một session đang chạy, gọi `session.rpc.skills.reload()` theo tài liệu SDK. Nên validate các giá trị trong `profile.skills` đều trùng tên skill đã được nạp; không bỏ qua skill không tồn tại.

## Mapping đủ 14 agent hiện có

Các mapping sau phản ánh frontmatter hiện tại của 14 file trong `agents/`. Mỗi mục được truyền vào SDK như `customAgents[n].skills`; sub-agent nhận đúng mapping riêng của nó, không phụ thuộc coordinator.

- `accessibility-checker`: `accessibility-smoke-test`, `bug-reporting`
- `api-automation-engineer`: `api-contract-testing`, `swagger-api-test-design`, `risk-based-test-design`
- `api-contract-reviewer`: `api-contract-testing`, `bug-reporting`
- `api-testcase-writer`: `swagger-api-test-design`, `api-contract-testing`, `qa-tool-selection`, `bug-reporting`
- `automation-test-orchestrator`: `qa-tool-selection`, `risk-based-test-design`, `feature-test-case-design`, `api-contract-testing`
- `bug-triage-partner`: `bug-reporting`, `risk-based-test-design`
- `feature-testcase-writer`: `feature-test-case-design`, `risk-based-test-design`, `bug-reporting`
- `manual-test-execution-coach`: `tester-manual-automation-api`, `exploratory-testing`, `feature-test-case-design`, `bug-reporting`
- `multi-agent-test-orchestrator`: `multi-agent-test-orchestration`, `tester-manual-automation-api`, `risk-based-test-design`, `qa-tool-selection`
- `qa-workflow-orchestrator`: `qa-tool-selection`, `risk-based-test-design`, `feature-test-case-design`, `swagger-api-test-design`
- `release-go-no-go`: `release-risk-review`, `risk-based-test-design`, `bug-reporting`
- `test-automation-framework-engineer`: `qa-tool-selection`, `risk-based-test-design`, `api-contract-testing`
- `test-strategy-planner`: `risk-based-test-design`, `exploratory-testing`
- `ui-automation-engineer`: `feature-test-case-design`, `risk-based-test-design`, `accessibility-smoke-test`

## Chạy ba nhánh độc lập với Fleet mode

Định nghĩa agent và preload skills chưa tự khởi chạy parallel work. Host cần gọi Fleet API để yêu cầu runtime tách task độc lập. Coordinator phải kiểm tra framework, phụ thuộc và file ownership trước; nếu cần sửa framework dùng chung trước, hãy chạy nhánh đó tuần tự.

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

Fleet và agent definitions không đồng nghĩa với việc sub-agent đã chạy; chỉ báo đã dispatch khi runtime xác nhận. Pin phiên bản Copilot SDK và Copilot CLI runtime nếu phụ thuộc API Fleet đang ở trạng thái experimental.

## Dùng từng specialist

- Chọn `ui-automation-engineer` khi yêu cầu tập trung vào browser flow, UI regression, locator, hoặc E2E.
- Chọn `api-automation-engineer` khi có API contract/spec hoặc cần tạo/sửa test tích hợp API.
- Chọn `test-automation-framework-engineer` khi cần fixture, mock, runner, test-data builder, CI test job, hoặc reporting.
- Dùng coordinator khi công việc băng qua nhiều nhánh; nếu chỉ một nhánh, gọi trực tiếp specialist để giảm overhead.

Các specialist có quyền `edit` để tạo/cập nhật test artefact. `bash` chỉ được cấp cho specialist để kiểm tra test có giới hạn. Coordinator có `task` để delegate nhưng không có `bash`. Trong bản copy cho VS Code, tool names được chuyển thành alias tương thích (`view` → `read`, `grep`/`glob` → `search`, `bash` → `execute`, `task` → `agent`). Bản copy bổ sung mục **Skill routing** từ `skills` metadata; điều này giúp agent biết mapping nhưng không biến VS Code discovery thành cam kết rằng skill sẽ được gọi ở mọi lượt.

## Tài liệu chính thức

- [Custom skills — Copilot SDK](https://docs.github.com/en/copilot/how-tos/copilot-sdk/features/skills)
- [Custom agents and sub-agent orchestration — Copilot SDK](https://docs.github.com/en/copilot/how-tos/copilot-sdk/features/custom-agents)
- [Fleet mode — Copilot SDK](https://docs.github.com/en/copilot/how-tos/copilot-sdk/features/fleet-mode)
- [Customization discovery locations — Copilot SDK](https://docs.github.com/en/copilot/how-tos/copilot-sdk/features/customization-locations)
- [Agent Skills — VS Code](https://code.visualstudio.com/docs/agent-customization/agent-skills)
- [Custom agent file reference — VS Code](https://code.visualstudio.com/docs/agents/reference/custom-agent-file-reference)
