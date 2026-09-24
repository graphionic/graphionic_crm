import { requireActiveUser } from "@/lib/session";
import { getCategories, getDataSources } from "@/lib/collector";
import CandidateQueueClient from "@/components/collector/CandidateQueueClient";

export const dynamic = "force-dynamic";

export default async function CandidatesPage() {
  await requireActiveUser();
  const [categories, sources] = await Promise.all([
    getCategories(),
    getDataSources(),
  ]);

  return <CandidateQueueClient categories={categories} sources={sources} showHeader={true} />;
}
