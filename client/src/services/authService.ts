import type { AuthSession, LoginCredentials, PasswordResetResult, RegisterDetails } from '../types/auth';
import { getClientIp } from './ipService';
import { mockLogin, mockLogout, mockRegister, mockRequestPasswordReset } from './mockAuthService';

export { AuthError } from './authError';

export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? '/api';

export async function login(credentials: LoginCredentials): Promise<AuthSession> {
  return mockLogin(credentials);
}

export async function register(details: RegisterDetails): Promise<AuthSession> {
  return mockRegister(details);
}

export async function requestPasswordReset(email: string): Promise<PasswordResetResult> {
  return mockRequestPasswordReset(email);
}

export async function logout(): Promise<void> {
  return mockLogout();
}

export async function verifySessionBinding(session: AuthSession): Promise<boolean> {
  if (!session.boundIp) return true;

  const currentIp = await getClientIp();
  if (!currentIp) return true;

  return session.boundIp === currentIp;
}
