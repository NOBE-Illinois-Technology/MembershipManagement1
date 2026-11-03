import InviteAcceptance from "./InviteAcceptance";

export default async function OrgInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <InviteAcceptance token={token} />;
}
