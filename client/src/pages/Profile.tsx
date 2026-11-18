import "../styles/auth.css";
import "../styles/dashboard.css";
import "../styles/profile.css";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import clsx from "clsx";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import {
  AuthError,
  changePassword,
  getProfile,
  updateProfile,
} from "../services/authService";
import {
  profileDetailsSchema,
  profilePasswordSchema,
  type ProfileDetailsValues,
  type ProfilePasswordValues,
} from "../validation/schemas";
import type { UserRole } from "../types/auth";

const ROLE_LABELS: Record<UserRole, string> = {
  user: "Member",
  staff: "Staff",
  admin: "Administrator",
};

function formatMemberSince(value: string | null): string {
  if (!value) return "—";

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
}

function Profile() {
  const { user, updateUser, logout } = useAuth();
  const { push } = useNotifications();
  const [detailsFormError, setDetailsFormError] = useState("");
  const [detailsSuccess, setDetailsSuccess] = useState("");
  const [savingDetails, setSavingDetails] = useState(false);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [profileError, setProfileError] = useState("");
  const [passwordFormError, setPasswordFormError] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const {
    register: registerDetails,
    handleSubmit: handleDetailsSubmit,
    reset: resetDetails,
    setError: setDetailsError,
    formState: { errors: detailsErrors },
  } = useForm<ProfileDetailsValues>({
    resolver: zodResolver(profileDetailsSchema),
    defaultValues: {
      firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "",
    },
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    setError: setPasswordError,
    formState: { errors: passwordErrors },
  } = useForm<ProfilePasswordValues>({
    resolver: zodResolver(profilePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    let active = true;

    getProfile()
      .then((profile) => {
        if (!active) return;

        setCreatedAt(profile.createdAt);
        resetDetails({
          firstName: profile.firstName,
          lastName: profile.lastName,
        });
        setProfileError("");
      })
      .catch((error: unknown) => {
        if (!active) return;

        if (error instanceof AuthError && error.status === 401) {
          logout();
          return;
        }

        setProfileError(
          error instanceof AuthError
            ? error.message
            : "Unable to load your profile details.",
        );
      });

    return () => {
      active = false;
    };
  }, [logout, resetDetails]);

  function onDetailsInvalid() {
    setDetailsFormError("");
    setDetailsSuccess("");
  }

  async function onDetailsSubmit(values: ProfileDetailsValues) {
    setDetailsFormError("");
    setDetailsSuccess("");

    setSavingDetails(true);
    try {
      const updated = await updateProfile({
        firstName: values.firstName,
        lastName: values.lastName,
      });

      updateUser({
        firstName: updated.firstName,
        lastName: updated.lastName,
      });
      setCreatedAt(updated.createdAt);
      resetDetails({
        firstName: updated.firstName,
        lastName: updated.lastName,
      });
      setDetailsSuccess("Profile updated successfully");
      push({ message: "Profile updated", type: "status_change" });
    } catch (error) {
      if (error instanceof AuthError) {
        if (error.status === 401) {
          logout();
          return;
        }

        if (error.fieldErrors.firstName) {
          setDetailsError("firstName", {
            type: "server",
            message: error.fieldErrors.firstName,
          });
        }

        if (error.fieldErrors.lastName) {
          setDetailsError("lastName", {
            type: "server",
            message: error.fieldErrors.lastName,
          });
        }

        setDetailsFormError(error.message);
        return;
      }

      setDetailsFormError("Something went wrong. Please try again.");
    } finally {
      setSavingDetails(false);
    }
  }

  function onPasswordInvalid() {
    setPasswordFormError("");
  }

  async function onPasswordSubmit(values: ProfilePasswordValues) {
    setPasswordFormError("");

    setChangingPassword(true);
    try {
      await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });

      resetPassword();
      logout("Password updated. Please sign in again with your new password.");
    } catch (error) {
      if (error instanceof AuthError) {
        if (error.status === 401) {
          logout();
          return;
        }

        if (error.fieldErrors.currentPassword) {
          setPasswordError("currentPassword", {
            type: "server",
            message: error.fieldErrors.currentPassword,
          });
        }

        if (error.fieldErrors.newPassword) {
          setPasswordError("newPassword", {
            type: "server",
            message: error.fieldErrors.newPassword,
          });
        }

        setPasswordFormError(error.message);
        return;
      }

      setPasswordFormError("Something went wrong. Please try again.");
    } finally {
      setChangingPassword(false);
    }
  }

  if (!user) return null;

  return (
    <div className="dashboard-page profile-page">
      <header className="dashboard-header">
        <h1>My profile</h1>
        <p>Manage your account details and password.</p>
      </header>

      <div className="dashboard-grid profile-grid">
        <section className="dashboard-card">
          <h2>Personal details</h2>

          <dl className="profile-meta">
            <dt>Role</dt>
            <dd>{ROLE_LABELS[user.role]}</dd>
            <dt>Member since</dt>
            <dd>{formatMemberSince(createdAt)}</dd>
            <dt>Account ID</dt>
            <dd className="profile-meta__id">{user.id}</dd>
          </dl>

          {profileError && (
            <div className="auth__alert" role="alert">
              {profileError}
            </div>
          )}

          {detailsFormError && (
            <div className="auth__alert" role="alert">
              {detailsFormError}
            </div>
          )}

          {detailsSuccess && (
            <div className="auth__alert auth__alert--success" role="status">
              {detailsSuccess}
            </div>
          )}

          <form
            className="auth__form"
            onSubmit={handleDetailsSubmit(onDetailsSubmit, onDetailsInvalid)}
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
                    "auth__input--invalid": detailsErrors.firstName,
                  })}
                  type="text"
                  autoComplete="given-name"
                  aria-invalid={Boolean(detailsErrors.firstName)}
                  aria-describedby={
                    detailsErrors.firstName ? "firstName-error" : undefined
                  }
                  {...registerDetails("firstName")}
                />
                {detailsErrors.firstName && (
                  <span className="auth__error" id="firstName-error">
                    {detailsErrors.firstName.message}
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
                    "auth__input--invalid": detailsErrors.lastName,
                  })}
                  type="text"
                  autoComplete="family-name"
                  aria-invalid={Boolean(detailsErrors.lastName)}
                  aria-describedby={
                    detailsErrors.lastName ? "lastName-error" : undefined
                  }
                  {...registerDetails("lastName")}
                />
                {detailsErrors.lastName && (
                  <span className="auth__error" id="lastName-error">
                    {detailsErrors.lastName.message}
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
                className="auth__input profile-input--readonly"
                type="email"
                autoComplete="email"
                value={user.email}
                readOnly
                aria-describedby="email-hint"
              />
              <span className="profile-hint" id="email-hint">
                Email can't be changed.
              </span>
            </div>

            <button
              type="submit"
              className="auth__submit"
              disabled={savingDetails}
            >
              {savingDetails ? "Saving…" : "Save changes"}
            </button>
          </form>
        </section>

        <section className="dashboard-card">
          <h2>Change password</h2>

          {passwordFormError && (
            <div className="auth__alert" role="alert">
              {passwordFormError}
            </div>
          )}

          <form
            className="auth__form"
            onSubmit={handlePasswordSubmit(onPasswordSubmit, onPasswordInvalid)}
            noValidate
          >
            <div className="auth__field">
              <label className="auth__label" htmlFor="currentPassword">
                Current password
              </label>
              <input
                id="currentPassword"
                className={clsx("auth__input", {
                  "auth__input--invalid": passwordErrors.currentPassword,
                })}
                type="password"
                autoComplete="current-password"
                aria-invalid={Boolean(passwordErrors.currentPassword)}
                aria-describedby={
                  passwordErrors.currentPassword
                    ? "currentPassword-error"
                    : undefined
                }
                {...registerPassword("currentPassword")}
              />
              {passwordErrors.currentPassword && (
                <span className="auth__error" id="currentPassword-error">
                  {passwordErrors.currentPassword.message}
                </span>
              )}
            </div>

            <div className="auth__field">
              <label className="auth__label" htmlFor="newPassword">
                New password
              </label>
              <input
                id="newPassword"
                className={clsx("auth__input", {
                  "auth__input--invalid": passwordErrors.newPassword,
                })}
                type="password"
                autoComplete="new-password"
                aria-invalid={Boolean(passwordErrors.newPassword)}
                aria-describedby={
                  passwordErrors.newPassword ? "newPassword-error" : undefined
                }
                {...registerPassword("newPassword")}
              />
              {passwordErrors.newPassword && (
                <span className="auth__error" id="newPassword-error">
                  {passwordErrors.newPassword.message}
                </span>
              )}
            </div>

            <div className="auth__field">
              <label className="auth__label" htmlFor="confirmPassword">
                Confirm new password
              </label>
              <input
                id="confirmPassword"
                className={clsx("auth__input", {
                  "auth__input--invalid": passwordErrors.confirmPassword,
                })}
                type="password"
                autoComplete="new-password"
                aria-invalid={Boolean(passwordErrors.confirmPassword)}
                aria-describedby={
                  passwordErrors.confirmPassword
                    ? "confirmPassword-error"
                    : undefined
                }
                {...registerPassword("confirmPassword")}
              />
              {passwordErrors.confirmPassword && (
                <span className="auth__error" id="confirmPassword-error">
                  {passwordErrors.confirmPassword.message}
                </span>
              )}
            </div>

            <button
              type="submit"
              className="auth__submit"
              disabled={changingPassword}
            >
              {changingPassword ? "Updating…" : "Update password"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

export default Profile;
