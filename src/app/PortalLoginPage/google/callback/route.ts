import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/(NOBEDevOps)/utils/supabase/server';
import { safeNext } from '../../safeNext';

// Success goes to ?next (the page that asked for sign-in) or the dashboard, which also creates
// the person's `people` row on first Google sign-in.
function loginRedirect(request: NextRequest, next?: string | null, error?: string) {
  const destination = error ? '/PortalLoginPage' : safeNext(next ?? request.nextUrl.searchParams.get('next'));
  const url = new URL(destination, request.url);
  const targetNext = safeNext(next ?? request.nextUrl.searchParams.get('next'));
  if (error && targetNext) url.searchParams.set('next', targetNext);
  if (error) url.searchParams.set('google_error', error);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const next = searchParams.get("next");
  if (searchParams.has('error')) {
    return loginRedirect(request, next, 'oauth');
  }

  const code = searchParams.get('code');
  if (!code) {
    return loginRedirect(request, next, 'oauth');
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Google OAuth code exchange failed:', error.message);
      return loginRedirect(request, next, 'oauth');
    }

    return loginRedirect(request, next);
  } catch (error) {
    console.error('Google OAuth callback failed:', error);
    return loginRedirect(request, next, 'oauth');
  }
}
