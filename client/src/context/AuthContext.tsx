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
import { AuthError } from "../services/authError";

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  sessionInvalidated: boolean;
  login: (credentials: LoginCredentials) => Promise<User>;
  register: (details: RegisterDetails) => Promise<User>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredSession(): AuthSession | null {
  const raw =
    localStorage.getItem(authService.AUTH_SESSION_STORAGE_KEY) ??
    sessionStorage.getItem(authService.AUTH_SESSION_STORAGE_KEY);
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
    authService.AUTH_SESSION_STORAGE_KEY,
    JSON.stringify(session),
  );
}

function clearStoredSession() {
  localStorage.removeItem(authService.AUTH_SESSION_STORAGE_KEY);
  sessionStorage.removeItem(authService.AUTH_SESSION_STORAGE_KEY);
}

function storedSessionIsPersistent(): boolean {
  return localStorage.getItem(authService.AUTH_SESSION_STORAGE_KEY) !== null;
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

    authService
      .fetchSessionUser(token)
      .then((freshUser) => {
        if (cancelled) return;

        const nextSession: AuthSession = { ...session, user: freshUser };
        persistSession(nextSession, storedSessionIsPersistent());
        setSession(nextSession);
        setVerifiedToken(token);
      })
      .catch((error: unknown) => {
        if (cancelled) return;

        if (!(error instanceof AuthError) || error.status !== 401) {
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

  const updateUser = useCallback(
    (updates: Partial<User>) => {
      if (!session) return;

      const nextSession: AuthSession = {
        ...session,
        user: { ...session.user, ...updates },
      };
      persistSession(nextSession, storedSessionIsPersistent());
      setSession(nextSession);
    },
    [session],
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
      updateUser,
    }),
    [
      session,
      isInitializing,
      sessionInvalidated,
      login,
      register,
      logout,
      updateUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
