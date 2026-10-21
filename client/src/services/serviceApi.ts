
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

const API_URL = 'http://localhost:3000/api/services'

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