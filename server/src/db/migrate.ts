import type { DatabaseSync } from "node:sqlite";

export interface Migration {
  readonly version: number;
  readonly name: string;
  readonly up: (db: DatabaseSync) => void;
}

export function tableExists(db: DatabaseSync, table: string): boolean {
  return (
    db
      .prepare("SELECT 1 AS found FROM sqlite_master WHERE type = 'table' AND name = ?")
      .get(table) !== undefined
  );
}

function tableDdl(db: DatabaseSync, table: string): string {
  const row = db
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(table) as { sql?: string } | undefined;

  return row?.sql ?? "";
}

function normalizeDdl(sql: string): string {
  return sql
    .toLowerCase()
    .replace(/["`]/g, "")
    .replace(/if not exists/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([(),])\s*/g, "$1")
    .trim();
}

export function matchesDdl(
  db: DatabaseSync,
  table: string,
  expected: string,
): boolean {
  return normalizeDdl(tableDdl(db, table)) === normalizeDdl(expected);
}

function schemaVersion(db: DatabaseSync): number {
  const row = db.prepare("PRAGMA user_version").get() as
    | { user_version?: number }
    | undefined;

  return Number(row?.user_version ?? 0);
}

function assertOrdered(migrations: readonly Migration[]): void {
  let previous = 0;

  for (const { version, name } of migrations) {
    if (!Number.isInteger(version) || version <= previous) {
      throw new Error(`Migration ${name} has a duplicate or unordered version`);
    }

    previous = version;
  }
}

export function runMigrations(
  db: DatabaseSync,
  migrations: readonly Migration[],
): number {
  assertOrdered(migrations);

  const current = schemaVersion(db);
  const latest = migrations.at(-1)?.version ?? 0;

  if (current > latest) {
    throw new Error(
      `Database is at schema version ${current} but only ${latest} migrations are known`,
    );
  }

  const pending = migrations.filter(({ version }) => version > current);
  if (pending.length === 0) return current;

  db.exec("PRAGMA foreign_keys = OFF");

  try {
    for (const migration of pending) {
      db.exec("BEGIN IMMEDIATE");

      try {
        migration.up(db);

        const violations = db.prepare("PRAGMA foreign_key_check").all();
        if (violations.length > 0) {
          throw new Error(
            `would leave ${violations.length} foreign key violation(s)`,
          );
        }

        db.exec(`PRAGMA user_version = ${migration.version}`);
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw new Error(
          `Migration ${migration.version}-${migration.name} failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
          { cause: error },
        );
      }
    }
  } finally {
    db.exec("PRAGMA foreign_keys = ON");
  }

  return latest;
}
