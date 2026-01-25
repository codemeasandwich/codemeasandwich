---
allowed-tools: Bash(git add:*), Bash(git status:*), Bash(git commit:*), Bash(git push:*), Bash(git pull:*)
description: Review changes and create a conventional commit
---

## Context

- Current git status: !`git status`
- Staged changes: !`git diff --cached`
- Unstaged changes: !`git diff`
- Current branch: !`git branch --show-current`
- Recent commits: !`git log --oneline -10`

## Staging Rules

- If there ARE staged changes (staged changes output is not empty): ONLY commit the staged files. Do NOT stage any additional files.
- If there are NO staged changes: Stage and commit all changed files (new, modified, deleted).

## Commit Message Rules

You MUST follow these rules for the commit message:

### Format
- First line: `<type>: <message>` or `<type>!: <message>` for breaking changes
- Valid types: build, ci, docs, feat, fix, perf, refactor, style, test
- First line MUST be 80 characters or less
- There must be a non-empty message after ": "
- After the first line, add a blank line, then a bullet list of specific changes

### Commit Body
After the subject line, ALWAYS include a body with:
- A blank line after the subject
- A bulleted list (using `-`) of specific changes made
- Each bullet should describe a concrete change, not just repeat the subject

Example:
```
feat: add user authentication system

- Add login and logout endpoints in auth controller
- Create JWT token generation and validation
- Add password hashing with bcrypt
- Create user session middleware
```

### Content Rules
- Do NOT include `Co-Authored-By` lines
- If you were explicitly asked to fix or work on a specific GitHub issue during this session, add `Closes #<issue-number>` at the bottom after the bullet list
- Keep bullets concise but specific

### Type Selection Guide
- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation only
- **style**: Formatting, missing semi-colons, etc (no code change)
- **refactor**: Code change that neither fixes a bug nor adds a feature
- **perf**: Performance improvement
- **test**: Adding or updating tests
- **build**: Changes to build system or dependencies
- **ci**: Changes to CI configuration

## Your Task

1. Check if there are staged changes
2. Determine which changes to review:
   - If staged changes exist: Review ONLY the staged changes
   - If no staged changes: Review all changed files
3. Analyze if the changes should be split into multiple commits:
   - Different features or bug fixes
   - Unrelated files (e.g., docs + code changes)
   - Separate logical units of work
4. If changes should be split: Ask the user if they want to create multiple commits, listing what each commit would contain. Wait for their response.
5. Proceed with committing:
   - If staged: Commit only staged files (do not stage anything else)
   - If not staged: Stage and commit the appropriate files
6. Determine the appropriate commit type based on the changes being committed
7. Craft a commit message following the rules above

If splitting is not needed, proceed directly with staging and committing without asking.

## Pre-Commit Hook Failures

If the commit fails due to a pre-commit hook:
1. **DO NOT** ask the user whether to fix or skip
2. **DO NOT** use `--no-verify` or any bypass flag
3. **IMMEDIATELY** fix the issue the hook identified
4. Re-stage any modified files
5. Retry the commit
6. Repeat until the commit succeeds

This is mandatory. Pre-commit hooks exist to maintain code quality - bypassing them is never acceptable.
