import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { config } from "../config/env";
import { runMigrations } from "./migrate";
import { migrations } from "./migrations";

function databaseFile(url: string): string {
  const path = url.startsWith("file:") ? url.slice("file:".length) : url;
  return path === ":memory:" ? path : resolve(path);
}

export function openDatabase(url: string): DatabaseSync {
  const file = databaseFile(url);
  if (file !== ":memory:") {
    mkdirSync(dirname(file), { recursive: true });
  }

  const database = new DatabaseSync(file);
  database.exec("PRAGMA busy_timeout = 5000");
  database.exec("PRAGMA foreign_keys = ON");

  try {
    runMigrations(database, migrations);
  } catch (error) {
    database.close();
    throw error;
  }

  database.exec("PRAGMA foreign_keys = ON");
  return database;
}

export const db = openDatabase(config.databaseUrl);
