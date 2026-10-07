import Link from "next/link";
import { requireActiveUser } from "@/lib/session";
import {
  getBusinessProfile,
  listBusinessServices,
  listBusinessPortfolio,
} from "@/lib/actions/himi-knowledge";
import { KnowledgeManager } from "./client";

export const dynamic = "force-dynamic";

export default async function HimiKnowledgeSettingsPage() {
  await requireActiveUser();
  const [rawProfile, rawServices, rawPortfolio] = await Promise.all([
    getBusinessProfile(),
    listBusinessServices(),
    listBusinessPortfolio(),
  ]);

  const profile = rawProfile
    ? {
        ...rawProfile,
        updatedAt: rawProfile.updatedAt.toISOString(),
      }
    : null;

  const services = rawServices.map((s) => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }));

  const portfolio = rawPortfolio.map((p) => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));

  return (
    <>
      <div className="page-head">
        <div>
          <h2>HIMI / Business Knowledge</h2>
          <p>
            Manage the factual business information HIMI will use for services, pricing guidance, positioning, and portfolio proof.
          </p>
        </div>
      </div>

      <div
        className="hstack"
        style={{
          gap: 12,
          marginBottom: 20,
          borderBottom: "1px solid var(--border-color, #e5e7eb)",
          paddingBottom: 10,
        }}
      >
        <Link href="/settings/himi" className="btn sm">
          OpenAI Configuration
        </Link>
        <Link href="/settings/himi/skills" className="btn sm">
          Dynamic Skills
        </Link>
        <Link href="/settings/himi/knowledge" className="btn sm primary">
          Business Knowledge
        </Link>
      </div>

      <KnowledgeManager
        initialProfile={profile}
        initialServices={services}
        initialPortfolio={portfolio}
      />
    </>
  );
}
