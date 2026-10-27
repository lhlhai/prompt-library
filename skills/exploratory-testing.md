---
title: Structured Exploratory Testing
slug: exploratory-testing
category: Test Execution
tags: [exploratory, charter, heuristics]
level: Intermediate
name: exploratory-testing
description: Plan and conduct focused exploratory QA sessions using charters, heuristics, and evidence. Load when investigating an application beyond scripted tests, probing a defined risk area, or documenting reproducible findings.
---

# Structured Exploratory Testing

Use this skill to investigate a defined product risk through purposeful exploration, not as a substitute for required scripted tests. Work only in environments, accounts, and data you are authorized to use.

## Session flow

1. **Confirm scope and access.** Identify the feature/build or version, test environment, allowed account and data, and any actions that are out of bounds. If these are unknown, ask or state the limitation; do not assume production access is safe.
2. **Set a charter.** Use: **Explore [area] with [data/heuristic] to discover [risk] within [timebox].** Keep one primary charter per session. Choose a practical timebox (often 30–60 minutes) and note any scope boundary.
3. **Establish a baseline.** Record available build/version, environment, relevant account/role, and test data. Note what is unavailable rather than inventing it.
4. **Explore deliberately.** Follow the charter and select relevant tours, varying one factor at a time where useful. Record actions, observations, questions, anomalies, and follow-up ideas as you go.
5. **Investigate anomalies.** Pause broad exploration to check whether an anomaly is reproducible. Reduce it to the shortest safe sequence, compare expected and actual behavior using a stated requirement or observable baseline, and capture available evidence. Do not claim a cause without supporting evidence.
6. **Debrief.** Summarize areas exercised, findings, unresolved questions, remaining risks, and recommended follow-up. Mark the session incomplete if its scope or access prevented meaningful exploration.

## Heuristics

Choose only those relevant to the charter:

- **CRUD and golden path:** create, view, edit, delete, and complete the primary workflow.
- **Boundaries and data:** empty, minimum/maximum, invalid input, Unicode, timezone, and retry.
- **Consistency:** compare UI with API responses, notifications, or audit records only when those surfaces are available and in scope.
- **Interruption and repetition:** refresh, back, timeout, retry, and duplicate submission; avoid actions that could cause uncontrolled side effects.
- **Permissions:** compare roles only with authorized test accounts and data.

## Finding and evidence quality

For each finding, record:

- Short title and observed impact; severity only if the project’s criteria are known, otherwise state the impact without inventing a rating.
- Build/version and environment, if available; relevant role and non-sensitive seed-data description.
- Minimal reproduction steps, expected behavior and its source (requirement, specification, or explicit baseline), and actual behavior.
- Evidence actually captured (for example, sanitized screenshot, log excerpt, or response); redact secrets and personal data.
- Reproducibility and confidence. Separate **observed facts** from **assumptions**, suspected causes, and unanswered questions.

Never imply a test was run, a system was accessed, or evidence was captured unless that happened and is supported by the session record. If reproduction or comparison was not possible, label the item as an unverified observation, not a confirmed defect.

## Safety boundaries

- Do not test systems, accounts, or data without authorization; do not use real personal data when safe test data is available.
- Avoid destructive, irreversible, high-volume, or externally visible actions unless explicitly in scope and approved. Stop if an action may affect real users, payments, messages, or production data.
- Do not expose credentials, tokens, personal information, or unredacted sensitive evidence in notes or reports.
- If access, expected behavior, or a safe recovery path is unclear, pause that test and report the limitation.

## Checklist

- [ ] Scope, environment, permissions, and boundaries are clear.
- [ ] Charter names an area, approach/data, risk, and timebox.
- [ ] Notes distinguish observations from assumptions and include evidence that actually exists.
- [ ] Findings have reproducible steps or are explicitly marked unverified.
- [ ] Debrief records coverage, open questions, and follow-up risks.
