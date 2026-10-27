import WorldLayer from "./WorldLayer";

export default function Hero() {
  return (
    <section id="hero" className="hero" aria-labelledby="hero-title">
      <WorldLayer />
      <div className="hero__shade" aria-hidden />

      <div className="hero__content">
        <p className="mono hero__eyebrow">svā labs · coming soon</p>
        <h1 id="hero-title" className="hero__title">
          <span className="line">Return</span>
          <span className="line">
            <em>to self.</em>
          </span>
        </h1>
        <p className="hero__lede">
          Clean, plant-powered remedies from natural ingredients, made to turn ordinary moments into small rituals of
          reconnection.
        </p>
        <a href="#join" className="btn btn--ink">
          Join the waitlist
        </a>
      </div>

      <p className="mono hero__hint" aria-hidden>
        Move through the botanicals
      </p>
      <a href="#about" className="mono hero__scroll" aria-label="Scroll to read more">
        Scroll
      </a>
    </section>
  );
}
