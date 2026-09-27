import '../styles/auth.css';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthError, requestPasswordReset } from '../services/authService';

function submitLabel(submitting: boolean, cooldown: number) {
  if (submitting) return 'Sending…';
  if (cooldown > 0) return `Resend in ${cooldown}s`;
  return 'Send reset link';
}

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [formError, setFormError] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  function validate() {
    if (!email.trim()) {
      setFieldError('Email is required');
      return false;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setFieldError('Enter a valid email address');
      return false;
    }
    setFieldError('');
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    setSentTo('');
    if (!validate()) return;

    setSubmitting(true);
    try {
      const result = await requestPasswordReset(email.trim());
      setSentTo(email.trim());
      setCooldown(result.retryAfterSeconds);
    } catch (error) {
      setFormError(
        error instanceof AuthError ? error.message : 'Something went wrong. Please try again.'
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
            Enter your account email and we'll send you a link to choose a new password.
          </p>
        </header>

        {sentTo && (
          <p className="auth__alert auth__alert--success" role="status">
            If an account exists for <strong>{sentTo}</strong>, we've sent a password reset link.
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
              className={`auth__input${fieldError ? ' auth__input--invalid' : ''}`}
              type="email"
              autoComplete="email"
              placeholder="jamie@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(fieldError)}
              aria-describedby={fieldError ? 'email-error' : undefined}
            />
            {fieldError && (
              <span className="auth__error" id="email-error">
                {fieldError}
              </span>
            )}
          </div>

          <button type="submit" className="auth__submit" disabled={submitting || cooldown > 0}>
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
