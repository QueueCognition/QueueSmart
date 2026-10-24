import type { Service } from "../types/queue";

type HasDuration = Pick<Service, "expectedDuration">;

export function estimateWaitMinutes(
  position: number,
  service: HasDuration,
): number {
  if (!Number.isInteger(position) || position < 1) {
    throw new RangeError("position must be a positive whole number");
  }
  return position * service.expectedDuration;
}

export function estimateWaitForNewJoiner(
  waitingCount: number,
  service: HasDuration,
): number {
  return estimateWaitMinutes(waitingCount + 1, service);
}
