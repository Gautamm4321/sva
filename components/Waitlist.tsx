import WaitlistForm from "./WaitlistForm";

export default function Waitlist() {
  return (
    <section id="join" className="paper waitlist" aria-labelledby="join-title">
      <div className="rule-row">
        <span className="mono">03 — The waitlist</span>
        <span className="mono">Coming soon</span>
      </div>
      <div className="waitlist__grid">
        <div className="waitlist__intro">
          <h2 id="join-title" className="display reveal">
            Be first <em>to return.</em>
          </h2>
          <p className="waitlist__lede reveal" style={{ ["--d" as string]: "100ms" }}>
            svā labs is still in the making. Leave your name and email, and we’ll write when the first rituals are
            ready — nothing more.
          </p>
        </div>
        <WaitlistForm turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""} />
      </div>
    </section>
  );
}
