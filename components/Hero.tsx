import WorldLayer from "./WorldLayer";
import Photo from "./Photo";
import { PHOTOS } from "@/lib/media";

export default function Hero() {
  return (
    <section id="hero" className="hero" aria-labelledby="hero-title">
      <div className="hero__media">
        <Photo photo={PHOTOS.hero} className="hero__photo" priority />
      </div>
      <div className="hero__shade" aria-hidden />
      <WorldLayer />

      <div className="hero__content">
        <p className="mono hero__eyebrow">svā labs · coming soon</p>
        <h1 id="hero-title" className="hero__title">
          Return <em>to self.</em>
        </h1>
        <p className="hero__lede">
          Clean, plant-powered remedies from natural ingredients, made to turn ordinary moments into small rituals of
          reconnection.
        </p>
        <a href="#join" className="btn btn--light">
          Join the waitlist
        </a>
      </div>

      <a href="#about" className="mono hero__scroll" aria-label="Scroll to read more">
        Scroll
      </a>
    </section>
  );
}
