export const PRIORITIES = ["low", "medium", "high"] as const;

export type Priority = (typeof PRIORITIES)[number];

export const PRIORITY_RANK: Record<Priority, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

export function isPriority(value: unknown): value is Priority {
  return PRIORITIES.includes(value as Priority);
}

export interface Service {
  id: number;
  name: string;
  description: string;
  duration: number;
  priority: Priority;
  isAvailable: boolean;
}
