
import { API_BASE_URL } from "./authService";

export type Priority = 'low' | 'medium' | 'high'

export type Service = {
  id: number
  name: string
  description: string
  duration: number
  priority: Priority
}

type ApiResponse<T> = {
  success: boolean
  data?: T
  errors?: string[]
}

const API_URL = `${API_BASE_URL.replace(/\/$/, '')}/services`

async function request<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  const result = (await response.json()) as ApiResponse<T>

  if (!response.ok || !result.success) {
    throw new Error(
      result.errors?.join(' ') || 'Something went wrong.',
    )
  }

  return result.data as T
}

export function getServices(): Promise<Service[]> {
  return request<Service[]>(API_URL)
}

export function createService(
  service: Omit<Service, 'id'>,
): Promise<Service> {
  return request<Service>(API_URL, {
    method: 'POST',
    body: JSON.stringify(service),
  })
}

export function updateService(
  id: number,
  service: Omit<Service, 'id'>,
): Promise<Service> {
  return request<Service>(`${API_URL}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(service),
  })
}

export function deleteService(
  id: number,
): Promise<{ message: string }> {
  return request<{ message: string }>(`${API_URL}/${id}`, {
    method: 'DELETE',
  })
}