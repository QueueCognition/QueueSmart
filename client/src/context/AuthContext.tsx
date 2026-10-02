import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import type {
  AuthSession,
  LoginCredentials,
  RegisterDetails,
  User,
} from "../types/auth";
import * as authService from "../services/authService";

const STORAGE_KEY = "queuesmart.auth.session";

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  sessionInvalidated: boolean;
  login: (credentials: LoginCredentials) => Promise<User>;
  register: (details: RegisterDetails) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredSession(): AuthSession | null {
  const raw =
    localStorage.getItem(STORAGE_KEY) ?? sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const session = JSON.parse(raw) as AuthSession;
    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      clearStoredSession();
      return null;
    }
    return session;
  } catch {
    clearStoredSession();
    return null;
  }
}

function persistSession(session: AuthSession, remember: boolean) {
  clearStoredSession();
  (remember ? localStorage : sessionStorage).setItem(
    STORAGE_KEY,
    JSON.stringify(session),
  );
}

function clearStoredSession() {
  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() =>
    readStoredSession(),
  );
  const [verifiedToken, setVerifiedToken] = useState<string | null>(null);
  const [sessionInvalidated, setSessionInvalidated] = useState(false);
  const navigate = useNavigate();

  const isInitializing = session !== null && verifiedToken !== session.token;

  useEffect(() => {
    if (!session) return;
    if (verifiedToken === session.token) return;

    const token = session.token;
    let cancelled = false;

    authService.verifySessionBinding(session).then((isValid) => {
      if (cancelled) return;

      if (isValid) {
        setVerifiedToken(token);
        return;
      }

      clearStoredSession();
      setSession(null);
      setVerifiedToken(null);
      setSessionInvalidated(true);
      navigate("/login", { replace: true });
    });

    return () => {
      cancelled = true;
    };
  }, [session, verifiedToken, navigate]);

  const applySession = useCallback(
    (nextSession: AuthSession, remember: boolean) => {
      persistSession(nextSession, remember);
      setSessionInvalidated(false);
      setVerifiedToken(nextSession.token);
      setSession(nextSession);
    },
    [],
  );

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      const nextSession = await authService.login(credentials);
      applySession(nextSession, credentials.remember);
      return nextSession.user;
    },
    [applySession],
  );

  const register = useCallback(
    async (details: RegisterDetails) => {
      const nextSession = await authService.register(details);
      applySession(nextSession, true);
      return nextSession.user;
    },
    [applySession],
  );

  const logout = useCallback(() => {
    void authService.logout();
    clearStoredSession();
    setSession(null);
    setVerifiedToken(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      isAuthenticated: session !== null,
      isInitializing,
      sessionInvalidated,
      login,
      register,
      logout,
    }),
    [session, isInitializing, sessionInvalidated, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
