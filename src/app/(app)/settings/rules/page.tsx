import { requireActiveUser } from "@/lib/session";
import { getCollectionRules } from "@/lib/collector";
import CollectionRulesClient from "@/components/collector/CollectionRulesClient";

export const dynamic = "force-dynamic";

export default async function SettingsRulesPage() {
  await requireActiveUser();
  const rules = await getCollectionRules();

  return <CollectionRulesClient initialRules={rules} showHeader={true} />;
}
