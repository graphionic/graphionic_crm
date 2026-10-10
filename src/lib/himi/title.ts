/**
 * Derives a clean, concise conversation title deterministically from the first user prompt.
 * ZERO OpenAI calls — pure string parsing.
 */
export function deriveConversationTitle(firstPrompt?: string): string {
  if (!firstPrompt) return "New Conversation";

  // Clean leading/trailing whitespace, quotes, markdown formatting
  let clean = firstPrompt
    .replace(/^[\s#*>`"'-]+/, "")
    .replace(/[\s`"']+$/, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!clean) return "New Conversation";

  const MAX_LEN = 45;

  if (clean.length <= MAX_LEN) {
    return clean;
  }

  // Truncate cleanly at nearest word boundary before MAX_LEN
  const truncated = clean.slice(0, MAX_LEN);
  const lastSpaceIdx = truncated.lastIndexOf(" ");

  if (lastSpaceIdx > 20) {
    return truncated.slice(0, lastSpaceIdx).trim() + "…";
  }

  return truncated.trim() + "…";
}
