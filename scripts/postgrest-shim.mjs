// Test-only stand-in for Supabase's REST endpoint (PostgREST), backed by a
// real Postgres. Implements just the call the waitlist API makes:
//   POST /rest/v1/waitlist?on_conflict=email&select=id
//   Prefer: return=representation,resolution=ignore-duplicates
// → INSERT … ON CONFLICT (email) DO NOTHING RETURNING id, as service_role.
// usage: PG_URL=postgres://… KEY=test-key PORT=54400 node scripts/postgrest-shim.mjs
import http from "node:http";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.PG_URL });
const KEY = process.env.KEY;
let failNext = 0;

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, "http://x");
    const send = (code, body) => {
      res.writeHead(code, { "content-type": "application/json" });
      res.end(JSON.stringify(body));
    };
    if (url.pathname === "/__fail") {
      failNext = Number(url.searchParams.get("n") || 1);
      return send(200, { ok: true });
    }
    if (req.headers.apikey !== KEY) return send(401, { message: "Invalid API key" });
    if (req.method !== "POST" || url.pathname !== "/rest/v1/waitlist") return send(404, {});
    if (failNext > 0) {
      failNext--;
      return send(500, { message: "internal detail that must not leak", hint: "schema waitlist" });
    }
    const prefer = String(req.headers.prefer || "");
    let body = "";
    for await (const c of req) body += c;
    const row = JSON.parse(body);
    const cols = ["name", "email", "marketing_consent", "consent_timestamp", "consent_version", "source"];
    const conflict = url.searchParams.get("on_conflict");
    const ignore = prefer.includes("resolution=ignore-duplicates");
    const sql =
      `insert into public.waitlist (${cols.join(",")}) values ($1,$2,$3,$4,$5,$6)` +
      (ignore && conflict ? ` on conflict (${conflict}) do nothing` : "") +
      " returning id";
    const client = await pool.connect();
    try {
      await client.query("set role service_role");
      const r = await client.query(sql, cols.map((c) => row[c] ?? null));
      send(201, prefer.includes("return=representation") ? r.rows : []);
    } catch (e) {
      send(409, { code: e.code, message: e.message });
    } finally {
      await client.query("reset role").catch(() => {});
      client.release();
    }
  })
  .listen(Number(process.env.PORT || 54400), () => console.log("shim ready"));
