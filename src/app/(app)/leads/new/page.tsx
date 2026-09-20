import { requireActiveUser } from "@/lib/session";
import { LeadForm } from "@/components/LeadForm";
import { createLead } from "@/lib/actions/leads";

export const dynamic = "force-dynamic";

export default async function NewLeadPage() {
  await requireActiveUser();
  return (
    <>
      <div className="page-head">
        <div>
          <h2>New lead</h2>
          <p>Add one company by hand. For bulk, use CSV import.</p>
        </div>
      </div>
      <LeadForm action={createLead} submitLabel="Create lead" />
    </>
  );
}
