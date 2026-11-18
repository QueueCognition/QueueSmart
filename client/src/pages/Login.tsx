import "../styles/auth.css";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import clsx from "clsx";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import { AuthError } from "../services/authService";
import { loginSchema, type LoginValues } from "../validation/schemas";

function Login() {
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { login, sessionNotice } = useAuth();
  const { push } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();

  const locationState = location.state as { from?: string } | null;
  const redirectTo = locationState?.from ?? "/";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", remember: false },
  });

  async function onSubmit(values: LoginValues) {
    setFormError("");
    setSubmitting(true);
    try {
      const user = await login({
        email: values.email,
        password: values.password,
        remember: values.remember,
      });
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

        {sessionNotice && (
          <p className="auth__alert auth__alert--warning" role="status">
            {sessionNotice}
          </p>
        )}

        {formError && (
          <p className="auth__alert" role="alert">
            {formError}
          </p>
        )}

        <form
          className="auth__form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          <div className="auth__field">
            <label className="auth__label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              className={clsx("auth__input", {
                "auth__input--invalid": errors.email,
              })}
              type="email"
              autoComplete="email"
              placeholder="jamie@example.com"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "email-error" : undefined}
              {...register("email")}
            />
            {errors.email && (
              <span className="auth__error" id="email-error">
                {errors.email.message}
              </span>
            )}
          </div>

          <div className="auth__field">
            <label className="auth__label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              className={clsx("auth__input", {
                "auth__input--invalid": errors.password,
              })}
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? "password-error" : undefined}
              {...register("password")}
            />
            {errors.password && (
              <span className="auth__error" id="password-error">
                {errors.password.message}
              </span>
            )}
          </div>

          <div className="auth__actions">
            <label className="auth__checkbox">
              <input type="checkbox" {...register("remember")} />
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
