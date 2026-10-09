// Longest prompt sent to the AI in one request (a brief plus any intake answers appended to it, or one studio edit).
// Enforced server-side; the inputs below cap lower so a full brief with every intake answer still fits.
export const MAX_PROMPT_CHARS = 4_000;
// One typed or linked event brief.
export const MAX_BRIEF_CHARS = 2_000;
// One free-text intake answer.
export const MAX_INTAKE_ANSWER_CHARS = 200;

export function promptTooLong(prompt: string) {
  return prompt.trim().length > MAX_PROMPT_CHARS;
}
