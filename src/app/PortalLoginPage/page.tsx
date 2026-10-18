'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/app/(NOBEDevOps)/utils/supabase/client';
import { safeNext } from './safeNext';

const inputStyle = {
  width: '100%',
  padding: '12px 14px',
  border: '1px solid #cbd5ce',
  borderRadius: '8px',
  outlineColor: '#31845a',
};

export default function PortalLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'forgot'>('signin');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [next, setNext] = useState('/Layer3');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const destination = safeNext(params.get('next'));
    setNext(destination);

    if (params.get('google_error')) {
      setError('Google sign in could not be completed. Please try again.');
    } else if (params.get('error') === 'link_expired') {
      if (params.get('type') === 'recovery') {
        setMode('forgot');
        setError('That password reset link has expired or has already been used. Please request a new one below.');
      } else {
        setError('That confirmation link has expired. Please request a new one.');
      }
    } else if (params.get('confirmed') === '1') {
      setMessage('All set! You can now sign in.');
    }

    // Already signed in (e.g. sent here from a page whose session check raced): skip the form.
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (data.user) router.replace(destination);
      })
      .catch(() => {});
  }, [router]);

  function switchMode(nextMode: 'signin' | 'forgot') {
    setMode(nextMode);
    setError(null);
    setMessage(null);
    setPassword('');
  }

  async function handleForgotPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const result: { error?: string; message?: string } = await response.json();

      if (!response.ok || result.error) {
        setError(result.error ?? 'Failed to send a password reset email.');
      } else {
        setMessage(result.message ?? 'Check your email for a password reset link.');
      }
    } catch (resetError) {
      console.error('Password reset request failed:', resetError);
      setError('Unable to send a reset link. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    setError(null);
    setGoogleSubmitting(true);

    try {
      const supabase = createClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/PortalLoginPage/google/callback?next=${encodeURIComponent(next)}`,
        },
      });

      if (oauthError) {
        setError(oauthError.message);
        setGoogleSubmitting(false);
      }
    } catch (oauthError) {
      console.error('Google sign-in failed:', oauthError);
      setError('Unable to start Google sign in. Please try again.');
      setGoogleSubmitting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const supabase = createClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInError || !data.user) {
        setError(signInError?.message ?? 'Unable to sign in. Please try again.');
        return;
      }

      router.replace(next);
      router.refresh();
    } catch (loginError) {
      console.error('Portal sign-in failed:', loginError);
      setError('Unable to complete sign in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '24px',
        background: 'linear-gradient(135deg, #93E9BE, #FBFBF9)',
      }}
    >
      <section
        style={{
          width: 'min(100%, 420px)',
          padding: '36px',
          border: '1px solid rgba(0, 0, 0, 0.12)',
          borderRadius: '18px',
          textAlign: 'center',
          background: 'white',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.12)',
        }}
      >
        <h1 style={{ margin: 0, color: '#202a24', fontSize: '1.8rem' }}>
          {mode === 'forgot' ? 'Reset password' : 'Welcome back'}
        </h1>
        <p style={{ margin: '10px 0 28px', color: '#5d6861' }}>
          {mode === 'forgot'
            ? 'Enter your email and we will send you a reset link'
            : 'Sign in once to reach all of your organizations'}
        </p>

        {error && (
          <p
            role="alert"
            style={{
              margin: '0 0 18px',
              padding: '12px',
              borderRadius: '8px',
              color: '#8b2525',
              background: '#fff0f0',
              textAlign: 'left',
            }}
          >
            {error}
          </p>
        )}
        {message && (
          <p
            role="status"
            style={{
              margin: '0 0 18px',
              padding: '12px',
              borderRadius: '8px',
              color: '#245d39',
              background: '#edf8f0',
              textAlign: 'left',
            }}
          >
            {message}
          </p>
        )}

        {mode === 'forgot' ? (
          <form onSubmit={handleForgotPassword} style={{ display: 'grid', gap: '16px', textAlign: 'left' }}>
            <label style={{ display: 'grid', gap: '7px', color: '#303a34', fontWeight: 600 }}>
              Email
              <input
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
                style={inputStyle}
              />
            </label>
            <button type="submit" disabled={submitting} style={{ ...primaryButtonStyle, cursor: submitting ? 'wait' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
              {submitting ? 'Sending…' : 'Send reset link'}
            </button>
            <button type="button" onClick={() => switchMode('signin')} style={linkButtonStyle}>
              Back to sign in
            </button>
          </form>
        ) : (
          <>
            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px', textAlign: 'left' }}>
              <label style={{ display: 'grid', gap: '7px', color: '#303a34', fontWeight: 600 }}>
                Email
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                  style={inputStyle}
                />
              </label>

              <div style={{ display: 'grid', gap: '7px', color: '#303a34', fontWeight: 600 }}>
                <span style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <label htmlFor="portal-password">Password</label>
                  <button type="button" onClick={() => switchMode('forgot')} style={linkButtonStyle}>
                    Forgot password?
                  </button>
                </span>
                <input
                  id="portal-password"
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  style={inputStyle}
                />
              </div>

              <button
                type="submit"
                disabled={submitting || googleSubmitting}
                style={{ ...primaryButtonStyle, cursor: submitting ? 'wait' : 'pointer', opacity: submitting ? 0.7 : 1 }}
              >
                {submitting ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                margin: '20px 0',
                color: '#778079',
              }}
            >
              <span style={{ height: '1px', flex: 1, background: '#e0e6e1' }} />
              <span style={{ fontSize: '0.85rem' }}>or</span>
              <span style={{ height: '1px', flex: 1, background: '#e0e6e1' }} />
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={submitting || googleSubmitting}
              style={{
                width: '100%',
                padding: '12px 18px',
                border: '1px solid #cbd5ce',
                borderRadius: '8px',
                color: '#303a34',
                background: 'white',
                fontWeight: 600,
                cursor: googleSubmitting ? 'wait' : 'pointer',
                opacity: googleSubmitting ? 0.7 : 1,
              }}
            >
              {googleSubmitting ? 'Connecting to Google…' : 'Continue with Google'}
            </button>

            <p style={{ margin: '20px 0 0', color: '#5d6861' }}>
              Need an account?{' '}
              <Link href="/PortalLoginPage/create-account" style={{ color: '#246b46', fontWeight: 700 }}>
                Create account
              </Link>
            </p>
          </>
        )}
      </section>
    </main>
  );
}

const primaryButtonStyle = {
  marginTop: '4px',
  padding: '13px 18px',
  border: 0,
  borderRadius: '8px',
  color: '#102319',
  background: '#93E9BE',
  fontWeight: 700,
};

const linkButtonStyle = {
  padding: 0,
  border: 0,
  background: 'none',
  color: '#246b46',
  fontSize: '0.85rem',
  fontWeight: 700,
  cursor: 'pointer',
};
