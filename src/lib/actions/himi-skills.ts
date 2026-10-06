"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/session";

export async function listSkills() {
  await requireActiveUser();
  try {
    return await prisma.himiSkill.findMany({
      orderBy: [
        { priority: "asc" },
        { createdAt: "desc" },
      ],
    });
  } catch (e) {
    console.error("Failed to query HimiSkill records:", e);
    return [];
  }
}


export async function createSkill(fd: FormData) {
  await requireActiveUser();
  const g = (k: string) => String(fd.get(k) ?? "").trim();

  const name = g("name");
  const rawSlug = g("slug") || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const slug = rawSlug.toLowerCase().trim();
  const instructions = g("instructions");
  const description = g("description") || null;
  const usageGuidance = g("usageGuidance") || null;
  const category = g("category") || "GENERAL";
  const priorityRaw = g("priority");
  const priority = priorityRaw ? parseInt(priorityRaw, 10) : 0;
  const enabled = fd.get("enabled") === "true" || fd.get("enabled") === "on";

  if (!name) {
    return { ok: false, message: "Skill name is required." };
  }
  if (!slug) {
    return { ok: false, message: "Skill slug is required." };
  }
  if (!instructions) {
    return { ok: false, message: "Skill instructions are required." };
  }

  try {
    const existing = await prisma.himiSkill.findUnique({ where: { slug } });
    if (existing) {
      return { ok: false, message: `A skill with slug "${slug}" already exists.` };
    }

    const skill = await prisma.himiSkill.create({
      data: {
        name,
        slug,
        description,
        instructions,
        usageGuidance,
        category,
        priority: isNaN(priority) ? 0 : priority,
        enabled,
      },
    });

    revalidatePath("/settings/himi/skills");
    revalidatePath("/settings/himi");
    return { ok: true, message: `Skill "${skill.name}" created successfully.`, skill };
  } catch (e) {
    return { ok: false, message: `Failed to create skill: ${(e as Error).message}` };
  }
}

export async function updateSkill(id: string, fd: FormData) {
  await requireActiveUser();
  if (!id) {
    return { ok: false, message: "Skill ID is required." };
  }

  const g = (k: string) => String(fd.get(k) ?? "").trim();

  const name = g("name");
  const rawSlug = g("slug") || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const slug = rawSlug.toLowerCase().trim();
  const instructions = g("instructions");
  const description = g("description") || null;
  const usageGuidance = g("usageGuidance") || null;
  const category = g("category") || "GENERAL";
  const priorityRaw = g("priority");
  const priority = priorityRaw ? parseInt(priorityRaw, 10) : 0;
  const enabled = fd.get("enabled") === "true" || fd.get("enabled") === "on";

  if (!name) {
    return { ok: false, message: "Skill name is required." };
  }
  if (!slug) {
    return { ok: false, message: "Skill slug is required." };
  }
  if (!instructions) {
    return { ok: false, message: "Skill instructions are required." };
  }

  try {
    const slugOwner = await prisma.himiSkill.findUnique({ where: { slug } });
    if (slugOwner && slugOwner.id !== id) {
      return { ok: false, message: `Another skill with slug "${slug}" already exists.` };
    }

    const skill = await prisma.himiSkill.update({
      where: { id },
      data: {
        name,
        slug,
        description,
        instructions,
        usageGuidance,
        category,
        priority: isNaN(priority) ? 0 : priority,
        enabled,
      },
    });

    revalidatePath("/settings/himi/skills");
    revalidatePath("/settings/himi");
    return { ok: true, message: `Skill "${skill.name}" updated successfully.`, skill };
  } catch (e) {
    return { ok: false, message: `Failed to update skill: ${(e as Error).message}` };
  }
}

export async function toggleSkillEnabled(id: string, enabled: boolean) {
  await requireActiveUser();
  if (!id) {
    return { ok: false, message: "Skill ID is required." };
  }

  try {
    const skill = await prisma.himiSkill.update({
      where: { id },
      data: { enabled },
    });

    revalidatePath("/settings/himi/skills");
    revalidatePath("/settings/himi");
    return {
      ok: true,
      message: `Skill "${skill.name}" ${enabled ? "enabled" : "disabled"}.`,
      skill,
    };
  } catch (e) {
    return { ok: false, message: `Failed to toggle skill state: ${(e as Error).message}` };
  }
}
