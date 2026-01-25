# Phase 5: Implementation

**Goal:** Execute the approved plan with continuous testing (agile/CD style).

After each sub-step: update task tracking markdown file in the project's `todo/` folder

---

## Steps

### 1. Branch Safety Check
- Check current branch: if on main/master, checkout new feature/hotfix branch
- Branch naming: `feature/short-description` or `hotfix/short-description`

### 2. Parallel Execution of [P] Tasks
- Execute all `[P]` tagged tasks in parallel by launching multiple Task agents **in a single message**
- Each agent handles one isolated file/module
- Maximum concurrent agents = number of truly isolated files (typically 2-4)
- For `[P-group]` tasks: execute all tasks within the same group in parallel
- **Wait for all parallel agents to complete** before moving to dependent `[S]` tasks

### 3. Implement in Testable Increments
- Each high-level task = a complete piece of functionality
- Tasks build progressively toward the final solution
- Work through `[S]` tasks in order, updating status as you progress
- Surface blockers or scope changes immediately
- **Before major decisions:** Re-read the task plan section to prevent goal drift

### 4. Test Each Increment
*(Continuous - not deferred to end)*

- After completing each testable piece of functionality:
  - Write integration/E2E tests covering the behavioral flows
  - Run full scenario testing with 100% coverage on all metrics
  - Verify no dead or unreachable code exists
- Do NOT proceed to next **task** until current **task's** tests pass
- Tests are derived from acceptance criteria defined in Phase 2
- **Test Entry Point:** Public documented API / developer package interface ONLY
  - Tests must interact through the same interface a real user/developer would use
  - No testing of internal implementation details
  - Think through corner cases and edge conditions from the public API perspective

### 5. Follow Technical Guidelines
- Use required packages (api-ape, scribbles, react-outline, bri-db, resolve-browser-trace)
- Follow testing philosophy (integration/E2E only, 100% coverage)
- Run via Docker only

### 6. Update Documentation
*(After tests pass)*

- Update `README.md` following spec (user-facing, quick start, examples)
- Update `files.md` following spec (developer-facing, module architecture, constraints)
- Ensure documentation reflects all new/changed functionality

---

## Exit Criteria
- All tasks implemented
- All tests passing with 100% coverage
- Documentation updated
- Ready for completion phase
