# BRI Server Integration Guide

Help the user integrate BRI (Bigdata Repository of Intelligence) database with their server framework.

## Overview

BRI is a zero-dependency embedded database with:
- Proxy-based CRUD API (`db.get.user()`, `db.add.post()`)
- Hot/cold tier storage with LRU cache
- Write-Ahead Log (WAL) for durability
- Optional AES-256-GCM encryption
- Transactions, subscriptions, and reactive entities

## Installation

```bash
npm install bri-db
# or
bun add bri-db
```

## Quick Start (All Frameworks)

```javascript
import { createDB } from 'bri-db';

const db = await createDB({
  storeConfig: {
    dataDir: './data',
    maxMemoryMB: 256
  }
});

// CRUD Operations
const user = await db.add.user({ name: 'Alice', email: 'alice@example.com' });
const users = await db.get.userS(); // Note: uppercase S for collections
const single = await db.get.user('USER_abc123');
user.name = 'Alice Smith';
await user.save();
await db.del.user(user.$ID, 'SYSTEM');
```

---

## Bun Server Integration

```javascript
import { createDB } from 'bri-db';

const db = await createDB({
  storeConfig: {
    dataDir: process.env.DATA_DIR || './data',
    maxMemoryMB: parseInt(process.env.MAX_MEMORY_MB || '256')
  }
});

Bun.serve({
  port: 3000,

  async fetch(req) {
    const url = new URL(req.url);

    // Health check
    if (url.pathname === '/health') {
      return Response.json({ ok: true });
    }

    // GET /users
    if (req.method === 'GET' && url.pathname === '/users') {
      const users = await db.get.userS();
      return Response.json(users.map(u => u.toObject ? u.toObject() : u));
    }

    // GET /users/:id
    if (req.method === 'GET' && url.pathname.startsWith('/users/')) {
      const id = url.pathname.split('/')[2];
      const user = await db.get.user(id);
      if (!user) return new Response('Not Found', { status: 404 });
      return Response.json(user.toObject ? user.toObject() : user);
    }

    // POST /users
    if (req.method === 'POST' && url.pathname === '/users') {
      const data = await req.json();
      const user = await db.add.user(data);
      return Response.json(user.toObject ? user.toObject() : user, { status: 201 });
    }

    // PUT /users/:id
    if (req.method === 'PUT' && url.pathname.startsWith('/users/')) {
      const id = url.pathname.split('/')[2];
      const user = await db.get.user(id);
      if (!user) return new Response('Not Found', { status: 404 });

      const updates = await req.json();
      Object.assign(user, updates);
      await user.save();
      return Response.json(user.toObject ? user.toObject() : user);
    }

    // DELETE /users/:id
    if (req.method === 'DELETE' && url.pathname.startsWith('/users/')) {
      const id = url.pathname.split('/')[2];
      await db.del.user(id, 'API');
      return new Response(null, { status: 204 });
    }

    return new Response('Not Found', { status: 404 });
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await db.disconnect();
  process.exit(0);
});
```

---

## Express.js Integration

```javascript
import express from 'express';
import { createDB } from 'bri-db';

const app = express();
app.use(express.json());

let db;

// Initialize BRI before starting server
async function initDB() {
  db = await createDB({
    storeConfig: {
      dataDir: process.env.DATA_DIR || './data',
      maxMemoryMB: parseInt(process.env.MAX_MEMORY_MB || '256')
    }
  });
}

// Middleware to ensure db is ready
app.use((req, res, next) => {
  if (!db) return res.status(503).json({ error: 'Database not ready' });
  req.db = db;
  next();
});

// Helper to convert entity to plain object
const toJSON = (entity) => {
  if (!entity) return null;
  if (Array.isArray(entity)) return entity.map(toJSON);
  return entity.toObject ? entity.toObject() : entity;
};

// Routes
app.get('/users', async (req, res) => {
  const users = await db.get.userS();
  res.json(toJSON(users));
});

app.get('/users/:id', async (req, res) => {
  const user = await db.get.user(req.params.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(toJSON(user));
});

app.post('/users', async (req, res) => {
  const user = await db.add.user(req.body);
  res.status(201).json(toJSON(user));
});

app.put('/users/:id', async (req, res) => {
  const user = await db.get.user(req.params.id);
  if (!user) return res.status(404).json({ error: 'Not found' });

  Object.assign(user, req.body);
  await user.save();
  res.json(toJSON(user));
});

app.delete('/users/:id', async (req, res) => {
  await db.del.user(req.params.id, 'API');
  res.status(204).send();
});

// Start server
initDB().then(() => {
  app.listen(3000, () => console.log('Server running on port 3000'));
});

// Graceful shutdown
process.on('SIGINT', async () => {
  if (db) await db.disconnect();
  process.exit(0);
});
```

---

## Next.js Integration

### Option 1: API Routes (App Router)

```javascript
// lib/db.js - Singleton database instance
import { createDB, getDB } from 'bri-db';

let dbPromise = null;

export async function getDatabase() {
  if (!dbPromise) {
    dbPromise = createDB({
      storeConfig: {
        dataDir: process.env.BRI_DATA_DIR || './data',
        maxMemoryMB: parseInt(process.env.BRI_MAX_MEMORY_MB || '256')
      }
    });
  }
  return dbPromise;
}
```

```javascript
// app/api/users/route.js
import { getDatabase } from '@/lib/db';

const toJSON = (entity) => {
  if (!entity) return null;
  if (Array.isArray(entity)) return entity.map(toJSON);
  return entity.toObject ? entity.toObject() : entity;
};

export async function GET() {
  const db = await getDatabase();
  const users = await db.get.userS();
  return Response.json(toJSON(users));
}

export async function POST(request) {
  const db = await getDatabase();
  const data = await request.json();
  const user = await db.add.user(data);
  return Response.json(toJSON(user), { status: 201 });
}
```

```javascript
// app/api/users/[id]/route.js
import { getDatabase } from '@/lib/db';

const toJSON = (entity) => entity?.toObject ? entity.toObject() : entity;

export async function GET(request, { params }) {
  const db = await getDatabase();
  const user = await db.get.user(params.id);
  if (!user) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(toJSON(user));
}

export async function PUT(request, { params }) {
  const db = await getDatabase();
  const user = await db.get.user(params.id);
  if (!user) return Response.json({ error: 'Not found' }, { status: 404 });

  const updates = await request.json();
  Object.assign(user, updates);
  await user.save();
  return Response.json(toJSON(user));
}

export async function DELETE(request, { params }) {
  const db = await getDatabase();
  await db.del.user(params.id, 'API');
  return new Response(null, { status: 204 });
}
```

### Option 2: Server Actions (App Router)

```javascript
// app/actions/users.js
'use server';
import { getDatabase } from '@/lib/db';
import { revalidatePath } from 'next/cache';

const toJSON = (entity) => {
  if (!entity) return null;
  if (Array.isArray(entity)) return entity.map(toJSON);
  return entity.toObject ? entity.toObject() : entity;
};

export async function getUsers() {
  const db = await getDatabase();
  const users = await db.get.userS();
  return toJSON(users);
}

export async function getUser(id) {
  const db = await getDatabase();
  const user = await db.get.user(id);
  return toJSON(user);
}

export async function createUser(formData) {
  const db = await getDatabase();
  const user = await db.add.user({
    name: formData.get('name'),
    email: formData.get('email')
  });
  revalidatePath('/users');
  return toJSON(user);
}

export async function updateUser(id, formData) {
  const db = await getDatabase();
  const user = await db.get.user(id);
  if (!user) throw new Error('User not found');

  user.name = formData.get('name');
  user.email = formData.get('email');
  await user.save();

  revalidatePath('/users');
  return toJSON(user);
}

export async function deleteUser(id) {
  const db = await getDatabase();
  await db.del.user(id, 'API');
  revalidatePath('/users');
}
```

---

## Advanced Features

### Subscriptions (Real-time Updates)

```javascript
// Subscribe to changes
const unsubscribe = await db.sub.user((change) => {
  console.log('Action:', change.action);  // 'CREATE', 'UPDATE', 'DELETE'
  console.log('Target:', change.target);  // Entity $ID
  console.log('Patches:', change.patchs); // RFC 6902 JSON Patch
});

// Later: unsubscribe
unsubscribe();
```

### Transactions

```javascript
// Start transaction
db.rec();

try {
  await db.add.order({ items: [...], total: 100 });
  await db.add.payment({ orderId: order.$ID, amount: 100 });
  await db.fin();  // Commit
} catch (error) {
  await db.nop();  // Rollback
  throw error;
}
```

### Relationships & Population

```javascript
// Create with references
const post = await db.add.post({
  title: 'Hello',
  author: user.$ID  // Store reference
});

// Populate reference
const withAuthor = await post.and.author;
console.log(withAuthor.author.name);  // Full user object

// Chain population
const full = await post.and.author.and.comments;
```

### Encryption at Rest

```javascript
const db = await createDB({
  storeConfig: {
    dataDir: './data',
    maxMemoryMB: 256,
    encryption: {
      enabled: true,
      algorithm: 'aes-256-gcm',
      keyProvider: 'env'  // Reads BRI_ENCRYPTION_KEY env var
    }
  }
});
```

### Query Filtering

```javascript
// Object matching
const admins = await db.get.userS({ role: 'admin' });

// Function filter
const active = await db.get.userS(u => u.active && u.age > 18);

// Complex queries
const results = await db.get.postS(p =>
  p.tags?.includes('featured') &&
  new Date(p.createdAt) > lastWeek
);
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BRI_DATA_DIR` | `./data` | Storage directory |
| `BRI_MAX_MEMORY_MB` | `256` | LRU cache size |
| `BRI_ENCRYPTION_KEY` | - | 64-char hex key for encryption |

---

## Docker Deployment

```dockerfile
FROM oven/bun:1-alpine
WORKDIR /app
COPY package.json ./
RUN bun install --production
COPY . .
ENV PORT=3000 DATA_DIR=/data MAX_MEMORY_MB=256
EXPOSE 3000
VOLUME ["/data"]
CMD ["bun", "run", "index.js"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  api:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - bri-data:/data
    environment:
      - DATA_DIR=/data
      - MAX_MEMORY_MB=256

volumes:
  bri-data:
```

---

## Key Points

1. **Always await createDB()** - It's async and initializes storage
2. **Use uppercase S for collections** - `db.get.userS()` returns array, `db.get.user(id)` returns single
3. **Call toObject() for JSON serialization** - Entities are proxies with methods
4. **Graceful shutdown** - Always call `db.disconnect()` on SIGINT/SIGTERM
5. **Singleton pattern** - Reuse the same db instance across requests
