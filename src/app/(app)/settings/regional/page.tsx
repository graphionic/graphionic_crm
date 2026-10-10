import Link from "next/link";
import { requireActiveUser } from "@/lib/session";
import { RegionalSettingsForm } from "./regional-settings-form";

export const dynamic = "force-dynamic";

export default async function RegionalSettingsPage() {
  const user = await requireActiveUser();

  return (
    <>
      <div className="page-head">
        <div>
          <div className="hstack" style={{ gap: 8, marginBottom: 4 }}>
            <Link href="/settings" className="small muted" style={{ textDecoration: "none" }}>
              ← Settings
            </Link>
          </div>
          <h2>Timezone &amp; Regional Settings</h2>
          <p>Configure your personal operational timezone for accurate CRM timestamps and AI temporal awareness.</p>
        </div>
      </div>

      <RegionalSettingsForm
        initialTimezone={user.timezone || null}
        userEmail={user.email}
      />
    </>
  );
}
