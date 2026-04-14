---
paths:
  - "apps/api/**/*"
  - "packages/backend/**/*"
---

# TypeORM Rules

## Union-typed columns need explicit `type`

TypeScript's `emitDecoratorMetadata` reflects union types (e.g. `string | null`) as `Object`, which PostgreSQL doesn't support. Always add an explicit `type` to `@Column()` for union types.

```typescript
// WRONG — TypeORM sees "Object" and Postgres rejects it
@Column({ nullable: true })
resetPasswordToken!: string | null;

// CORRECT — explicit type resolves to varchar
@Column({ nullable: true, type: 'varchar' })
resetPasswordToken!: string | null;

// Also applies to Date | null without explicit type
@Column({ nullable: true, type: 'timestamp' })
resetPasswordExpires!: Date | null;
```

Non-union types (`string`, `number`, `boolean`, `Date`) reflect correctly and don't need an explicit `type`.

## Entity conventions

- Use `@PrimaryGeneratedColumn('uuid')` for IDs
- Use `@CreateDateColumn()` and `@UpdateDateColumn()` for timestamps
- Sensitive fields (password, refreshToken) must be stripped in the service layer via the mapper, never exposed in DTOs
