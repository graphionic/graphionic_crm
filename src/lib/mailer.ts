import "server-only";
import nodemailer from "nodemailer";
import { mailConfig } from "./settings";

export type SendResult = {
  ok: boolean;
  provider: string;
  messageId?: string;
  error?: string;
};

function isConfigured(c: Awaited<ReturnType<typeof mailConfig>>) {
  if (c.provider === "resend") return Boolean(c.resendApiKey && c.fromEmail);
  if (c.provider === "smtp") return Boolean(c.smtpHost && c.smtpUser && c.smtpPass);
  return false;
}

function textToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  const withLinks = escaped.replace(
    /\bhttps?:\/\/[^\s<>'"]+/gi,
    (url) => `<a href="${url}" style="color: #2563eb; text-decoration: underline;">${url}</a>`
  );

  const paragraphs = withLinks.split(/\n{2,}/);
  const htmlBody = paragraphs
    .map((p) => `<p style="margin: 0 0 14px 0; line-height: 1.6;">${p.replace(/\n/g, "<br/>")}</p>`)
    .join("\n");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #151927; margin: 0; padding: 0;">
  <div>
${htmlBody}
  </div>
</body>
</html>`;
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  body: string;
  html?: string;
  replyTo?: string;
}): Promise<SendResult> {
  const c = await mailConfig();
  if (!isConfigured(c)) {
    return { ok: false, provider: c.provider, error: "Mail is not configured. Open Settings → Email." };
  }
  const from = c.fromName ? `${c.fromName} <${c.fromEmail}>` : c.fromEmail;
  const html = opts.html || textToHtml(opts.body);

  if (c.provider === "resend") {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${c.resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [opts.to],
          subject: opts.subject,
          text: opts.body,
          html,
          reply_to: opts.replyTo || c.replyTo || c.fromEmail,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { ok: false, provider: "resend", error: data?.message || `HTTP ${res.status}` };
      }
      return { ok: true, provider: "resend", messageId: data?.id };
    } catch (e) {
      return { ok: false, provider: "resend", error: (e as Error).message };
    }
  }

  // ---- SMTP ----
  try {
    const transport = nodemailer.createTransport({
      host: c.smtpHost,
      port: c.smtpPort,
      secure: c.smtpSecure,
      auth: { user: c.smtpUser, pass: c.smtpPass },
    });
    const info = await transport.sendMail({
      from,
      to: opts.to,
      subject: opts.subject,
      text: opts.body,
      html,
      replyTo: opts.replyTo || c.replyTo || undefined,
    });
    return { ok: true, provider: "smtp", messageId: info.messageId };
  } catch (e) {
    return { ok: false, provider: "smtp", error: (e as Error).message };
  }
}

/** "Test connection" button in Settings. */
export async function verifyMail(): Promise<SendResult> {
  const c = await mailConfig();
  if (!isConfigured(c)) {
    return { ok: false, provider: c.provider, error: "Missing credentials." };
  }
  if (c.provider === "resend") {
    try {
      const res = await fetch("https://api.resend.com/domains", {
        headers: { Authorization: `Bearer ${c.resendApiKey}` },
      });
      if (res.ok) return { ok: true, provider: "resend" };
      const d = await res.json().catch(() => ({}));
      return { ok: false, provider: "resend", error: d?.message || `HTTP ${res.status}` };
    } catch (e) {
      return { ok: false, provider: "resend", error: (e as Error).message };
    }
  }
  try {
    const transport = nodemailer.createTransport({
      host: c.smtpHost,
      port: c.smtpPort,
      secure: c.smtpSecure,
      auth: { user: c.smtpUser, pass: c.smtpPass },
    });
    await transport.verify();
    return { ok: true, provider: "smtp" };
  } catch (e) {
    return { ok: false, provider: "smtp", error: (e as Error).message };
  }
}
