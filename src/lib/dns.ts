import "server-only";

/**
 * DNS record helper + live verification.
 *
 * Uses Google's public DNS-over-HTTPS resolver (free, no API key) to check
 * whether the SPF / DKIM / DMARC records you were given are actually live.
 * This is what powers the "Verify DNS" button in Settings → Email.
 */

export type DnsRecord = {
  type: string;
  host: string;
  value: string;
  purpose: string;
  required: boolean;
};

export type DnsCheck = {
  host: string;
  matches: "yes" | "no" | "partial";
  found: string;
  expected: string;
};

async function resolve(name: string, type: "TXT" | "MX"): Promise<string[]> {
  try {
    const url = `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`;
    const res = await fetch(url, { headers: { accept: "application/dns-json" } });
    if (!res.ok) return [];
    const data = await res.json().catch(() => ({}));
    const answers = (data?.Answer ?? []) as Array<{ data: string; type: number }>;
    return answers.map((a) => (a.data || "").replace(/^"|"$/g, "").replace(/"\s*"/g, ""));
  } catch {
    return [];
  }
}

/** The records your sending domain needs. Shown in the UI as a table. */
export function expectedRecords(domain: string, provider: string): DnsRecord[] {
  const base: DnsRecord[] = [
    {
      type: "TXT",
      host: "@ (or blank)",
      value: "v=spf1 include:_spf.google.com ~all",
      purpose:
        "SPF — authorises who may send email as your domain. Swap the include for your provider: Resend → include:amazonses.com · Brevo → include:spf.brevo.com · Mailgun → include:mailgun.org",
      required: true,
    },
    {
      type: "TXT",
      host: "google._domainkey  (name varies by provider)",
      value: "v=DKIM1; k=rsa; p=<public key from your mail provider>",
      purpose: "DKIM — cryptographically signs each email so it can't be forged",
      required: true,
    },
    {
      type: "TXT",
      host: "_dmarc",
      value: "v=DMARC1; p=none; rua=mailto:dmarc@" + (domain || "yourdomain.com"),
      purpose:
        "DMARC — tells receivers what to do when SPF/DKIM fail. START AT p=none, move to p=quarantine after 3–4 weeks of clean reports. Never jump straight to p=reject.",
      required: true,
    },
  ];

  if (provider === "resend") {
    base.push(
      {
        type: "TXT",
        host: "resend._domainkey",
        value: "<DKIM key shown in your Resend dashboard>",
        purpose: "Resend DKIM key",
        required: true,
      },
      {
        type: "MX",
        host: "send",
        value: "feedback-smtp.<region>.amazonses.com  (priority 10)",
        purpose: "Resend Return-Path / bounce handling",
        required: true,
      }
    );
  }
  return base;
}

/** Live DNS check — resolves the real records and compares. */
export async function verifyDns(domain: string): Promise<DnsCheck[]> {
  if (!domain) return [];
  const [spf, dmarc, mx] = await Promise.all([
    resolve(domain, "TXT"),
    resolve(`_dmarc.${domain}`, "TXT"),
    resolve(domain, "MX"),
  ]);

  const spfRec = spf.find((r) => r.toLowerCase().startsWith("v=spf1")) || "";
  const dmarcRec = dmarc.find((r) => r.toLowerCase().startsWith("v=dmarc1")) || "";

  const checks: DnsCheck[] = [
    {
      host: domain,
      expected: "v=spf1 ...",
      found: spfRec || "(none found)",
      matches: spfRec ? "yes" : "no",
    },
    {
      host: `_dmarc.${domain}`,
      expected: "v=DMARC1; p=none; ...",
      found: dmarcRec || "(none found)",
      matches: dmarcRec
        ? dmarcRec.toLowerCase().includes("p=none")
          ? "partial"
          : "yes"
        : "no",
    },
    {
      host: domain,
      expected: "MX record",
      found: mx.length ? mx.join(", ") : "(none found)",
      matches: mx.length ? "yes" : "no",
    },
    {
      host: `google._domainkey.${domain}`,
      expected: "v=DKIM1; ...",
      found: "(checked on save — selector name varies)",
      matches: "partial",
    },
  ];
  return checks;
}
