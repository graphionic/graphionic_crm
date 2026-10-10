import { requireActiveUser } from "@/lib/session";
import InboxClient from "./inbox-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function InboxPage(props: {
  searchParams?: Promise<{ phone?: string; leadId?: string }>;
}) {
  const user = await requireActiveUser();
  const searchParams = props.searchParams ? await props.searchParams : undefined;

  return (
    <InboxClient
      initialPhone={searchParams?.phone}
      initialLeadId={searchParams?.leadId}
      operatorTimezone={user.timezone || null}
    />
  );
}
