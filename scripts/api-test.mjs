// End-to-end tests for POST /api/waitlist.
// usage: BASE=http://localhost:3101 node scripts/api-test.mjs
// Expects the server's SUPABASE_URL to point at a store that persists rows,
// and PSQL (a psql command line) to query that same database.
import { execSync } from "node:child_process";

const BASE = process.env.BASE || "http://localhost:3101";
const SHIM = process.env.SHIM || "http://127.0.0.1:54400";
const PSQL = process.env.PSQL;
let pass = 0;
let fail = 0;
let ipN = 0;

const sql = (q) => execSync(`${PSQL} -tAc "${q.replace(/"/g, '\\"')}"`).toString().trim();

async function post(body, { headers = {}, ip, raw } = {}) {
  const res = await fetch(`${BASE}/api/waitlist`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip || `10.0.0.${++ipN}`, ...headers },
    body: raw ?? JSON.stringify(body),
  });
  let json = {};
  try {
    json = await res.json();
  } catch {}
  return { status: res.status, json };
}

function check(name, cond, detail = "") {
  if (cond) pass++;
  else fail++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
}

const ok = { name: "Mira Rao", email: "mira@example.com", consent: true, elapsed: 4000 };

(async () => {
  sql("delete from public.waitlist");

  let r = await post(ok);
  check("valid signup → 201 joined", r.status === 201 && r.json.status === "joined", JSON.stringify(r));
  const row = sql(
    "select name||'|'||email||'|'||marketing_consent||'|'||(consent_timestamp is not null)||'|'||source||'|'||consent_version from public.waitlist",
  );
  check("row persisted with consent + source", row === "Mira Rao|mira@example.com|true|true|sva-coming-soon|2026-10-v1", row);

  r = await post({ ...ok, email: "  MIRA@Example.com " , name: "Mira again" });
  check("duplicate (case/space variant) → 200 already", r.status === 200 && r.json.status === "already", JSON.stringify(r));
  check("still exactly one row", sql("select count(*) from public.waitlist") === "1");

  r = await post({ ...ok, email: "not-an-email" });
  check("bad email → 422 with field error", r.status === 422 && !!r.json.errors?.email, JSON.stringify(r));

  r = await post({ ...ok, email: "noconsent@example.com", consent: false });
  check("no consent → 422 with field error", r.status === 422 && !!r.json.errors?.consent, JSON.stringify(r));

  r = await post({ ...ok, name: "   ", email: "blank@example.com" });
  check("blank name → 422", r.status === 422 && !!r.json.errors?.name);

  r = await post({ ...ok, name: "<b>Leela</b>", email: "leela@example.com" });
  check("tags stripped from name", r.status === 201 && sql("select name from public.waitlist where email='leela@example.com'") === "Leela");

  r = await post({ ...ok, email: "bot1@example.com", company: "ACME" });
  check("honeypot → looks like success", r.status === 200 && r.json.ok === true);
  check("honeypot → nothing stored", sql("select count(*) from public.waitlist where email='bot1@example.com'") === "0");

  r = await post({ ...ok, email: "bot2@example.com", elapsed: 300 });
  check("too-fast submit → nothing stored", r.status === 200 && sql("select count(*) from public.waitlist where email='bot2@example.com'") === "0");

  r = await post(ok, { headers: { origin: "https://evil.example" } });
  check("cross-site origin → 403", r.status === 403);

  r = await post(null, { headers: { "content-type": "text/plain" }, raw: "name=x" });
  check("wrong content-type → 415", r.status === 415);

  r = await post(null, { raw: JSON.stringify({ ...ok, name: "x".repeat(6000) }) });
  check("oversized body → 413", r.status === 413);

  r = await post(null, { raw: "{not json" });
  check("malformed JSON → 400", r.status === 400);

  await fetch(`${SHIM}/__fail?n=1`);
  r = await post({ ...ok, email: "upstream@example.com" });
  const leaked = JSON.stringify(r.json).includes("internal detail") || JSON.stringify(r.json).includes("schema");
  check("upstream failure → 502 generic, no leak", r.status === 502 && !leaked, JSON.stringify(r));

  const ip = "203.0.113.9";
  const codes = [];
  for (let i = 0; i < 6; i++) codes.push((await post({ ...ok, email: `rl${i}@example.com` }, { ip })).status);
  check("rate limit: 6th request from one IP → 429", codes[5] === 429 && codes.slice(0, 5).every((c) => c !== 429), codes.join(","));

  const g = await fetch(`${BASE}/api/waitlist`);
  check("GET → 405", g.status === 405);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
