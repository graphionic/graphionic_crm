# ClientForge CRM

Secure, serverless-first CRM for UK/USA/UAE agency outreach — built for Vercel free plan.

**Stack:** Next.js 15 App Router + React 19 + Prisma 6 + Postgres (Neon free) + jose JWT cookie auth + nodemailer + zod. No Tailwind — self-contained CSS in `globals.css` for zero-config Vercel deploys.

## Features

- **Admin login** — bcryptjs + 7-day httpOnly `cf_session` cookie, edge middleware + DB check on every request
- **Lead pipeline** — NEW → QUALIFIED → CONTACTED → REPLIED → CALL_BOOKED → PROPOSAL_SENT → WON / LOST / NURTURE, with every field you asked: business category, company name, contact person, phone, email, website analysis (segment/score/issues/hookLine), follow-up state, opt-in flags
- **Timeline** — every email/WhatsApp/status change logged in `Activity` (direction, channel, body, externalId, error) — never lose context
- **Email sending** — SMTP or Resend API, DNS verification (SPF/DKIM/DMARC) via Google DoH, live "Test connection" button
- **WhatsApp Cloud API** — official Meta API only. Sends are blocked unless `optedInWhatsapp` is set, and free-form text is blocked outside the 24-hour window — enforced in code
- **CSV import** — header auto-mapping (`company_name`, `registered_address`, `hook_line`, `decision_maker`, `contact_no`, etc.) + country guesser + dedupe on companyNumber → email → companyName+postcode
- **Compliance** — suppression list (email + phone), opt-in flags, do-not-contact, auto-suppress on "stop"/"unsubscribe" replies
- **Webhooks** — `/api/webhooks/whatsapp` (GET verify + POST inbound) and `/api/webhooks/email` (generic inbound-parse)

## Models (Prisma)

- `AdminUser` — single admin for now (email unique, bcrypt hash, isActive)
- `Lead` — company, website analysis, contact, pipeline, compliance, counters, notes/tags
- `Activity` — timeline
- `Setting` — encrypted secrets (SMTP pass, WA token, etc.)
- `Suppression` — email/phone that must never be contacted
- `Template` — EMAIL/WHATSAPP reusable copy with placeholders

## Quick start (local)

```bash
# 1. install
npm install

# 2. env
cp .env.example .env
# edit .env — see below

# 3. local Postgres (if you don't have one)
# This repo includes a helper: it already ran initdb in .pgdata/
# If you need to start it:
# /usr/lib/postgresql/17/bin/pg_ctl -D .pgdata -l .pgdata/logfile start

# 4. push schema + seed admin
npx prisma db push
npm run seed

# 5. dev
npm run dev
# → http://localhost:3000
# login with ADMIN_EMAIL / ADMIN_PASSWORD from .env
```

### .env

```
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require&pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://user:pass@host:5432/db?sslmode=disable"  # for migrations, without pgbouncer
SESSION_SECRET="at least 32 random chars — openssl rand -hex 32"
ADMIN_EMAIL="you@example.com"
ADMIN_PASSWORD="12+ chars"
ADMIN_NAME="Your Name"
SETTINGS_ENCRYPTION_KEY="base64 32 bytes — openssl rand -base64 32"
NEXT_PUBLIC_APP_NAME="ClientForge CRM"
APP_URL="http://localhost:3000"   # or your Vercel URL
```

Generate secrets:

```bash
openssl rand -hex 32       # SESSION_SECRET
openssl rand -base64 32    # SETTINGS_ENCRYPTION_KEY
openssl rand -hex 24       # webhook secret (set in UI → Compliance)
```

## Vercel free deploy (Neon free Postgres)

Vercel free plan is a hard constraint — this app is designed for it:

- No extra servers, no Redis, no paid add-ons
- Pooled DB connection (`?pgbouncer=true&connection_limit=1`) — required on serverless
- `prisma generate && next build` as build command
- All routes are `force-dynamic` — no ISR caching that would leak leads

**Steps:**

1. **Neon** — https://neon.tech → Create project (free) → copy:
   - Pooled connection string → `DATABASE_URL` (add `&pgbouncer=true&connection_limit=1`)
   - Direct connection string → `DIRECT_URL`

2. **Vercel** — https://vercel.com → New project → Import this git repo → Framework: Next.js

3. **Env vars in Vercel** (Project → Settings → Environment Variables):
   ```
   DATABASE_URL=...
   DIRECT_URL=...
   SESSION_SECRET=...
   ADMIN_EMAIL=...
   ADMIN_PASSWORD=...
   ADMIN_NAME=...
   SETTINGS_ENCRYPTION_KEY=...
   NEXT_PUBLIC_APP_NAME=ClientForge CRM
   APP_URL=https://your-project.vercel.app
   ```

4. **Deploy** — Vercel will run `prisma generate && next build`

5. **Push schema + seed** — from your local machine, with the production DATABASE_URL in .env:
   ```bash
   npx prisma db push
   npm run seed
   ```

6. **Login** — `https://your-project.vercel.app/login` → ADMIN_EMAIL / ADMIN_PASSWORD

7. **Domain + email DNS** — Settings → Email → enter your sending domain → it shows exact SPF/DKIM/DMARC records → add them at your registrar → "Verify DNS" → "Test connection" → send with `check-auth@verifier.port25.com` to verify.

## Email setup

**You need a second domain for cold outreach** — never send cold from your main domain. Example: if your agency is `clientforge.co.uk`, use `mail.clientforge.co.uk` or `getclientforge.com`.

Settings → Email:

- Provider: SMTP (any) or Resend API
- SMTP: host/port/user/pass — test with "Test connection"
- Resend: API key + from email must be verified in Resend
- From name / Reply-to
- Sending domain — shows DNS records:
  - SPF: `v=spf1 include:_spf.google.com ~all` (or your provider)
  - DKIM: provider-specific TXT
  - DMARC: `v=DMARC1; p=none; rua=mailto:dmarc@yourdomain` — start at `p=none`, ramp to `quarantine` after warm-up
  - MX if using Resend inbound

Warm-up: week 1 = 5 sends/day/mailbox, week 2 = 10-15, week 3 = 20-30. Verify with mail-tester.com.

## WhatsApp setup

**Rule: email and LinkedIn start the conversation. WhatsApp only replies to it.** Cold WhatsApp = ban.

Meta docs: https://developers.facebook.com/docs/whatsapp/cloud-api

1. developers.facebook.com → My Apps → Create App → Business → Add WhatsApp product
2. API Setup → copy Phone number ID + temporary Access token + WhatsApp Business Account ID
3. For production: Business Settings → System Users → Create system user → Assign WhatsApp app → Generate permanent token (temporary tokens expire in 24h)
4. WhatsApp Manager → Message Templates → Create → Wait for approval (minutes to hours)
5. Configuration → Webhook:
   - Callback URL: `https://YOUR-DOMAIN/api/webhooks/whatsapp`
   - Verify token: invent one, paste same value in CRM → Settings → WhatsApp
   - Subscribe to: `messages`, `message_template_status_update`
6. CRM → Settings → WhatsApp → paste IDs + permanent token + verify token → Save → Test connection → Load templates

Sending rules enforced in code (`src/lib/actions/send.ts`):
- `doNotContact` or suppressed → blocked
- No `optedInWhatsapp` → blocked
- Free-form outside 24h window (`lastInboundAt` older than 24h) → blocked, only approved templates allowed
- Every send logged in Activity — success or failure

## Importing the 282 qualified leads

You have:
- `leads-dental-qualified.csv` (130 rows, 98 hooks)
- `leads-trades-qualified.csv` (152 rows, 88 hooks)
- `leads-agencies.csv` (360 raw)

In the CRM: Import → Upload CSV → maps headers automatically → dedupes on companyNumber → email → companyName+postcode → creates leads with `optedInEmail=true` for Ltd/LLP rows, never auto-ticks WhatsApp opt-in.

CSV columns expected (any of these aliases work):
`company_name`, `company_number`, `registered_address`, `city`, `postcode`, `country`, `website`, `website_status`, `segment`, `score`, `issues`, `hook_line`, `contact_name`, `email`, `phone`, `business_category`, `sic_code`, `source`

## Compliance

- UK cold B2B email to Ltd/LLP/PLC is allowed without prior consent (PECR Reg 22 — corporate subscribers) — but you still need real sender identity, honest subject, one-step opt-out, privacy policy, legitimate-interests assessment
- Sole traders / partnerships / individuals = need consent — don't add without basis
- Every send checks suppression list + opt-in + do-not-contact
- Inbound "stop"/"unsubscribe" → auto-suppress + block all channels (see webhook handlers)
- Keep consent records + import sources as long as you hold data

## Project structure

```
src/
  app/
    globals.css          # self-contained design system, no Tailwind
    layout.tsx
    middleware.ts        # edge auth check
    page.tsx             # → /dashboard
    login/               # login page + form
    (app)/
      layout.tsx + shell-client.tsx  # sidebar + header
      dashboard/         # stats, pipeline, follow-ups due
      leads/             # list + detail + new + edit
      import/            # CSV importer
      follow-ups/        # leads with nextFollowUpAt <= now
      outbox/            # recent Activity
      settings/
        email/           # SMTP/Resend + DNS check
        whatsapp/        # Cloud API creds + template loader
        compliance/      # suppression + webhook secret + rules
        templates/       # reusable email/WA copy
    api/
      auth/login, logout
      webhooks/whatsapp, email
  lib/
    prisma.ts
    crypto.ts            # AES-256-GCM for secrets
    session.ts           # jose JWT + requireActiveUser()
    settings.ts          # getSetting/setSettings with encryption + masking
    mailer.ts            # nodemailer / Resend + verifyMail()
    whatsapp.ts          # sendText/sendTemplate/listTemplates/verify + 24h window
    dns.ts               # Google DoH DNS verifier
    constants.ts         # pipeline statuses, segments, countries
    csv.ts               # header alias mapping + country guesser
    actions/
      leads.ts, send.ts, settings.ts, import.ts
  components/
    LeadForm.tsx, CopyButton.tsx
prisma/
  schema.prisma
scripts/
  seed.mjs
```

## Security

- Passwords: bcryptjs 12 rounds
- Sessions: jose JWT, httpOnly, secure in production, sameSite=lax, 7-day expiry, checked at edge + re-checked in DB
- Secrets: AES-256-GCM with SETTINGS_ENCRYPTION_KEY (base64 32B) — never returned to browser, blank field = leave unchanged
- Login rate-limit: 8 attempts / 15 min (in-memory, per IP+email)
- Security headers: HSTS, X-Frame-Options, X-Content-Type-Options, etc. (next.config.mjs)
- No tracking pixels on cold email (PROCESS.md)

## Next steps after deploy

1. Add sending domain + verify DNS
2. Warm-up mailbox 2 weeks
3. Import 282 qualified leads → they become visual pipeline
4. Send 15-20/day using the 3-email sequence (templates already seeded)
5. Log every touch — dashboard shows follow-ups due
6. When they reply → lead moves to REPLIED automatically via webhook → 24h WhatsApp window opens → you can reply on WhatsApp

## Local Postgres helper

```bash
# start
/usr/lib/postgresql/17/bin/pg_ctl -D .pgdata -l .pgdata/logfile start
# stop
/usr/lib/postgresql/17/bin/pg_ctl -D .pgdata stop
# logs
tail -f .pgdata/logfile
```

Don't commit `.pgdata/` or `.env`.
