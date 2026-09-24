import { requireActiveUser } from "@/lib/session";
import { getCategories } from "@/lib/collector";
import CollectorCategoriesClient from "@/components/collector/CollectorCategoriesClient";

export const dynamic = "force-dynamic";

export default async function SettingsCategoriesPage() {
  await requireActiveUser();
  const categories = await getCategories();

  return <CollectorCategoriesClient initialCategories={categories} showHeader={true} />;
}
