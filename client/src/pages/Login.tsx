import "../styles/auth.css";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import { AuthError } from "../services/authService";
import {
  ADMIN_CREDENTIALS,
  DEMO_CREDENTIALS,
} from "../services/mockAuthService";

interface FieldErrors {
  email?: string;
  password?: string;
}

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { login, sessionInvalidated } = useAuth();
  const { push } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectTo = (location.state as { from?: string } | null)?.from ?? "/";

  function validate() {
    const next: FieldErrors = {};
    if (!email.trim()) next.email = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(email))
      next.email = "Enter a valid email address";
    if (!password) next.password = "Password is required";
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!validate()) return;

    setSubmitting(true);
    try {
      const user = await login({ email: email.trim(), password, remember });
      push({
        message: `Welcome back, ${user.firstName}`,
        type: "status_change",
      });
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setFormError(
        error instanceof AuthError
          ? error.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth">
      <div className="auth__card">
        <header className="auth__header">
          <h1 className="auth__title">Welcome back</h1>
          <p className="auth__subtitle">
            Sign in to manage your queues and appointments.
          </p>
        </header>

        {sessionInvalidated && (
          <p className="auth__alert auth__alert--warning" role="status">
            Your session ended because your network address changed. Please sign
            in again.
          </p>
        )}

        {formError && (
          <p className="auth__alert" role="alert">
            {formError}
          </p>
        )}

        <form className="auth__form" onSubmit={handleSubmit} noValidate>
          <div className="auth__field">
            <label className="auth__label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              className={`auth__input${fieldErrors.email ? " auth__input--invalid" : ""}`}
              type="email"
              autoComplete="email"
              placeholder="jamie@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? "email-error" : undefined}
            />
            {fieldErrors.email && (
              <span className="auth__error" id="email-error">
                {fieldErrors.email}
              </span>
            )}
          </div>

          <div className="auth__field">
            <label className="auth__label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              className={`auth__input${fieldErrors.password ? " auth__input--invalid" : ""}`}
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={
                fieldErrors.password ? "password-error" : undefined
              }
            />
            {fieldErrors.password && (
              <span className="auth__error" id="password-error">
                {fieldErrors.password}
              </span>
            )}
          </div>

          <div className="auth__actions">
            <label className="auth__checkbox">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <span>Remember me</span>
            </label>

            <Link className="auth__link" to="/forgot-password">
              Forgot password?
            </Link>
          </div>

          <button type="submit" className="auth__submit" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="auth__hint">
          Regular User: <strong>{DEMO_CREDENTIALS.email}</strong> /{" "}
          <strong>{DEMO_CREDENTIALS.password}</strong>
          <br />
          Admin User: <strong>{ADMIN_CREDENTIALS.email}</strong> /{" "}
          <strong>{ADMIN_CREDENTIALS.password}</strong>
        </p>

        <footer className="auth__footer">
          <span>New to QueueSmart?</span>
          <Link
            className="auth__footer-button auth__footer-button--primary"
            to="/register"
          >
            Create an account
          </Link>
          <Link
            className="auth__footer-button auth__footer-button--secondary"
            to="/schedule/join-queue"
          >
            Continue as guest
          </Link>
        </footer>
      </div>
    </div>
  );
}

export default Login;
