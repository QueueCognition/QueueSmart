import { API_BASE_URL, getStoredAccessToken } from "./authService";

export type Priority = "low" | "medium" | "high";

export type Service = {
  id: number;
  name: string;
  description: string;
  duration: number;
  priority: Priority;
  isAvailable: boolean;
};

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  errors?: string[];
};

const API_URL = `${API_BASE_URL.replace(/\/$/, "")}/services`;

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const token = getStoredAccessToken();

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  const result = (await response.json()) as ApiResponse<T>;

  if (!response.ok || !result.success) {
    throw new Error(result.errors?.join(" ") || "Something went wrong.");
  }

  return result.data as T;
}

export function getServices(): Promise<Service[]> {
  return request<Service[]>(API_URL);
}

export function createService(
  service: Omit<Service, "id" | "isAvailable">,
): Promise<Service> {
  return request<Service>(API_URL, {
    method: "POST",
    body: JSON.stringify(service),
  });
}

export function updateService(
  id: number,
  service: Omit<Service, "id" | "isAvailable">,
): Promise<Service> {
  return request<Service>(`${API_URL}/${id}`, {
    method: "PUT",
    body: JSON.stringify(service),
  });
}

export function setServiceAvailability(
  id: number,
  isAvailable: boolean,
): Promise<Service> {
  return request<Service>(`${API_URL}/${id}/availability`, {
    method: "PATCH",
    body: JSON.stringify({ isAvailable }),
  });
}

export function deleteService(id: number): Promise<{ message: string }> {
  return request<{ message: string }>(`${API_URL}/${id}`, {
    method: "DELETE",
  });
}
