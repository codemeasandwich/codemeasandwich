# Claude Cognitive Scripts

Working memory system for Claude Code with TARS workflow integration.

## Scripts

| Script | Hook | Purpose |
|--------|------|---------|
| `context-router-v2.py` | UserPromptSubmit | Attention-based file injection |
| `pool-auto-update.py` | UserPromptSubmit | Auto-detect completions/blockers |
| `pool-loader.py` | SessionStart | Load prior instance state |
| `pool-extractor.py` | Stop | Save session state for other instances |
| `history.py` | CLI | View attention history |
| `pool-query.py` | CLI | Query pool entries |

## Attention System

Files are classified into tiers based on attention scores:

| Tier | Score | Injection |
|------|-------|-----------|
| HOT | >0.8 | Full file content |
| WARM | 0.25-0.8 | First 25 lines (headers) |
| COLD | <0.25 | Not injected |

### Dynamics

- **Activation**: Keywords in your prompt boost file scores to 1.0
- **Decay**: Scores decay each turn (×0.7-0.85 depending on category)
- **Co-activation**: Related files get boosted when primary file activates
- **Pinned**: Some files always stay at least WARM

## TARS Integration

### Auto-detected `todo/` Files

The router automatically detects `todo/*.md` files in the current project and:
1. Adds them to keywords with recovery terms
2. Pins them (always at least WARM)
3. Makes them HOT when you say "resume", "task status", etc.

**Recovery keywords that activate task files:**
- task, status, progress, resume, handoff, recovery
- todo, tracking, session, continue
- "where was i", "what was i doing", "pick up", "left off"

### How Session Recovery Works

```
/clear needed (context full)
    ↓
Stop hook reminds: "Is session log updated?"
    ↓
You write handoff to todo/current-task.md
    ↓
New session starts
    ↓
SessionStart hook loads pool state
    ↓
UserPromptSubmit hook runs context router
    ↓
todo/*.md auto-detected and pinned (WARM)
    ↓
You say "resume" or "where was i"
    ↓
Task files become HOT → full content injected
    ↓
Claude sees your handoff summary automatically
```

## Configuration

### Global Keywords: `~/.claude/keywords.json`

```json
{
  "keywords": {
    "CLAUDE.md": ["tars", "workflow", "recovery", "handoff", "resume"],
    "personas/persona-tars.md": ["tars", "lead dev"]
  },
  "co_activation": {
    "CLAUDE.md": ["personas/persona-tars.md"]
  },
  "pinned": ["CLAUDE.md"]
}
```

### Project Keywords: `.claude/keywords.json`

Project-local config takes priority over global.

## CLI Commands

```bash
# View recent attention history
python3 ~/.claude/scripts/history.py

# View stats
python3 ~/.claude/scripts/history.py --stats

# Filter by time
python3 ~/.claude/scripts/history.py --since 2h

# Query pool (multi-instance coordination)
python3 ~/.claude/scripts/pool-query.py --since 1h
```

## Files Created

| File | Purpose |
|------|---------|
| `~/.claude/attn_state.json` | Attention scores (or `.claude/attn_state.json` per-project) |
| `~/.claude/attention_history.jsonl` | Turn-by-turn history log |
| `~/.claude/context_injection.log` | Debug log of injections |
| `~/.claude/pool/*.jsonl` | Pool coordination entries |

## Modifications from Upstream

This installation includes custom modifications for TARS workflow:

1. **Auto-detect `todo/` files** (lines 422-471 in context-router-v2.py)
   - Scans for `todo/*.md` in current project
   - Adds recovery-related keywords
   - Pins task files (always WARM)

2. **Resolve project-relative paths** (lines 510-525)
   - `resolve_file_path()` checks both docs_root and cwd
   - Enables `todo/` files outside `.claude/` to be injected

## Environment

```bash
# Set in ~/.zshrc
export CLAUDE_INSTANCE=A  # Change per terminal for multi-instance
```

## Source

- Upstream: https://github.com/GMaN1911/claude-cognitive
- Installed: 2026-01-25
