import type { Service } from "../models/service";
import {
  validateServiceInput,
  type ServiceInput,
} from "../validators/serviceValidator";

export class ServiceService {
  private services: Service[] = [
    {
      id: 1,
      name: "Student ID Card",
      description: "Student identification card services.",
      duration: 15,
      priority: "medium",
    },
    {
      id: 2,
      name: "Financial Aid Consultation",
      description: "Assistance with financial aid questions and applications.",
      duration: 30,
      priority: "high",
    },
    {
      id: 3,
      name: "DMV License Renewal",
      description: "License renewal and related documentation services.",
      duration: 20,
      priority: "low",
    },
  ];

  private nextId = 4;

  listServices(): Service[] {
    return this.services.map((service) => ({ ...service }));
  }

  createService(input: unknown): Service {
    const result = validateServiceInput(input);

    if (!result.valid) {
      throw new Error(result.errors.join(" "));
    }

    const data = input as ServiceInput;

    const service: Service = {
      id: this.nextId++,
      name: data.name.trim(),
      description: data.description.trim(),
      duration: data.duration,
      priority: data.priority,
    };

    this.services.push(service);
    return { ...service };
  }

  updateService(id: number, input: unknown): Service | undefined {
    const existing = this.services.find((service) => service.id === id);

    if (!existing) {
      return undefined;
    }

    const result = validateServiceInput(input);

    if (!result.valid) {
      throw new Error(result.errors.join(" "));
    }

    const data = input as ServiceInput;

    const updated: Service = {
      id: existing.id,
      name: data.name.trim(),
      description: data.description.trim(),
      duration: data.duration,
      priority: data.priority,
    };

    this.services = this.services.map((service) =>
      service.id === id ? updated : service,
    );

    return { ...updated };
  }
  removeService(id: number): boolean {
    const exists = this.services.some((service) => service.id === id);

    if (!exists) {
      return false;
    }

    this.services = this.services.filter((service) => service.id !== id);

    return true;
  }
}
