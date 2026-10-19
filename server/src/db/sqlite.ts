import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { config } from "../config/env";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('user', 'staff', 'admin')),
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS password_reset_requests (
  email TEXT PRIMARY KEY,
  requested_at INTEGER NOT NULL
);
`;

function databaseFile(url: string): string {
  const path = url.startsWith("file:") ? url.slice("file:".length) : url;
  return path === ":memory:" ? path : resolve(path);
}

function openDatabase(): DatabaseSync {
  const file = databaseFile(config.databaseUrl);
  if (file !== ":memory:") {
    mkdirSync(dirname(file), { recursive: true });
  }

  const database = new DatabaseSync(file);
  database.exec(SCHEMA);
  return database;
}

export const db = openDatabase();
