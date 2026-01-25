# Phase 6: Completion

**Goal:** Clean handoff with user confirmation.

After each step: update task tracking markdown file in the project's `todo/` folder

---

## Steps

### 1. Parallel Validation
*(Run all checks simultaneously)*

- Launch validation agents **in a single message**:
  - Test runner agent (integration/E2E tests)
  - Linting agent (code style, formatting)
  - Type checker agent (TypeScript/type validation)
  - Build validator agent (production build check)
- **All 4 must pass** before proceeding to commit
- If any fail, fix issues and re-run failed validations

### 2. Verify & Test
- Ensure all acceptance criteria are met
- Confirm 100% coverage on all metrics

### 3. User Review
- Demo or describe what was built
- Get explicit confirmation user is satisfied

### 4. Commit & Merge
- Stage changes
- Present to user:
  - List of files staged
  - Proposed commit message
- Ask: "OK to proceed with committing & merging?"
- If approved: commit, merge to target branch, resolve any conflicts

---

## Exit Criteria
- All validation checks pass
- User confirmed satisfaction
- Changes committed and merged
- Task tracking file updated with post-mortem
