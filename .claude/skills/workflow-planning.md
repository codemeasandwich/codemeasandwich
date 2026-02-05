---
name: workflow-planning
description: "Phases 1-2: Capture & Understand + Requirements & Scope. Use when starting new work, gathering requirements, writing user stories, or defining scope. Triggers: new feature, new request, requirements, user stories, scope, acceptance criteria."
---

# Workflow: Planning (Phases 1-2)

**Goal:** Document the request and define exactly what will be built before designing how.

After each step: update task tracking file in `todo/`

---

## Phase 1: Capture & Understand

### 1. Log the Request
- Create task tracking markdown file in `todo/`
- Include user's original wording **verbatim**

### 2. Initial Clarification
Ask about:
- Intent — what problem are they actually trying to solve?
- Scope — how big/small should this be?
- Constraints — timeline, technical limitations, dependencies?

Surface all assumptions for confirmation.

---

## Phase 2: Requirements & Scope

### 1. User Stories *(Critical — drives everything downstream)*

Format: **"As a [role], I want [feature] so that [benefit]"**

Rules:
- Each story must be testable
- Each story must be independently deliverable
- Stories define behavioral flows requiring 100% test coverage
- Stories directly inform acceptance criteria

### 2. Acceptance Criteria

- Derive directly from user stories
- Each criterion must be verifiable through integration/E2E tests
- These become test scenarios in Phase 5

### 3. Functional Requirements

- List specific behaviors/features the solution must have
- Map each requirement back to its user story

### 4. Scope Boundaries

Document explicitly:
```
**In Scope:**
- [Item]

**Out of Scope:**
- [Item]
```

Get user confirmation on boundaries.

### 5. Questions Checkpoint

- Surface ALL remaining questions
- **STOP and wait for user confirmation that requirements are complete**

---

## Phase Exit Criteria

Before proceeding to Phase 3 (Architecture):
- [ ] Request logged verbatim
- [ ] User stories written and approved
- [ ] Acceptance criteria derived from stories
- [ ] Scope boundaries confirmed
- [ ] All questions answered
