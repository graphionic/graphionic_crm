import { requireActiveUser } from "@/lib/session";
import { getCollectorRuns } from "@/lib/collector";
import CollectorRunsClient from "@/components/collector/CollectorRunsClient";

export const dynamic = "force-dynamic";

export default async function CollectorRunsPage() {
  await requireActiveUser();
  const runs = await getCollectorRuns({ limit: 100 });

  return <CollectorRunsClient initialRuns={runs} showHeader={true} />;
}
