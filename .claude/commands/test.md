---
allowed-tools: Bash(npm:*), Bash(bun:*), Bash(pytest:*), Bash(make:*)
description: Run project tests with target coverage
---

## Context

- Package scripts: !`cat package.json 2>/dev/null | grep -A 20 '"scripts"' | head -25`
- Python config: !`cat pyproject.toml 2>/dev/null | head -30`
- Coverage requirements: !`cat .claude.md CLAUDE.md 2>/dev/null | grep -i "coverage\|test" | head -10`

## Instructions

1. **Detect the project type and test command:**
   - If `package.json` with `test:cover` script → `npm run test:cover`
   - If `package.json` with `test` script → `npm test`
   - If `pyproject.toml` or `pytest.ini` exists → `pytest --cov --cov-report=term-missing`
   - If `Makefile` with test target → `make test`
   - If `bun.lockb` exists → `bun test`

2. **Check for coverage targets in .claude.md:**
   - Note any coverage requirements mentioned in the project config
   - If "100%" is mentioned, inform user they can use `/100` to enforce it

3. **Run the tests and report results:**
   - Execute the detected test command
   - Show test pass/fail results
   - Show coverage summary if available

4. **If tests fail:**
   - Show the failures clearly
   - Do NOT automatically try to fix them unless explicitly asked
