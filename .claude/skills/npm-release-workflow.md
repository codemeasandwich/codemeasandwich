# npm Release Workflow

A two-part release system: local script handles versioning and GitHub Release creation, GitHub Actions automatically publishes to npm.

---

## Prerequisites

| Requirement | Purpose |
|-------------|---------|
| GitHub repo with Actions enabled | Runs publish workflow |
| npm account + automation token | Publishes to registry |
| GitHub CLI (`gh`) | Creates releases (recommended) |
| Conventional commits | Determines version bumps |
| commit-msg hook | Validates commit format (recommended) |
| 100% test coverage | Safety gate before release |

---

## Setup

### 1. Add npm Token to GitHub

1. Generate token: npmjs.com → Access Tokens → Generate New Token → Automation
2. Add to repo: Settings → Secrets → Actions → New repository secret
   - Name: `NPM_TOKEN`
   - Value: your token

### 2. Create GitHub Actions Workflow

Create `.github/workflows/publish.yml`:

```yaml
name: Publish to npm

on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write  # Required for npm provenance
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Build
        run: npm run build  # Adjust to your build script

      - name: Publish to npm with provenance
        run: npm publish --provenance --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### 3. Add Commit Message Hook (Recommended)

Create `.git/hooks/commit-msg` to enforce conventional commits format. This ensures the release script can reliably detect version bumps and generates better changelogs.

```bash
#!/usr/bin/env bash
#
# Enforces Conventional Commits format:
#   <type>: <summary>
#
#   - change 1
#   - change 2
#

MSG_FILE="$1"
MSG_CONTENT=$(cat "$MSG_FILE")
FIRST_LINE=$(echo "$MSG_CONTENT" | sed -n '1p' | tr -d '\r')

# Skip merge commits
if printf '%s\n' "$FIRST_LINE" | grep -Eq "^Merge "; then
    exit 0
fi

# Allowed types
TYPES="bug|fix|feat|docs|style|refactor|perf|test|build|ci|chore"

# Check format: type: message (with optional ! for breaking changes)
if ! printf '%s\n' "$FIRST_LINE" | grep -Eq "^(${TYPES})(!)?:[[:space:]]+[^[:space:]]"; then
    echo "Error: Invalid commit format. Use: <type>: <message>"
    echo "Types: bug, fix, feat, docs, style, refactor, perf, test, build, ci, chore"
    exit 1
fi

# Enforce max 80 chars on first line
if [ ${#FIRST_LINE} -gt 80 ]; then
    echo "Error: First line is ${#FIRST_LINE} chars (max 80)"
    exit 1
fi

exit 0
```

Make it executable: `chmod +x .git/hooks/commit-msg`

---

### 4. Create Release Script

Create `scripts/_publish.sh`:

```bash
#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No color

PACKAGE_NAME=$(node -p "require('./package.json').name")

# ============================================
# Safety Checks
# ============================================

# Must be on main/master branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$CURRENT_BRANCH" != "main" && "$CURRENT_BRANCH" != "master" ]]; then
  echo "Error: Must be on main or master branch"
  exit 1
fi

# Sync with origin
git fetch origin "$CURRENT_BRANCH" --quiet
LOCAL_COMMIT=$(git rev-parse HEAD)
REMOTE_COMMIT=$(git rev-parse "origin/$CURRENT_BRANCH")
BASE_COMMIT=$(git merge-base HEAD "origin/$CURRENT_BRANCH")

if [[ "$LOCAL_COMMIT" == "$REMOTE_COMMIT" ]]; then
  echo "Local and origin are in sync"
elif [[ "$BASE_COMMIT" == "$REMOTE_COMMIT" ]]; then
  echo "Pushing local changes..."
  git push origin "$CURRENT_BRANCH"
elif [[ "$BASE_COMMIT" == "$LOCAL_COMMIT" ]]; then
  echo "Error: Origin is ahead. Run: git pull"
  exit 1
else
  echo "Error: Branches diverged. Run: git pull --rebase"
  exit 1
fi

# Run tests with 100% coverage
echo -e "${YELLOW}Running tests...${NC}"
npm run test:coverage:check || {
  echo -e "${RED}✗ Tests failed or coverage below 100%${NC}"
  exit 1
}
echo -e "${GREEN}✓ Tests passed with 100% coverage${NC}"

# Verify README exists
if [[ ! -f "README.md" ]]; then
  echo -e "${RED}✗ README.md not found${NC}"
  exit 1
fi

# ============================================
# Version Detection
# ============================================

LOCAL_VERSION=$(node -p "require('./package.json').version")
NPM_VERSION=$(npm view "$PACKAGE_NAME" version 2>/dev/null || echo "0.0.0")

echo "Local: $LOCAL_VERSION | npm: $NPM_VERSION"

# Compare versions
compare_versions() {
  local v1=$1 v2=$2
  IFS='.' read -r v1_major v1_minor v1_patch <<< "$v1"
  IFS='.' read -r v2_major v2_minor v2_patch <<< "$v2"

  if [[ $v1_major -gt $v2_major ]]; then echo 1; return; fi
  if [[ $v1_major -lt $v2_major ]]; then echo 2; return; fi
  if [[ $v1_minor -gt $v2_minor ]]; then echo 1; return; fi
  if [[ $v1_minor -lt $v2_minor ]]; then echo 2; return; fi
  if [[ $v1_patch -gt $v2_patch ]]; then echo 1; return; fi
  if [[ $v1_patch -lt $v2_patch ]]; then echo 2; return; fi
  echo 0
}

# Analyze commits for version bump
analyze_commits() {
  PREV_TAG=$(git describe --tags --abbrev=0 HEAD^ 2>/dev/null || echo "")
  COMMIT_RANGE="${PREV_TAG:+$PREV_TAG..}HEAD"

  HAS_BREAKING=false HAS_FEAT=false HAS_FIX=false

  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    # Breaking change (any type with !)
    [[ "$line" =~ ^[a-f0-9]+[[:space:]]+[a-z]+![:\(] ]] && HAS_BREAKING=true
    # Feature (minor bump)
    [[ "$line" =~ ^[a-f0-9]+[[:space:]]+(feat|feature)[:\(] ]] && HAS_FEAT=true
    # Fix and other types (patch bump)
    [[ "$line" =~ ^[a-f0-9]+[[:space:]]+(fix|bug|bugfix|perf|docs|style|refactor|test|build|ci|chore)[:\(] ]] && HAS_FIX=true
  done < <(git log $COMMIT_RANGE --oneline)
}

# Bump version based on commits
bump_version() {
  local BASE_VERSION="$1"
  IFS='.' read -r MAJOR MINOR PATCH <<< "$BASE_VERSION"

  if [[ "$HAS_BREAKING" == true ]]; then
    NEW_VERSION="$((MAJOR + 1)).0.0"
  elif [[ "$HAS_FEAT" == true ]]; then
    NEW_VERSION="$MAJOR.$((MINOR + 1)).0"
  else
    NEW_VERSION="$MAJOR.$MINOR.$((PATCH + 1))"
  fi

  echo "Bumping: $BASE_VERSION -> $NEW_VERSION"

  node -e "
    const fs = require('fs');
    const pkg = require('./package.json');
    pkg.version = '$NEW_VERSION';
    fs.writeFileSync('./package.json', JSON.stringify(pkg, null, 2) + '\n');
  "

  git add package.json
  git commit --amend --no-edit
  git push --force-with-lease

  LOCAL_VERSION="$NEW_VERSION"
}

# Apply version bump if needed
VERSION_CMP=$(compare_versions "$LOCAL_VERSION" "$NPM_VERSION")

if [[ $VERSION_CMP -eq 1 ]]; then
  echo "Using manually set version: $LOCAL_VERSION"
elif [[ $VERSION_CMP -eq 0 ]]; then
  echo "Analyzing commits for version bump..."
  analyze_commits
  bump_version "$LOCAL_VERSION"
else
  echo "Local < npm. Bumping from npm version..."
  analyze_commits
  bump_version "$NPM_VERSION"
fi

TAG="v$LOCAL_VERSION"

# ============================================
# Create Tag & Release
# ============================================

if ! git rev-parse "$TAG" >/dev/null 2>&1; then
  echo "Creating tag $TAG..."
  git tag -a "$TAG" -m "Release $TAG"
  git push origin "$TAG"
fi

# Generate changelog
PREV_TAG=$(git describe --tags --abbrev=0 HEAD^ 2>/dev/null || echo "")
COMMIT_RANGE="${PREV_TAG:+$PREV_TAG..}HEAD"

CHANGELOG=""
while IFS= read -r line; do
  [[ -z "$line" ]] && continue
  msg="${line#* }"
  CHANGELOG+="- $msg\n"
done < <(git log $COMMIT_RANGE --oneline)

[[ -z "$CHANGELOG" ]] && CHANGELOG="No notable changes."

# Create GitHub release (triggers npm publish)
echo "Creating GitHub release..."

if command -v gh &> /dev/null; then
  echo -e "$CHANGELOG" | gh release create "$TAG" --title "$TAG" --notes-file -
else
  echo "Install GitHub CLI: brew install gh && gh auth login"
  exit 1
fi

echo "Release $TAG created! GitHub Actions will publish to npm."
```

### 5. Add npm Script

In `package.json`:

```json
{
  "scripts": {
    "release": "bash scripts/_publish.sh",
    "test:coverage:check": "jest --coverage --coverageThreshold='{\"global\":{\"statements\":100,\"branches\":100,\"functions\":100,\"lines\":100}}'"
  }
}
```

---

## Modular Validation (Optional)

For complex projects, organize release validation in a modular structure:

```
scripts/
├── _publish.sh           # Main release orchestrator
└── release/
    ├── check-branch.sh   # Branch validation
    ├── check-sync.sh     # Origin sync check
    ├── check-coverage.sh # 100% coverage gate
    └── check-docs.sh     # README validation
```

Each validator exits 0 (pass) or 1 (fail). The main script runs them in sequence.

---

## Conventional Commits

Version bumps are determined by commit prefixes:

| Prefix | Bump | Description |
|--------|------|-------------|
| `<type>!:` | **Major** | Breaking change (any type with `!`) |
| `feat:` | **Minor** | New feature |
| `fix:` | **Patch** | Bug fix |
| `bug:` | **Patch** | Bug report/fix (alias for fix) |
| `perf:` | **Patch** | Performance improvement |
| `docs:` | **Patch** | Documentation only |
| `style:` | **Patch** | Code style (formatting, etc) |
| `refactor:` | **Patch** | Code refactoring |
| `test:` | **Patch** | Adding/updating tests |
| `build:` | **Patch** | Build system changes |
| `ci:` | **Patch** | CI/CD changes |
| `chore:` | **Patch** | Other changes (deps, configs)

---

## Usage

```bash
npm run release
```

The script will:
1. Verify you're on main/master and synced with origin
2. Run tests
3. Analyze commits to determine version bump
4. Update package.json and amend commit
5. Create git tag
6. Generate changelog from commits
7. Create GitHub Release → triggers npm publish

---

## Flow Diagram

```
npm run release (local)
    │
    ├─ Safety checks (branch, sync, tests)
    ├─ Analyze commits → determine bump type
    ├─ Update package.json version
    ├─ Create git tag (v1.2.3)
    └─ Create GitHub Release
           │
           ▼
GitHub Actions (automatic)
    │
    ├─ Checkout code
    ├─ Install & test
    ├─ Build distribution
    └─ npm publish --provenance
           │
           ▼
Package live on npm
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Must be on main branch" | `git checkout main` |
| "Origin is ahead" | `git pull origin main` |
| "Branches diverged" | `git pull origin main --rebase` |
| Tests fail | Fix tests before releasing |
| Release already exists | Delete the release/tag or bump version manually |
| npm publish fails | Check `NPM_TOKEN` secret is set correctly |
