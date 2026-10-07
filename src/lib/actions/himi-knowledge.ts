"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/session";

// ---------------------------------------------------------------- BUSINESS PROFILE

export async function getBusinessProfile() {
  await requireActiveUser();
  try {
    return await prisma.himiBusinessProfile.findUnique({
      where: { id: "default" },
    });
  } catch (e) {
    console.error("Failed to query HimiBusinessProfile:", e);
    return null;
  }
}

export async function upsertBusinessProfile(fd: FormData) {
  await requireActiveUser();
  const g = (k: string) => String(fd.get(k) ?? "").trim();

  const businessName = g("businessName");
  const description = g("description") || null;
  const industry = g("industry") || null;
  const website = g("website") || null;
  const contactEmail = g("contactEmail") || null;
  const contactPhone = g("contactPhone") || null;
  const headquarters = g("headquarters") || null;
  const targetMarkets = g("targetMarkets") || null;
  const valueProposition = g("valueProposition") || null;
  const positioning = g("positioning") || null;
  const pricingPolicy = g("pricingPolicy") || null;
  const salesGuidance = g("salesGuidance") || null;

  if (!businessName) {
    return { ok: false, message: "Business name is required." };
  }

  try {
    const profile = await prisma.himiBusinessProfile.upsert({
      where: { id: "default" },
      update: {
        businessName,
        description,
        industry,
        website,
        contactEmail,
        contactPhone,
        headquarters,
        targetMarkets,
        valueProposition,
        positioning,
        pricingPolicy,
        salesGuidance,
      },
      create: {
        id: "default",
        businessName,
        description,
        industry,
        website,
        contactEmail,
        contactPhone,
        headquarters,
        targetMarkets,
        valueProposition,
        positioning,
        pricingPolicy,
        salesGuidance,
      },
    });

    revalidatePath("/settings/himi/knowledge");
    return { ok: true, profile, message: "Business profile saved successfully." };
  } catch (e) {
    console.error("Failed to upsert HimiBusinessProfile:", e);
    return { ok: false, message: "Failed to save business profile." };
  }
}

// ---------------------------------------------------------------- SERVICES

export async function listBusinessServices() {
  await requireActiveUser();
  try {
    return await prisma.himiService.findMany({
      orderBy: [
        { priority: "asc" },
        { createdAt: "desc" },
      ],
    });
  } catch (e) {
    console.error("Failed to query HimiService records:", e);
    return [];
  }
}

export async function createBusinessService(fd: FormData) {
  await requireActiveUser();
  const g = (k: string) => String(fd.get(k) ?? "").trim();

  const name = g("name");
  const category = g("category") || null;
  const description = g("description") || null;
  const deliverables = g("deliverables") || null;
  const technologies = g("technologies") || null;
  const idealCustomer = g("idealCustomer") || null;
  const pricingGuidance = g("pricingGuidance") || null;
  const timelineGuidance = g("timelineGuidance") || null;
  const salesNotes = g("salesNotes") || null;
  const priorityRaw = g("priority");
  const priority = priorityRaw ? parseInt(priorityRaw, 10) : 0;
  const enabled = fd.get("enabled") === "true" || fd.get("enabled") === "on";

  if (!name) {
    return { ok: false, message: "Service name is required." };
  }

  try {
    const service = await prisma.himiService.create({
      data: {
        name,
        category,
        description,
        deliverables,
        technologies,
        idealCustomer,
        pricingGuidance,
        timelineGuidance,
        salesNotes,
        enabled,
        priority: isNaN(priority) ? 0 : priority,
      },
    });

    revalidatePath("/settings/himi/knowledge");
    return { ok: true, service, message: "Service created successfully." };
  } catch (e) {
    console.error("Failed to create HimiService:", e);
    return { ok: false, message: "Failed to create service." };
  }
}

export async function updateBusinessService(id: string, fd: FormData) {
  await requireActiveUser();
  const g = (k: string) => String(fd.get(k) ?? "").trim();

  const name = g("name");
  const category = g("category") || null;
  const description = g("description") || null;
  const deliverables = g("deliverables") || null;
  const technologies = g("technologies") || null;
  const idealCustomer = g("idealCustomer") || null;
  const pricingGuidance = g("pricingGuidance") || null;
  const timelineGuidance = g("timelineGuidance") || null;
  const salesNotes = g("salesNotes") || null;
  const priorityRaw = g("priority");
  const priority = priorityRaw ? parseInt(priorityRaw, 10) : 0;
  const enabled = fd.get("enabled") === "true" || fd.get("enabled") === "on";

  if (!name) {
    return { ok: false, message: "Service name is required." };
  }

  try {
    const service = await prisma.himiService.update({
      where: { id },
      data: {
        name,
        category,
        description,
        deliverables,
        technologies,
        idealCustomer,
        pricingGuidance,
        timelineGuidance,
        salesNotes,
        enabled,
        priority: isNaN(priority) ? 0 : priority,
      },
    });

    revalidatePath("/settings/himi/knowledge");
    return { ok: true, service, message: "Service updated successfully." };
  } catch (e) {
    console.error("Failed to update HimiService:", e);
    return { ok: false, message: "Failed to update service." };
  }
}

export async function toggleBusinessServiceEnabled(id: string, enabled: boolean) {
  await requireActiveUser();
  try {
    await prisma.himiService.update({
      where: { id },
      data: { enabled },
    });
    revalidatePath("/settings/himi/knowledge");
    return { ok: true };
  } catch (e) {
    console.error("Failed to toggle HimiService enabled status:", e);
    return { ok: false, message: "Failed to update service status." };
  }
}

// ---------------------------------------------------------------- PORTFOLIO

export async function listBusinessPortfolio() {
  await requireActiveUser();
  try {
    return await prisma.himiPortfolioItem.findMany({
      orderBy: [
        { priority: "asc" },
        { createdAt: "desc" },
      ],
    });
  } catch (e) {
    console.error("Failed to query HimiPortfolioItem records:", e);
    return [];
  }
}

export async function createBusinessPortfolioItem(fd: FormData) {
  await requireActiveUser();
  const g = (k: string) => String(fd.get(k) ?? "").trim();

  const projectName = g("projectName");
  const clientName = g("clientName") || null;
  const industry = g("industry") || null;
  const description = g("description") || null;
  const servicesProvided = g("servicesProvided") || null;
  const technologies = g("technologies") || null;
  const resultOutcome = g("resultOutcome") || null;
  const projectUrl = g("projectUrl") || null;
  const priorityRaw = g("priority");
  const priority = priorityRaw ? parseInt(priorityRaw, 10) : 0;
  const enabled = fd.get("enabled") === "true" || fd.get("enabled") === "on";

  if (!projectName) {
    return { ok: false, message: "Project name is required." };
  }

  try {
    const item = await prisma.himiPortfolioItem.create({
      data: {
        projectName,
        clientName,
        industry,
        description,
        servicesProvided,
        technologies,
        resultOutcome,
        projectUrl,
        enabled,
        priority: isNaN(priority) ? 0 : priority,
      },
    });

    revalidatePath("/settings/himi/knowledge");
    return { ok: true, item, message: "Portfolio item created successfully." };
  } catch (e) {
    console.error("Failed to create HimiPortfolioItem:", e);
    return { ok: false, message: "Failed to create portfolio item." };
  }
}

export async function updateBusinessPortfolioItem(id: string, fd: FormData) {
  await requireActiveUser();
  const g = (k: string) => String(fd.get(k) ?? "").trim();

  const projectName = g("projectName");
  const clientName = g("clientName") || null;
  const industry = g("industry") || null;
  const description = g("description") || null;
  const servicesProvided = g("servicesProvided") || null;
  const technologies = g("technologies") || null;
  const resultOutcome = g("resultOutcome") || null;
  const projectUrl = g("projectUrl") || null;
  const priorityRaw = g("priority");
  const priority = priorityRaw ? parseInt(priorityRaw, 10) : 0;
  const enabled = fd.get("enabled") === "true" || fd.get("enabled") === "on";

  if (!projectName) {
    return { ok: false, message: "Project name is required." };
  }

  try {
    const item = await prisma.himiPortfolioItem.update({
      where: { id },
      data: {
        projectName,
        clientName,
        industry,
        description,
        servicesProvided,
        technologies,
        resultOutcome,
        projectUrl,
        enabled,
        priority: isNaN(priority) ? 0 : priority,
      },
    });

    revalidatePath("/settings/himi/knowledge");
    return { ok: true, item, message: "Portfolio item updated successfully." };
  } catch (e) {
    console.error("Failed to update HimiPortfolioItem:", e);
    return { ok: false, message: "Failed to update portfolio item." };
  }
}

export async function toggleBusinessPortfolioItemEnabled(id: string, enabled: boolean) {
  await requireActiveUser();
  try {
    await prisma.himiPortfolioItem.update({
      where: { id },
      data: { enabled },
    });
    revalidatePath("/settings/himi/knowledge");
    return { ok: true };
  } catch (e) {
    console.error("Failed to toggle HimiPortfolioItem enabled status:", e);
    return { ok: false, message: "Failed to update portfolio status." };
  }
}
