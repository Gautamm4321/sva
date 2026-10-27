import { NextResponse } from "next/server";
import { validate } from "@/lib/waitlist/validate";
import { addSubscriber, StoreUnavailableError } from "@/lib/waitlist/store";
import { clientIp, hashIp, rateLimit, sameOrigin, turnstileEnabled, verifyTurnstile } from "@/lib/waitlist/protect";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY = 4096;
const MIN_FILL_MS = 1200;

type Body = {
  name?: unknown;
  email?: unknown;
  consent?: unknown;
  company?: unknown; // honeypot — real people never see or fill it
  elapsed?: unknown; // ms between form render and submit
  turnstileToken?: unknown;
};

const json = (status: number, body: Record<string, unknown>) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

const GENERIC_FAIL = "Something went wrong on our side. Please try again in a moment.";

export async function POST(req: Request) {
  if (!sameOrigin(req.headers)) return json(403, { ok: false, message: "Request not allowed." });
  if (!(req.headers.get("content-type") || "").includes("application/json")) {
    return json(415, { ok: false, message: "Unsupported request." });
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY) return json(413, { ok: false, message: "Request too large." });

  let body: Body;
  try {
    body = JSON.parse(raw) as Body;
    if (!body || typeof body !== "object") throw new Error();
  } catch {
    return json(400, { ok: false, message: "Invalid request." });
  }

  // Bots: answer like a success so they learn nothing, but store nothing.
  const honeypot = typeof body.company === "string" && body.company.trim() !== "";
  const tooFast = typeof body.elapsed === "number" && body.elapsed < MIN_FILL_MS;
  if (honeypot || tooFast) return json(200, { ok: true, status: "joined" });

  const ip = clientIp(req.headers);
  if (!(await rateLimit(hashIp(ip)))) {
    return json(429, { ok: false, message: "That’s a few too many tries. Please wait a few minutes and try again." });
  }

  const { ok, value, errors } = validate(body);
  if (!ok) return json(422, { ok: false, errors, message: "Please check the highlighted fields." });

  if (turnstileEnabled()) {
    const token = typeof body.turnstileToken === "string" ? body.turnstileToken : undefined;
    if (!(await verifyTurnstile(token, ip))) {
      return json(400, { ok: false, message: "We couldn’t verify you’re human. Please refresh and try again." });
    }
  }

  try {
    const result = await addSubscriber(value);
    return json(result === "created" ? 201 : 200, { ok: true, status: result === "created" ? "joined" : "already" });
  } catch (err) {
    if (err instanceof StoreUnavailableError) {
      console.error("[waitlist] storage not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)");
      return json(503, { ok: false, message: "The waitlist isn’t open just yet. Please try again soon." });
    }
    // Log the failure class only — never the address or upstream body.
    const domain = value.email.split("@")[1] ?? "?";
    console.error(`[waitlist] insert failed (${(err as Error).message}) domain=${domain}`);
    return json(502, { ok: false, message: GENERIC_FAIL });
  }
}

export function GET() {
  return json(405, { ok: false, message: "Method not allowed." });
}
