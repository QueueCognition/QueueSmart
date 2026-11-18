import {
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
} from "date-fns";

export function timeAgo(iso: string): string {
  const then = new Date(iso);
  const now = new Date();

  const minutes = differenceInMinutes(now, then);
  if (minutes < 1) return "Just now";

  if (minutes < 60) return `${minutes} min ago`;

  const hours = differenceInHours(now, then);
  if (hours < 24) return `${hours} hr ago`;

  const days = differenceInDays(now, then);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}
