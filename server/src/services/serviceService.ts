
import type { DatabaseSync } from "node:sqlite";
import { db } from "../db/sqlite";
import type { Priority, Service } from "../models/service";
import {
  validateServiceInput,
  type ServiceInput,
} from "../validators/serviceValidator";

type ServiceRow = {
  id: string;
  name: string;
  description: string;
  expected_duration: number;
  priority: string;
};

function toService(row: ServiceRow): Service {
  return {
    id: Number(row.id),
    name: row.name,
    description: row.description,
    duration: row.expected_duration,
    priority: row.priority as Priority,
  };
}

export class ServiceService {
  constructor(private readonly database: DatabaseSync = db) {}

  listServices(): Service[] {
    const rows = this.database
      .prepare(
        `SELECT id, name, description, expected_duration, priority
         FROM services
         ORDER BY CAST(id AS INTEGER)`,
      )
      .all() as ServiceRow[];

    return rows.map(toService);
  }

  createService(input: unknown): Service {
    const result = validateServiceInput(input);
    if (!result.valid) {
      throw new Error(result.errors.join(" "));
    }

    const data = input as ServiceInput;

    const row = this.database
      .prepare(
        `SELECT COALESCE(MAX(CAST(id AS INTEGER)), 0) + 1 AS next_id
         FROM services`,
      )
      .get() as { next_id: number };

    const service: Service = {
      id: row.next_id,
      name: data.name.trim(),
      description: data.description.trim(),
      duration: data.duration,
      priority: data.priority,
    };

    this.database
      .prepare(
        `INSERT INTO services
         (id, name, description, expected_duration, priority)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(
        String(service.id),
        service.name,
        service.description,
        service.duration,
        service.priority,
      );

    return service;
  }

  updateService(id: number, input: unknown): Service | undefined {
    const existing = this.database
      .prepare("SELECT id FROM services WHERE id = ?")
      .get(String(id));

    if (!existing) {
      return undefined;
    }

    const result = validateServiceInput(input);
    if (!result.valid) {
      throw new Error(result.errors.join(" "));
    }

    const data = input as ServiceInput;

    this.database
      .prepare(
        `UPDATE services
         SET name = ?, description = ?, expected_duration = ?, priority = ?
         WHERE id = ?`,
      )
      .run(
        data.name.trim(),
        data.description.trim(),
        data.duration,
        data.priority,
        String(id),
      );

    return {
      id,
      name: data.name.trim(),
      description: data.description.trim(),
      duration: data.duration,
      priority: data.priority,
    };
  }

  removeService(id: number): boolean {
    const result = this.database
      .prepare("DELETE FROM services WHERE id = ?")
      .run(String(id));

    return result.changes > 0;
  }
}
