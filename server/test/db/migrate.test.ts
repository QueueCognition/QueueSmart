import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { after, before, describe, it } from "node:test";
import { matchesDdl, runMigrations } from "../../src/db/migrate";
import { migrations } from "../../src/db/migrations";
import {
  NOTIFICATIONS,
  QUEUES,
  QUEUE_ENTRIES,
  QUEUE_TICKET_SEQUENCE,
  TABLES,
  USERS,
} from "../../src/db/migrations/001-init";

function version(db: DatabaseSync): number {
  const row = db.prepare("PRAGMA user_version").get() as { user_version: number };
  return Number(row.user_version);
}

function indexNames(db: DatabaseSync): string[] {
  return db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'index' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    )
    .all()
    .map((row) => String((row as { name: string }).name));
}

describe("migration runner", () => {
  it("brings an empty database to the latest version", () => {
    const db = new DatabaseSync(":memory:");
    try {
      assert.equal(runMigrations(db, migrations), version(db));

      for (const [table] of TABLES) {
        assert.ok(matchesDdl(db, table, TABLES.get(table) ?? ""), table);
      }
    } finally {
      db.close();
    }
  });

  it("is idempotent across repeated runs", () => {
    const db = new DatabaseSync(":memory:");
    try {
      const first = runMigrations(db, migrations);
      assert.equal(runMigrations(db, migrations), first);
    } finally {
      db.close();
    }
  });

  it("rejects a database newer than the newest migration", () => {
    const db = new DatabaseSync(":memory:");
    try {
      runMigrations(db, migrations);
      db.exec("PRAGMA user_version = 99");

      assert.throws(() => runMigrations(db, migrations), /only .* known/);
    } finally {
      db.close();
    }
  });

  it("rejects migrations that are out of order", () => {
    const db = new DatabaseSync(":memory:");
    try {
      assert.throws(
        () =>
          runMigrations(db, [
            { version: 2, name: "two", up: () => {} },
            { version: 1, name: "one", up: () => {} },
          ]),
        /duplicate or unordered/,
      );
    } finally {
      db.close();
    }
  });

  it("rolls back a failing migration and keeps the version untouched", () => {
    const db = new DatabaseSync(":memory:");
    try {
      const applied = runMigrations(db, migrations);

      assert.throws(
        () =>
          runMigrations(db, [
            ...migrations,
            {
              version: applied + 1,
              name: "broken",
              up: (target) => {
                target.exec("CREATE TABLE half_applied (id INTEGER)");
                target.exec("INSERT INTO missing_table VALUES (1)");
              },
            },
          ]),
        /Migration \d+-broken failed/,
      );

      assert.equal(version(db), applied);
      assert.equal(
        db.prepare("SELECT 1 FROM sqlite_master WHERE name = 'half_applied'").all()
          .length,
        0,
      );
    } finally {
      db.close();
    }
  });

  it("rejects a migration that would orphan rows", () => {
    const db = new DatabaseSync(":memory:");
    try {
      assert.throws(
        () =>
          runMigrations(db, [
            {
              version: 1,
              name: "orphaning",
              up: (target) => {
                target.exec("CREATE TABLE parent (id TEXT PRIMARY KEY)");
                target.exec(
                  "CREATE TABLE child (id TEXT PRIMARY KEY, parent_id TEXT REFERENCES parent(id))",
                );
                target.exec("INSERT INTO child VALUES ('c1', 'missing')");
              },
            },
          ]),
        /foreign key violation/,
      );

      assert.equal(version(db), 0);
    } finally {
      db.close();
    }
  });

  it("restores foreign key enforcement after a failed run", () => {
    const db = new DatabaseSync(":memory:");
    try {
      assert.throws(() =>
        runMigrations(db, [
          { version: 1, name: "broken", up: (t) => t.exec("THIS IS NOT SQL") },
        ]),
      );

      const row = db.prepare("PRAGMA foreign_keys").get() as {
        foreign_keys: number;
      };
      assert.equal(Number(row.foreign_keys), 1);
    } finally {
      db.close();
    }
  });
});

describe("init migration", () => {
  it("creates every table", () => {
    const db = new DatabaseSync(":memory:");
    try {
      runMigrations(db, migrations);

      assert.deepEqual(
        indexNames(db),
        [
          "appointments_user_date_idx",
          "notifications_user_timestamp_idx",
          "queue_entries_service_status_idx",
          "queues_one_open_per_service_idx",
        ],
      );
    } finally {
      db.close();
    }
  });

  it("seeds the ticket sequence exactly once", () => {
    const db = new DatabaseSync(":memory:");
    try {
      runMigrations(db, migrations);
      runMigrations(db, migrations);

      const rows = db.prepare("SELECT id, value FROM queue_ticket_sequence").all();
      assert.equal(rows.length, 1);
      assert.equal(Number((rows[0] as { value: number }).value), 100);
      assert.ok(matchesDdl(db, "queue_ticket_sequence", QUEUE_TICKET_SEQUENCE));
    } finally {
      db.close();
    }
  });

  it("treats email as case insensitive", () => {
    const db = new DatabaseSync(":memory:");
    try {
      runMigrations(db, migrations);
      db.exec(`INSERT INTO users (id, first_name, last_name, email, role, password_hash, created_at)
               VALUES ('u1','A','B','Mixed@Example.com','user','hash','2026-01-01')`);

      assert.ok(db.prepare("SELECT id FROM users WHERE email = ?").get("mixed@example.com"));
      assert.throws(
        () =>
          db
            .prepare(
              `INSERT INTO users (id, first_name, last_name, email, role, password_hash, created_at)
               VALUES ('u2','A','B','MIXED@EXAMPLE.COM','user','hash','2026-01-01')`,
            )
            .run(),
        /UNIQUE constraint failed/,
      );
    } finally {
      db.close();
    }
  });

  it("enforces one open queue per service", () => {
    const db = new DatabaseSync(":memory:");
    try {
      runMigrations(db, migrations);
      db.exec(
        `INSERT INTO services (id,name,description,expected_duration,priority)
         VALUES ('1','S','d',10,'medium')`,
      );
      db.exec(
        `INSERT INTO queues (id,service_id,status,created_at) VALUES ('q1','1','open','2026-01-01')`,
      );

      assert.throws(
        () =>
          db.exec(
            `INSERT INTO queues (id,service_id,status,created_at) VALUES ('q2','1','open','2026-01-02')`,
          ),
        /UNIQUE constraint failed/,
      );
    } finally {
      db.close();
    }
  });

  it("keeps the composite foreign key resolvable", () => {
    const db = new DatabaseSync(":memory:");
    try {
      runMigrations(db, migrations);
      db.exec("PRAGMA foreign_keys = ON");
      db.exec(
        `INSERT INTO services (id,name,description,expected_duration,priority)
         VALUES ('1','S','d',10,'medium')`,
      );
      db.exec(
        `INSERT INTO queues (id,service_id,status,created_at) VALUES ('q1','1','open','2026-01-01')`,
      );
      db.exec(
        `INSERT INTO queue_entries
         (id,queue_id,service_id,user_id,position,estimated_wait_minutes,status,
          joined_at,updated_at,priority,customer_name,customer_email,date,time_slot,ticket_number)
         VALUES ('e1','q1','1','u1',1,10,'waiting','2026-01-01','2026-01-01','medium',
                 'N','n@example.com','2026-01-01','9:00','S-101')`,
      );

      assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
      assert.ok(matchesDdl(db, "queue_entries", QUEUE_ENTRIES));
      assert.ok(matchesDdl(db, "queues", QUEUES));
      assert.ok(matchesDdl(db, "notifications", NOTIFICATIONS));
      assert.ok(matchesDdl(db, "users", USERS));
    } finally {
      db.close();
    }
  });

  it("refuses to adopt a table that already has a different shape", () => {
    const db = new DatabaseSync(":memory:");
    try {
      db.exec("CREATE TABLE users (id TEXT PRIMARY KEY)");

      assert.throws(
        () => runMigrations(db, migrations),
        /already exists with a different definition/,
      );
    } finally {
      db.close();
    }
  });
});

describe("migration runner on disk", () => {
  let directory: string;

  before(() => {
    directory = mkdtempSync(join(tmpdir(), "queuesmart-migrations-"));
  });

  after(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  it("persists the schema version across connections", () => {
    const file = join(directory, "persisted.db");

    const first = new DatabaseSync(file);
    const applied = runMigrations(first, migrations);
    first.close();

    const second = new DatabaseSync(file);
    try {
      assert.equal(version(second), applied);
      assert.equal(runMigrations(second, migrations), applied);
    } finally {
      second.close();
    }
  });
});
