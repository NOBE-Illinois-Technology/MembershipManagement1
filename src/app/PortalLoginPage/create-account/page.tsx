'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/app/(NOBEDevOps)/utils/supabase/client';

const inputStyle = {
  width: '100%',
  padding: '12px 14px',
  border: '1px solid #cbd5ce',
  borderRadius: '8px',
  outlineColor: '#31845a',
};

const labelStyle = {
  display: 'grid',
  gap: '7px',
  color: '#303a34',
  fontWeight: 600,
};

export default function CreateAccountPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

  async function handleGoogleSignUp() {
    setError(null);
    setGoogleSubmitting(true);

    try {
      const supabase = createClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/PortalLoginPage/google/callback`,
        },
      });

      if (oauthError) {
        setError(oauthError.message);
        setGoogleSubmitting(false);
      }
    } catch (oauthError) {
      console.error('Google account creation failed:', oauthError);
      setError('Unable to start Google sign up. Please try again.');
      setGoogleSubmitting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    let accountCreated = false;

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: normalizedEmail,
          password,
        }),
      });
      const result: { error?: string; message?: string } = await response.json();

      if (!response.ok || result.error) {
        setError(result.error ?? 'Failed to create your account. Please try again.');
        return;
      }
      accountCreated = true;

      const supabase = createClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (signInError || !data.user) {
        setMessage('Your account was created. Please sign in with your new credentials.');
        return;
      }

      router.replace('/Layer1');
      router.refresh();
    } catch (signupError) {
      console.error('Account creation failed:', signupError);
      if (accountCreated) {
        setMessage('Your account was created, but we could not complete sign in. Please sign in.');
      } else {
        setError('Unable to create your account. Please try again.');
      }
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
          width: 'min(100%, 460px)',
          padding: '36px',
          border: '1px solid rgba(0, 0, 0, 0.12)',
          borderRadius: '18px',
          textAlign: 'center',
          background: 'white',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.12)',
        }}
      >
        <h1 style={{ margin: 0, color: '#202a24', fontSize: '1.8rem' }}>Create account</h1>
        <p style={{ margin: '10px 0 28px', color: '#5d6861' }}>
          Create your account
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

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px', textAlign: 'left' }}>
          <label style={labelStyle}>
            First name
            <input
              type="text"
              name="firstName"
              autoComplete="given-name"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              required
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            Last name
            <input
              type="text"
              name="lastName"
              autoComplete="family-name"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              required
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            Email
            <input
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            Password
            <input
              type="password"
              name="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={6}
              required
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            Confirm password
            <input
              type="password"
              name="confirmPassword"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={6}
              required
              style={inputStyle}
            />
          </label>

          <button
            type="submit"
            disabled={submitting || googleSubmitting}
            style={{
              marginTop: '4px',
              padding: '13px 18px',
              border: 0,
              borderRadius: '8px',
              color: '#102319',
              background: '#93E9BE',
              fontWeight: 700,
              cursor: submitting ? 'wait' : 'pointer',
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0', color: '#778079' }}>
          <span style={{ height: '1px', flex: 1, background: '#e0e6e1' }} />
          <span style={{ fontSize: '0.85rem' }}>or</span>
          <span style={{ height: '1px', flex: 1, background: '#e0e6e1' }} />
        </div>
        <button
          type="button"
          onClick={handleGoogleSignUp}
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
          Already have an account?{' '}
          <Link href="/PortalLoginPage" style={{ color: '#246b46', fontWeight: 700 }}>
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
