import type { DatabaseSync } from "node:sqlite";
import { db } from "../db/sqlite";
import type { Priority, Service } from "../models/service";
import { ValidationError } from "../utils/errors";
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
  is_available: number;
};

function toService(row: ServiceRow): Service {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    duration: row.expected_duration,
    priority: row.priority as Priority,
    isAvailable: row.is_available === 1,
  };
}

export class ServiceService {
  constructor(private readonly database: DatabaseSync = db) {}

  listServices(): Service[] {
    const rows = this.database
      .prepare(
        `SELECT id, name, description, expected_duration, priority, is_available
         FROM services
         ORDER BY CAST(id AS INTEGER) = 0, CAST(id AS INTEGER), id`,
      )
      .all() as ServiceRow[];

    return rows.map(toService);
  }

  createService(input: unknown): Service {
    const data = this.validate(input);

    const row = this.database
      .prepare(
        `SELECT COALESCE(MAX(CAST(id AS INTEGER)), 0) + 1 AS next_id
         FROM services`,
      )
      .get() as { next_id: number };

    const service: Service = {
      id: String(row.next_id),
      name: data.name.trim(),
      description: data.description.trim(),
      duration: data.duration,
      priority: data.priority,
      isAvailable: true,
    };

    this.database
      .prepare(
        `INSERT INTO services
         (id, name, description, expected_duration, priority)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(
        service.id,
        service.name,
        service.description,
        service.duration,
        service.priority,
      );

    return service;
  }

  updateService(id: string, input: unknown): Service | undefined {
    const existing = this.database
      .prepare("SELECT is_available FROM services WHERE id = ?")
      .get(id) as { is_available: number } | undefined;

    if (!existing) {
      return undefined;
    }

    const data = this.validate(input);

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
        id,
      );

    return {
      id,
      name: data.name.trim(),
      description: data.description.trim(),
      duration: data.duration,
      priority: data.priority,
      isAvailable: existing.is_available === 1,
    };
  }

  setAvailability(id: string, isAvailable: boolean): Service | undefined {
    const result = this.database
      .prepare("UPDATE services SET is_available = ? WHERE id = ?")
      .run(isAvailable ? 1 : 0, id);

    if (result.changes === 0) {
      return undefined;
    }

    const row = this.database
      .prepare(
        `SELECT id, name, description, expected_duration, priority, is_available
         FROM services
         WHERE id = ?`,
      )
      .get(id) as ServiceRow | undefined;

    return row ? toService(row) : undefined;
  }

  removeService(id: string): boolean {
    const result = this.database
      .prepare("DELETE FROM services WHERE id = ?")
      .run(id);

    return result.changes > 0;
  }

  private validate(input: unknown): ServiceInput {
    const result = validateServiceInput(input);

    if (!result.valid) {
      throw new ValidationError({}, result.errors.join(" "));
    }

    return input as ServiceInput;
  }
}
