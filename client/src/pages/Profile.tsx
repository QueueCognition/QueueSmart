import "../styles/auth.css";
import "../styles/dashboard.css";
import "../styles/profile.css";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import {
  AuthError,
  changePassword,
  getProfile,
  updateProfile,
} from "../services/authService";
import type { UserRole } from "../types/auth";

interface DetailsErrors {
  firstName?: string;
  lastName?: string;
}

interface PasswordErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

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
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [detailsErrors, setDetailsErrors] = useState<DetailsErrors>({});
  const [detailsFormError, setDetailsFormError] = useState("");
  const [detailsSuccess, setDetailsSuccess] = useState("");
  const [savingDetails, setSavingDetails] = useState(false);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [profileError, setProfileError] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<PasswordErrors>({});
  const [passwordFormError, setPasswordFormError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    let active = true;

    getProfile()
      .then((profile) => {
        if (!active) return;

        setCreatedAt(profile.createdAt);
        setFirstName(profile.firstName);
        setLastName(profile.lastName);
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
  }, [logout]);

  function validateDetails() {
    const next: DetailsErrors = {};
    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();

    if (!trimmedFirst) next.firstName = "First name is required";
    else if (trimmedFirst.length > 50) {
      next.firstName = "Must be under 50 characters";
    }

    if (!trimmedLast) next.lastName = "Last name is required";
    else if (trimmedLast.length > 50) {
      next.lastName = "Must be under 50 characters";
    }

    setDetailsErrors(next);
    return Object.keys(next).length === 0;
  }

  function validatePassword() {
    const next: PasswordErrors = {};

    if (!currentPassword) {
      next.currentPassword = "Current password is required";
    }

    if (!newPassword) {
      next.newPassword = "Password is required";
    } else if (newPassword.length < 8) {
      next.newPassword = "Password must be at least 8 characters";
    } else if (currentPassword && newPassword === currentPassword) {
      next.newPassword =
        "New password must be different from your current password";
    }

    if (!confirmPassword) {
      next.confirmPassword = "Please confirm your password";
    } else if (confirmPassword !== newPassword) {
      next.confirmPassword = "Passwords do not match";
    }

    setPasswordErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleDetailsSubmit(event: React.FormEvent) {
    event.preventDefault();
    setDetailsFormError("");
    setDetailsSuccess("");
    if (!validateDetails()) return;

    setSavingDetails(true);
    try {
      const updated = await updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });

      updateUser({
        firstName: updated.firstName,
        lastName: updated.lastName,
      });
      setCreatedAt(updated.createdAt);
      setFirstName(updated.firstName);
      setLastName(updated.lastName);
      setDetailsSuccess("Profile updated successfully");
      push({ message: "Profile updated", type: "status_change" });
    } catch (error) {
      if (error instanceof AuthError) {
        if (error.status === 401) {
          logout();
          return;
        }

        setDetailsErrors({
          firstName: error.fieldErrors.firstName,
          lastName: error.fieldErrors.lastName,
        });
        setDetailsFormError(error.message);
        return;
      }

      setDetailsFormError("Something went wrong. Please try again.");
    } finally {
      setSavingDetails(false);
    }
  }

  async function handlePasswordSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPasswordFormError("");
    setPasswordSuccess("");
    if (!validatePassword()) return;

    setChangingPassword(true);
    try {
      await changePassword({ currentPassword, newPassword });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess(
        "Password updated successfully. You are still signed in.",
      );
      push({ message: "Password updated", type: "status_change" });
    } catch (error) {
      if (error instanceof AuthError) {
        if (error.status === 401) {
          logout();
          return;
        }

        setPasswordErrors({
          currentPassword: error.fieldErrors.currentPassword,
          newPassword: error.fieldErrors.newPassword,
        });
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

          <form className="auth__form" onSubmit={handleDetailsSubmit} noValidate>
            <div className="auth__row">
              <div className="auth__field">
                <label className="auth__label" htmlFor="firstName">
                  First name
                </label>
                <input
                  id="firstName"
                  className={`auth__input${detailsErrors.firstName ? " auth__input--invalid" : ""}`}
                  type="text"
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  aria-invalid={Boolean(detailsErrors.firstName)}
                  aria-describedby={
                    detailsErrors.firstName ? "firstName-error" : undefined
                  }
                />
                {detailsErrors.firstName && (
                  <span className="auth__error" id="firstName-error">
                    {detailsErrors.firstName}
                  </span>
                )}
              </div>

              <div className="auth__field">
                <label className="auth__label" htmlFor="lastName">
                  Last name
                </label>
                <input
                  id="lastName"
                  className={`auth__input${detailsErrors.lastName ? " auth__input--invalid" : ""}`}
                  type="text"
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  aria-invalid={Boolean(detailsErrors.lastName)}
                  aria-describedby={
                    detailsErrors.lastName ? "lastName-error" : undefined
                  }
                />
                {detailsErrors.lastName && (
                  <span className="auth__error" id="lastName-error">
                    {detailsErrors.lastName}
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

          {passwordSuccess && (
            <div className="auth__alert auth__alert--success" role="status">
              {passwordSuccess}
            </div>
          )}

          <form className="auth__form" onSubmit={handlePasswordSubmit} noValidate>
            <div className="auth__field">
              <label className="auth__label" htmlFor="currentPassword">
                Current password
              </label>
              <input
                id="currentPassword"
                className={`auth__input${passwordErrors.currentPassword ? " auth__input--invalid" : ""}`}
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                aria-invalid={Boolean(passwordErrors.currentPassword)}
                aria-describedby={
                  passwordErrors.currentPassword
                    ? "currentPassword-error"
                    : undefined
                }
              />
              {passwordErrors.currentPassword && (
                <span className="auth__error" id="currentPassword-error">
                  {passwordErrors.currentPassword}
                </span>
              )}
            </div>

            <div className="auth__field">
              <label className="auth__label" htmlFor="newPassword">
                New password
              </label>
              <input
                id="newPassword"
                className={`auth__input${passwordErrors.newPassword ? " auth__input--invalid" : ""}`}
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                aria-invalid={Boolean(passwordErrors.newPassword)}
                aria-describedby={
                  passwordErrors.newPassword ? "newPassword-error" : undefined
                }
              />
              {passwordErrors.newPassword && (
                <span className="auth__error" id="newPassword-error">
                  {passwordErrors.newPassword}
                </span>
              )}
            </div>

            <div className="auth__field">
              <label className="auth__label" htmlFor="confirmPassword">
                Confirm new password
              </label>
              <input
                id="confirmPassword"
                className={`auth__input${passwordErrors.confirmPassword ? " auth__input--invalid" : ""}`}
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                aria-invalid={Boolean(passwordErrors.confirmPassword)}
                aria-describedby={
                  passwordErrors.confirmPassword
                    ? "confirmPassword-error"
                    : undefined
                }
              />
              {passwordErrors.confirmPassword && (
                <span className="auth__error" id="confirmPassword-error">
                  {passwordErrors.confirmPassword}
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
