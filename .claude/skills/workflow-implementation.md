---
name: workflow-implementation
description: "Phases 5-6: Implementation + Completion. Use when writing code, running tests, updating docs, or completing/merging work. Triggers: implement, code, build, test, merge, commit, complete, ship."
---

# Workflow: Implementation (Phases 5-6)

**Goal:** Execute the approved plan with continuous testing, then clean handoff.

After each sub-step: update task tracking file in `todo/`

---

## Phase 5: Implementation

### 1. Branch Safety Check

```bash
# Check current branch
git branch --show-current

# If on main/master, create feature branch
git checkout -b feature/short-description
# or
git checkout -b hotfix/short-description
```

### 2. Implement in Testable Increments

- Each high-level task = complete piece of functionality
- Work through tasks in order
- Update task status as you progress
- Surface blockers or scope changes immediately

### 3. Test Each Increment *(Continuous — not deferred)*

**For existing codebases:** First run through `codebase-analysis.md` to understand user flows.

After completing each testable piece:

1. **Write tests** covering behavioral flows
2. **Run full scenario testing** with 100% coverage on all metrics
3. **Verify no dead code** exists
4. **Do NOT proceed** until current increment passes all tests

Test rules (see `skills/testing-philosophy.md`):
- Entry point: Public API / developer interface ONLY
- No testing internal implementation
- Tests derived from acceptance criteria (Phase 2)

### 4. Follow Technical Guidelines

- Use required packages for project type:
  - JS/TS/Node/Web/SaaS → see `skills/tech-stack-js.md`
  - Unity/Unreal/Godot/VR/AR/Games → see `skills/tech-stack-vr-game.md`
- Run via Docker where applicable
- Minimize dependencies beyond required packages

### 5. Update Documentation *(After tests pass)*

- Update `README.md` — user-facing, quick start, examples
- Update `files.md` — developer-facing, module architecture, constraints
- Ensure docs reflect all new/changed functionality

---

## Phase 6: Completion

### 1. Verify & Test

- [ ] All acceptance criteria met
- [ ] All tests pass
- [ ] 100% coverage confirmed

### 2. User Review

- Demo or describe what was built
- Get explicit confirmation user is satisfied

### 3. Commit & Merge

**Present to user:**
```
Files staged:
- [file1]
- [file2]

Proposed commit message:
[message]

OK to proceed with committing & merging?
```

If approved:
1. Commit with approved message
2. Merge to target branch
3. Resolve any conflicts
4. Update task tracking with post-mortem & retrospective

---

## Phase Exit Criteria

- [ ] All tasks completed and checked off
- [ ] All tests pass with 100% coverage
- [ ] Documentation updated
- [ ] User confirmed satisfied
- [ ] Changes committed and merged
- [ ] Post-mortem and retrospective written
