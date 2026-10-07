import { prisma } from "@/lib/prisma";

export interface DynamicSkillMetadata {
  id: string;
  slug: string;
  name: string;
}

export interface DynamicResourceMetadata {
  id: string;
  title: string;
  skillId: string;
}

export interface DynamicSkillDiscoveryResult {
  instructions: string;
  skills: DynamicSkillMetadata[];
  resources: DynamicResourceMetadata[];
}

export const MAX_TOTAL_RESOURCE_CHARS = 5000;
export const MAX_RESOURCES_PER_SKILL = 5;

/**
 * Semantically discovers and returns guidance for enabled HimiSkills from Prisma.
 * Uses a lightweight, fast OpenAI completion call to evaluate skill metadata relevance.
 * Loads enabled supporting resources for selected skills within character budgets.
 * Gracefully returns safe empty metadata on any failure or if no skills are relevant.
 */
export async function getDynamicSkillInstructions(
  userPrompt: string,
  apiKey: string,
  modelName: string
): Promise<DynamicSkillDiscoveryResult> {
  const emptyResult: DynamicSkillDiscoveryResult = {
    instructions: "",
    skills: [],
    resources: [],
  };

  if (!userPrompt || !apiKey) {
    return emptyResult;
  }

  try {
    // 1. Fetch enabled HimiSkill records from Prisma
    const enabledSkills = await prisma.himiSkill.findMany({
      where: { enabled: true },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        usageGuidance: true,
        instructions: true,
        priority: true,
      },
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    });

    if (!enabledSkills || enabledSkills.length === 0) {
      return emptyResult;
    }

    // 2. Format metadata for semantic selection (excluding heavy procedural instructions & resources)
    const skillsMetadata = enabledSkills.map((s) => ({
      slug: s.slug,
      name: s.name,
      description: s.description || "",
      usageGuidance: s.usageGuidance || "",
    }));

    const systemPrompt = `You are an expert skill selector for ClientForge CRM AI.
Given the user's message and available skills, select which skills (if any) are semantically relevant.

Rules:
- Respond in JSON format: { "selectedSlugs": ["slug1", ...] }
- Return { "selectedSlugs": [] } if the query is a simple lead lookup, specific entity detail request, or simple action.
- Select at most 2 skills.
- Select a skill ONLY if its usage guidance or description directly matches the user's intent.`;

    const userMessage = `[User Message]\n"${userPrompt}"\n\n[Available Skills]\n${JSON.stringify(skillsMetadata, null, 2)}`;

    // Fast completion call using fetch with 8s timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    let selectedSlugs: string[] = [];

    try {
      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelName.includes("gpt-5") ? "gpt-4o-mini" : modelName,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          response_format: { type: "json_object" },
          temperature: 0,
          max_tokens: 150,
        }),
        signal: controller.signal,
      });

      if (resp.ok) {
        const data = await resp.json();
        const content = data?.choices?.[0]?.message?.content || "";
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed?.selectedSlugs)) {
          selectedSlugs = parsed.selectedSlugs.map((s: any) => String(s).trim());
        }
      }
    } catch (selectionErr) {
      console.error("[Skill Discovery Selection Error]:", selectionErr);
    } finally {
      clearTimeout(timeout);
    }

    if (!selectedSlugs || selectedSlugs.length === 0) {
      return emptyResult;
    }

    // Limit to max 2 skills per turn
    const selectedSet = new Set(selectedSlugs.slice(0, 2));
    const matchedSkills = enabledSkills.filter((s) => selectedSet.has(s.slug));

    if (matchedSkills.length === 0) {
      return emptyResult;
    }

    const selectedSkillsMeta: DynamicSkillMetadata[] = matchedSkills.map((s) => ({
      id: s.id,
      slug: s.slug,
      name: s.name,
    }));

    // 3. Fetch enabled supporting resources for selected skill IDs
    const selectedSkillIds = matchedSkills.map((s) => s.id);
    const resourcesBySkillId: Record<
      string,
      Array<{ id: string; skillId: string; title: string; content: string }>
    > = {};

    try {
      const enabledResources = await prisma.himiSkillResource.findMany({
        where: {
          skillId: { in: selectedSkillIds },
          enabled: true,
        },
        select: {
          id: true,
          skillId: true,
          title: true,
          content: true,
        },
        orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
      });

      for (const r of enabledResources) {
        if (!resourcesBySkillId[r.skillId]) {
          resourcesBySkillId[r.skillId] = [];
        }
        if (resourcesBySkillId[r.skillId].length < MAX_RESOURCES_PER_SKILL) {
          resourcesBySkillId[r.skillId].push({
            id: r.id,
            skillId: r.skillId,
            title: r.title.trim(),
            content: r.content.trim(),
          });
        }
      }
    } catch (resErr) {
      console.error("[Resource Loading Failure]:", resErr);
      // Fail safely: continue with selected skill instructions only
    }

    // 4. Compose guidance blocks while enforcing total resource character budget without truncating individual resources
    let totalResourceCharsUsed = 0;
    const guidanceBlocks: string[] = [];
    const loadedResources: DynamicResourceMetadata[] = [];

    for (const s of matchedSkills) {
      let skillBlock = `[Skill: ${s.name}]\n${s.instructions.trim()}`;

      const skillResources = resourcesBySkillId[s.id] || [];
      for (const res of skillResources) {
        if (totalResourceCharsUsed + res.content.length <= MAX_TOTAL_RESOURCE_CHARS) {
          skillBlock += `\n\n[Resource: ${res.title}]\n${res.content}`;
          totalResourceCharsUsed += res.content.length;
          loadedResources.push({
            id: res.id,
            title: res.title,
            skillId: res.skillId,
          });
        }
      }

      guidanceBlocks.push(skillBlock);
    }

    const instructions = `--- RELEVANT SKILL GUIDANCE ---\n\n${guidanceBlocks.join("\n\n")}`;

    return {
      instructions,
      skills: selectedSkillsMeta,
      resources: loadedResources,
    };
  } catch (err) {
    console.error("[Dynamic Skill Discovery Failure]:", err);
    return emptyResult;
  }
}
