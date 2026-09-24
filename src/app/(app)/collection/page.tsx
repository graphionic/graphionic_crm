import { requireActiveUser } from "@/lib/session";
import { getCollectorOverview, getLeadCandidateStats } from "@/lib/collector";
import CollectorOverviewClient from "@/components/collector/CollectorOverviewClient";

export const dynamic = "force-dynamic";

export default async function CollectionOverviewPage() {
  await requireActiveUser();
  const [overview, candidateStats] = await Promise.all([
    getCollectorOverview(),
    getLeadCandidateStats(),
  ]);

  return <CollectorOverviewClient overview={overview} candidateStats={candidateStats} showHeader={true} />;
}
