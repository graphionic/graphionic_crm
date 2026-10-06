import Link from "next/link";
import { requireActiveUser } from "@/lib/session";
import { listSkills } from "@/lib/actions/himi-skills";
import { SkillsManager } from "./client";

export const dynamic = "force-dynamic";

export default async function HimiSkillsSettingsPage() {
  await requireActiveUser();
  const rawSkills = await listSkills();

  // Convert Date objects to strings for client prop compatibility
  const skills = rawSkills.map((s) => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }));

  return (
    <>
      <div className="page-head">
        <div>
          <h2>HIMI / Dynamic Skills</h2>
          <p>Manage dynamic skills, procedural rules, and intelligence guidelines used by HIMI.</p>
        </div>
      </div>

      <div className="hstack" style={{ gap: 12, marginBottom: 20, borderBottom: "1px solid var(--border-color, #e5e7eb)", paddingBottom: 10 }}>
        <Link href="/settings/himi" className="btn sm">
          OpenAI Configuration
        </Link>
        <Link href="/settings/himi/skills" className="btn sm primary">
          Dynamic Skills
        </Link>
      </div>

      <SkillsManager initialSkills={skills} />
    </>
  );
}
