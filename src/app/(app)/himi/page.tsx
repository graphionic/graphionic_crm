import { requireActiveUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import HimiClient from "./himi-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HimiPage(props: {
  searchParams?: Promise<{ leadId?: string; intent?: string; message?: string }>;
}) {
  await requireActiveUser();
  const searchParams = props.searchParams ? await props.searchParams : undefined;
  const initialLeadId = searchParams?.leadId;
  const initialIntent = searchParams?.intent;
  const initialMessage = searchParams?.message ? String(searchParams.message).slice(0, 500) : "";

  let initialPrompt = initialMessage || "";
  if (initialLeadId && initialIntent) {
    const lead = await prisma.lead.findUnique({
      where: { id: initialLeadId },
      select: { companyName: true },
    });
    if (lead) {
      if (initialIntent === "review_reply") {
        initialPrompt = `Review the recent reply from ${lead.companyName}`;
      } else if (initialIntent === "review_delivery_issue") {
        initialPrompt = `Review the recent delivery issue for ${lead.companyName}`;
      } else if (initialIntent === "prepare_followup") {
        initialPrompt = `Prepare a follow-up for ${lead.companyName}`;
      } else if (initialIntent === "prepare_first_touch") {
        initialPrompt = `Prepare a first-touch message for ${lead.companyName}`;
      }
    }
  }

  return (
    <HimiClient
      initialLeadId={initialLeadId}
      initialIntent={initialIntent}
      initialPrompt={initialPrompt}
    />
  );
}
