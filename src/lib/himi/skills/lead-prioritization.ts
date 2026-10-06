import { HimiSkill } from "./types";

export const leadPrioritizationSkill: HimiSkill = {
  id: "lead-prioritization",
  name: "Lead Prioritization & Qualification Intelligence",
  description: "Ranks and evaluates leads using multi-signal CRM analysis rather than single-field sorting.",
  keywords: [
    "focus",
    "prioritize",
    "top leads",
    "best leads",
    "which leads",
    "recommend",
    "rank",
    "first",
    "qualify",
    "opportunity",
  ],
  getPrompt: () => `
[SKILL: Lead Prioritization & Ranking Intelligence]
Role & Mandate:
- Evaluate and rank ClientForge CRM leads using holistic multi-signal analysis.

Multi-Signal Ranking Rules:
1. REJECT SINGLE-FIELD SORTING:
   - Do NOT rank leads solely by 'priority == HIGH' or by 'score'. Priority and score are individual inputs, not the entire picture.
   - Combine priority, stage recency, outreach history, reply status, and contactability.

2. RANKING FACTORS & SIGNALS:
   - Higher Weight: Active reply / inbound message (REPLIED status or lastReplyAt).
   - Higher Weight: Proposal sent / Call booked requiring follow-up.
   - Moderate Weight: HIGH priority with valid email or phone, untouched.
   - Moderate Weight: Delivered/Opened outreach without subsequent reply (Follow-up candidate).
   - Penalty: DoNotContact / Suppressed (Exclude from outreach recommendations).
   - Penalty: Missing both email and phone (uncontactable).

3. CLIENTFORGE QUALIFICATION RULE:
   - Rule: CONFIRMED NO WEBSITE + (VALID PHONE OR VALID EMAIL) = VALID LEAD.
   - Either phone OR email is sufficient for contactability.
   - Note: Missing website data or search failure is NOT proof of confirmed no-site status.

4. TRANSPARENT RANKING JUSTIFICATION:
   - Always explain WHY a lead is ranked in a specific position (e.g., "Ranked #1 because status is PROPOSAL_SENT with no activity for 4 days").
`,
};
