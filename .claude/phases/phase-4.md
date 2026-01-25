# Phase 4: Task Breakdown

**Goal:** Create detailed implementation roadmap.

After each step: update task tracking markdown file in the project's `todo/` folder

---

## Steps

### 1. Generate Tasks & Sub-tasks
- Break down into granular, actionable tasks
- Each task should be completable in one focused session
- Include sub-tasks where needed

### 2. Parallel Workstream Analysis
*(Critical for maximizing throughput)*

- Review all tasks and apply File Isolation Criteria (see Parallelization Strategy)
- Tag each task with parallel notation:
  - `[P]` = Can run in parallel with other [P] tasks
  - `[S]` = Must run sequentially (has dependencies)
  - `[P-group-name]` = Can run parallel within named group (e.g., `[P-frontend]`, `[P-backend]`)
- Group parallel tasks by domain/module
- Identify the critical path (sequential dependencies)

### 3. Present Task List
- Show complete task breakdown with parallel tags to user
- Highlight which tasks will be executed in parallel
- **STOP and wait for explicit approval before coding**

---

## Exit Criteria
- All tasks broken down with sub-tasks
- Each task tagged with [P], [S], or [P-group]
- Critical path identified
- User explicitly approved the task list
