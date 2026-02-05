---
name: task-tracking
description: "Task tracking markdown file format and maintenance. Use when creating or updating task files in todo/. Triggers: task tracking, todo file, tracking file, update tasks, log request."
---

# Task Tracking

All work is tracked in markdown files in the `todo/` folder.

## File Structure

```markdown
# [Feature/Request Name]

## Request
[User's original request verbatim]

## Research Covered
- [Source/area researched]
- [Source/area researched]

## Research Findings
[Key discoveries that inform the solution]

## User Stories
- As a [role], I want [feature] so that [benefit]
- As a [role], I want [feature] so that [benefit]

## Acceptance Criteria
- [ ] [Criterion derived from user story]
- [ ] [Criterion derived from user story]

## Scope
**In Scope:**
- [Item]

**Out of Scope:**
- [Item]

## Architecture
[High-level design, components, files affected]

## Tasks
- [ ] **Task 1: [Name]**
  - [ ] Sub-task a
  - [ ] Sub-task b
- [ ] **Task 2: [Name]**
  - [ ] Sub-task a

## Post-Mortem
[After completion: what happened, any issues encountered]

## Retrospective
[After completion: improvements for development and communication]
```

## Update Frequency

Update the task file **after each step** of every phase:
- Log new information immediately
- Check off completed tasks/sub-tasks
- Note blockers or scope changes as they arise
