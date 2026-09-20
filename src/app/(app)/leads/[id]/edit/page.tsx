import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/session";
import { LeadForm } from "@/components/LeadForm";
import { updateLead, deleteLead } from "@/lib/actions/leads";
import { DeleteLeadButton } from "./delete-button";

export const dynamic = "force-dynamic";

export default async function EditLeadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireActiveUser();
  const { id } = await params;
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) notFound();

  const action = updateLead.bind(null, id);

  return (
    <>
      <div className="page-head">
        <div>
          <div className="hstack" style={{ marginBottom: 6 }}>
            <Link className="btn sm ghost" href={`/leads/${id}`}>← Back to lead</Link>
          </div>
          <h2>Edit — {lead.companyName}</h2>
        </div>
        <DeleteLeadButton action={deleteLead.bind(null, id)} name={lead.companyName} />
      </div>
      <LeadForm action={action} initial={lead as unknown as Record<string, never>} submitLabel="Save changes" />
    </>
  );
}
