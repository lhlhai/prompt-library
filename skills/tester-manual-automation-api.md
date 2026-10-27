---
title: Tester Handbook — Manual, Automation & API Testing
slug: tester-manual-automation-api
category: Testing Practice
tags: [manual-testing, automation, api, checklist, templates]
level: Intermediate
name: tester-manual-automation-api
description: Practical tester handbook for planning and performing manual, UI/API automation, and API testing. Use when a tester needs a structured workflow, executable safe examples, coverage checklist, or reusable test templates.
---

# Tester Handbook: Manual, Automation & API Testing

Use this playbook to select a testing approach, create reproducible cases, capture evidence, and hand off results. Separate requirements, assumptions, tests planned, tests executed, and observed evidence. A test case is not a test result. Never access production, use real customer data, expose secrets, or cause a side effect unless the user explicitly authorizes the exact action in a safe environment.

## Manual Testing

### Theory and approach

Manual testing uses a person to explore a product and assess observable behavior. It is useful for learning an unfamiliar feature, evaluating usability and visual behavior, investigating ambiguous requirements, and finding interactions that are difficult to encode. It complements—not replaces—repeatable automated regression.

Start from a charter or a requirement. Identify actor, preconditions, environment, data, expected behavior, scope, and stop condition. Derive tests using equivalence partitions, boundary values, decision tables, state transitions, negative cases, and exploratory heuristics. Prioritize by probability and impact of failure. A reproducible finding states the setup, exact steps, expected result, actual observed result, and evidence. Mark any unperformed step `Not run`; do not infer a pass from the absence of a report.

A useful exploratory session is time-boxed and risk-led. Keep a lightweight session log: what was tried, what was observed, what changed, and what remains untested. Stop before destructive actions, external messages, purchases, or production writes unless explicitly authorized.

### Manual testing cheatsheet

| Technique | Apply it to | Example |
|---|---|---|
| Equivalence partitioning | Inputs expected to behave alike | Valid, invalid, and missing email |
| Boundary-value analysis | Limits and transitions | 0, 1, max, max + 1 |
| Decision table | Several conditions determine an outcome | Role × account state × requested action |
| State transition | Behavior depends on current state | Draft → submitted → approved / rejected |
| Negative testing | Invalid, unauthorized, or interrupted flows | Expired session, duplicate submit, network loss |
| Pairwise sampling | Many configuration combinations | Browser × locale × role |
| Exploratory charter | Unclear or high-risk behavior | Probe recovery after interrupted upload |

### Tools and tips

Use the team's agreed browser and test environment. Capture exact build/version, browser, viewport, role, feature flags, test data identifiers (non-sensitive), and timestamps where useful. Prefer synthetic accounts and reversible setup. For accessibility smoke checks, include keyboard-only navigation, visible focus, labels/errors, zoom/reflow, and accessible names; do not call a smoke test a WCAG audit.

Keep test cases independent and data setup repeatable. Use a clear status vocabulary such as `Pass`, `Fail`, `Blocked`, and `Not run`. Record an observation only after performing the step. If the environment is unavailable, return a test plan and clearly state that execution did not occur.

**Example: small manual session log (Markdown)**

```markdown
## Charter
Explore password-reset recovery when the user requests multiple links.

- Environment/build: <test environment and build>
- Account/data: <synthetic account identifier>
- Time box: 20 minutes
- In scope: link expiry, repeated request, return to sign-in
- Out of scope: sending messages to real users

| Time | Action | Observation | Evidence | Follow-up |
|---|---|---|---|---|
| 10:00 | Request reset once | Not run until performed | — | — |
```

### Manual test case template

```markdown
| ID | Requirement / AC | Title | Priority | Preconditions | Steps | Test data | Expected result | Actual result | Status | Evidence |
|---|---|---|---|---|---|---|---|---|---|---|
| MT-001 | AC-<id> | <observable behavior> | P1 | <role, state, environment> | 1. ... 2. ... | <synthetic data> | <measurable result> | Not run | — |
```

A defect report should add a concise title, reproducibility, frequency if known, impact, environment, sanitized evidence, and severity rationale. Keep suspected cause separate from observed behavior.

## Automation Testing

### Theory and approach

Automation executes a repeatable check with software. Use it where stable, observable behavior is repeated often enough to justify maintenance. Unit tests are fast and isolate small logic; component/integration tests check boundaries among modules; API/contract tests validate service behavior and schemas; end-to-end UI tests cover a few critical user journeys through the real application surface. Favor the lowest layer that provides credible evidence for the risk.

A useful automated test has one purpose, deterministic setup, explicit assertions, isolated data, and cleanup where needed. Avoid arbitrary sleeps, shared mutable fixtures, assertions on implementation details, and tests coupled to unstable copy or layout unless those are the requirement. Keep test names and IDs traceable to requirements. Treat retries as diagnostics, not a substitute for fixing flakiness.

Use the repository's existing runner and conventions. Do not add dependencies or change production code unless asked. Inspect commands and destinations before running tests; a script existing in a repo does not itself authorize execution. Only run against local/mock or explicitly authorized non-production systems.

### Automation testing cheatsheet

| Concern | Preferred practice | Warning sign |
|---|---|---|
| Test pyramid | Many unit/component checks, focused API integration, few E2E | Entire suite depends on browser E2E |
| Selectors | Role, label, accessible name, stable test ID | CSS classes tied to styling internals |
| Assertions | Check user-visible outcome and state | Test only that a click did not throw |
| Waits | Wait for a specific state/network response | Fixed sleep as synchronization |
| Test data | Unique synthetic data and deterministic cleanup | Shared account/state across parallel cases |
| Flakiness | Capture trace/logs; fix root cause | Increase retries and declare green |
| Coverage | Map tests to requirements and risks | Chasing line coverage without behavior |
| Parallelism | Isolate files, data, and environment | Workers mutate the same record or fixture |

### Tools and tips

Use the framework already installed (for example Playwright, Cypress, pytest, JUnit, or a contract runner) rather than prescribing a stack without evidence. For browser tests, prefer semantic locators. For API tests, isolate base URL and credentials in environment configuration; never paste secrets into code or output. Store logs and screenshots with test-run identifiers and redact tokens and personal data.

**Example: Playwright UI assertion (TypeScript)**

```ts
import { test, expect } from "@playwright/test";

test("shows a validation message for a missing required field", async ({ page }) => {
  await page.goto(process.env.TEST_BASE_URL ?? "http://127.0.0.1:3000");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Enter your email address")).toBeVisible();
});
```

This is a local/test-environment pattern only. Confirm the actual UI labels and local app availability before using it; do not point it at production.

**Example: pytest API check with a local base URL (Python)**

```python
import os
import requests

BASE_URL = os.getenv("TEST_BASE_URL", "http://127.0.0.1:8080").rstrip("/")

def test_health_endpoint_returns_success():
    response = requests.get(f"{BASE_URL}/health", timeout=5)
    assert response.status_code == 200
```

Run only after confirming that the local test service is intended and safe to query. Do not insert a real token into the example or share raw authorization headers in logs.

### Automation test template

```markdown
| Test ID | Requirement / risk | Layer | Setup / fixture | Action | Assertion | Cleanup | Owner | Status |
|---|---|---|---|---|---|---|---|---|
| AT-001 | <AC or risk> | unit / component / API / UI | <isolated synthetic setup> | <single behavior> | <observable assertion> | <reset or none> | <owner> | NOT_RUN |
```

Before merging, review scope, isolation, determinism, cleanup, secret handling, and the exact command. Report command, environment, result, skipped tests, and `NOT_RUN` items honestly.

## API Testing

### Theory and approach

An API test checks the observable contract between a provider and consumer. Start from an authoritative OpenAPI/Swagger document, agreed schema, or explicit examples. Cover method/path, required and optional fields, types, formats, constraints, authentication and authorization, success and error status codes, response schema, pagination, and compatibility. Do not invent missing business rules.

Separate contract validation from live integration behavior. A static schema check does not prove a service returns that schema. A mock test does not prove a remote provider is healthy. State which evidence source was used. Use the lowest-risk environment available, synthetic data, and read-only requests by default. A write request, destructive action, or external network call requires explicit scope, safe target, authorization, and cleanup.

### API testing cheatsheet

| Test dimension | Cases to consider |
|---|---|
| Method and routing | Supported method, wrong method, unknown route, content type |
| Input validation | Required/missing, wrong type, malformed format, enum, min/max, boundary |
| Success | Status, headers, body shape, nullability, data types, pagination |
| Error behavior | 400/401/403/404/409/429/5xx where contract defines them; stable error schema |
| Authorization | Missing/invalid token, role mismatch, object-level access, tenant boundary |
| Compatibility | Removed/renamed fields, enum expansion, defaults, version changes, consumer tolerance |
| Resilience | Timeout, retry, idempotency, duplicate request, rate limit—only in authorized safe tests |
| Security hygiene | Redacted tokens/PII, no credentials in examples or logs |

### Tools and tips

Use OpenAPI linters and schema validators for static checks; use pytest/requests, Newman, Bruno, REST Assured, or an existing runner for executable checks. Select tools from repository evidence. Keep base URL configurable and secret values outside source control. Prefer a local mock or a dedicated non-production environment. Use a non-mutating `GET` smoke request first where authorized; never assume a public URL is safe to test.

**Example: inspect a local GET endpoint with curl**

```sh
set -eu
BASE_URL="${TEST_BASE_URL:-http://127.0.0.1:8080}"
curl --fail-with-body --silent --show-error \
  --header 'Accept: application/json' \
  "$BASE_URL/health"
```

This sends a request. Run it only after verifying that `TEST_BASE_URL` points to an authorized local or test service. Do not append a token unless one was explicitly provided for that environment; redact sensitive response fields before sharing output.

**Example: minimal OpenAPI contract review checklist**

```markdown
- [ ] Method/path and operation purpose match the requirement.
- [ ] Required, nullable, type, enum, format, and boundary constraints are clear.
- [ ] Auth scheme and required authorization are stated.
- [ ] Success and documented error responses have schemas and examples.
- [ ] Pagination, idempotency, retry, and rate limits are covered when applicable.
- [ ] Breaking-change risk for known consumers has been reviewed.
- [ ] Unknown rules are recorded as questions, not guessed.
```

### API test matrix template

```markdown
| Case ID | Endpoint / method | Contract clause | Scenario | Request data | Expected status / schema | Environment | Side effect? | Evidence / result |
|---|---|---|---|---|---|---|---|---|
| API-001 | GET /<path> | <spec section> | Valid request | <synthetic input> | <status and measurable schema> | <local/test> | No | NOT_RUN |
| API-002 | POST /<path> | <spec section> | Missing required field | <synthetic input> | <documented error> | <local/test> | Confirm before run | NOT_RUN |
```

For each finding, record endpoint, minimal reproduction, expected versus actual, status/headers/body evidence with secrets redacted, service version/environment, impact, and whether it was confirmed or remains a risk/question.

## Cross-cutting handoff checklist

- [ ] Scope, requirements, environment, roles, and constraints are explicit or marked unknown.
- [ ] Priorities are tied to risk, user impact, or a requirement.
- [ ] Test design is traceable and uses synthetic or sanitized data.
- [ ] Planned, executed, observed, and verified states are not conflated.
- [ ] Each parallel task has one owner and non-overlapping files/data.
- [ ] Commands and requests are run only when authorized and safe.
- [ ] Results include evidence, limitations, skipped/not-run checks, and next action.
