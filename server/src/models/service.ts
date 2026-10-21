export type Priority = 'low' | 'medium' | 'high'

export interface Service {
  id: number
  name: string
  description: string
  duration: number
  priority: Priority
}