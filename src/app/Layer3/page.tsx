import OrgDashboard from "./OrgDashboard";
import { getUserOrgs } from "./getUserOrgs";

export default async function Layer3Page() {
  const { orgs, isPlaceholder } = await getUserOrgs();
  return <OrgDashboard orgs={orgs} isPlaceholder={isPlaceholder} />;
}
