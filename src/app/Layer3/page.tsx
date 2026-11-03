import OrgDashboard from "./OrgDashboard";
import { getUserOrgs } from "./getUserOrgs";

// Orgs are created at runtime, so this page must never be cached.
export const dynamic = "force-dynamic";

export default async function Layer3Page() {
  const { orgs, error } = await getUserOrgs();
  return <OrgDashboard orgs={orgs} error={error} />;
}
