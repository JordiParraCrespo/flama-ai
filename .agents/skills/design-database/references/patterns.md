# Schema patterns

Recurring shapes, each with the design and the reason for it. Read the ones
the feature needs. Types, naming and the index rules are in
`.agents/rules/database-design.md`; these examples follow them.

## Contents

1. Tenant-owned table
2. Child of a tenant-owned table (no cross-tenant links)
3. Many-to-many join
4. State machine with transition timestamps
5. Money and ledgers
6. Append-only event or audit log
7. Soft delete
8. Trees and hierarchies
9. Polymorphic references
10. Tags and labels
11. Work queue
12. Idempotency keys
13. Per-user or per-tenant settings (1:1)
14. Concurrent edits (optimistic locking)
15. Counters

---

## 1. Tenant-owned table

```sql
CREATE TABLE "project" (
  "id"             uuid NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" uuid NOT NULL,
  "name"           character varying(120) NOT NULL,
  "slug"           character varying(64) NOT NULL,
  "createdById"    uuid,
  "createdAt"      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "updatedAt"      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT "PK_project" PRIMARY KEY ("id"),
  CONSTRAINT "UQ_project_organization_slug" UNIQUE ("organizationId", "slug"),
  CONSTRAINT "CHK_project_name_not_blank" CHECK (char_length(btrim("name")) > 0),
  CONSTRAINT "FK_project_organization" FOREIGN KEY ("organizationId")
    REFERENCES "organization"("id") ON DELETE CASCADE,
  CONSTRAINT "FK_project_created_by" FOREIGN KEY ("createdById")
    REFERENCES "user"("id") ON DELETE SET NULL
);
-- The org's project list, newest first (keyset-paginated).
CREATE INDEX "IDX_project_organization_created" ON "project" ("organizationId", "createdAt" DESC, "id" DESC);
-- FK index: a user delete sets these to NULL.
CREATE INDEX "IDX_project_created_by" ON "project" ("createdById");
```

- `organizationId` is `NOT NULL`, leads the unique and the list index. The
  unique also serves "by slug within an org" and the org FK's lookups, so
  the FK needs no separate index.
- `createdById` is `SET NULL`: the project outlives its creator.

## 2. Child of a tenant-owned table

Carry the tenant on the child too, and make the child's foreign key include
it, so a child can never point at a parent in another tenant:

```sql
-- on the parent
ALTER TABLE "project" ADD CONSTRAINT "UQ_project_organization_id" UNIQUE ("organizationId", "id");

CREATE TABLE "task" (
  "id"             uuid NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" uuid NOT NULL,
  "projectId"      uuid NOT NULL,
  ...
  CONSTRAINT "FK_task_project" FOREIGN KEY ("organizationId", "projectId")
    REFERENCES "project"("organizationId", "id") ON DELETE CASCADE,
  CONSTRAINT "FK_task_organization" FOREIGN KEY ("organizationId")
    REFERENCES "organization"("id") ON DELETE CASCADE
);
CREATE INDEX "IDX_task_organization_project" ON "task" ("organizationId", "projectId");
```

The redundant `organizationId` is what every query filters on first, and what
row-level security or partitioning would key on later.

## 3. Many-to-many join

No payload and nothing nullable: composite primary key, plus an index on the
reverse direction.

```sql
CREATE TABLE "project_member" (
  "projectId" uuid NOT NULL,
  "userId"    uuid NOT NULL,
  "role"      character varying(16) NOT NULL DEFAULT 'viewer',
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT "PK_project_member" PRIMARY KEY ("projectId", "userId"),
  CONSTRAINT "CHK_project_member_role" CHECK ("role" IN ('viewer', 'editor', 'admin')),
  ...FKs, both ON DELETE CASCADE
);
-- "Projects this user belongs to"; the PK already serves "members of this project".
CREATE INDEX "IDX_project_member_user" ON "project_member" ("userId");
```

If part of the uniqueness can be NULL (a global vs scoped assignment), use a
surrogate `id` plus partial uniques, as `user_role` does, or
`UNIQUE NULLS NOT DISTINCT (...)`.

## 4. State machine with transition timestamps

```sql
"status"      character varying(16) NOT NULL DEFAULT 'draft',
"submittedAt" TIMESTAMP WITH TIME ZONE,
"approvedAt"  TIMESTAMP WITH TIME ZONE,
"approvedById" uuid,
CONSTRAINT "CHK_expense_status" CHECK ("status" IN ('draft', 'submitted', 'approved', 'rejected', 'paid')),
CONSTRAINT "CHK_expense_approved_has_time" CHECK ("status" NOT IN ('approved', 'paid') OR "approvedAt" IS NOT NULL)
```

`status` is where the row is now; the timestamps are when it got there, and
the `CHECK`s keep the two consistent. The TypeScript union for the status
lives beside the domain entity and matches the `CHECK` list. When the full
history matters (who moved it, each time), add an append-only
`<table>_event` table (pattern 6) rather than more columns.

## 5. Money and ledgers

- Amounts are `bigint` in minor units (cents) with `"currency" char(3)`
  (`CHECK ("currency" ~ '^[A-Z]{3}$')`), or `numeric(19,4)` when fractions of a
  minor unit matter (unit prices, FX). Never floating point.
- Totals on a document (`invoice."totalAmount"`) are either computed from the
  lines or stored and kept equal to them in the same transaction. Say which.
- A balance is a ledger: an append-only `ledger_entry` of signed amounts, and
  the balance is their sum, optionally cached on the account row and updated
  in the same transaction with a `version` guard. Entries are never updated or
  deleted; a correction is a reversing entry.
- Financial rows are `ON DELETE RESTRICT` toward their parents. An invoice
  does not disappear because a customer was deleted, which usually means
  customers are archived, not deleted.
- Snapshot what the document must keep even if the source changes: the line
  stores `description` and `unitPrice` at the time of sale, not only a
  `productId`.

## 6. Append-only event or audit log

```sql
CREATE TABLE "audit_event" (
  "id"             uuid NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" uuid NOT NULL,
  "actorId"        uuid,             -- no FK: the log outlives the user
  "action"         character varying(64) NOT NULL,
  "targetType"     character varying(32) NOT NULL,
  "targetId"       uuid,             -- polymorphic: no FK
  "metadata"       jsonb NOT NULL DEFAULT '{}',
  "ipAddress"      inet,
  "occurredAt"     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT "PK_audit_event" PRIMARY KEY ("id")
);
CREATE INDEX "IDX_audit_event_org_time" ON "audit_event" ("organizationId", "occurredAt" DESC);
CREATE INDEX "IDX_audit_event_target" ON "audit_event" ("targetType", "targetId", "occurredAt" DESC);
```

- No `updatedAt`, since rows never change. Say "append-only" in the header.
- The references are deliberately FK-less so history survives deletes. Keep
  the tenant FK only if the log should vanish with the tenant (usually yes,
  for GDPR).
- Unbounded: give a retention period and the job that enforces it, and note
  it as a candidate for monthly range partitioning on `occurredAt`, which
  makes retention a `DROP` of old partitions instead of a mass `DELETE`.
  (A partitioned table's primary key must include `occurredAt`.)
- Index for the reads (per tenant timeline, per target history) and nothing
  else; this table is written far more than it is read.

## 7. Soft delete

Only with a reason: undo, legal retention, or references that must still
resolve. Then:

```sql
"deletedAt" TIMESTAMP WITH TIME ZONE,
"deletedById" uuid,
-- uniqueness among live rows only
CREATE UNIQUE INDEX "UQ_document_org_slug_live" ON "document" ("organizationId", "slug") WHERE "deletedAt" IS NULL;
-- the hot list only reads live rows
CREATE INDEX "IDX_document_org_updated_live" ON "document" ("organizationId", "updatedAt" DESC) WHERE "deletedAt" IS NULL;
```

Plus a purge: how long soft-deleted rows stay, and what hard-deletes them.
TypeORM's `@DeleteDateColumn({ type: 'timestamptz' })` makes `find*` skip
them; raw query builders must add the predicate themselves.

## 8. Trees and hierarchies

- **Adjacency list** (`"parentId" uuid` self-FK, indexed) for shallow trees
  and "children of X"; recursive CTEs for subtrees.
- Add a **materialized path** (`"path" text` like `/a/b/c/`, indexed with
  `text_pattern_ops`, or `ltree`) when subtree reads are hot, and maintain it
  on move.
- `CHECK ("parentId" <> "id")`; deeper cycle prevention lives in the
  application or a trigger.
- `ON DELETE`: `CASCADE` deletes the subtree; `RESTRICT` forces the app to
  move or delete children first. Choose by what the product wants.

## 9. Polymorphic references

One table that points at several kinds of target (comments on tasks and on
documents):

- **Preferred when the set is small and fixed**: one nullable FK column per
  target with `CHECK (num_nonnulls("taskId", "documentId") = 1)`. Real foreign
  keys, real cascades, one index per column.
- **When the set is open**: `"targetType" varchar + "targetId" uuid` with a
  `CHECK` on the type list and a composite index `("targetType", "targetId")`.
  No FK is possible, so the header says what cleans up orphans (the target's
  delete handler, or a sweep job). `access_grant` is this shape.

## 10. Tags and labels

A `tag` table per tenant (`UNIQUE ("organizationId", lower("name"))`) and a
join table to the tagged rows, not a `text[]` or `jsonb` column, when tags
are managed (renamed, coloured, listed with counts). A plain `text[]` with a
GIN index is fine for free-form labels that are only filtered on.

## 11. Work queue

The `outbox_message` shape: `status`, `attempts`, `availableAt`, `lockedBy`,
`lockedUntil`, `lastError`, and a `("status", "availableAt")` index (or a
partial index `WHERE "status" = 'pending'`). Claimed with
`FOR UPDATE SKIP LOCKED`; a lapsed lease makes a row reclaimable. Processed
rows are deleted or moved on a schedule, so the table stays small.

## 12. Idempotency keys

For operations a client may retry (payments, webhooks received):

```sql
"idempotencyKey" character varying(128) NOT NULL,
CONSTRAINT "UQ_payment_org_idempotency" UNIQUE ("organizationId", "idempotencyKey")
```

Insert with `ON CONFLICT DO NOTHING` and read back. For inbound webhooks, the
provider's event id is the key. Keys expire with a retention job when the
table is not otherwise bounded.

## 13. Per-user or per-tenant settings (1:1)

The parent's id is the primary key and the FK (`user_settings."userId"`), with
`ON DELETE CASCADE`. Defaults live in the column `DEFAULT`s, and a missing
row means "all defaults", so no backfill is needed. A separate table rather
than columns on the parent when the lifecycle or the owner differs (settings
on a Better Auth table would be written through Better Auth).

## 14. Concurrent edits (optimistic locking)

`"version" integer NOT NULL DEFAULT 1` with TypeORM's `@VersionColumn()`, or
a guarded `UPDATE ... SET "version" = "version" + 1 WHERE "id" = $1 AND
"version" = $2`, where zero rows updated means a conflict (HTTP 409). Use it for
documents, shared settings and balances, anything two people edit.

## 15. Counters

A count on a hot parent row (`post."likeCount"`) serializes every writer on
that row. Keep the facts (`post_like` rows, unique per user and post) and
either count them with an index, or maintain the counter asynchronously (a job
or the outbox). A denormalized counter that is updated in the same
transaction is acceptable only when writes to that parent are rare.
