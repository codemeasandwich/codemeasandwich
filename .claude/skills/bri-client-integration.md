---
name: bri-client
description: "BRI database client integration. Use when working with BRI db operations, CRUD, queries, subscriptions, transactions, or reactive entities. Examples: 'query BRI database', 'add record to BRI', 'subscribe to changes', 'use transactions in BRI'."
---

# BRI Client Integration

## Quick Start

```javascript
import { createDB } from 'bri-db';

const db = await createDB({
  storeConfig: { dataDir: './data', maxMemoryMB: 256 }
});

const user = await db.add.user({ name: 'Alice' });
console.log(user.$ID); // USER_abc123
```

## Core Operations

### CRUD Pattern

```javascript
// CREATE - returns reactive entity
const user = await db.add.user({ name: 'Alice', role: 'admin' });

// READ (singular) - by ID
const found = await db.get.user('USER_abc123');

// READ (plural) - returns array (note uppercase S)
const allUsers = await db.get.userS();

// UPDATE - modify and save
found.name = 'Bob';
await found.save();

// REPLACE - full document replacement
await db.set.user({ $ID: user.$ID, name: 'Charlie', role: 'user' });

// DELETE - soft delete (requires who deleted)
await db.del.user(user.$ID, 'SYSTEM');
```

### Querying

```javascript
// By ID string
const user = await db.get.user('USER_abc123');

// By object filter (shallow equality)
const admins = await db.get.userS({ role: 'admin' });

// By function filter
const active = await db.get.userS(u => u.active && u.age > 18);

// Complex function queries
const featured = await db.get.postS(p =>
  p.tags?.includes('featured') &&
  new Date(p.createdAt) > lastWeek
);

// By array of IDs
const specific = await db.get.userS(['USER_abc', 'USER_def']);
```

### Reactive Entities

Entities returned from `add`/`get` are proxies with automatic change tracking:

```javascript
const user = await db.get.user('USER_abc123');

// Modify properties directly
user.name = 'Updated Name';
user.settings = { theme: 'dark' };

// Save with optional metadata
await user.save();                           // Basic save
await user.save('userId123');                // Track who saved
await user.save({ saveBy: 'admin', tag: 'bulk-update' });

// Convert to plain objects
user.toObject();  // Plain JS object
user.toJSON();    // JSON-serializable
user.toJSS();     // Preserves Date, RegExp, etc.
```

## Integration Patterns

### Subscriptions (Real-time)

```javascript
const unsubscribe = await db.sub.user((change) => {
  console.log(change.action);  // 'CREATE' | 'UPDATE' | 'DELETE'
  console.log(change.target);  // Entity $ID
  console.log(change.patchs);  // RFC 6902 JSON Patch array
});

// Later: stop listening
unsubscribe();
```

### Transactions

```javascript
// Start recording
const txnId = db.rec();

try {
  const order = await db.add.order({ items: cart, total: 99.99 });
  const payment = await db.add.payment({ orderId: order.$ID, amount: 99.99 });

  await db.fin();  // Commit (uses active txn)
} catch (error) {
  await db.nop();  // Rollback
  throw error;
}

// Other transaction methods
db.pop();              // Undo last action
db.txnStatus();        // Get current transaction status
db.txnStatus(txnId);   // Get specific transaction status
```

### Relationships & Population

```javascript
// Store references by $ID
const post = await db.add.post({
  title: 'Hello World',
  author: user.$ID       // Reference to user
});

// Populate single field
const withAuthor = await post.and.author;
console.log(withAuthor.author.name);  // Full user object

// Chain multiple populations
const full = await post.and.author.and.comments;
```

### Middleware

```javascript
// Register middleware (chainable)
db.use(async (ctx, next) => {
  console.log(`${ctx.operation} on ${ctx.type}`);
  const start = Date.now();

  await next();  // Continue to next middleware/operation

  console.log(`Completed in ${Date.now() - start}ms`);
  console.log('Result:', ctx.result);
});

// Context shape
interface MiddlewareContext {
  operation: 'get' | 'add' | 'set' | 'del';
  type: string;           // Collection name
  args: any[];            // Original arguments
  opts: Record<string, any>;
  db: Database;
  result?: any;           // Set after operation
}

// Built-in middleware patterns
import { transactionMiddleware, loggingMiddleware } from 'bri-db';

db.use(transactionMiddleware());  // Auto-inject active txnId
db.use(loggingMiddleware());      // Log all operations
```

## Common Pitfalls

| Issue | Solution |
|-------|----------|
| `userS` vs `users` | Use uppercase `S` for plural: `db.get.userS()` |
| Collection ends in 's' | Names can't end in lowercase 's' - use `item` not `items` |
| Forgot await on createDB | `createDB()` is async, always await it |
| Entity not serializing | Call `.toObject()` before JSON.stringify or Response.json |
| Data loss on crash | Call `db.disconnect()` on SIGINT/SIGTERM |
| Adding with $ID | Can't `db.add` with existing `$ID` - use `db.set` instead |

## API Quick Reference

| Method | Purpose | Returns |
|--------|---------|---------|
| `db.add.type(data)` | Create document | `Promise<ReactiveEntity>` |
| `db.get.type(id)` | Get single by ID | `Promise<ReactiveEntity \| null>` |
| `db.get.typeS(filter?)` | Get all/filtered | `Promise<ReactiveEntity[]>` |
| `db.set.type(data)` | Replace document | `Promise<ReactiveEntity>` |
| `db.del.type(id, by)` | Soft delete | `Promise<Entity>` |
| `db.sub.type(cb)` | Subscribe to changes | `Promise<() => void>` |
| `db.rec()` | Start transaction | `txnId` |
| `db.fin(txnId?)` | Commit transaction | `Promise<void>` |
| `db.nop(txnId?)` | Rollback transaction | `Promise<void>` |
| `db.pop(txnId?)` | Undo last action | `Promise<void>` |
| `db.use(fn)` | Add middleware | `Database` (chainable) |
| `db.disconnect()` | Graceful shutdown | `Promise<void>` |
| `entity.save(by?)` | Persist changes | `Promise<ReactiveEntity>` |
| `entity.and.field` | Populate reference | `Promise<ReactiveEntity>` |

## Configuration

```javascript
const db = await createDB({
  storeType: 'inhouse',  // Currently only option
  storeConfig: {
    dataDir: './data',           // Required
    maxMemoryMB: 256,            // Required - LRU cache size
    memoryTargetPercent: 0.8,
    walSegmentSize: 10485760,    // 10MB default
    fsyncMode: 'batched',        // 'batched' | 'immediate'
    fsyncIntervalMs: 100,
    snapshotIntervalMs: 1800000, // 30 min
    keepSnapshots: 3,
    encryption: {
      enabled: true,
      algorithm: 'aes-256-gcm',
      keyProvider: 'env'         // Reads BRI_ENCRYPTION_KEY
    }
  }
});
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BRI_DATA_DIR` | `./data` | Storage directory |
| `BRI_MAX_MEMORY_MB` | `256` | LRU cache size |
| `BRI_ENCRYPTION_KEY` | - | 64-char hex key for encryption |