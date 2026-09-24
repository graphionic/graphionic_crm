import { requireActiveUser } from "@/lib/session";
import { getDataSources, getProviderCredentials } from "@/lib/collector";
import CollectorSourcesClient from "@/components/collector/CollectorSourcesClient";

export const dynamic = "force-dynamic";

export default async function CollectorSourcesPage() {
  await requireActiveUser();
  const [sources, credentials] = await Promise.all([
    getDataSources(),
    getProviderCredentials(),
  ]);

  return <CollectorSourcesClient initialSources={sources} initialCredentials={credentials} showHeader={true} />;
}
