# Phase 3: Architecture & High-Level Plan

**Goal:** Design the solution following project technical guidelines.

After each step: update task tracking markdown file in the project's `todo/` folder

---

## Steps

### 1. Review Technical Constraints
- Check CLAUDE.md for technical guidelines (required packages, testing philosophy, etc.)
- Review existing project patterns and architecture
- Suggestions on algorithm and alternative approaches are welcome

### 2. Parallel Architecture Analysis
*(For complex decisions)*

- Launch 2-3 Plan agents **in a single message** with different optimization priorities:
  - Simplicity-focused: "Design the simplest solution that meets requirements"
  - Performance-focused: "Design for maximum performance and scalability"
  - Maintainability-focused: "Design for long-term maintainability and extensibility"
- Compare approaches and select the best fit for the project

### 3. High-Level Design
- Outline components/modules involved
- Identify files to create/modify
- Note any new dependencies or patterns being introduced

### 4. Present for Approval
- Write high-level plan to markdown
- Present to user for review
- **STOP and wait for explicit approval before proceeding**

---

## Exit Criteria
- Technical constraints reviewed
- Architecture approach selected
- Files to create/modify identified
- User explicitly approved the high-level plan
