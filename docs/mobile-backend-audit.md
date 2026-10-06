# ClientForge Mobile Backend Audit & Specification

## Executive Summary
This document provides a comprehensive audit of the existing **ClientForge** Next.js 15 backend architecture, authentication system, database models, dashboard queries, and HIMI AI integration. It forms the authoritative specification for Phase 6 (Mobile API & Authentication Implementation).

---

## A. Current Authentication Architecture

* **Framework & Version**: Next.js `15.1.6` (App Router, Node.js runtime).
* **Database & ORM**: PostgreSQL via Prisma ORM (`@prisma/client` `^6.2.1`).
* **Authentication Method**: Custom JWT-based session handling using `jose` (`^5.9.6`) stored in signed HTTP cookies.
* **Password Hashing**: `bcryptjs` (`^2.4.3`) with 10 salt rounds.
* **User Model**: `AdminUser` table in Prisma schema.
  ```prisma
  model AdminUser {
    id           String    @id @default(cuid())
    email        String    @unique
    name         String?
    passwordHash String
    isActive     Boolean   @default(true)
    lastLoginAt  DateTime?
    createdAt    DateTime  @default(now())
    updatedAt    DateTime  @updatedAt
  }
  ```

---

## B. Login Flow

* **Endpoint**: `POST /api/auth/login`
* **File Location**: `src/app/api/auth/login/route.ts`
* **Request Format**: `Content-Type: application/json`
  ```json
  {
    "email": "agent@clientforge.io",
    "password": "yourpassword",
    "next": "/dashboard"
  }
  ```
* **Validation & Processing**:
  1. **Rate Limiting**: In-memory IP-based limit (max 8 attempts per 15-minute window). Exceeding returns `429 Too Many Requests`.
  2. **Zod Schema Validation**: Validates email format and presence of password.
  3. **User Lookup**: Queries `AdminUser` by `email.toLowerCase().trim()`.
  4. **Password Comparison**: Uses `bcrypt.compare()` (includes dummy hash fallback to prevent timing side-channel attacks).
  5. **Active Account Check**: Rejects if `isActive === false`.
  6. **Database Update**: Updates `lastLoginAt` timestamp.
  7. **Session Creation**: Invokes `createSession()` to sign JWT and set cookie.
* **Response Format**:
  * **Success (`200 OK`)**:
    ```json
    { "ok": true, "redirect": "/dashboard" }
    ```
  * **Invalid Credentials (`401 Unauthorized`)**:
    ```json
    { "error": "Incorrect email or password." }
    ```
  * **Rate Limited (`429 Too Many Requests`)**:
    ```json
    { "error": "Too many attempts. Try again in 15 minutes." }
    ```

---

## C. Session & Token Lifecycle

* **Session Storage**: Signed JWT stored in HTTP-only cookie named `cf_session`.
* **Cookie Parameters**:
  * `httpOnly`: `true`
  * `secure`: `true` in production (`process.env.NODE_ENV === "production"`)
  * `sameSite`: `"lax"`
  * `path`: `"/"`
  * `maxAge`: `604800` seconds (7 days)
* **JWT Token Spec**:
  * Algorithm: `HS256`
  * Subject (`sub`): `AdminUser.id` (cuid string)
  * Claims: `{ "email": string, "name": string | null }`
  * Expiry (`exp`): 7 days
  * Secret: `process.env.SESSION_SECRET` (minimum 32-character string)
* **Server Verification Helpers** (`src/lib/session.ts`):
  * `getSessionUser()`: Reads `cf_session` cookie, verifies signature via `jose.jwtVerify()`, returns `SessionUser` object `{ id, email, name }` or `null`.
  * `requireUser()`: Server guard that redirects to `/login` if `getSessionUser()` returns `null`.
  * `requireActiveUser()`: Server guard that re-queries `AdminUser` in Prisma to confirm account exists and `isActive === true`.

---

## D. Logout Flow

* **Endpoint**: `POST /api/auth/logout`
* **File Location**: `src/app/api/auth/logout/route.ts`
* **Action**: Deletes the `cf_session` cookie via `destroySession()`.
* **Response (`200 OK`)**:
  ```json
  { "ok": true }
  ```

---

## E. Authorization Model

* **Access Control**: Role-less admin access. All active users in `AdminUser` table have full administrative permissions.
* **Edge Guard**: `src/middleware.ts` checks for presence of `cf_session` cookie on non-public routes.
* **API Guards**: Protected API routes check `getSessionUser()` at the start of request execution.

---

## F. Auth & Security Considerations for Flutter

1. **Secret Variable Names**:
   * `SESSION_SECRET`
   * `DATABASE_URL`
   * `DIRECT_URL`
   * `OPENAI_API_KEY`
   * `SETTINGS_ENCRYPTION_KEY`
2. **CORS & HTTP Clients**:
   * Current backend relies on same-origin browser requests without explicit CORS headers on API routes.
   * For Flutter Dio client integration, `getSessionUser()` should support inspecting both `cf_session` cookies AND `Authorization: Bearer <token>` headers.
3. **Storage Security**:
   * Mobile app must store JWT tokens securely using OS keychain primitives (e.g. `flutter_secure_storage`).

---

## G. Existing Relevant API Routes

| Endpoint | Method | Auth Required | Description | Status |
| :--- | :--- | :--- | :--- | :--- |
| `/api/auth/login` | `POST` | No | User login & session creation | **Reuse with Adaptation** |
| `/api/auth/logout` | `POST` | Yes | Destroy active session | **Reuse Directly** |
| `/api/himi/chat` | `POST` | Yes | HIMI AI assistant chat & action execution | **Reuse Directly** |
| `/api/himi/health` | `GET` | Yes | HIMI AI service status & configuration | **Reuse Directly** |
| `/api/mobile/dashboard` | `GET` | Yes | Compact mobile dashboard metrics endpoint | **New Endpoint Required** |
| `/api/mobile/auth/me` | `GET` | Yes | Current authenticated user profile | **New Endpoint Required** |

---

## H. Current HIMI API Contract

* **Chat Endpoint**: `POST /api/himi/chat`
* **Headers**: `Content-Type: application/json`, Cookie or Bearer Token
* **Request Payload Variants**:
  1. **Standard Turn**:
     ```json
     {
       "message": "What are the top priority leads today?",
       "history": [
         { "sender": "user", "text": "Hello" },
         { "sender": "himi", "text": "Hi! How can I help with your CRM today?" }
       ]
     }
     ```
  2. **Controlled Action Confirmation**:
     ```json
     {
       "confirmedPendingAction": {
         "action": "update_lead_status",
         "leadId": "clx...",
         "arguments": { "status": "CONTACTED" },
         "description": "Status: NEW → CONTACTED"
       }
     }
     ```
  3. **Action Cancellation**:
     ```json
     { "cancelPendingAction": true }
     ```
* **Response Contract**:
  * **Success Response (`200 OK`)**:
    ```json
    {
      "ok": true,
      "agent": "HIMI",
      "response": "Here are your top high-priority leads today...",
      "toolCalls": [
        { "name": "get_leads_needing_attention", "ok": true, "durationMs": 142 }
      ],
      "pendingAction": {
        "action": "update_lead_status",
        "leadId": "clx...",
        "arguments": { "status": "CONTACTED" },
        "description": "Status: NEW → CONTACTED"
      }
    }
    ```

---

## I. HIMI Controlled-Action Status

HIMI V5 natively implements a **Controlled Action Confirmation System** (`src/lib/himi/agent.ts` & `src/lib/himi/tools.ts`):
1. **Write Tools**: `update_lead_status`, `update_lead_priority`, `add_lead_note`.
2. **Behavior**: Write tools do **not** mutate the database immediately. Instead, they capture a `pendingAction` object and return it to the client.
3. **Execution**: When the user clicks **Confirm**, the client sends `confirmedPendingAction` back to `POST /api/himi/chat`, executing `executeConfirmedHimiAction()` in `src/lib/himi/tools.ts`.

---

## J. Dashboard Data Sources & Reusable Queries

The web Dashboard (`src/app/(app)/dashboard/page.tsx`) queries metrics directly via Prisma:
* **Total Leads**: `prisma.lead.count({ where: { doNotContact: false } })`
* **Leads by Status**: `prisma.lead.groupBy({ by: ["status"], _count: { _all: true } })`
* **Leads by Country**: `prisma.lead.groupBy({ by: ["country"], _count: { _all: true } })`
* **Outreach Activity**:
  * Emails Sent Today: `prisma.activity.count({ where: { type: "EMAIL", direction: "OUT", createdAt: { gte: dayStart } } })`
  * Emails Sent This Week: `prisma.activity.count({ where: { type: "EMAIL", direction: "OUT", createdAt: { gte: weekStart } } })`
  * WhatsApps Sent This Week: `prisma.activity.count({ where: { type: "WHATSAPP", direction: "OUT", createdAt: { gte: weekStart } } })`
  * Inbound Replies This Week: `prisma.activity.count({ where: { direction: "IN", createdAt: { gte: weekStart } } })`
* **Follow-ups Due**: `prisma.lead.findMany({ where: { nextFollowUpAt: { lte: tomorrow }, status: { notIn: ["WON", "LOST"] } } })`
* **Recent Activity**: `prisma.activity.findMany({ take: 12, orderBy: { createdAt: "desc" }, include: { lead: true } })`

---

## K. Mobile Compatibility Classification

1. **REUSE DIRECTLY**:
   * `POST /api/himi/chat`
   * `GET /api/himi/health`
   * `POST /api/auth/logout`
2. **REUSE WITH SMALL ADAPTATION**:
   * `POST /api/auth/login` (return session token in JSON response body in addition to setting cookie).
   * `src/lib/session.ts` -> `getSessionUser()` (support both `cf_session` cookie and `Authorization: Bearer <token>` header).
3. **NEW ENDPOINT REQUIRED**:
   * `GET /api/mobile/dashboard` (consolidated JSON endpoint for mobile Dashboard screen).
   * `GET /api/mobile/auth/me` (returns current `SessionUser` profile and server health).
4. **BLOCKED / DECISION**: None.

---

## L. Recommended Mobile Authentication Strategy

### Dual-Header & Cookie Verification Strategy (Preferred)
* **Mechanism**: Enhance `getSessionUser()` in `src/lib/session.ts` so it extracts the JWT token from:
  1. `Authorization: Bearer <token>` header (if present), or
  2. `cf_session` cookie (fallback for web browser).
* **Benefits**:
  * 100% backward compatible with web App Router pages and existing cookies.
  * Allows Flutter Dio HTTP client to pass `Authorization: Bearer <token>` cleanly without cookie-jar complexities or CORS cookie issues.
  * Mobile receives the token directly in the `POST /api/auth/login` JSON response body.
  * Mobile stores token in `flutter_secure_storage`.

---

## M. Proposed Minimal Flutter API Contract (Phase 6)

### 1. `POST /api/auth/login`
* **Response Body**:
  ```json
  {
    "ok": true,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "clx123",
      "email": "agent@clientforge.io",
      "name": "Alex Morgan"
    }
  }
  ```

### 2. `GET /api/mobile/auth/me`
* **Headers**: `Authorization: Bearer <token>`
* **Response Body**:
  ```json
  {
    "ok": true,
    "user": {
      "id": "clx123",
      "email": "agent@clientforge.io",
      "name": "Alex Morgan"
    }
  }
  ```

### 3. `GET /api/mobile/dashboard`
* **Headers**: `Authorization: Bearer <token>`
* **Response Body**:
  ```json
  {
    "ok": true,
    "metrics": {
      "totalLeads": 124,
      "activeDeals": 18,
      "pipelineValueCents": 12450000,
      "emailsSentToday": 14,
      "repliesThisWeek": 6
    },
    "dueFollowUps": [
      {
        "id": "clx456",
        "companyName": "ABC Dental",
        "contactName": "Dr. Smith",
        "nextFollowUpAt": "2026-10-07T09:00:00.000Z",
        "isOverdue": false
      }
    ],
    "recentActivity": [
      {
        "id": "act789",
        "type": "EMAIL",
        "direction": "OUT",
        "leadName": "Apex Health",
        "status": "delivered",
        "createdAt": "2026-10-06T14:30:00.000Z"
      }
    ]
  }
  ```

---

## N. Exact Backend Files Likely to Change in Phase 6

1. `src/lib/session.ts` — Adapt `getSessionUser()` to support `Authorization: Bearer <token>` headers.
2. `src/app/api/auth/login/route.ts` — Include `token` and `user` in JSON response.
3. `src/app/api/mobile/auth/me/route.ts` — Create current user profile endpoint.
4. `src/app/api/mobile/dashboard/route.ts` — Create consolidated mobile dashboard metrics endpoint.

---

## O. Risks & Decisions Needed Before Implementation

1. **Cors / Host Verification**: Verify if mobile app will connect over HTTPS via custom domain or local IP during dev testing.
2. **Rate Limiting**: Current login rate limiting uses an in-memory map (8 attempts/15min). Suitable for mobile companion app.

---

## P. Git Status

```
On branch main
Your branch is up to date with 'origin/main'.
working tree clean
```
