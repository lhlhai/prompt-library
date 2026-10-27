---
title: High-signal Bug Reporting
slug: bug-reporting
category: Communication
tags: [bug, evidence, triage, severity]
level: Beginner
name: bug-reporting
description: Create concise, reproducible QA bug reports with evidence, impact, and severity/priority distinctions. Use when documenting or refining a software defect for triage, especially when separating observed facts from hypotheses.
---

# High-signal Bug Reporting

Use this skill to document a suspected software defect for engineering or product triage. Report only what the available evidence supports; do not claim to have reproduced, tested, or inspected a system unless that was actually done.

## Workflow

1. **Confirm the observation.** Capture what happened, where, and when. If you cannot reproduce it yourself, identify the reporter/source and label it as unverified.
2. **Record reproduction context.** Include only relevant environment details: build/version, browser or device, account role (never credentials), feature flags, and data/setup. Note unknowns rather than inventing them.
3. **Write minimal reproduction steps.** State preconditions, then number the actions from a clean starting point through the observed failure. Make each step specific and repeatable.
4. **Separate outcomes.** Describe the expected result and the actual observed result in distinct, concrete terms. Include frequency, impact, and any known workaround; use “unknown” when not established.
5. **Attach evidence.** Cite available screenshots/video, timestamps, request or correlation IDs, and relevant logs/responses. Do not fabricate evidence or infer root cause from symptoms. Redact secrets and personal data.
6. **Support triage.** Describe severity as user/business impact and priority as urgency/order of work. Recommend values only when the evidence and team conventions support them; otherwise leave them for triage.
7. **Label uncertainty.** Keep verified observations separate from hypotheses, suspected causes, and missing information.

## Report format

- **Title:** `[Area] [action] causes [observable impact] when [condition]`
- **Environment / setup:**
- **Preconditions:**
- **Steps to reproduce:**
- **Expected:**
- **Actual:**
- **Frequency / impact / workaround:**
- **Evidence:**
- **Severity / priority:** values or `not assessed`, with brief rationale
- **Known facts:**
- **Hypotheses / unknowns:**

Omit fields that truly do not apply; mark relevant missing details as unknown instead of silently guessing. Keep the title focused on the symptom, not a proposed fix.

## Safety and quality checklist

- [ ] A reader can follow the steps without guessing essential setup.
- [ ] Expected behavior, actual observation, and evidence are distinguishable.
- [ ] Reproduction status and uncertainty are explicit; no unverified root cause is stated as fact.
- [ ] No credentials, tokens, or unnecessary personal data are included.
- [ ] Do not trigger destructive or production-impacting actions to gather evidence without explicit authorization; use approved test data and environments.
