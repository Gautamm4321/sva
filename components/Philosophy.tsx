import Photo from "./Photo";
import { PHOTOS } from "@/lib/media";

const moments = [
  { k: "Midday", t: "The headache that won’t let go." },
  { k: "Bedtime", t: "The restless mind that won’t settle." },
  { k: "Every day", t: "The spaces you live and work in." },
];

/** Second section: what svā means, in the brand deck's own words. */
export default function Philosophy() {
  return (
    <section id="about" className="about" aria-labelledby="about-title">
      <div className="about__text">
        <p className="mono reveal">About us</p>
        <h2 id="about-title" className="about__title reveal" style={{ ["--d" as string]: "80ms" }}>
          svā means self.
        </h2>
        <p className="about__body reveal" style={{ ["--d" as string]: "140ms" }}>
          It’s where our name comes from, and where every product begins. svā labs is a sensorial wellness brand built
          on a simple belief: self-care should feel like coming home to yourself.
        </p>
        <p className="about__body reveal" style={{ ["--d" as string]: "200ms" }}>
          Life doesn’t pause, so we bring wellness into the pauses.
        </p>
        <ul className="about__moments">
          {moments.map((m, i) => (
            <li key={m.k} className="reveal" style={{ ["--d" as string]: `${240 + i * 80}ms` }}>
              <span className="mono">{m.k}</span>
              <span className="about__moment">{m.t}</span>
            </li>
          ))}
        </ul>
        <p className="about__quiet reveal">No harsh additives. No noise. Just what your senses need to slow down, breathe, and return to svā.</p>
      </div>
      <figure className="about__figure">
        <Photo photo={PHOTOS.lavender} className="about__photo" sizes="(max-width: 860px) 100vw, 50vw" />
      </figure>
    </section>
  );
}
