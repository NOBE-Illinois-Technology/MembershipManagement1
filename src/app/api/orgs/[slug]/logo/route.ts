import { NextResponse } from "next/server";
import { getOrgRole, getSignedInUser } from "@/lib/membership";
import { LIMITS, LOGO_TYPES } from "@/lib/orgSettings";
import { clearOrgLogo, replaceOrgLogo } from "@/lib/orgSettingsStore";

// An org's logo. Admins only.
//   POST   multipart form with a `logo` file (PNG/JPEG/WebP/GIF, up to 2 MB)  200 { logo_url }
//   DELETE                                                                   200 { logo_url: null }
// Both: 400 bad file, 401 not signed in, 403 not an admin.

async function requireAdmin(slug: string) {
  const user = await getSignedInUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if ((await getOrgRole(user.id, slug)) !== "ADMIN") {
    return NextResponse.json({ error: "Only admins of this organization can change the logo." }, { status: 403 });
  }
  return null;
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const denied = await requireAdmin(slug);
    if (denied) return denied;

    const form = await request.formData().catch(() => null);
    const file = form?.get("logo");
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose an image to upload." }, { status: 400 });
    if (!(LOGO_TYPES as readonly string[]).includes(file.type)) {
      return NextResponse.json({ error: "The logo must be a PNG, JPEG, WebP, or GIF image." }, { status: 400 });
    }
    if (file.size > LIMITS.logoBytesMax) {
      return NextResponse.json({ error: "The logo must be 2 MB or smaller." }, { status: 400 });
    }

    return NextResponse.json({ logo_url: await replaceOrgLogo(slug, file) });
  } catch (err) {
    console.error(`[POST /api/orgs/${slug}/logo]`, err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const denied = await requireAdmin(slug);
    if (denied) return denied;
    await clearOrgLogo(slug);
    return NextResponse.json({ logo_url: null });
  } catch (err) {
    console.error(`[DELETE /api/orgs/${slug}/logo]`, err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error." }, { status: 500 });
  }
}
