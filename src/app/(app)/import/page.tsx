import { requireActiveUser } from "@/lib/session";
import { Importer } from "./importer";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  await requireActiveUser();

  const example = `company_name,business_category,country,city,postcode,email,contact_name,phone,website,segment,score,issues,hook_line,company_number
NICHOLS AND FISHER DENTAL CARE LTD,Dental Clinic,UK,Leeds,LS25 1AR,jane@nicholsandfisher.co.uk,Jane Fisher,+44 113 555 0100,https://nicholsandfisher.co.uk,OUTDATED,40,"not mobile-responsive; copyright still says 2022","I checked your site on my phone this morning - it loads as a zoomed-out desktop page.",17430882`;

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Import leads</h2>
          <p>
            Paste a CSV or upload a file. Column names are auto-detected, and re-importing
            the same file updates existing leads instead of duplicating them.
          </p>
        </div>
      </div>

      <Importer example={example} />
    </>
  );
}
