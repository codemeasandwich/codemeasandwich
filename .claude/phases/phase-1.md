# Phase 1: Capture & Understand

**Goal:** Document the request and ensure mutual understanding.

After each step: update task tracking markdown file in the project's `todo/` folder

---

## Steps

### 1. Log the Request
- Write user's request/problem to a task tracking markdown file in the `todo/` folder in current project
- Include original wording verbatim

### 2. Initial Clarification
- Ask clarifying questions about intent, scope, and constraints
- Identify what problem the user is actually trying to solve (not just what they asked for)
- Surface any assumptions for confirmation

### 3. Parallel Exploration
*(When codebase is unfamiliar or scope is uncertain)*

- Launch 2-3 Explore agents **in a single message** targeting different areas
- Example focuses: "auth patterns", "data layer", "API structure", "test patterns"
- Each agent should have a specific search focus to avoid duplication
- Synthesize findings from all agents before proceeding

---

## Exit Criteria
- Request logged verbatim
- Key clarifying questions answered
- Codebase explored (if needed)
- Ready to define requirements
