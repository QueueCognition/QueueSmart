import type {
  AuthSession,
  LoginCredentials,
  PasswordResetResult,
  RegisterDetails,
  User,
} from "../types/auth";
import { AuthError } from "./authError";

export { AuthError } from "./authError";

export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL;

const AUTH_BASE_URL = `${API_BASE_URL}/auth`;

interface ErrorPayload {
  message?: string;
}

function withJsonHeaders(init: RequestInit): RequestInit {
  const headers = new Headers(init.headers);
  if (init.body !== undefined) headers.set("Content-Type", "application/json");

  return { ...init, headers };
}

async function readErrorMessage(response: Response): Promise<string> {
  const fallback = "Something went wrong. Please try again.";

  try {
    const payload = (await response.json()) as ErrorPayload;
    return payload.message?.trim() || fallback;
  } catch {
    return fallback;
  }
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${AUTH_BASE_URL}${path}`, withJsonHeaders(init));
  } catch {
    throw new AuthError("Unable to reach the server. Please try again.", 0);
  }

  if (!response.ok) {
    throw new AuthError(await readErrorMessage(response), response.status);
  }

  return (await response.json()) as T;
}

export async function login(
  credentials: LoginCredentials,
): Promise<AuthSession> {
  return request<AuthSession>("/login", {
    method: "POST",
    body: JSON.stringify({
      email: credentials.email,
      password: credentials.password,
    }),
  });
}

export async function register(details: RegisterDetails): Promise<AuthSession> {
  return request<AuthSession>("/register", {
    method: "POST",
    body: JSON.stringify(details),
  });
}

export async function requestPasswordReset(
  email: string,
): Promise<PasswordResetResult> {
  return request<PasswordResetResult>("/password-reset", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function logout(): Promise<void> {
  await fetch(`${AUTH_BASE_URL}/logout`, { method: "POST" }).catch(
    () => undefined,
  );
}

export async function fetchSessionUser(token: string): Promise<User> {
  const session = await request<{ user: User }>("/session", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  return session.user;
}
