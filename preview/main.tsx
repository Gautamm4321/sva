// Preview entry: renders the real home page client-side for a static preview.
// The waitlist API is simulated here — nothing is stored.
import { createRoot } from "react-dom/client";
import Home from "@/app/page";
import { validate } from "@/lib/waitlist/validate";

const seen = new Set<string>();
const realFetch = window.fetch.bind(window);
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (!url.endsWith("/api/waitlist")) return realFetch(input, init);
  await new Promise((r) => setTimeout(r, 700));
  const body = JSON.parse(String(init?.body ?? "{}"));
  const v = validate(body);
  const json = (status: number, data: unknown) =>
    new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
  if (!v.ok) return json(422, { ok: false, errors: v.errors, message: "Please check the highlighted fields." });
  if (seen.has(v.value.email)) return json(200, { ok: true, status: "already" });
  seen.add(v.value.email);
  return json(201, { ok: true, status: "joined" });
};

// /privacy isn't part of the preview: keep those links on the page.
document.addEventListener("click", (e) => {
  const a = (e.target as Element).closest('a[href="/privacy"]');
  if (a) e.preventDefault();
});

createRoot(document.getElementById("root")!).render(<Home />);
