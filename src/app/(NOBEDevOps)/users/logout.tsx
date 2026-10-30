"use client";

import { createClient } from "@/app/(NOBEDevOps)/utils/supabase/client";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const supabase = createClient();
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/PortalLoginPage"); // signing out of NOBE signs out of the whole portal
  }

  return (
    <button
      onClick={handleLogout}
      className="btn-danger"
    >
      Log out
    </button>
  );
}
