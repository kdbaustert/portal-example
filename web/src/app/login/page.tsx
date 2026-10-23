'use client';

import { Suspense, useEffect, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { errorMessage } from '@/lib/api';

const demoAccounts = [
  { label: 'Client — Acme Corporation', email: 'jane@acme.test' },
  { label: 'Client — Globex Industries', email: 'hank@globex.test' },
  { label: 'Administrator', email: 'admin@example.com' },
];

function LoginForm() {
  const { user, login, loading } = useAuth();
  const router = useRouter();
  const next = useSearchParams().get('next') || '/';
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace(safeNext);
  }, [user, loading, router, safeNext]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email, password, remember);
      router.replace(safeNext);
    } catch (err) {
      setError(errorMessage(err, 'Sign-in failed.'));
      setBusy(false);
    }
  };

  return (
    <form className="login-form" onSubmit={submit}>
      <div className="d-flex align-items-center gap-2 mb-4">
        <span className="brand-mark">
          <i className="bi bi-stack" />
        </span>
        <span className="fw-bold text-ink fs-5">Portal Example</span>
      </div>

      <h1 className="h3 mb-1">Sign in</h1>
      <p className="text-muted mb-4">Use the email your project contact set up for you.</p>

      {error && <div className="alert alert-danger py-2">{error}</div>}

      <label className="form-label" htmlFor="email">
        Email
      </label>
      <input id="email" type="email" className="form-control mb-3" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />

      <label className="form-label" htmlFor="password">
        Password
      </label>
      <input
        id="password"
        type="password"
        className="form-control mb-3"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <div className="form-check mb-4">
        <input id="remember" type="checkbox" className="form-check-input" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
        <label className="form-check-label" htmlFor="remember">
          Keep me signed in
        </label>
      </div>

      <button className="btn btn-primary w-100 py-2" disabled={busy}>
        {busy ? 'Signing in…' : 'Sign in'}
      </button>

      {process.env.NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS === 'true' && (
        <div className="demo-accounts mt-4 pt-4 border-top">
          <div className="small-caps mb-2">Demo accounts · password “password”</div>
          <div className="list-group">
            {demoAccounts.map((a) => (
              <button
                type="button"
                key={a.email}
                className="list-group-item list-group-item-action py-2"
                onClick={() => {
                  setEmail(a.email);
                  setPassword('password');
                }}
              >
                <div className="small fw-semibold">{a.label}</div>
                <div className="small text-muted">{a.email}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="login-page">
      <aside className="login-aside">
        <div className="d-flex align-items-center gap-2 text-white fw-bold">
          <span className="brand-mark">
            <i className="bi bi-stack" />
          </span>
          Portal Example
        </div>
        <div>
          <h2>Every file you share, and every version of it.</h2>
          <div className="feature">
            <i className="bi bi-layers" />
            <span>Upload a new revision and the old one stays one click away.</span>
          </div>
          <div className="feature">
            <i className="bi bi-arrow-counterclockwise" />
            <span>Restore any earlier version without losing the history.</span>
          </div>
          <div className="feature">
            <i className="bi bi-shield-check" />
            <span>Private to your organisation, with a full record of who did what.</span>
          </div>
        </div>
        <small style={{ opacity: 0.5 }}>© {new Date().getFullYear()} Portal Example</small>
      </aside>
      <div className="login-form-wrap">
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
