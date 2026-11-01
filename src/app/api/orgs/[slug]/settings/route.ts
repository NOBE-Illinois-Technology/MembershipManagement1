import { NextResponse } from "next/server";
import { getOrgRole, getSignedInUser } from "@/lib/membership";
import { parseSettingsInput } from "@/lib/orgSettings";
import { loadOrgSettings, saveOrgSettings } from "@/lib/orgSettingsStore";

// An org's settings (logo, colors, points, strikes, committees).
//   GET  any member     200 { settings }
//   PUT  admins only    200 { settings }   400 { error } invalid input
// Both: 401 not signed in, 403 not a member / not an admin.

async function callerRole(slug: string) {
  const user = await getSignedInUser();
  if (!user) return { status: 401 as const, error: "Not signed in." };
  const role = await getOrgRole(user.id, slug);
  if (!role) return { status: 403 as const, error: "Not a member of this organization." };
  return { role };
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const caller = await callerRole(slug);
    if ("error" in caller) return NextResponse.json({ error: caller.error }, { status: caller.status });
    return NextResponse.json({ settings: await loadOrgSettings(slug) });
  } catch (err) {
    console.error(`[GET /api/orgs/${slug}/settings]`, err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error." }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const caller = await callerRole(slug);
    if ("error" in caller) return NextResponse.json({ error: caller.error }, { status: caller.status });
    if (caller.role !== "ADMIN") {
      return NextResponse.json({ error: "Only admins of this organization can change settings." }, { status: 403 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
    }

    const current = await loadOrgSettings(slug);
    const { settings, errors } = parseSettingsInput(body, current.logo_url);
    if (errors.length) return NextResponse.json({ error: errors.join(" ") }, { status: 400 });

    return NextResponse.json({ settings: await saveOrgSettings(slug, settings) });
  } catch (err) {
    console.error(`[PUT /api/orgs/${slug}/settings]`, err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error." }, { status: 500 });
  }
}
