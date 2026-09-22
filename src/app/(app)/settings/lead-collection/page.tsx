import { requireActiveUser } from "@/lib/session";
import { getCollectorOverview, getLocations, getCategories, getDataSources, getProviderCredentials, getCollectionRules, getCollectorRuns, getCollectorStates } from "@/lib/collector";
import LeadCollectionClient from "./client";

export const dynamic = "force-dynamic";

export default async function LeadCollectionSettingsPage() {
  await requireActiveUser();

  const [overview, locations, categories, sources, credentials, rules, runs, states] = await Promise.all([
    getCollectorOverview(),
    getLocations(),
    getCategories(),
    getDataSources(),
    getProviderCredentials(),
    getCollectionRules(),
    getCollectorRuns({ limit: 20 }),
    getCollectorStates(),
  ]);

  return (
    <LeadCollectionClient
      initialOverview={overview}
      initialLocations={locations}
      initialCategories={categories}
      initialSources={sources}
      initialCredentials={credentials}
      initialRules={rules}
      initialRuns={runs}
      initialStates={states}
    />
  );
}
