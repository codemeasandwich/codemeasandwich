---
name: codebase-analysis
description: "Analyze existing codebases to understand user flows, features, and test coverage gaps. Use when working on existing projects, adding tests to existing code, understanding how features work, or reasoning about user journeys. Triggers: existing code, current codebase, understand the code, user flow, how does this work, add tests to existing, coverage gaps, trace the flow."
---

# Codebase Analysis

**Goal:** Understand existing code well enough to reason about user flows and write comprehensive E2E tests.

## When to Use

- Starting work on an existing project
- Adding E2E tests to untested features
- Understanding how a feature works before modifying it
- Identifying coverage gaps
- Mapping user journeys through the system

---

## Analysis Workflow

### 1. Project Structure Survey

```bash
# Get lay of the land
find . -type f -name "*.js" -o -name "*.ts" | head -50
ls -la src/ lib/ api/ components/ 2>/dev/null

# Find entry points
cat package.json | grep -A5 '"main"\|"scripts"'

# Find existing tests
find . -path ./node_modules -prune -o -name "*.test.*" -print
find . -path ./node_modules -prune -o -name "*.spec.*" -print
```

### 2. Identify Public API Surface

Focus on what users/developers actually interact with:

```bash
# API endpoints (api-ape controllers)
ls api/ 2>/dev/null

# Exported modules
grep -r "module.exports\|export " src/ --include="*.js" | head -30

# React components (entry points for UI flows)
find . -name "*.jsx" -o -name "*.tsx" | head -20
```

### 3. Trace User Flows

For each feature, map the journey:

```markdown
## Feature: [Name]

**Entry Point:** [Where user starts - UI component, API call, etc.]

**Flow:**
1. User does X → triggers [file/function]
2. [file/function] calls → [next step]
3. Data flows to → [destination]
4. User sees → [result]

**Side Effects:**
- Database writes: [tables/collections affected]
- External calls: [APIs, services]
- State changes: [what gets modified]
```

### 4. Map Code to User Stories

Connect implementation to behavior:

| User Story | Code Path | Current Coverage |
|------------|-----------|------------------|
| "User can login" | api/auth.js → db.get.user → session | ❌ No tests |
| "User sees dashboard" | components/Dashboard.jsx → api/stats | ⚠️ Partial |

### 5. Identify Coverage Gaps

```bash
# Run existing tests with coverage
npm test -- --coverage

# Look for uncovered files
# Look for branches not taken
# Look for functions never called
```

**Questions to answer:**
- Which user flows have no tests?
- Which branches are never exercised?
- What error paths are untested?
- What edge cases are missing?

---

## E2E Test Planning from Existing Code

### Step 1: List All User-Facing Features

From codebase analysis, enumerate:
```markdown
## Features Inventory

1. **Authentication**
   - Login (email/password)
   - Logout
   - Session persistence

2. **Dashboard**
   - View stats
   - Filter by date range
   
3. **[Feature N]**
   - [Capability]
```

### Step 2: Define Test Scenarios per Feature

For each feature, ask:
- What's the happy path?
- What are the error cases?
- What edge cases exist?
- What would break this?

```markdown
## Feature: Login

### Scenarios:
1. ✅ Valid credentials → redirects to dashboard
2. ❌ Invalid password → shows error, stays on login
3. ❌ Unknown email → shows error
4. ⚠️ Empty fields → validation prevents submit
5. ⚠️ Session expired → redirects to login
6. ⚠️ Already logged in → redirects to dashboard
```

### Step 3: Trace Each Scenario Through Code

For each test scenario, document:
```markdown
### Scenario: Valid login

**Triggers code path:**
1. `components/Login.jsx` → form submit
2. `api/auth.js:login()` → validates credentials  
3. `db.get.user()` → fetches user record
4. `session.create()` → creates session
5. `redirect('/dashboard')` → navigation

**Assertions needed:**
- API returns success
- Session cookie set
- User redirected
- Dashboard loads with user data
```

---

## Quick Commands

```bash
# Find all functions in a file
grep -n "function\|const.*=.*=>\|async " src/file.js

# Find all API endpoints
grep -rn "module.exports" api/

# Find database operations
grep -rn "db\.\(add\|get\|update\|delete\)" src/

# Find component event handlers
grep -rn "onClick\|onSubmit\|onChange" components/

# Find error handling
grep -rn "catch\|throw\|Error" src/
```

## Output: Coverage Plan

After analysis, produce:

```markdown
## E2E Test Coverage Plan

### Priority 1 (Critical User Flows)
- [ ] Login/logout flow
- [ ] [Core feature]

### Priority 2 (Important Features)  
- [ ] [Feature]

### Priority 3 (Edge Cases)
- [ ] [Edge case]

### Dead Code Identified
- [ ] `src/unused.js` - no code path reaches this
- [ ] `api/deprecated.js:oldFunction()` - never called
```
