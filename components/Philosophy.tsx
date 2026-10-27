const moments = [
  { k: "Midday", t: "The headache that won’t let go." },
  { k: "Bedtime", t: "The restless mind that won’t settle." },
  { k: "Every day", t: "The spaces you live and work in." },
];

/** Second section: what svā means, in the brand's own words. */
export default function Philosophy() {
  return (
    <section id="about" className="about" aria-labelledby="about-title">
      <div className="about__clouds" aria-hidden>
        <i />
        <i />
        <i />
      </div>

      <div className="about__inner">
        <p className="mono about__label reveal">svā (n.) — self</p>
        <h2 id="about-title" className="about__title reveal" style={{ ["--d" as string]: "80ms" }}>
          svā means self. It’s where our name comes from, and where every ritual begins.
        </h2>
        <p className="about__body reveal" style={{ ["--d" as string]: "160ms" }}>
          svā labs is a sensorial wellness brand built on a simple belief: self-care should feel like coming home to
          yourself. No harsh additives. No noise. Just what your senses need to slow down, breathe, and return.
        </p>

        <div className="about__moments">
          <p className="mono about__moments-lead reveal">Life doesn’t pause, so we bring wellness into the pauses.</p>
          <ul>
            {moments.map((m, i) => (
              <li key={m.k} className="reveal" style={{ ["--d" as string]: `${i * 90}ms` }}>
                <span className="mono">{m.k}</span>
                <span className="about__moment">{m.t}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="mono about__making reveal">
          In the making — functional roll-ons · hand creams · candles · functional fragrances
        </p>
      </div>
    </section>
  );
}
