"use server";

import { createClient } from "@/app/(NOBEDevOps)/utils/supabase/server";
import { createAdminClient } from "@/app/(NOBEDevOps)/utils/supabase/admin";
import { revalidatePath } from "next/cache";
import { NOBE_SLUG, requireOrgAdmin, setOrgRole, type OrgRole } from "@/lib/membership";

function toOrgRole(role: string): OrgRole {
    const normalized = role.trim().toUpperCase();
    if (normalized !== "ADMIN" && normalized !== "MEMBER") throw new Error(`Unknown role "${role}".`);
    return normalized;
}

// Every action in this file is for NOBE admins only, and only acts on NOBE members and NOBE data
// (rows with org_id null). Server actions can be called directly from the browser, so each action
// checks for itself instead of relying on the page that shows the button.

type AdminClient = ReturnType<typeof createAdminClient>;

type NobeMembership = {
    nobeMembershipId: number;
    // How many other orgs the person belongs to. If any, NOBE must not delete or unlink their
    // account, only remove them from NOBE.
    otherOrgCount: number;
};

// The person's NOBE membership, or null if they aren't in NOBE.
async function getNobeMembership(admin: AdminClient, personId: number): Promise<NobeMembership | null> {
    const { data, error } = await admin
        .from("memberships")
        .select("id, organizations!inner(slug)")
        .eq("person_id", personId);
    if (error) throw new Error(`Could not check memberships: ${error.message}`);

    const rows = (data ?? []).map((m) => {
        const org = Array.isArray(m.organizations) ? m.organizations[0] : m.organizations;
        return { id: m.id as number, slug: (org as { slug: string } | undefined)?.slug };
    });
    const nobe = rows.find((r) => r.slug === NOBE_SLUG);
    return nobe ? { nobeMembershipId: nobe.id, otherOrgCount: rows.length - 1 } : null;
}

async function requireNobeMember(admin: AdminClient, personId: number): Promise<NobeMembership> {
    const membership = await getNobeMembership(admin, personId);
    if (!membership) throw new Error("That person is not a member of NOBE.");
    return membership;
}

async function requireNobeMemberByAuthId(admin: AdminClient, authId: string) {
    const { data: person, error } = await admin.from("people").select("id").eq("auth_id", authId).maybeSingle();
    if (error) throw new Error(`Could not look up the member: ${error.message}`);
    if (!person) throw new Error("Member not found.");
    return requireNobeMember(admin, person.id);
}

// Removes a person from NOBE: their NOBE attendance, absences and strikes and their officer notes.
// If they belong to other orgs, their account and those orgs' data are kept and only the NOBE
// membership is removed. If NOBE is their only org, their whole account is deleted as before.
// The login and email come from the member's own record, never from the caller, so a caller
// can't pass someone else's email and have that account deleted.
export async function deleteMember(memberId: number) {
    await requireOrgAdmin(NOBE_SLUG);
    const supabaseAdmin = createAdminClient();
    const membership = await requireNobeMember(supabaseAdmin, memberId);

    // 1. Fetch member record to gather all identifiers (id, auth_id, illinois_email)
    const { data: memberRecord, error: memberError } = await supabaseAdmin
        .from("people")
        .select("id, auth_id, illinois_email")
        .eq("id", memberId)
        .maybeSingle();

    if (memberError || !memberRecord) {
        throw new Error(memberError?.message || "Member not found");
    }

    const targetAuthId: string | null = memberRecord.auth_id || null;
    const targetEmail: string | null = memberRecord.illinois_email || null;

    // 2. Identify all Supabase Auth user IDs for this person
    const authIdsToDelete = new Set<string>();
    if (targetAuthId) {
        authIdsToDelete.add(targetAuthId);
    }

    if (targetEmail) {
        try {
            const { data: listData } = await supabaseAdmin.auth.admin.listUsers({
                page: 1,
                perPage: 1000,
            });
            const matchingAuthUser = listData?.users?.find(
                (u) => u.email?.toLowerCase().trim() === targetEmail!.toLowerCase().trim()
            );
            if (matchingAuthUser?.id) {
                authIdsToDelete.add(matchingAuthUser.id);
            }
        } catch (authListErr) {
            console.error("Error searching auth users by email:", authListErr);
        }
    }

    // 3. Delete NOBE attendance, absences, strikes (other orgs' rows have an org_id and are kept)
    for (const uid of authIdsToDelete) {
        await supabaseAdmin
            .from("strikes")
            .delete()
            .eq("user_id", uid)
            .is("org_id", null);

        await supabaseAdmin
            .from("attendance")
            .delete()
            .eq("user_id", uid)
            .is("org_id", null);

        await supabaseAdmin
            .from("excused_absences")
            .delete()
            .eq("user_id", uid)
            .is("org_id", null);
    }

    // 4. Delete officer notes for this member
    await supabaseAdmin
        .from("system_settings")
        .delete()
        .eq("key", `officer_notes_member_id_${memberId}`);

    // 5a. In other orgs too: remove them from NOBE only, keep their account.
    if (membership.otherOrgCount > 0) {
        const { error: membershipError } = await supabaseAdmin
            .from("memberships")
            .delete()
            .eq("id", membership.nobeMembershipId);
        if (membershipError) {
            throw new Error(membershipError.message);
        }
        revalidatePath("/users/admin/reviewMemberStats");
        return;
    }

    // 5b. NOBE is their only org: delete member from people table
    const { error: deletePeopleError } = await supabaseAdmin
        .from("people")
        .delete()
        .eq("id", memberId);

    if (deletePeopleError) {
        throw new Error(deletePeopleError.message);
    }

    // Clean up any remaining rows in People that match target authId or email
    for (const uid of authIdsToDelete) {
        await supabaseAdmin
            .from("people")
            .delete()
            .eq("auth_id", uid);
    }
    if (targetEmail) {
        await supabaseAdmin
            .from("people")
            .delete()
            .ilike("illinois_email", targetEmail.trim());
    }

    // 6. Delete user(s) from Supabase Auth (auth.users)
    for (const uid of authIdsToDelete) {
        try {
            const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(uid);
            if (authDeleteError) {
                console.error(`Failed to delete auth user ${uid}:`, authDeleteError.message);
            }
        } catch (authErr) {
            console.error(`Exception deleting auth user ${uid}:`, authErr);
        }
    }

    revalidatePath("/users/admin/reviewMemberStats");
}

export async function addStrike(formData: FormData) {
    await requireOrgAdmin(NOBE_SLUG);
    const supabase = await createClient();
    const supabaseAdmin = createAdminClient();

    const memberAuthId = String(formData.get("memberAuthId") ?? "");
    const eventIdRaw = String(formData.get("eventId") ?? "");
    const reason = String(formData.get("reason") ?? "").trim();
    const adminNote = String(formData.get("adminNote") ?? "").trim();

    if (!memberAuthId) {
        throw new Error("Missing member auth id.");
    }

    if (!reason) {
        throw new Error("Strike reason is required.");
    }

    await requireNobeMemberByAuthId(supabaseAdmin, memberAuthId);

    // Only NOBE events: a strike on another org's event would count in that org.
    if (eventIdRaw) {
        const { data: event } = await supabaseAdmin
            .from("events")
            .select("id")
            .eq("id", eventIdRaw)
            .is("org_id", null)
            .maybeSingle();
        if (!event) {
            throw new Error("Event not found.");
        }
    }

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
        throw new Error(userError.message);
    }

    const { error } = await supabase.from("strikes").insert({
        user_id: memberAuthId,
        event_id: eventIdRaw || null,
        strike_type: "MANUAL_ADJUSTMENT",
        reason,
        status: "ACTIVE",
        source: "ADMIN_MANUAL",
        admin_note: adminNote || null,
        created_by: user?.id ?? null,
    });

    if (error) {
        throw new Error(error.message);
    }

    revalidatePath("/users/admin/reviewMemberStats");
}

export async function deleteStrike(strikeId: string) {
    await requireOrgAdmin(NOBE_SLUG);
    const supabase = await createClient();

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
        throw new Error(userError.message);
    }

    const { error } = await supabase
        .from("strikes")
        .update({
            status: "REMOVED",
            removed_at: new Date().toISOString(),
            removed_by: user?.id ?? null,
        })
        .eq("id", strikeId)
        // NOBE strikes only; other orgs' strikes have an org_id.
        .is("org_id", null);

    if (error) {
        throw new Error(error.message);
    }

    revalidatePath("/users/admin/reviewMemberStats");
}

export async function updateMemberPoints(memberId: number, category: "professional" | "social" | "service", amount: number) {
    await requireOrgAdmin(NOBE_SLUG);
    await requireNobeMember(createAdminClient(), memberId);
    const supabase = await createClient();

    const { data: member, error: fetchError } = await supabase
        .from("people")
        .select("professional_points, social_points, service_points")
        .eq("id", memberId)
        .single();

    if (fetchError || !member) {
        throw new Error(fetchError?.message || "Member not found");
    }

    let newPoints = 0;
    let updateField = "";
    if (category === "professional") {
        newPoints = Math.max((member.professional_points || 0) + amount, 0);
        updateField = "professional_points";
    } else if (category === "social") {
        newPoints = Math.max((member.social_points || 0) + amount, 0);
        updateField = "social_points";
    } else if (category === "service") {
        newPoints = Math.max((member.service_points || 0) + amount, 0);
        updateField = "service_points";
    }

    const { error: updateError } = await supabase
        .from("people")
        .update({ [updateField]: newPoints })
        .eq("id", memberId);

    if (updateError) {
        throw new Error(updateError.message);
    }

    revalidatePath("/users/admin/reviewMemberStats");
}

export async function updateOfficerNotes(memberId: number, notes: string) {
    await requireOrgAdmin(NOBE_SLUG);
    await requireNobeMember(createAdminClient(), memberId);
    const supabase = await createClient();

    const key = `officer_notes_member_id_${memberId}`;
    const { error } = await supabase
        .from("system_settings")
        .upsert({ key, value: notes });

    if (error) {
        throw new Error(error.message);
    }

    revalidatePath("/users/admin/reviewMemberStats");
}

// Roles are per org and live on memberships; only a NOBE admin may change NOBE roles.
export async function updateMemberRole(memberId: number, role: string) {
    await requireOrgAdmin(NOBE_SLUG);
    await setOrgRole(memberId, NOBE_SLUG, toOrgRole(role));

    revalidatePath("/users/admin/reviewMemberStats");
}

// Deactivating unlinks the person's login so they can no longer sign in. If they belong to other
// orgs, that would lock them out of those orgs too, so they're only removed from NOBE instead.
export async function deactivateMember(memberId: number) {
    await requireOrgAdmin(NOBE_SLUG);
    const supabaseAdmin = createAdminClient();
    const membership = await requireNobeMember(supabaseAdmin, memberId);

    if (membership.otherOrgCount > 0) {
        const { error: membershipError } = await supabaseAdmin
            .from("memberships")
            .delete()
            .eq("id", membership.nobeMembershipId);
        if (membershipError) {
            throw new Error(membershipError.message);
        }
        revalidatePath("/users/admin/reviewMemberStats");
        return;
    }

    const supabase = await createClient();

    const { error } = await supabase
        .from("people")
        .update({ auth_id: null })
        .eq("id", memberId);

    if (error) {
        throw new Error(error.message);
    }

    revalidatePath("/users/admin/reviewMemberStats");
}

export async function updateAbsenceStatus(absenceId: string, status: "APPROVED" | "REJECTED") {
    await requireOrgAdmin(NOBE_SLUG);
    const supabase = await createClient();

    const { error } = await supabase
        .from("excused_absences")
        .update({ status })
        .eq("id", absenceId)
        // NOBE absences only; other orgs' absences have an org_id.
        .is("org_id", null);

    if (error) {
        throw new Error(error.message);
    }

    revalidatePath("/users/admin/reviewMemberStats");
}

export async function editMemberDetails(
    memberId: number,
    payload: {
        name: string;
        illinois_email: string;
        major: string;
        year: string;
        college: string;
        committee: string;
        role?: string;
    }
) {
    await requireOrgAdmin(NOBE_SLUG);
    await requireNobeMember(createAdminClient(), memberId);
    const role = payload.role ? toOrgRole(payload.role) : null;

    const supabase = await createClient();

    const updateData: {
        name: string;
        illinois_email: string;
        major: string;
        year: string;
        college: string;
        committee: string;
    } = {
        name: payload.name.trim(),
        illinois_email: payload.illinois_email.trim(),
        major: payload.major.trim(),
        year: payload.year.trim(),
        college: payload.college.trim(),
        committee: payload.committee.trim(),
    };

    const { error } = await supabase
        .from("people")
        .update(updateData)
        .eq("id", memberId);

    if (error) {
        throw new Error(error.message);
    }

    if (role) await setOrgRole(memberId, NOBE_SLUG, role);

    revalidatePath("/users/admin/reviewMemberStats");
}