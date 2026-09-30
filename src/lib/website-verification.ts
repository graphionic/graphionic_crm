/**
 * ClientForge CRM — Website Verification
 * Generic HTTP/HTTPS live site detection and domain parsing utility
 */

export const GENERIC_EMAIL_DOMAINS = new Set([
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com',
  'icloud.com', 'protonmail.com', 'proton.me', 'yandex.com', 'mail.com',
  'gmx.com', 'zoho.com', 'yahoo.co.uk', 'hotmail.co.uk', 'outlook.co.uk',
  'live.com', 'msn.com', 'googlemail.com', 'ymail.com', 'inbox.com',
  'me.com', 'mac.com', 'qq.com', '163.com', '126.com'
]);

export const USER_AGENT = 'ClientForge-CRM/1.0';

export interface WebsiteCheckOptions {
  httpsCheck?: boolean;
  httpFallback?: boolean;
  followRedirects?: boolean;
  timeoutMs?: number;
  maxRedirects?: number;
  maxBodyBytes?: number;
  userAgent?: string;
}

export interface WebsiteCheckResult {
  live: boolean;
  reason: string;
  statusCode?: number;
  finalUrl?: string;
  redirectCount?: number;
  bodyLength?: number;
}

const DEFAULT_OPTIONS: Required<WebsiteCheckOptions> = {
  httpsCheck: true,
  httpFallback: true,
  followRedirects: true,
  timeoutMs: 8000,
  maxRedirects: 3,
  maxBodyBytes: 200_000, // 200KB safety limit
  userAgent: USER_AGENT,
};

/**
 * Extract domain from email safely
 */
export function extractEmailDomain(email: string): string | null {
  if (!email || typeof email !== 'string') return null;
  const trimmed = email.trim().toLowerCase();
  if (!trimmed.includes('@')) return null;
  const parts = trimmed.split('@');
  if (parts.length !== 2) return null;
  const domain = parts[1].trim();
  if (!domain || domain.length < 4 || !domain.includes('.')) return null;
  if (domain.includes(' ') || domain.includes('/') || domain.includes('\\')) return null;
  return domain;
}

/**
 * Check if domain is generic provider
 */
export function isGenericEmailDomain(domain: string): boolean {
  if (!domain) return false;
  return GENERIC_EMAIL_DOMAINS.has(domain.toLowerCase().trim());
}

/**
 * Validate domain format
 */
export function isValidDomain(domain: string): boolean {
  if (!domain || typeof domain !== 'string') return false;
  const d = domain.toLowerCase().trim();
  if (d.length < 4 || d.length > 253) return false;
  if (!d.includes('.')) return false;
  if (GENERIC_EMAIL_DOMAINS.has(d)) return false;
  if (d.includes(' ') || d.includes('/') || d.includes('\\')) return false;
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(d)) return false;
  return true;
}

/**
 * Check if HTTP response body looks like real HTML site
 */
function isRealHtmlBody(body: string, statusCode: number): { isReal: boolean; reason: string } {
  if (statusCode < 200 || statusCode >= 400) {
    return { isReal: false, reason: `status_${statusCode}` };
  }
  if (!body || body.length < 500) {
    return { isReal: false, reason: `body_too_small_${body?.length || 0}` };
  }
  const lower = body.toLowerCase();
  const hasHtml = lower.includes('<html') || lower.includes('<!doctype') || lower.includes('<body');
  if (!hasHtml) {
    return { isReal: false, reason: 'no_html_tag' };
  }
  return { isReal: true, reason: 'valid_html' };
}

/**
 * Fetch with timeout, redirect handling, body limit
 */
async function fetchWithSafety(
  url: string,
  options: Required<WebsiteCheckOptions>,
  redirectCount = 0
): Promise<WebsiteCheckResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': options.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: controller.signal,
      // @ts-ignore - Next.js fetch supports redirect manual
      redirect: options.followRedirects ? 'follow' : 'manual',
    });

    clearTimeout(timeout);

    const statusCode = res.status;

    if (options.followRedirects && [301, 302, 303, 307, 308].includes(statusCode)) {
      if (redirectCount >= options.maxRedirects) {
        return {
          live: false,
          reason: `too_many_redirects_${redirectCount}`,
          statusCode,
          finalUrl: url,
          redirectCount,
        };
      }
      const location = res.headers.get('location');
      if (!location) {
        return {
          live: false,
          reason: 'redirect_no_location',
          statusCode,
          finalUrl: url,
          redirectCount,
        };
      }
      const nextUrl = new URL(location, url).toString();
      return fetchWithSafety(nextUrl, options, redirectCount + 1);
    }

    if (statusCode >= 200 && statusCode < 400) {
      const reader = res.body?.getReader();
      let body = '';
      let totalBytes = 0;

      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            totalBytes += value.length;
            if (totalBytes > options.maxBodyBytes) {
              body += new TextDecoder().decode(value.slice(0, options.maxBodyBytes - (totalBytes - value.length)));
              break;
            }
            body += new TextDecoder().decode(value);
            if (body.length > 2000 && body.toLowerCase().includes('<html')) {
              if (body.length > 5000) break;
            }
          }
        } catch {
          // Ignore read errors
        } finally {
          try { reader.releaseLock(); } catch {}
        }
      } else {
        const text = await res.text().catch(() => '');
        body = text.slice(0, options.maxBodyBytes);
        totalBytes = body.length;
      }

      const htmlCheck = isRealHtmlBody(body, statusCode);
      return {
        live: htmlCheck.isReal,
        reason: htmlCheck.reason,
        statusCode,
        finalUrl: url,
        redirectCount,
        bodyLength: totalBytes,
      };
    }

    return {
      live: false,
      reason: `status_${statusCode}`,
      statusCode,
      finalUrl: url,
      redirectCount,
    };
  } catch (err: any) {
    clearTimeout(timeout);
    const message = err?.name === 'AbortError' ? 'timeout' : err?.message || 'fetch_error';
    return {
      live: false,
      reason: message.includes('timeout') ? 'timeout' : 'fetch_error',
      finalUrl: url,
      redirectCount,
    };
  }
}

/**
 * Main: Check if email domain has live website
 */
export async function hasLiveWebsite(
  domain: string,
  opts: WebsiteCheckOptions = {}
): Promise<WebsiteCheckResult> {
  const options = { ...DEFAULT_OPTIONS, ...opts };

  if (!domain) {
    return { live: false, reason: 'no_domain' };
  }

  const normalized = domain.toLowerCase().trim();

  if (GENERIC_EMAIL_DOMAINS.has(normalized)) {
    return { live: false, reason: 'generic_domain' };
  }

  if (normalized.length < 4 || !normalized.includes('.')) {
    return { live: false, reason: 'invalid_domain_format' };
  }

  if (options.httpsCheck) {
    const httpsResult = await fetchWithSafety(`https://${normalized}`, options, 0);
    if (httpsResult.live) {
      return { ...httpsResult, reason: `https_${httpsResult.reason}` };
    }
    if (options.httpFallback) {
      const httpResult = await fetchWithSafety(`http://${normalized}`, options, 0);
      if (httpResult.live) {
        return { ...httpResult, reason: `http_${httpResult.reason}` };
      }
      return httpResult;
    }
    return httpsResult;
  }

  if (options.httpFallback) {
    return fetchWithSafety(`http://${normalized}`, options, 0);
  }

  return { live: false, reason: 'checks_disabled' };
}

/**
 * High-level lead verification using rules
 */
export interface LeadVerificationInput {
  email?: string | null;
  website?: string | null;
  companyName?: string | null;
}

export interface LeadVerificationResult {
  shouldReject: boolean;
  rejectionReason?: string;
  rejectionRule?: string;
  emailDomain?: string | null;
  websiteCheck?: WebsiteCheckResult | null;
}

export async function verifyLeadWebsite(
  input: LeadVerificationInput,
  rules: {
    requireNoWebsite?: boolean;
    rejectExistingWebsite?: boolean;
    rejectGeneric?: boolean;
    verifyEmailDomainWebsite?: boolean;
    httpsCheck?: boolean;
    httpFallback?: boolean;
    followRedirects?: boolean;
  } = {},
  checkOptions: WebsiteCheckOptions = {}
): Promise<LeadVerificationResult> {
  const {
    requireNoWebsite = true,
    rejectExistingWebsite = true,
    rejectGeneric = true,
    verifyEmailDomainWebsite = true,
    httpsCheck = true,
    httpFallback = true,
    followRedirects = true,
  } = rules;

  const website = (input.website || '').trim();
  const email = (input.email || '').trim();

  if (website && (requireNoWebsite || rejectExistingWebsite)) {
    return {
      shouldReject: true,
      rejectionReason: `website_present: ${website.slice(0, 100)}`,
      rejectionRule: 'require_no_website',
      emailDomain: extractEmailDomain(email),
      websiteCheck: null,
    };
  }

  const emailDomain = extractEmailDomain(email);

  if (!emailDomain) {
    return {
      shouldReject: false,
      emailDomain: null,
      websiteCheck: null,
    };
  }

  if (rejectGeneric && isGenericEmailDomain(emailDomain)) {
    return {
      shouldReject: true,
      rejectionReason: `generic_domain: ${emailDomain}`,
      rejectionRule: 'reject_generic',
      emailDomain,
      websiteCheck: null,
    };
  }

  if (verifyEmailDomainWebsite) {
    const websiteCheck = await hasLiveWebsite(emailDomain, {
      httpsCheck,
      httpFallback,
      followRedirects,
      ...checkOptions,
    });

    if (websiteCheck.live) {
      return {
        shouldReject: true,
        rejectionReason: `email_domain_has_live_site: ${emailDomain} (${websiteCheck.reason} ${websiteCheck.statusCode || ''})`,
        rejectionRule: 'verify_email_domain_website',
        emailDomain,
        websiteCheck,
      };
    }

    return {
      shouldReject: false,
      emailDomain,
      websiteCheck,
    };
  }

  return {
    shouldReject: false,
    emailDomain,
    websiteCheck: null,
  };
}
