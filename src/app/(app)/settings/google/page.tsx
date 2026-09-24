import { requireActiveUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import GoogleGuardrailsPlaceholderClient from "@/components/collector/GoogleGuardrailsPlaceholderClient";

export const dynamic = "force-dynamic";

export default async function SettingsGooglePage() {
  await requireActiveUser();

  const [config, usageCount, cacheCount] = await Promise.all([
    prisma.googleCollectionConfig.findFirst(),
    prisma.googleApiUsage.count(),
    prisma.googleApiCache.count(),
  ]);

  const hasApiKey = Boolean(process.env.GOOGLE_MAPS_API_KEY);

  return (
    <GoogleGuardrailsPlaceholderClient
      config={config}
      usageCount={usageCount}
      cacheCount={cacheCount}
      hasApiKey={hasApiKey}
      showHeader={true}
    />
  );
}
