import '../styles/auth.css';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { AuthError } from '../services/authService';

interface FieldErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

function Register() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { register } = useAuth();
  const { push } = useNotifications();
  const navigate = useNavigate();

  function validate() {
    const next: FieldErrors = {};
    if (!firstName.trim()) next.firstName = 'First name is required';
    else if (firstName.trim().length > 50) next.firstName = 'Must be under 50 characters';
    if (!lastName.trim()) next.lastName = 'Last name is required';
    else if (lastName.trim().length > 50) next.lastName = 'Must be under 50 characters';
    if (!email.trim()) next.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(email)) next.email = 'Enter a valid email address';
    if (!password) next.password = 'Password is required';
    else if (password.length < 8) next.password = 'Password must be at least 8 characters';
    if (!confirmPassword) next.confirmPassword = 'Please confirm your password';
    else if (confirmPassword !== password) next.confirmPassword = 'Passwords do not match';
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    if (!validate()) return;

    setSubmitting(true);
    try {
      const user = await register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        password,
      });
      push({ message: `Welcome to QueueSmart, ${user.firstName}`, type: 'status_change' });
      navigate('/', { replace: true });
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
      <div className="auth__card auth__card--wide">
        <header className="auth__header">
          <h1 className="auth__title">Create your account</h1>
          <p className="auth__subtitle">Register to book and track your appointments.</p>
        </header>

        {formError && (
          <p className="auth__alert" role="alert">
            {formError}
          </p>
        )}

        <form className="auth__form" onSubmit={handleSubmit} noValidate>
          <div className="auth__row">
            <div className="auth__field">
              <label className="auth__label" htmlFor="firstName">
                First name
              </label>
              <input
                id="firstName"
                className={`auth__input${fieldErrors.firstName ? ' auth__input--invalid' : ''}`}
                type="text"
                autoComplete="given-name"
                placeholder="Jamie"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                aria-invalid={Boolean(fieldErrors.firstName)}
                aria-describedby={fieldErrors.firstName ? 'firstName-error' : undefined}
              />
              {fieldErrors.firstName && (
                <span className="auth__error" id="firstName-error">
                  {fieldErrors.firstName}
                </span>
              )}
            </div>

            <div className="auth__field">
              <label className="auth__label" htmlFor="lastName">
                Last name
              </label>
              <input
                id="lastName"
                className={`auth__input${fieldErrors.lastName ? ' auth__input--invalid' : ''}`}
                type="text"
                autoComplete="family-name"
                placeholder="Win"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                aria-invalid={Boolean(fieldErrors.lastName)}
                aria-describedby={fieldErrors.lastName ? 'lastName-error' : undefined}
              />
              {fieldErrors.lastName && (
                <span className="auth__error" id="lastName-error">
                  {fieldErrors.lastName}
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
              className={`auth__input${fieldErrors.email ? ' auth__input--invalid' : ''}`}
              type="email"
              autoComplete="email"
              placeholder="jamie@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? 'email-error' : undefined}
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
              className={`auth__input${fieldErrors.password ? ' auth__input--invalid' : ''}`}
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? 'password-error' : undefined}
            />
            {fieldErrors.password && (
              <span className="auth__error" id="password-error">
                {fieldErrors.password}
              </span>
            )}
          </div>

          <div className="auth__field">
            <label className="auth__label" htmlFor="confirmPassword">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              className={`auth__input${fieldErrors.confirmPassword ? ' auth__input--invalid' : ''}`}
              type="password"
              autoComplete="new-password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              aria-invalid={Boolean(fieldErrors.confirmPassword)}
              aria-describedby={fieldErrors.confirmPassword ? 'confirmPassword-error' : undefined}
            />
            {fieldErrors.confirmPassword && (
              <span className="auth__error" id="confirmPassword-error">
                {fieldErrors.confirmPassword}
              </span>
            )}
          </div>

          <button type="submit" className="auth__submit" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Create account'}
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
