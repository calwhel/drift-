import AcceptInviteClient from "./accept-invite-client";

type AcceptInvitePageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function AcceptInvitePage({ searchParams }: AcceptInvitePageProps) {
  const params = await searchParams;
  return <AcceptInviteClient token={params.token?.trim() ?? ""} />;
}
