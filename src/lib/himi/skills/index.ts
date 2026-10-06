import { HimiSkill } from "./types";
import { salesManagerSkill } from "./sales-manager";
import { leadPrioritizationSkill } from "./lead-prioritization";

export * from "./types";
export * from "./sales-manager";
export * from "./lead-prioritization";

export const ALL_SKILLS: HimiSkill[] = [
  salesManagerSkill,
  leadPrioritizationSkill,
];

/**
 * Resolves and formats relevant skill prompts based on user query.
 * If query matches specific keywords, returns matching skills.
 * For general queries or empty inputs, returns core skills foundation.
 */
export function getRelevantSkillInstructions(query: string): string {
  const normalized = (query || "").toLowerCase();

  const matchedSkills = ALL_SKILLS.filter((skill) =>
    skill.keywords.some((kw) => normalized.includes(kw.toLowerCase()))
  );

  // If specific skills matched, use those; otherwise provide both foundational skills
  const skillsToUse = matchedSkills.length > 0 ? matchedSkills : ALL_SKILLS;

  return skillsToUse.map((s) => s.getPrompt()).join("\n\n");
}
