import type {
  AuthSession,
  LoginCredentials,
  PasswordResetResult,
  ProfileUser,
  RegisterDetails,
  User,
} from "../types/auth";
import { apiGet, apiPatch, apiPost } from "./apiClient";
import { AUTH_SESSION_STORAGE_KEY } from "./session";

export { AuthError } from "./apiError";
export { AUTH_SESSION_STORAGE_KEY };

const AUTH_PATH = "auth";

export async function login(
  credentials: LoginCredentials,
): Promise<AuthSession> {
  return apiPost<AuthSession>(`${AUTH_PATH}/login`, {
    json: {
      email: credentials.email,
      password: credentials.password,
    },
    retry: 0,
  });
}

export async function register(details: RegisterDetails): Promise<AuthSession> {
  return apiPost<AuthSession>(`${AUTH_PATH}/register`, {
    json: details,
    retry: 0,
  });
}

export async function requestPasswordReset(
  email: string,
): Promise<PasswordResetResult> {
  return apiPost<PasswordResetResult>(`${AUTH_PATH}/password-reset`, {
    json: { email },
    retry: 0,
  });
}

export async function logout(): Promise<void> {
  await apiPost<void>(`${AUTH_PATH}/logout`, { retry: 0 }).catch(
    () => undefined,
  );
}

export async function fetchSessionUser(token: string): Promise<User> {
  const session = await apiGet<{ user: User }>(`${AUTH_PATH}/session`, {
    headers: { Authorization: `Bearer ${token}` },
    retry: 0,
  });

  return session.user;
}

export async function getProfile(): Promise<ProfileUser> {
  return apiGet<ProfileUser>(`${AUTH_PATH}/profile`);
}

export async function updateProfile(details: {
  firstName: string;
  lastName: string;
}): Promise<ProfileUser> {
  return apiPatch<ProfileUser>(`${AUTH_PATH}/profile`, { json: details });
}

export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  await apiPost<void>(`${AUTH_PATH}/password-change`, {
    json: input,
    retry: 0,
  });
}
