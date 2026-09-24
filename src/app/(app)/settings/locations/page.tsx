import { requireActiveUser } from "@/lib/session";
import { getLocations } from "@/lib/collector";
import CollectorLocationsClient from "@/components/collector/CollectorLocationsClient";

export const dynamic = "force-dynamic";

export default async function SettingsLocationsPage() {
  await requireActiveUser();
  const locations = await getLocations();

  return <CollectorLocationsClient initialLocations={locations} showHeader={true} />;
}
