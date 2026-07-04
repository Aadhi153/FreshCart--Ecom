import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Eye, EyeOff, Leaf, Lock, Mail } from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider';

interface AuthLocationState {
  from?: {
    pathname?: string;
  };
}

export default function Auth() {
  const { session, signIn, signUp, signInWithGoogle, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as AuthLocationState | null)?.from?.pathname || '/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
const [isSignUp, setIsSignUp] = useState(false);

  useEffect(() => {
    if (session) {
      navigate(from, { replace: true });
    }
  }, [from, navigate, session]);

  if (!loading && session) {
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      if (isSignUp) {
        await signUp(email.trim(), password);
      } else {
        await signIn(email.trim(), password);
      }
      navigate(from, { replace: true });
    } catch (authError) {
      const message = authError instanceof Error ? authError.message : 'Authentication failed.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
}
  async function handleGoogle() {
    setSubmitting(true);
    setError('');
    try {
      await signInWithGoogle();
      navigate(from, { replace: true });
    } catch (googleError) {
      const message = googleError instanceof Error ? googleError.message : 'Google sign-in failed.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-backdrop" aria-hidden="true">
        <span className="auth-mesh-orb auth-mesh-orb-one" />
        <span className="auth-mesh-orb auth-mesh-orb-two" />
        <span className="auth-mesh-orb auth-mesh-orb-three" />
        <span className="auth-grid-glow" />
      </div>
      <section className="auth-shell">
        <div className="auth-brand-panel">
          <div className="auth-logo">
            <Leaf size={28} />
          </div>
          <div>
            <p className="auth-kicker">FreshCart</p>
            <h1>Admin Portal</h1>
            <p className="auth-copy">
              Manage orders, inventory, customers, and store settings from one protected workspace.
            </p>
          </div>
        </div>

        <form className="auth-card spatial-card" onSubmit={handleSubmit}>
          <div>
            <p className="auth-kicker">Secure access</p>
            <h2>{isSignUp ? 'Sign up' : 'Sign in'}</h2>
          </div>

          {error && <div className="auth-alert">{error}</div>}

          <label className="auth-field">
            <span>Email address</span>
            <div className="auth-input-wrap">
              <Mail size={16} />
              <input
                autoComplete="email"
                className="form-input"
                disabled={submitting}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@freshcart.com"
                required
                type="email"
                value={email}
              />
            </div>
          </label>

          <label className="auth-field">
            <span>Password</span>
            <div className="auth-input-wrap">
              <Lock size={16} />
              <input
                autoComplete="current-password"
                className="form-input"
                disabled={submitting}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter password"
                required
                type={showPassword ? 'text' : 'password'}
                value={password}
              />
              <button
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="auth-icon-button"
                disabled={submitting}
                onClick={() => setShowPassword((current) => !current)}
                type="button"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>

            <button type="button" className="auth-google" disabled={submitting} onClick={handleGoogle}>{submitting ? (isSignUp ? 'Signing up...' : 'Signing in...') : 'Sign in with Google'}</button>
            <button className="btn-primary auth-submit" disabled={submitting} type="submit">
              {submitting ? (isSignUp ? 'Signing up...' : 'Signing in...') : (isSignUp ? 'Sign up' : 'Sign in')}
            </button>
            <div className="auth-toggle">
              {isSignUp ? (
                <>
                  <span>Already have an account?</span>
                  <button type="button" className="btn-secondary auth-toggle-btn" onClick={() => setIsSignUp(false)} disabled={submitting}>Sign in</button>
                </>
              ) : (
                <>
                  <span>Don't have an account?</span>
                  <button type="button" className="btn-secondary auth-toggle-btn" onClick={() => setIsSignUp(true)} disabled={submitting}>Sign up</button>
                </>
              )}
            </div>
        </form>
      </section>
    </main>
  );
}
