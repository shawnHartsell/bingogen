# Research: Card Persistence & Navigation

**Feature Branch**: `003-card-persistence`  
**Date**: 2026-03-21

## Research Task 1: NoSQL Database Engine Selection

### Context

The feature requires persisting bingo cards as JSON documents in a NoSQL database. The app is small (fewer than 100 cards), single-user, deployed on Vercel, and built with Next.js 16 (App Router). The constitution requires favoring simplicity and good documentation.

### Options Evaluated

#### A. MongoDB Atlas (via native `mongodb` driver)

| Criterion            | Fit                                                                     |
| -------------------- | ----------------------------------------------------------------------- |
| JSON document model  | Native — BSON is a superset of JSON, no impedance mismatch              |
| Vercel compatibility | Excellent — works in serverless functions, connection pooling available |
| Free tier            | M0 Shared cluster: 512 MB storage (cards use ~500 KB total at scale)    |
| Setup simplicity     | Create Atlas cluster, add connection string to Vercel env vars          |
| TypeScript SDK       | `mongodb` native driver has strong TS types; Mongoose adds schema layer |
| Documentation        | Industry-leading; massive community and tutorial ecosystem              |

**Gotchas**: M0 has no backups and shared resources. Connection string must be stored as env var. Need to handle connection pooling for serverless (standard pattern with cached client).

#### B. Firebase Firestore

| Criterion            | Fit                                                             |
| -------------------- | --------------------------------------------------------------- |
| JSON document model  | Native document store, excellent match                          |
| Vercel compatibility | Works but requires Firebase project + service account setup     |
| Free tier            | Very generous (1 GB storage, 50K reads/day, 20K writes/day)     |
| Setup simplicity     | More configuration: Firebase project, service account, SDK init |
| TypeScript SDK       | Official Firebase SDK with solid TS support                     |
| Documentation        | Excellent (Google-maintained)                                   |

**Gotchas**: Real-time sync features are overkill. Larger SDK bundle. Separate Google Cloud account. Slightly higher setup friction.

#### C. Vercel KV / Upstash Redis

| Criterion           | Fit                                                                  |
| ------------------- | -------------------------------------------------------------------- |
| JSON document model | Poor — key-value store, not document DB. JSON stored as strings      |
| Free tier           | Very limited (3K–10K commands/month). Listing all cards is expensive |
| Setup simplicity    | Easiest (Vercel-native) but wrong data model                         |

**Rejected**: Redis is a cache/key-value store, not a document database. Listing documents requires N queries. Free tier would be exhausted quickly with normal usage.

#### D. Vercel Postgres (Neon)

| Criterion           | Fit                                                     |
| ------------------- | ------------------------------------------------------- |
| JSON document model | Possible via JSONB columns but adds relational ceremony |
| Free tier           | Generous (3 GB), but conceptual mismatch                |

**Rejected**: The user explicitly requested NoSQL for JSON storage. Relational schema adds unnecessary complexity for a pure document model.

### Decision: MongoDB with native `mongodb` driver (local instance for development)

**Rationale**:

1. Perfect model match — bingo cards are JSON documents, MongoDB stores JSON documents natively.
2. Local MongoDB instance (`mongod` or `mongosh`) provides a zero-cost, zero-latency development environment with no account signup required.
3. Simplest path aligning with the constitution: one SDK (`mongodb`), one connection string, intuitive CRUD.
4. Best documentation and community of all options evaluated.
5. The native `mongodb` driver (without Mongoose) is the simplest choice — no ORM overhead, direct document operations, excellent TypeScript types.
6. Hosted infrastructure (MongoDB Atlas, containers, Terraform) is deferred to a later feature — local-only for now.

**Alternatives considered**: Firestore is a strong runner-up (technically equivalent) but adds a separate Google Cloud account and unused real-time features. Redis and Postgres are poor fits for the document model.

---

## Research Task 2: Persistence Strategy (Whole-Document vs. Partial Update)

### Context

The spec requires auto-saving card state on every user interaction (cell toggle, notes edit, title edit). The user suggested saving the entire board state rather than inline/partial updates.

### Options Evaluated

#### A. Whole-document replacement (`replaceOne` / `findOneAndReplace`)

- On every change, serialize the full `AppState` → JSON and replace the entire document in MongoDB.
- Simple implementation: one code path for all save operations.
- Slight data overhead (~2-5 KB per write) but negligible at this scale.
- No risk of partial state inconsistency.

#### B. Partial updates (`$set` / `updateOne` with field paths)

- On each change, compute a diff and send only changed fields.
- More complex: need to map each action type to a specific `$set` operation.
- Marginally more efficient per write but adds code complexity.
- Risk of state drift if partial updates conflict.

### Decision: Whole-document replacement

**Rationale**:

1. Constitution mandates simplicity — one save path is simpler than action-specific partial updates.
2. Documents are tiny (2-5 KB). Write efficiency gains from partial updates are negligible.
3. Eliminates state drift risk — the document in the database always matches the full in-memory state.
4. MongoDB's `replaceOne` is a single atomic operation, well-suited for this pattern.
5. The user explicitly preferred this approach ("save the entire state of the board").

**Alternative rejected**: Partial updates would add complexity (mapping each `AppAction` to a `$set` path) without meaningful performance benefit at this scale.

---

## Research Task 3: ID Generation Strategy

### Context

Each bingo card needs a unique identifier used in the URL (`/cards?id=<identifier>`). The ID must be safe for URLs and unique enough for the expected volume.

### Options Evaluated

#### A. MongoDB ObjectId (default `_id`)

- Auto-generated by MongoDB. 12-byte hex string (24 characters).
- Guaranteed unique. Contains timestamp.
- URL-safe but long and opaque (e.g., `507f1f77bcf86cd799439011`).

#### B. UUID v4

- Universally unique, 36-character string with hyphens.
- Standard format but very long for URLs.

#### C. nanoid (short IDs)

- Generates short, URL-safe, unique IDs (e.g., `V1StGXR8_Z5jdHi6B-myT`).
- Configurable length. 21 chars by default (collision-safe for billions).
- Requires adding `nanoid` package.

### Decision: MongoDB ObjectId (default `_id`)

**Rationale**:

1. Zero additional dependencies — MongoDB generates it automatically.
2. Guaranteed unique without any collision logic.
3. Contains embedded creation timestamp (useful for sort-by-created ordering in the sidebar).
4. 24 characters is acceptable for a URL query string parameter.
5. Constitution favors fewer dependencies (YAGNI principle).

**Alternative rejected**: nanoid produces shorter IDs but adds a dependency for no meaningful user benefit (query strings aren't visible in the same way as path segments).

---

## Research Task 4: Server-Side Data Access Pattern

### Context

The constitution requires following Next.js App Router patterns. Data fetching should use Server Components or Server Actions. Direct client-side database access is not appropriate.

### Decision: Next.js Server Actions for mutations, Server Component data fetching for reads

**Rationale**:

1. **Reads (load card, list cards)**: The `/cards` page can fetch card data in a Server Component before rendering, then pass it as props to client components. This follows the Next.js convention of server-side data fetching.
2. **Writes (save card, update card, delete card)**: Server Actions (`"use server"` functions) handle mutations. The client calls these actions, which execute on the server and interact with MongoDB.
3. This pattern keeps the MongoDB connection string and driver server-side only — no database credentials or SDK exposed to the browser.
4. Aligns directly with constitution principle II (Next.js Conventions): "Data fetching MUST happen in Server Components or Server Actions unless client-side state is explicitly needed."

---

## Research Task 5: Connection Management in Serverless

### Context

MongoDB connections in serverless environments (Vercel Functions) need special handling to avoid exhausting the connection pool on cold starts.

### Decision: Cached MongoClient singleton pattern

**Rationale**:
The standard pattern for Next.js + MongoDB is to cache the `MongoClient` instance in a module-level variable, reusing the connection across requests within the same process:

```typescript
// lib/db.ts
import { MongoClient } from "mongodb";

const client = new MongoClient(process.env.MONGODB_URI!);
const clientPromise = client.connect();

export default clientPromise;
```

This pattern works identically for local development (connecting to `localhost:27017`) and for future hosted deployments (Atlas connection string). The `MONGODB_URI` environment variable is the only thing that changes between environments.
