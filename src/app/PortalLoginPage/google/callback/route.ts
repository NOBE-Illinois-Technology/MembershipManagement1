import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/(NOBEDevOps)/utils/supabase/server';
import { safeNext } from '../../safeNext';

// Success goes to ?next (the page that asked for sign-in) or the dashboard, which also creates
// the person's `people` row on first Google sign-in.
function loginRedirect(request: NextRequest, error?: string) {
  const url = new URL(
    error ? '/PortalLoginPage' : safeNext(request.nextUrl.searchParams.get('next')),
    request.url
  );
  if (error) url.searchParams.set('google_error', error);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  if (searchParams.has('error')) {
    return loginRedirect(request, 'oauth');
  }

  const code = searchParams.get('code');
  if (!code) {
    return loginRedirect(request, 'oauth');
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Google OAuth code exchange failed:', error.message);
      return loginRedirect(request, 'oauth');
    }

    return loginRedirect(request);
  } catch (error) {
    console.error('Google OAuth callback failed:', error);
    return loginRedirect(request, 'oauth');
  }
}
