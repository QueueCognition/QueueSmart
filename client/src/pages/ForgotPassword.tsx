import "../styles/auth.css";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import clsx from "clsx";
import { AuthError, requestPasswordReset } from "../services/authService";
import {
  forgotPasswordSchema,
  type ForgotPasswordValues,
} from "../validation/schemas";

function submitLabel(submitting: boolean, cooldown: number) {
  if (submitting) return "Sending…";
  if (cooldown > 0) return `Resend in ${cooldown}s`;
  return "Send reset link";
}

function ForgotPassword() {
  const [formError, setFormError] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  function onInvalid() {
    setFormError("");
    setSentTo("");
  }

  async function onSubmit(values: ForgotPasswordValues) {
    setFormError("");
    setSentTo("");
    setSubmitting(true);
    try {
      const result = await requestPasswordReset(values.email);
      setSentTo(values.email);
      setCooldown(result.retryAfterSeconds);
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
          <h1 className="auth__title">Reset your password</h1>
          <p className="auth__subtitle">
            Enter your account email and we'll send you a link to choose a new
            password.
          </p>
        </header>

        {sentTo && (
          <p className="auth__alert auth__alert--success" role="status">
            If an account exists for <strong>{sentTo}</strong>, we've sent a
            password reset link.
          </p>
        )}

        {formError && (
          <p className="auth__alert" role="alert">
            {formError}
          </p>
        )}

        <form
          className="auth__form"
          onSubmit={handleSubmit(onSubmit, onInvalid)}
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

          <button
            type="submit"
            className="auth__submit"
            disabled={submitting || cooldown > 0}
          >
            {submitLabel(submitting, cooldown)}
          </button>
        </form>

        <footer className="auth__footer">
          <Link className="auth__link" to="/login">
            Back to sign in
          </Link>
        </footer>
      </div>
    </div>
  );
}

export default ForgotPassword;
