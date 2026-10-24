import type { Notification } from "../types/queue";
import { getStoredAccessToken } from "./authService";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "/api"
).replace(/\/$/, "");

const NOTIFICATION_URL = `${API_BASE_URL}/notifications`;

export async function getNotifications(): Promise<Notification[]> {
  const headers = new Headers();
  const token = getStoredAccessToken();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;

  try {
    response = await fetch(NOTIFICATION_URL, { headers });
  } catch {
    throw new Error("Unable to reach the server. Please try again.");
  }

  if (!response.ok) {
    throw new Error(
      `Failed to load notifications (status ${response.status}).`,
    );
  }

  return (await response.json()) as Notification[];
}