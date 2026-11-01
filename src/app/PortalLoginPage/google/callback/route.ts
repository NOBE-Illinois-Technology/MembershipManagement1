import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/(NOBEDevOps)/utils/supabase/server';

function getSafeNextPath(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/Layer1";
}

function loginRedirect(request: NextRequest, next: string | null, error?: string) {
  const url = new URL(error ? '/PortalLoginPage' : getSafeNextPath(next), request.url);
  if (error && next) url.searchParams.set("next", getSafeNextPath(next));
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
