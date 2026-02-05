---
name: api-ape-client
description: "Web client integration with api-ape WebSocket framework. Use when: connecting browser/React/Vue apps to api-ape server, making RPC calls, subscribing to pub/sub channels, handling connection states, file transfers. Triggers: api-ape client, websocket client, real-time frontend, subscribe to channel, pub/sub subscription."
---

# api-ape Web Client

Integrate browser and bundled apps with api-ape servers via WebSocket.

## Quick Start

**Browser (script tag):**
```html
<script src="/api/ape.js"></script>
<script>
  const result = await api.hello('World')  // RPC call
  const unsub = api.message(data => console.log(data))  // Subscribe
</script>
```

**Bundler (React, Vue, etc.):**
```javascript
import api from 'api-ape'

const users = await api.users.list()  // Calls buffered until connected
```

## RPC Calls

Call server endpoints like local methods. Pass **data** to make an RPC call.

```javascript
// Chained syntax maps to controller paths
await api.hello('World')           // → api/hello.js
await api.users.list()             // → api/users/list.js
await api.users.create({ name: 'Alice' })

// Path parameters (first arg is path segment)
await api.users('/123', { name: 'Updated' })  // → /users/123
await api.chat.messages('/room1', { text: 'Hi' })
```

## Pub/Sub Subscriptions

Pass a **callback function** (not data) to subscribe. Returns an unsubscribe function.

```javascript
// Subscribe - pass callback
const unsub = api.news.banking(data => {
  console.log('Received:', data)
})

// Unsubscribe when done
unsub()

// Multiple subscriptions
const unsub1 = api.stock.AAPL(data => console.log('AAPL:', data.price))
const unsub2 = api.notifications(data => console.log('Alert:', data))

// Cleanup
unsub1()
unsub2()
```

**Key behaviors:**
- On subscribe, receive the last published message immediately (if any)
- Subscriptions auto-restore on reconnect
- Subscriptions auto-cleanup on disconnect

## Connection Management

```javascript
// Monitor connection state
const unsub = api.onConnectionChange(state => {
  console.log('Connection:', state)
})

// States:
// 'offline'     - Browser reports no network
// 'walled'      - Captive portal detected (WiFi login)
// 'disconnected'- Had connection, lost it
// 'connecting'  - Actively connecting
// 'connected'   - Ready to use
```

**Call buffering:** Messages sent before connection are queued and flushed when connected.

## File Transfers

**Receiving binary data:**
```javascript
const result = await api.files.download('image.png')
const blob = new Blob([result.data])  // result.data is ArrayBuffer
img.src = URL.createObjectURL(blob)
```

**Uploading files:**
```javascript
const file = input.files[0]
await api.files.upload({
  name: file.name,
  data: await file.arrayBuffer()  // Sent via HTTP PUT automatically
})
```

## Common Pitfalls

| Problem | Solution |
|---------|----------|
| Callback vs data confusion | **Callback** = subscribe, **Data** = RPC call |
| Memory leaks | Always call `unsub()` when component unmounts |
| Timeout errors | Default 10s timeout; calls buffered while disconnected |
| No response | Check server has matching controller in `api/` folder |

## API Quick Reference

| Pattern | Purpose | Returns |
|---------|---------|---------|
| `api.path.method(data)` | RPC call | `Promise<response>` |
| `api.path.channel(callback)` | Subscribe | `unsubscribe function` |
| `api.onConnectionChange(fn)` | Connection state | `unsubscribe function` |
| `api.path('/segment', data)` | RPC with path param | `Promise<response>` |
