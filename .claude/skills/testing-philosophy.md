---
name: SaaS & Web testing-philosophy
description: "TARS testing approach and coverage requirements. Use when writing tests, planning test strategy, or discussing test coverage. Triggers: test, testing, coverage, E2E, integration test, dead code."
---

# Testing Philosophy

## Core Rules

- **ZERO unit tests** — only integration/E2E tests
- **100% coverage required** on ALL metrics (statements, branches, lines, functions)
- **Test functionality, not functions** — design tests around real user/developer workflows

## Test Design Approach

1. Ask: "What would a user/dev do to trigger this code?"
2. Write tests that simulate those real scenarios
3. If no realistic scenario triggers code → it's dead code, comment it out

**For existing codebases:** Use `codebase-analysis.md` to map user flows before writing tests.

## Test Entry Point

**Public documented API / developer package interface ONLY**

- Tests interact through the same interface a real user/developer would use
- No testing of internal implementation details
- Think through corner cases from the public API perspective

## Coverage Enforcement

```bash
# All metrics must hit 100%
- Statements: 100%
- Branches: 100%
- Lines: 100%
- Functions: 100%
```

## Dead Code Rule

If no realistic scenario triggers a piece of code:
1. Verify it's truly unreachable from public API
2. Comment it out (don't delete—may be needed later)
3. Note in task tracking why it was commented
