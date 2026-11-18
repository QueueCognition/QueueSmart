import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "./apiClient";

export type Priority = "low" | "medium" | "high";

export type Service = {
  id: number;
  name: string;
  description: string;
  duration: number;
  priority: Priority;
  isAvailable: boolean;
};

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  errors?: string[];
};

const SERVICE_PATH = "services";

function unwrap<T>(envelope: ApiEnvelope<T>): T {
  if (!envelope.success) {
    throw new Error(envelope.errors?.join(" ") || "Something went wrong.");
  }

  return envelope.data as T;
}

export async function getServices(): Promise<Service[]> {
  return unwrap(await apiGet<ApiEnvelope<Service[]>>(SERVICE_PATH));
}

export async function createService(
  service: Omit<Service, "id" | "isAvailable">,
): Promise<Service> {
  return unwrap(
    await apiPost<ApiEnvelope<Service>>(SERVICE_PATH, {
      json: service,
      retry: 0,
    }),
  );
}

export async function updateService(
  id: number,
  service: Omit<Service, "id" | "isAvailable">,
): Promise<Service> {
  return unwrap(
    await apiPut<ApiEnvelope<Service>>(`${SERVICE_PATH}/${id}`, {
      json: service,
      retry: 0,
    }),
  );
}

export async function setServiceAvailability(
  id: number,
  isAvailable: boolean,
): Promise<Service> {
  return unwrap(
    await apiPatch<ApiEnvelope<Service>>(`${SERVICE_PATH}/${id}/availability`, {
      json: { isAvailable },
      retry: 0,
    }),
  );
}

export async function deleteService(id: number): Promise<{ message: string }> {
  return unwrap(
    await apiDelete<ApiEnvelope<{ message: string }>>(`${SERVICE_PATH}/${id}`, {
      retry: 0,
    }),
  );
}
