"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/session";
import { setSettings } from "@/lib/settings";
import { verifyMail } from "@/lib/mailer";
import { listTemplates, verifyWhatsapp } from "@/lib/whatsapp";
import { verifyDns } from "@/lib/dns";

export async function saveMailSettings(fd: FormData) {
  await requireActiveUser();
  const g = (k: string) => String(fd.get(k) ?? "").trim();
  try {
    await setSettings({
      mail_provider: g("mail_provider") || "smtp",
      mail_from_name: g("mail_from_name"),
      mail_from_email: g("mail_from_email"),
      mail_reply_to: g("mail_reply_to"),
      sending_domain: g("sending_domain"),
      smtp_host: g("smtp_host"),
      smtp_port: g("smtp_port") || "587",
      smtp_user: g("smtp_user"),
      smtp_pass: g("smtp_pass"),
      smtp_secure: fd.get("smtp_secure") ? "true" : "false",
      resend_api_key: g("resend_api_key"),
    });
    revalidatePath("/settings/email");
    return { ok: true, message: "Email settings saved." };
  } catch (e) {
    return { ok: false, message: `Save failed: ${(e as Error).message}` };
  }
}

export async function testMailConnection() {
  await requireActiveUser();
  try {
    const r = await verifyMail();
    return r.ok
      ? { ok: true, message: `Connection OK (${r.provider}). You can send.` }
      : { ok: false, message: r.error || "Connection failed." };
  } catch (e) {
    return { ok: false, message: `Test failed: ${(e as Error).message}` };
  }
}

export async function checkDns(domain: string) {
  await requireActiveUser();
  if (!domain) return { ok: false, message: "Enter your sending domain first." };
  try {
    const checks = await verifyDns(domain);
    return { ok: true, checks };
  } catch (e) {
    return { ok: false, message: `DNS check failed: ${(e as Error).message}` };
  }
}

export async function saveWhatsappSettings(fd: FormData) {
  await requireActiveUser();
  const g = (k: string) => String(fd.get(k) ?? "").trim();
  try {
    await setSettings({
      wa_enabled: fd.get("wa_enabled") ? "true" : "false",
      wa_phone_number_id: g("wa_phone_number_id"),
      wa_business_account_id: g("wa_business_account_id"),
      wa_access_token: g("wa_access_token"),
      wa_app_secret: g("wa_app_secret"),
      wa_verify_token: g("wa_verify_token"),
      wa_api_version: g("wa_api_version") || "v21.0",
      wa_default_country_code: g("wa_default_country_code") || "44",
    });
    revalidatePath("/settings/whatsapp");
    return { ok: true, message: "WhatsApp settings saved." };
  } catch (e) {
    return { ok: false, message: `Save failed: ${(e as Error).message}` };
  }
}

export async function testWhatsappConnection() {
  await requireActiveUser();
  try {
    const r = await verifyWhatsapp();
    return r.ok
      ? { ok: true, message: `Connected: ${r.messageId}` }
      : { ok: false, message: r.error || "Connection failed." };
  } catch (e) {
    return { ok: false, message: `Test failed: ${(e as Error).message}` };
  }
}

export async function fetchWhatsappTemplates() {
  await requireActiveUser();
  try {
    const r = await listTemplates();
    return r.ok
      ? { ok: true, templates: r.templates ?? [] }
      : { ok: false, message: r.error || "Could not load templates." };
  } catch (e) {
    return { ok: false, message: `Load failed: ${(e as Error).message}` };
  }
}

export async function saveTemplates(fd: FormData) {
  await requireActiveUser();
  const id = String(fd.get("id") ?? "");
  const data = {
    name: String(fd.get("name") ?? "").trim(),
    channel: String(fd.get("channel") ?? "EMAIL"),
    subject: String(fd.get("subject") ?? "").trim() || null,
    body: String(fd.get("body") ?? ""),
    waTemplateName: String(fd.get("waTemplateName") ?? "").trim() || null,
    waLanguage: String(fd.get("waLanguage") ?? "en_US").trim() || "en_US",
  };
  if (!data.name || !data.body) return { ok: false, message: "Name and body are required." };
  try {
    if (id) await prisma.template.update({ where: { id }, data });
    else await prisma.template.create({ data });
    revalidatePath("/settings/templates");
    return { ok: true, message: "Template saved." };
  } catch (e) {
    return { ok: false, message: `Save failed: ${(e as Error).message}` };
  }
}

export async function deleteTemplate(id: string) {
  await requireActiveUser();
  await prisma.template.delete({ where: { id } });
  revalidatePath("/settings/templates");
  return { ok: true };
}

export async function addSuppression(fd: FormData) {
  await requireActiveUser();
  const value = String(fd.get("value") ?? "").toLowerCase().trim();
  const reason = String(fd.get("reason") ?? "").trim() || "Manually added";
  if (!value) return { ok: false, message: "Enter an email address or phone number." };
  try {
    await prisma.suppression.upsert({
      where: { value },
      create: { value, reason },
      update: { reason },
    });
    revalidatePath("/settings/compliance");
    return { ok: true, message: "Added to suppression list." };
  } catch (e) {
    return { ok: false, message: `Save failed: ${(e as Error).message}` };
  }
}

export async function removeSuppression(id: string) {
  await requireActiveUser();
  await prisma.suppression.delete({ where: { id } });
  revalidatePath("/settings/compliance");
  return { ok: true, message: "Removed." };
}

export async function saveWebhookSecret(fd: FormData) {
  await requireActiveUser();
  const value = String(fd.get("watch_secret") ?? "").trim();
  if (value.length < 16) {
    return { ok: false, message: "Use at least 16 characters. Generate one with: openssl rand -hex 24" };
  }
  try {
    await setSettings({ watch_secret: value });
    revalidatePath("/settings/compliance");
    return { ok: true, message: "Webhook secret saved. Use it in the ?secret= parameter." };
  } catch (e) {
    return { ok: false, message: `Save failed: ${(e as Error).message}` };
  }
}
