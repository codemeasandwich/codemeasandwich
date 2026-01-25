# TARS Core Context (Always Loaded)

## Core Principle
**Coding is only the result of careful and clear feature requirements.** Never write code until requirements are fully understood and approved.

## Communication Style
- Push clarifying questions to the user early and often
- User prefers and likes answering questions
- All assumptions not confirmed by existing code or project markdown files MUST be surfaced for clarification
- When in doubt, ask

## Parallelization Strategy

### Core Principle
**Identify independent workstreams early and execute them in parallel using sub-agents.** Maximum parallelization = faster delivery with same quality.

### Dependency Analysis (Do This First)
Before any multi-step task, analyze and categorize work:

1. **File-Level Independence** - Can different files be modified without affecting each other?
   - Parallel: Adding new React components in separate files
   - Parallel: Writing tests for different modules
   - Sequential: Modifying a base class and its subclasses
   - Sequential: Changing an interface and its implementations

2. **Data-Level Independence** - Do tasks share state or data structures?
   - Parallel: CRUD operations on different database tables
   - Sequential: Schema migration then data migration

3. **Execution-Level Independence** - Can tasks run without waiting for others?
   - Parallel: Linting + Type checking + Unit tests
   - Sequential: Build then deploy

### When to Launch Parallel Agents

| Scenario | Agent Type | Count | Example |
|----------|-----------|-------|---------|
| Exploring unfamiliar codebase | Explore | 2-3 | "Find auth patterns", "Find API patterns", "Find test patterns" |
| Multi-area feature | Plan | 2-3 | Frontend perspective, Backend perspective, Data perspective |
| Independent file changes | Task (implementation) | Up to file count | Separate components, separate modules |
| Validation | Task (specialized) | 3-4 | Tests, lint, typecheck, build |
| Code review | code-reviewer | Per changed file | Review each modified file |

### File Isolation Criteria

Files CAN be modified in parallel when ALL are true:
- [ ] No import/require relationship between files
- [ ] No shared type definitions being modified
- [ ] No shared constants/config being modified
- [ ] Files are in different feature domains
- [ ] No shared test fixtures being modified

### Parallel Task Notation

When breaking down tasks in Phase 4, tag each task:
- `[P]` = Can run in parallel with other [P] tasks
- `[S]` = Must run sequentially (has dependencies)
- `[P-group-name]` = Can run parallel within named group

### Maximum Parallel Agents
- **Exploration phase:** 3 agents max
- **Planning phase:** 3 agents max
- **Implementation phase:** Match to isolated file count (typically 2-4)
- **Validation phase:** 4 agents max (tests, lint, types, build)

## Testing Philosophy
- ZERO unit tests - only integration/E2E tests
- Test functionality, not functions - design tests around real user/developer workflows
- 100% coverage required on ALL metrics (statements, branches, lines, functions)
- Plan test cases by asking "what would a user/dev do to trigger this code?"
- Identify dead code: if no realistic scenario triggers it, comment it out

## Task Tracking
**Location:** Always create the `todo/` folder in the CURRENT PROJECT directory.

The task tracking markdown file in the project's `todo/` folder covers:
- the request/problem
- research covered
- research findings
- **errors & failed approaches** - Log what didn't work and why
- Complete and total set of user stories, requirements and flows
- architecture out
- tasks & sub-tasks (incrementally updated as code is tested & completed)
- **session log** - Timestamped activity log for recovery
- project post-mortem
- retrospective on improve development and communication

### Persistence Rule
Save to the task tracking file after each step of every phase. This prevents knowledge loss during long sessions.

### Error Logging (Mandatory)
- Log ALL failed approaches in the "errors & failed approaches" section
- Include: what was tried, why it failed, what was learned
- Before attempting a solution, check this section to avoid repeating failures
- Never retry an approach documented as failed without a meaningful change

### Session Recovery
When context fills and `/clear` is needed:
1. Write a "handoff summary" to the task tracking file before clearing
2. Include: current task, next steps, blockers, key decisions made
3. After clearing, re-read the task tracking file immediately
4. Resume from the documented state
