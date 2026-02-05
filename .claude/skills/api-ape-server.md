---
name: api-ape-server
description: "Server integration with api-ape WebSocket framework. Use when: setting up api-ape with Express/Next/Bun/Node servers, configuring onConnect lifecycle, creating controllers, broadcasting messages, pub/sub channels. Triggers: api-ape server, websocket server, real-time backend, broadcast, publish."
---

# api-ape Server Integration

Integrate api-ape with any Node.js, Bun, or Deno HTTP server.

## Quick Start

**Express.js:**
```javascript
const express = require('express')
const { ape } = require('api-ape')

const app = express()
const server = app.listen(3000)

ape(server, { where: 'api' })  // Controllers in ./api/
```

**Next.js (custom server):**
```javascript
const { createServer } = require('http')
const next = require('next')
const { ape } = require('api-ape')

const app = next({ dev: true })
app.prepare().then(() => {
  const server = createServer((req, res) => app.getRequestHandler()(req, res))
  ape(server, { where: 'api' })
  server.listen(3000)
})
```

**Raw Node.js:**
```javascript
const { createServer } = require('http')
const { ape } = require('api-ape')

const server = createServer()
ape(server, { where: 'api' })
server.listen(3000)
```

**Bun:**
```javascript
const { ape } = require('api-ape')

const server = Bun.serve({
  port: 3000,
  fetch(req) { return new Response('Hello') }
})

ape(server, { where: 'api' })  // Bun's native WebSocket auto-detected
```

## onConnect Lifecycle

Handle client connections and configure per-client behavior.

```javascript
ape(server, {
  where: 'api',
  onConnect: (socket, req, send) => {
    // Push data immediately on connect
    send('welcome', { message: 'Connected!' })

    return {
      // Custom values available as this.* in controllers
      embed: { userId: req.session?.userId },

      // Optional hooks
      onReceive: (queryId, data, type) => { /* after message received */ },
      onSend: (data, type) => { /* after message sent */ },
      onError: (errStr) => { /* on error */ },
      onDisconnect: () => { /* client left */ }
    }
  }
})
```

**Parameters:**
- `socket` — WebSocket instance
- `req` — Original HTTP upgrade request
- `send(type, data)` — Push message to this client; `send.toString()` returns clientId

## Controllers (Auto-Routing)

Drop JS files in your `where` directory. They become API endpoints automatically.

```
api/
├── hello.js       → api.hello(data)
├── users.js       → api.users(data)
└── posts/
    ├── index.js   → api.posts(data)
    └── create.js  → api.posts.create(data)
```

**Controller format:**
```javascript
// api/hello.js
module.exports = function(data) {
  // 'this' contains context (see below)
  return { message: `Hello, ${data.name}!` }
}
```

**IMPORTANT:** Use `function()` syntax, not arrow functions. Arrow functions lose `this` context.

## Controller Context (`this`)

| Property | Description |
|----------|-------------|
| `this.broadcast(type, data)` | Send to ALL connected clients |
| `this.broadcastOthers(type, data)` | Send to all EXCEPT the caller |
| `this.publish(channel, data)` | Send to channel subscribers |
| `this.clientId` | Unique client identifier |
| `this.sessionId` | Session ID from cookie (may be null) |
| `this.embed` | Custom values from onConnect |
| `this.clients` | Map of all connected clients |
| `this.req` | Original HTTP request |
| `this.socket` | WebSocket instance |
| `this.agent` | Parsed user-agent |

## Broadcasting & Pub/Sub

**Broadcast to all clients:**
```javascript
const { ape } = require('api-ape')

ape.broadcast('notification', { message: 'Server update!' })
```

**Publish to channel (chained syntax):**
```javascript
ape.publish.stock.AAPL({ price: 185.50 })
ape.publish.news.banking({ headline: 'Market Update' })
ape.publish.health({ status: 'ok' })
```

**From inside a controller:**
```javascript
module.exports = function(data) {
  this.broadcastOthers('chat', data)  // Everyone except sender
  this.publish('room/123', data)       // Channel subscribers only
  return { sent: true }
}
```

## Client Access

Access connected clients via `ape.clients` Map.

```javascript
const { ape } = require('api-ape')

// Count connected clients
console.log(`${ape.clients.size} clients connected`)

// Iterate all clients
for (const [clientId, client] of ape.clients) {
  console.log(clientId, client.agent.browser?.name)
}

// Send to specific client (chained syntax)
const client = ape.clients.get(clientId)
client.send.notification({ message: 'Direct message' })
client.send('chat/room1', { text: 'Hello' })
```

**Client properties:**
| Property | Description |
|----------|-------------|
| `clientId` | Unique identifier |
| `sessionId` | Session from cookie |
| `embed` | Values from onConnect |
| `agent` | Parsed user-agent |
| `isAuthenticated` | Auth state (if configured) |
| `send` | Function to message this client |

## Common Pitfalls

| Problem | Solution |
|---------|----------|
| Controller not found | Ensure file is in `where` directory with `module.exports = function` |
| `this` is undefined | Use `function()` not `() =>` arrow functions |
| Duplicate endpoint error | Remove conflicting `users.js` and `users/index.js` |
| Messages not received | Check client subscribes with callback, not data |
| onConnect not called | Pass HTTP server, not Express app: `ape(server, ...)` not `ape(app, ...)` |

## API Quick Reference

| Pattern | Purpose |
|---------|---------|
| `ape(server, { where })` | Initialize server |
| `ape.broadcast(type, data)` | Send to all clients |
| `ape.publish.channel(data)` | Send to subscribers |
| `ape.clients.get(id).send(...)` | Send to specific client |
| `this.broadcastOthers(type, data)` | Send to all except caller |
