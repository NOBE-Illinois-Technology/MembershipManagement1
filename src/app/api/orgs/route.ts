import { NextResponse } from "next/server";
import { createAdminClient } from "@/app/(NOBEDevOps)/utils/supabase/admin";
import { ORG_SELECT } from "@/app/Layer3/getUserOrgs";
import { ensurePerson, getSignedInUser, joinOrg } from "@/lib/membership";
import {
  DEFAULT_ORG_COLOR,
  HEX_COLOR,
  ORG_NAME_MAX,
  ORG_NAME_MIN,
  slugifyOrgName,
} from "@/app/Layer3/orgs";

const UNIQUE_VIOLATION = "23505";

function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

// supabase-js reports an unreachable host as a bare "fetch failed", which tells the person
// staring at the form nothing. Name the likely cause instead of swallowing it.
function describeDbError(error: { message?: string; hint?: string | null }) {
  const message = error.message ?? "Unknown database error.";
  if (/fetch failed|ENOTFOUND|EAI_AGAIN|ECONNREFUSED|network/i.test(message)) {
    return (
      "Could not reach Supabase from the server. If you are running in Docker, the container " +
      "likely has no outbound network — restart Docker Desktop, or run `npm run dev` on your host."
    );
  }
  return error.hint ? `${message} (${error.hint})` : message;
}

// Creates an organization and makes the signed-in creator its ADMIN.
export async function POST(request: Request) {
  const user = await getSignedInUser();
  if (!user) return fail("You must be signed in to create an organization.", 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("Request body must be JSON.");
  }

  const raw = body as Record<string, unknown> | null;
  // Collapse runs of whitespace so "Robotics   Club" and "Robotics Club" can't both exist.
  const name = typeof raw?.name === "string" ? raw.name.trim().replace(/\s+/g, " ") : "";
  const color = typeof raw?.primary_color === "string" ? raw.primary_color.trim() : DEFAULT_ORG_COLOR;

  if (name.length < ORG_NAME_MIN) {
    return fail(`Organization name must be at least ${ORG_NAME_MIN} characters.`);
  }
  if (name.length > ORG_NAME_MAX) {
    return fail(`Organization name must be ${ORG_NAME_MAX} characters or fewer.`);
  }
  if (!HEX_COLOR.test(color)) {
    return fail("Primary color must be a hex value like #93E9BE.");
  }

  let supabase: ReturnType<typeof createAdminClient>;
  try {
    supabase = createAdminClient();
  } catch (configError) {
    console.error("[POST /api/orgs]", configError);
    return fail(
      configError instanceof Error ? configError.message : "Supabase is not configured.",
      500
    );
  }

  const base = slugifyOrgName(name);
  const { data: existing, error: slugError } = await supabase
    .from("organizations")
    .select("slug")
    .like("slug", `${base}%`)
    .returns<{ slug: string }[]>();

  if (slugError) {
    console.error("[POST /api/orgs] slug lookup failed:", slugError);
    return fail(describeDbError(slugError), 502);
  }

  const taken = new Set((existing ?? []).map((row) => row.slug));
  const nextSlug = () => {
    let slug = base;
    for (let n = 2; taken.has(slug); n += 1) slug = `${base}-${n}`;
    return slug;
  };

  // Two people creating the same org name at once both pass the check above, so the loser
  // gets a unique violation. Claim the next free slug and retry rather than failing them.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const slug = nextSlug();
    const { data, error } = await supabase
      .from("organizations")
      .insert({ name, slug, primary_color: color.toLowerCase() })
      .select(ORG_SELECT)
      .single();

    if (!error) {
      try {
        await joinOrg(supabase, await ensurePerson(user), data.id, "ADMIN");
      } catch (membershipError) {
        // An org nobody belongs to would be invisible to everyone, so don't leave it behind.
        await supabase.from("organizations").delete().eq("id", data.id);
        console.error("[POST /api/orgs] could not add creator as admin:", membershipError);
        return fail(
          membershipError instanceof Error ? membershipError.message : "Could not add you to the new organization.",
          502
        );
      }
      return NextResponse.json({ org: { ...data, role: "ADMIN" } }, { status: 201 });
    }

    if (error.code === UNIQUE_VIOLATION) {
      taken.add(slug);
      continue;
    }

    console.error("[POST /api/orgs] insert failed:", error);
    return fail(describeDbError(error), 502);
  }

  return fail("That organization name is taken. Try a different one.", 409);
}
