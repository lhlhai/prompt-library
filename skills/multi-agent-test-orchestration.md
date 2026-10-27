---
title: Multi-Agent Test Orchestration
slug: multi-agent-test-orchestration
category: Workflow & Tooling
tags: [multi-agent, orchestration, parallel, qa, evidence]
level: Advanced
name: multi-agent-test-orchestration
description: Plan and coordinate bounded QA work across multiple specialist agents for manual testing, automation, API contracts, accessibility, triage, and release review. Use when independent workstreams can benefit from parallel agents; includes safe dispatch, ownership, and evidence-based integration.
---

# Multi-Agent Test Orchestration

Use multiple agents only when there are genuinely independent workstreams or when a specialist review adds useful evidence. Delegation is a way to partition work, not proof that work ran. The coordinator owns scope, assignment, dependency ordering, evidence review, and the final integrated result.

## 1. Decide whether to use multiple agents

Choose parallel delegation when at least two bounded workstreams can proceed without changing the same files, shared test data, remote state, or environment. Examples include:

- Manual test design from acceptance criteria, API contract review, and accessibility review of supplied UI evidence.
- Independent read-only reviews of UI behavior, service contract, and release risk.
- Separate implementation/test work in disjoint UI, API, and harness-owned paths after framework conventions are understood.

Do not parallelize merely to use more agents. Work sequentially when one result determines the next, when requirements are ambiguous, when a shared fixture or framework must be changed first, or when tasks share mutable state. Keep a one-agent path for small or single-domain requests.

## 2. Build bounded work packets

Every assignment should contain:

1. **Goal and deliverable** — one question or artifact, with a concrete acceptance check.
2. **Context and evidence** — relevant request, requirement IDs, files, versions, and decisions already made.
3. **Scope and ownership** — allowed paths, excluded paths, test environment, data ownership, and whether edits are allowed.
4. **Method and constraints** — tools, time/coverage limit if known, security boundary, and what must not be executed.
5. **Return format** — findings with source/path/line or requirement reference, assumptions, missing evidence, exact edits/commands/results if any, and `NOT_RUN` where appropriate.

The coordinator should pass enough context for a worker that has no access to parent conversation history. A worker should not receive secrets, production customer data, or broader permission than necessary.

## 3. Assign specialists by task

Select only agents actually present in the current runtime. Example routing from this repository:

- **Test approach and risk coverage:** `test-strategy-planner`
- **Manual feature test cases:** `feature-testcase-writer`
- **API test matrix:** `api-testcase-writer`
- **API contract and compatibility review:** `api-contract-reviewer`
- **UI automation:** `ui-automation-engineer`
- **API automation:** `api-automation-engineer`
- **Shared automation harness:** `test-automation-framework-engineer`
- **Accessibility evidence review:** `accessibility-checker`
- **Defect report/triage:** `bug-triage-partner`
- **Release recommendation:** `release-go-no-go`
- **Broad, cross-domain automation implementation:** `automation-test-orchestrator`
- **Manual exploration planning:** `test-strategy-planner` with `exploratory-testing`; a separate execution operator is needed for live interaction.

The agent name is a routing suggestion, not proof it exists. Check the runtime's actual registered agents/tools; if a requested specialist is missing, perform only the work the coordinator is equipped and authorized to do, or return a transparent handoff.

## 4. Dispatch and control parallelism

Before dispatch, make a dependency graph. Identify shared files, fixtures, schemas, test accounts, browser sessions, and rate-limited services. Give one owner per mutable resource. Read-only work can often run concurrently; changes to shared harness or test data should be serialized.

Start with the smallest useful worker set. A practical default for cross-surface coverage is a strategy planner plus only the needed manual/UI, API, and accessibility specialists. Avoid duplicate agents reviewing the same material without a clear difference in question. Bound each task and specify a stop condition; do not create recursive delegation unless the host explicitly supports and authorizes it.

Runtime behavior differs by integration. Copilot SDK requires skill names to be configured for each custom agent; sub-agents do not inherit the coordinator's skill list. SDK Fleet/parallel execution must be started by the host and confirmed by its result. In VS Code, custom agent/sub-agent availability and invocation depend on the active harness and configured agent tool. A profile file does not itself dispatch workers. Never say workers ran until the runtime confirms they were started.

## 5. Integrate results as evidence

For every report:

- Map each conclusion to a requirement, source file/line, observation, test output, or supplied evidence.
- Distinguish `Observed`, `Confirmed`, `Assumption`, `Risk`, `Open question`, and `Not verified`.
- Inspect reported files and diffs when tools and task permissions allow; don't trust a summary as proof of unreviewed changes.
- Normalize conflicting terms or severity only after documenting each worker's original rationale.
- Deduplicate findings while preserving distinct environments, requirements, or reproduction paths.
- Mark commands/tests the worker did not run as `NOT_RUN`; do not turn a plan into a pass.
- Report absent workers, tool failures, missing data, skipped tasks, and uncertainty.

The final result should include workstreams and owners, dispatch status, evidence-based findings, files changed, test commands and outcomes (if run), coverage gaps, risk, and next owner/action. Say `NOT_DISPATCHED` when the host could not or did not start parallel work.

## 6. Safety and side effects

Do not dispatch production access, destructive testing, external write requests, deployments, purchases, or real-user communication without explicit, scoped authorization. Use local mocks or approved non-production environments and synthetic data. Inspect commands/destinations before test execution. Limit credentials to authorized secret stores and redact them from logs, screenshots, and reports. Parallel agents must not share a mutable test account or record unless the test plan explicitly isolates and resets that state.

## Dispatch brief template

```markdown
### Task <ID> — <specialist>
Goal: <one bounded question or artifact>
Context: <requirements, files, decisions, environment>
Allowed scope: <read-only or exact owned paths>
Not allowed: <production, external writes, shared files, secrets>
Dependencies: <none or prerequisite and owner>
Acceptance checks: <observable completion conditions>
Return: <findings/evidence/files/commands/results/assumptions/NOT_RUN>
```

## Coordinator checklist

- [ ] Multiple agents add value and the tasks are independent enough to parallelize.
- [ ] Each worker is available, named, and assigned one bounded deliverable.
- [ ] Shared files, data, environment, credentials, and commands have explicit owners and limits.
- [ ] Required inputs and agent-specific skill mappings are passed explicitly.
- [ ] Dispatch is confirmed before claiming any worker ran.
- [ ] Outputs have been checked against acceptance criteria and traceable evidence.
- [ ] Conflicts, gaps, unrun checks, and residual risk are stated in the integrated report.
