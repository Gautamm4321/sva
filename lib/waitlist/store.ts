import "server-only";
import type { WaitlistInput } from "./validate";

export const SOURCE = "sva-coming-soon";
/** Bump when the consent wording on the form changes. Stored with each row. */
export const CONSENT_VERSION = "2026-10-v1";

export class StoreUnavailableError extends Error {}
export class StoreError extends Error {
  constructor(public status: number) {
    super(`store error ${status}`);
  }
}

function config() {
  const url = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new StoreUnavailableError("Supabase is not configured");
  return { url, key };
}

/**
 * Insert one subscriber via Supabase's REST API (PostgREST) using the
 * service-role key, server-side only. Duplicate emails are ignored by the
 * database's unique constraint, so a repeat signup is not an error.
 */
export async function addSubscriber(input: WaitlistInput): Promise<"created" | "exists"> {
  const { url, key } = config();
  const headers: Record<string, string> = {
    apikey: key,
    "Content-Type": "application/json",
    Prefer: "return=representation,resolution=ignore-duplicates",
  };
  // Legacy service_role keys are JWTs and go in Authorization too;
  // new-style secret keys (sb_secret_…) are sent only as `apikey`.
  if (key.startsWith("eyJ")) headers.Authorization = `Bearer ${key}`;

  const now = new Date().toISOString();
  const res = await fetch(`${url}/rest/v1/waitlist?on_conflict=email&select=id`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: input.name,
      email: input.email,
      marketing_consent: input.consent,
      consent_timestamp: input.consent ? now : null,
      consent_version: CONSENT_VERSION,
      source: SOURCE,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    // Never forward upstream bodies: they can contain schema details.
    throw new StoreError(res.status);
  }
  const rows = (await res.json().catch(() => [])) as unknown[];
  return Array.isArray(rows) && rows.length > 0 ? "created" : "exists";
}
