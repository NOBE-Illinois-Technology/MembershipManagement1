import { createClient } from "@supabase/supabase-js";
import dns from "node:dns";

try {
  dns.setDefaultResultOrder("ipv4first");
} catch {}

// Service-role client: bypasses RLS, so it must never be constructed in code that
// reaches the browser.
//
// This used to fall back to "https://placeholder.supabase.co" / "placeholder-key" when the
// environment was missing, which turned a config mistake into a confusing runtime failure
// several layers downstream. Failing here instead names the actual problem.
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const missing = [
    !supabaseUrl && "NEXT_PUBLIC_SUPABASE_URL",
    !serviceRoleKey && "SUPABASE_SERVICE_ROLE_KEY",
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(
      `Supabase admin client is not configured: missing ${missing.join(" and ")}. ` +
        `Set these in .env.local (no spaces around the "="), then restart the dev server — ` +
        `env vars are read at startup, so editing .env.local in a running container has no effect.`
    );
  }

  return createClient(supabaseUrl!, serviceRoleKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
