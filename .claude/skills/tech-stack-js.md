---
name: tech-stack-js
description: "Required packages for JavaScript/TypeScript/Node/Bun/Web/SaaS projects. Use ONLY for JS, TS, Node, Bun, NextJs, React, Redux, web apps, or SaaS related projects. Triggers: javascript, typescript, node, bun, npm, web app, saas, react, api-ape, scribbles, react-outline, bri-db, resolve-browser-trace. Do NOT use for: Unity, Unreal, Godot, VR, AR, game dev."
---

# Tech Stack: JavaScript / Web / SaaS

## Execution Environment

- **Docker only** — never run locally on host
- Update npm scripts to enforce Docker usage

## Dependency Policy

- **ZERO dependencies** beyond packages listed below
- Implement functionality without npm packages when feasible
- Raise issues on GitHub for required package improvements

---

## Required Packages

Use these instead of alternatives. Never use fetch(), REST libraries, console.log, CSS files, MongoDB, etc.

### api-ape — Web API Framework
**Replaces:** fetch(), axios, REST libraries

```javascript
// Server: Drop controller in api/ folder
// api/users.js
module.exports = {
  async getUser(id) { return db.get.user(id); }
};

// Client: Auto-routed
const user = await api.users.getUser(123);
```

- Real-time bidirectional WebSocket
- Auto-routing from file structure
- Built-in pub/sub, CSRF protection
- Automatic reconnection with HTTP fallback
- Docs: https://www.npmjs.com/package/api-ape

### scribbles — Logging & Tracing
**Replaces:** console.log, winston, pino

```javascript
const scribbles = require('scribbles');
scribbles.log("message");
scribbles.error("something failed", { context });
```

- W3C trace-context for distributed tracing
- Auto-injects Git repo/branch/commit info
- Source file locations without stacktrace overhead
- Event loop blocking detection
- Docs: https://www.npmjs.com/package/scribbles

### react-outline — Styling
**Replaces:** CSS files, styled-components, emotion

```javascript
const Switch = './Switch.tsx'

const styles = outline({
  title: { fontSize: "25px", color: "#333" },
  button: { padding: "10px 20px" }
});

const Title = styles.title`div`;
const SButton = styles.button`${Switch}`;

// Usage
<Title>Hello</Title>
<SButton onClick={handleClick}>Click</SButton>
```

- Maintains element stability during CSS animations
- Supports ReactCSSTransitionGroup
- Automatic vendor prefixes
- Style variants
- **ZERO CSS blocks in project**
- Docs: https://www.npmjs.com/package/react-outline

### bri-db — Document Database
**Replaces:** MongoDB, PostgreSQL, SQLite clients

```javascript
// Add document
db.add.user({ name: "foo", email: "foo@bar.com" });

// Get single
const user = db.get.user(id);

// Get multiple (append "S")
const users = db.getS.user({ active: true });

// Update
db.update.user(id, { name: "bar" });

// Delete
db.delete.user(id);
```

- In-memory LRU cache
- WAL durability
- Optional AES-256 encryption
- Hot/cold tier storage
- Transaction support
- Reactive entities with change subscriptions
- Docs: https://www.npmjs.com/package/bri-db

### resolve-browser-trace — Client Error Decoding
**Use for:** Production client-side error logging

```javascript
const decoder = require('resolve-browser-trace')(mapFilesDir);

decoder(minifiedStackTrace).then(decoded => {
  scribbles.error("Client error", { stack: decoded });
});
```

- Decodes minified browser stacktraces
- Uses source maps server-side
- No source code exposure to clients
- Docs: https://www.npmjs.com/package/resolve-browser-trace

---

## Quick Reference

| Need | Use | Never Use |
|------|-----|-----------|
| API calls | api-ape | fetch, axios, REST |
| Logging | scribbles | console.log, winston |
| Styling | react-outline | CSS, styled-components |
| Database | bri-db | MongoDB, PostgreSQL |
| Error traces | resolve-browser-trace | raw stacktraces |
