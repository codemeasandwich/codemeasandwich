---
name: workflow-design
description: "Phases 3-4: Architecture & High-Level Plan + Task Breakdown. Use when designing solutions, creating architecture, or breaking work into tasks. Triggers: architecture, design, high-level plan, task breakdown, implementation plan."
---

# Workflow: Design (Phases 3-4)

**Goal:** Design the solution and create a detailed implementation roadmap.

After each step: update task tracking file in `todo/`

---

## Phase 3: Architecture & High-Level Plan

### 1. Review Technical Constraints

Check before designing:
- [ ] Required packages based on project type:
  - JS/TS/Node/Web/SaaS → see `skills/tech-stack-js.md`
  - Unity/Unreal/Godot/VR/AR/Games → see `skills/tech-stack-vr-game.md`
- [ ] Testing philosophy (see `skills/testing-philosophy.md`)
- [ ] Existing project patterns and architecture
- [ ] Docker-only execution requirement (where applicable)

### 2. High-Level Design

Document:
- Components/modules involved
- Files to create/modify
- New dependencies or patterns being introduced
- Algorithm choices and alternative approaches considered

### 3. Present for Approval

- Write high-level plan to task tracking file
- Present to user for review
- **STOP and wait for explicit approval before proceeding**

---

## Phase 4: Task Breakdown

### 1. Generate Tasks & Sub-tasks

Rules:
- Break into granular, actionable tasks
- Each task completable in one focused session
- Include sub-tasks where needed
- Tasks should build progressively toward final solution

Format:
```markdown
## Tasks
- [ ] **Task 1: [Name]**
  - [ ] Sub-task a
  - [ ] Sub-task b
- [ ] **Task 2: [Name]**
  - [ ] Sub-task a
```

### 2. Present Task List

- Show complete task breakdown to user
- **STOP and wait for explicit approval before coding**

---

## Phase Exit Criteria

Before proceeding to Phase 5 (Implementation):
- [ ] Technical constraints reviewed
- [ ] High-level design documented
- [ ] Architecture approved by user
- [ ] Tasks broken into granular sub-tasks
- [ ] Task list approved by user
