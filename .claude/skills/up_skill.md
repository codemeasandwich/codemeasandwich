---
name: skill-creator
description: "Generate skill files for libraries and codebases. Use when user asks to: create a skill, generate a skill, make a skill file, analyze a library/repo for skill creation, or wants Claude to learn how to use a library. Triggers on keywords like 'create skill', 'generate skill', 'skill for [library]', 'learn this library'."
---

# Skill Creator

Generate skill files that teach Claude how to use libraries and integrate them into projects.

## Workflow

1. **Analyze the library** — Find and read: README, main entry points, examples/, docs/, and key source files
2. **Identify core patterns** — What are the 3-5 most common operations users need?
3. **Extract working examples** — Prioritize real code from examples/ or tests/
4. **Generate SKILL.md** — Follow the template below

## SKILL.md Template

```markdown
---
name: library-name
description: "[What it does]. Use when [specific triggers: file types, tasks, keywords]. Examples: [2-3 example user requests]."
---

# Library Name

## Quick Start

[Minimal working example - install + basic usage in <10 lines]

## Core Operations

### Operation 1: [Most common task]
[Code example with brief explanation]

### Operation 2: [Second most common]
[Code example]

### Operation 3: [Third most common]
[Code example]

## Integration Patterns

[How to combine with other tools/frameworks the user likely has]

## Common Pitfalls

- [Gotcha 1]: [Solution]
- [Gotcha 2]: [Solution]

## API Quick Reference

| Function | Purpose | Example |
|----------|---------|---------|
| `func1()` | Does X | `func1(arg)` |
| `func2()` | Does Y | `func2(a, b)` |
```

## Key Rules

1. **Description is critical** — Include WHAT + WHEN + example triggers
2. **Concise > comprehensive** — Claude is smart; only add non-obvious info
3. **Working code > explanations** — Prefer tested examples from the repo
4. **<500 lines** — Split large content into `references/` files
5. **Integration focus** — Show how to use WITH other tools, not just standalone

## Analyzing a Library

```bash
# Find documentation
find . -name "README*" -o -name "*.md" | head -20

# Find examples
ls -la examples/ docs/ doc/ 2>/dev/null

# Find main entry points
head -50 src/index.* lib/index.* index.* 2>/dev/null

# Find tests (great for usage patterns)
ls tests/ test/ __tests__/ spec/ 2>/dev/null
```

## For Large Libraries

Create a lean SKILL.md + reference files:

```
library-skill/
├── SKILL.md              # Core operations only (~200 lines)
└── references/
    ├── api-reference.md  # Full API when needed
    ├── advanced.md       # Complex patterns
    └── examples.md       # Extended examples
```

In SKILL.md, link with guidance:
```markdown
## Advanced Usage
- **Streaming**: See [references/advanced.md](references/advanced.md#streaming)
- **Full API**: See [references/api-reference.md](references/api-reference.md)
```

## Quality Checklist

- [ ] Description has clear triggers (file types, keywords, task types)
- [ ] Quick start works in <10 lines
- [ ] Examples are tested/from real code
- [ ] Covers integration with common tools
- [ ] Pitfalls section prevents common mistakes
- [ ] Under 500 lines (or split to references/)