import type { Service as ManagedService } from "../models/service";
import type { Service } from "../types/queue";
import type { ServiceCatalog } from "./queueService";
import type { ServiceService } from "./serviceService";

function toQueueService(service: ManagedService): Service {
  return {
    id: String(service.id),
    name: service.name,
    description: service.description,
    expectedDuration: service.duration,
    priority: service.priority,
    isAvailable: true, 
  };
}

export function createQueueCatalog(serviceService: ServiceService): ServiceCatalog {
  return {
    list: () => serviceService.listServices().map(toQueueService),
    find: (serviceId) => {
      const match = serviceService
        .listServices()
        .find((service) => String(service.id) === serviceId);
      return match ? toQueueService(match) : undefined;
    },
  };
}