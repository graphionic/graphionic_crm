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
   - Do NOT rank leads solely by 'priority == HIGH' or by 'score'. Combine priority, stage recency, outreach history, reply status, and contactability.

2. TIE AWARENESS (CRITICAL):
   - When candidates have effectively identical signals (e.g. 5 untouched HIGH-priority leads with score 95), explicitly state that they are effectively tied based on current CRM evidence.
   - Do NOT manufacture artificial rank differences (#1 vs #5) or claim #1 has a higher conversion probability than #5 when evidence is equivalent.
   - State clearly: "These leads are effectively tied on current CRM evidence. Any of them is a reasonable starting point."

3. GROUNDED OPERATIONAL TERMINOLOGY:
   - Avoid unsupported statements such as "highest chance to convert", "best ROI", "most likely buyer", or "strong buying intent".
   - Use grounded operational terms: "strong candidate for attention", "high operational priority", "worth reviewing first".

4. HIDE RAW LEAD IDS:
   - Refer to leads by their Company Name (e.g. "Almondbury Dental Practice").
   - NEVER display raw database CUID strings (e.g. "cmuqt44nh00...") in conversational output unless explicitly requested.

5. CONTACTABILITY vs PERMISSION:
   - Having a phone number or email address means the lead is CONTACTABLE.
   - It does NOT mean permission or an aggressive multi-channel sequence recommendation. Recommend outreach conservatively via available contact channels.

6. CLIENTFORGE QUALIFICATION RULE:
   - Rule: CONFIRMED NO WEBSITE + (VALID PHONE OR VALID EMAIL) = VALID LEAD.
   - Either phone OR email is sufficient for contactability. Missing website data is NOT proof of confirmed no-site status.

7. TRANSPARENT JUSTIFICATION:
   - Always explain WHY a lead is recommended based on concrete signals (e.g. "Status is PROPOSAL_SENT with no activity for 4 days").
`,
};
