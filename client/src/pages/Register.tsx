import "../styles/auth.css";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import clsx from "clsx";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import { AuthError } from "../services/authService";
import { registerSchema, type RegisterValues } from "../validation/schemas";

function Register() {
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { register: registerUser } = useAuth();
  const { push } = useNotifications();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  function onInvalid() {
    setFormError("");
  }

  async function onSubmit(values: RegisterValues) {
    setFormError("");
    setSubmitting(true);
    try {
      const user = await registerUser({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        password: values.password,
      });
      push({
        message:
          user.role === "admin"
            ? `Welcome to QueueSmart, ${user.firstName}. Administrator`
            : `Welcome to QueueSmart, ${user.firstName}`,
        type: "status_change",
      });
      navigate("/", { replace: true });
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
      <div className="auth__card auth__card--wide">
        <header className="auth__header">
          <h1 className="auth__title">Create your account</h1>
          <p className="auth__subtitle">
            Register to book and track your appointments.
          </p>
        </header>

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
          <div className="auth__row">
            <div className="auth__field">
              <label className="auth__label" htmlFor="firstName">
                First name
              </label>
              <input
                id="firstName"
                className={clsx("auth__input", {
                  "auth__input--invalid": errors.firstName,
                })}
                type="text"
                autoComplete="given-name"
                placeholder="Jamie"
                aria-invalid={Boolean(errors.firstName)}
                aria-describedby={
                  errors.firstName ? "firstName-error" : undefined
                }
                {...register("firstName")}
              />
              {errors.firstName && (
                <span className="auth__error" id="firstName-error">
                  {errors.firstName.message}
                </span>
              )}
            </div>

            <div className="auth__field">
              <label className="auth__label" htmlFor="lastName">
                Last name
              </label>
              <input
                id="lastName"
                className={clsx("auth__input", {
                  "auth__input--invalid": errors.lastName,
                })}
                type="text"
                autoComplete="family-name"
                placeholder="Win"
                aria-invalid={Boolean(errors.lastName)}
                aria-describedby={
                  errors.lastName ? "lastName-error" : undefined
                }
                {...register("lastName")}
              />
              {errors.lastName && (
                <span className="auth__error" id="lastName-error">
                  {errors.lastName.message}
                </span>
              )}
            </div>
          </div>

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
              autoComplete="new-password"
              placeholder="At least 8 characters"
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

          <div className="auth__field">
            <label className="auth__label" htmlFor="confirmPassword">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              className={clsx("auth__input", {
                "auth__input--invalid": errors.confirmPassword,
              })}
              type="password"
              autoComplete="new-password"
              placeholder="Re-enter your password"
              aria-invalid={Boolean(errors.confirmPassword)}
              aria-describedby={
                errors.confirmPassword ? "confirmPassword-error" : undefined
              }
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <span className="auth__error" id="confirmPassword-error">
                {errors.confirmPassword.message}
              </span>
            )}
          </div>

          <button type="submit" className="auth__submit" disabled={submitting}>
            {submitting ? "Creating account…" : "Create account"}
          </button>
        </form>

        <footer className="auth__footer">
          <span>Already have an account?</span>
          <Link className="auth__link" to="/login">
            Sign in
          </Link>
        </footer>
      </div>
    </div>
  );
}

export default Register;
