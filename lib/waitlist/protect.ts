import "server-only";
import { createHash } from "node:crypto";

/* ───────────────────────────── Client IP ───────────────────────────── */

/**
 * Only trust the header the current platform sets itself — a client can send
 * any other header, and a spoofable key would let it dodge the rate limit.
 */
export function clientIp(headers: Headers): string {
  let v: string | null | undefined;
  if (process.env.NETLIFY) v = headers.get("x-nf-client-connection-ip");
  else if (process.env.VERCEL) v = headers.get("x-real-ip") ?? headers.get("x-forwarded-for")?.split(",")[0];
  else v = headers.get("x-forwarded-for")?.split(",")[0] ?? headers.get("x-real-ip");
  return v?.trim() || "unknown";
}

/** IPs are only ever used hashed, as rate-limit keys. Never stored. */
export function hashIp(ip: string): string {
  const salt = process.env.RATE_LIMIT_SALT || "sva-waitlist";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

/* ──────────────────────────── Rate limiting ────────────────────────── */

const WINDOW_S = 10 * 60;
const MAX_PER_WINDOW = 5;

const memory = new Map<string, { n: number; reset: number }>();

function memoryHit(key: string): boolean {
  const now = Date.now();
  if (memory.size > 5000) {
    for (const [k, v] of memory) if (v.reset < now) memory.delete(k);
  }
  const cur = memory.get(key);
  if (!cur || cur.reset < now) {
    memory.set(key, { n: 1, reset: now + WINDOW_S * 1000 });
    return true;
  }
  cur.n++;
  return cur.n <= MAX_PER_WINDOW;
}

/**
 * Returns true if the request is allowed. Uses Upstash Redis (durable, shared
 * across serverless instances) when configured; otherwise a per-instance
 * in-memory window, which is best-effort only.
 */
export async function rateLimit(ipHash: string): Promise<boolean> {
  const url = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/+$/, "");
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  const key = `sva:wl:${ipHash}`;
  if (!url || !token) return memoryHit(key);

  try {
    const res = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        ["INCR", key],
        ["EXPIRE", key, String(WINDOW_S), "NX"],
      ]),
      cache: "no-store",
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return memoryHit(key);
    const out = (await res.json()) as { result?: number }[];
    const n = Number(out?.[0]?.result ?? 0);
    return n <= MAX_PER_WINDOW;
  } catch {
    return memoryHit(key); // fail open to memory, never fully open
  }
}

/* ───────────────────────────── Turnstile ───────────────────────────── */

export function turnstileEnabled() {
  return Boolean(process.env.TURNSTILE_SECRET_KEY && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
}

export async function verifyTurnstile(token: string | undefined, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token || token.length > 2048) return false;
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip !== "unknown") body.set("remoteip", ip);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

/* ───────────────────────────── Same origin ─────────────────────────── */

/** Reject cross-site form posts: Origin (when sent) must match this host. */
export function sameOrigin(headers: Headers): boolean {
  const origin = headers.get("origin");
  if (!origin) return true; // same-origin fetches from some browsers omit it
  const host = headers.get("x-forwarded-host") || headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
