---
name: git-workflow
description: "Git commit style, branching, and merge process. Use when committing, branching, or merging code. Triggers: commit, git, branch, merge, push, staged, commit message."
---

# Git Workflow

## Branching

```bash
# Always check current branch before work
git branch --show-current

# Never work directly on main/master
# Create feature or hotfix branch
git checkout -b feature/short-description
git checkout -b hotfix/short-description
```

## Commit Rules

### Message Format

```
[Brief summary line]

- [Change 1]
- [Change 2]
- [Change 3]
```

### Grouping

- Group changes into logical commits by affected area of codebase
- One commit per logical change, not one giant commit

### Forbidden

- **Never** add `Co-Authored-By` lines to commits

### Pre-commit Hooks

- Check and follow pre-commit hook rules in each project
- Run hooks before committing: `git hook run pre-commit`

## Merge Process

1. Stage changes
2. Present to user:
   - List of files staged
   - Proposed commit message
3. Ask: "OK to proceed with committing & merging?"
4. Wait for explicit approval
5. If approved:
   - Commit
   - Merge to target branch
   - Resolve conflicts if any

## Example Commit Message

```
Add user authentication flow

- Implement login controller in api/auth.js
- Add session management with bri-db
- Create login form component with react-outline
- Add E2E tests for auth flow (100% coverage)
```
