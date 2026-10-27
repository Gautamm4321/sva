/**
 * Waitlist input rules — shared by the form (instant feedback) and the API
 * route (authoritative). Kept dependency-free on purpose.
 */

export const NAME_MAX = 80;
export const EMAIL_MAX = 254;

export type WaitlistInput = {
  name: string;
  email: string;
  consent: boolean;
};

export type FieldErrors = Partial<Record<keyof WaitlistInput, string>>;

// Pragmatic address check: one @, a dot in the domain, no spaces or brackets.
const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;

/** Collapse whitespace and strip control / zero-width / bidi characters. */
export function cleanName(raw: string): string {
  return raw
    .normalize("NFC")
    .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeEmail(raw: string): string {
  return raw.normalize("NFC").trim().toLowerCase();
}

export function validate(input: { name?: unknown; email?: unknown; consent?: unknown }): {
  ok: boolean;
  value: WaitlistInput;
  errors: FieldErrors;
} {
  const name = cleanName(typeof input.name === "string" ? input.name : "");
  const email = normalizeEmail(typeof input.email === "string" ? input.email : "");
  const consent = input.consent === true || input.consent === "true" || input.consent === "on";
  const errors: FieldErrors = {};

  if (!name) errors.name = "Please tell us your name.";
  else if (name.length > NAME_MAX) errors.name = `Please keep your name under ${NAME_MAX} characters.`;
  else if (!/\p{L}/u.test(name)) errors.name = "Please enter a name using letters.";

  if (!email) errors.email = "Please enter your email address.";
  else if (email.length > EMAIL_MAX || !EMAIL_RE.test(email)) errors.email = "That email address doesn’t look right.";

  if (!consent) errors.consent = "Please confirm you’d like to hear from us.";

  return { ok: Object.keys(errors).length === 0, value: { name, email, consent }, errors };
}
