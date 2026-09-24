import { requireActiveUser } from "@/lib/session";
import { getCollectorStates } from "@/lib/collector";
import CollectorStatesClient from "@/components/collector/CollectorStatesClient";

export const dynamic = "force-dynamic";

export default async function CollectorStatesPage() {
  await requireActiveUser();
  const states = await getCollectorStates();

  return <CollectorStatesClient initialStates={states} showHeader={true} />;
}
