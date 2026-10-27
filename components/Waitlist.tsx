import WaitlistForm from "./WaitlistForm";
import Photo from "./Photo";
import { PHOTOS } from "@/lib/media";

const EMAIL = "info@svalabs.in";

export default function Waitlist() {
  return (
    <section id="join" className="waitlist" aria-labelledby="join-title">
      <div className="waitlist__media" aria-hidden>
        <Photo photo={PHOTOS.dawn} className="waitlist__photo" />
      </div>
      <div className="waitlist__grid">
        <div className="waitlist__intro">
          <p className="mono">The waitlist</p>
          <h2 id="join-title" className="waitlist__title reveal">
            Be the first <em>to return.</em>
          </h2>
          <p className="waitlist__lede reveal" style={{ ["--d" as string]: "100ms" }}>
            Leave your name and email, and we’ll write when the first svā rituals are ready. Nothing more.
          </p>
        </div>
        <WaitlistForm turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""} />
      </div>

      <footer className="foot mono">
        <span className="foot__mark" aria-label="svā labs">
          svā
        </span>
        <span>© {new Date().getFullYear()} svā labs</span>
        <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
        <a href="/privacy">Privacy policy</a>
        <span className="foot__credit">
          Photographs: {[PHOTOS.hero, PHOTOS.lavender, PHOTOS.dawn].map((p, i) => (
            <span key={p.id}>
              {i ? ", " : ""}
              <a href={p.page} target="_blank" rel="noreferrer">
                {p.credit}
              </a>
            </span>
          ))}{" "}
          / Unsplash
        </span>
      </footer>
    </section>
  );
}
