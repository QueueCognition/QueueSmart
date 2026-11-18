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
import {
  clearSession,
  persistSession,
  readSession,
  sessionIsPersistent,
} from "../services/session";

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  sessionNotice: string | null;
  login: (credentials: LoginCredentials) => Promise<User>;
  register: (details: RegisterDetails) => Promise<User>;
  logout: (notice?: string) => void;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() =>
    readSession(),
  );
  const [verifiedToken, setVerifiedToken] = useState<string | null>(null);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);
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
        persistSession(nextSession, sessionIsPersistent());
        setSession(nextSession);
        setVerifiedToken(token);
      })
      .catch((error: unknown) => {
        if (cancelled) return;

        if (!(error instanceof AuthError) || error.status !== 401) {
          setVerifiedToken(token);
          return;
        }

        clearSession();
        setSession(null);
        setVerifiedToken(null);
        setSessionNotice(error.message);
        navigate("/login", { replace: true });
      });

    return () => {
      cancelled = true;
    };
  }, [session, verifiedToken, navigate]);

  const applySession = useCallback(
    (nextSession: AuthSession, remember: boolean) => {
      persistSession(nextSession, remember);
      setSessionNotice(null);
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
      persistSession(nextSession, sessionIsPersistent());
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

  const logout = useCallback((notice?: string) => {
    void authService.logout();
    clearSession();
    setSession(null);
    setVerifiedToken(null);
    setSessionNotice(notice ?? null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      isAuthenticated: session !== null,
      isInitializing,
      sessionNotice,
      login,
      register,
      logout,
      updateUser,
    }),
    [
      session,
      isInitializing,
      sessionNotice,
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
