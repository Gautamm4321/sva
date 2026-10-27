import Wordmark from "./Wordmark";
import SoundToggle from "./SoundToggle";

export default function SiteHeader() {
  return (
    <>
      <a className="skip" href="#join">
        Skip to the waitlist
      </a>
      <header className="site-header">
        <div className="site-header__left">
          <a href="#hero" className="site-header__brand" aria-label="svā labs — top">
            <Wordmark labs />
          </a>
          <nav className="site-header__nav mono" aria-label="Primary">
            <a href="#philosophy">Philosophy</a>
            <a href="#lineup">In the making</a>
          </nav>
        </div>
        <div className="site-header__right">
          <SoundToggle />
          <a href="#join" className="btn btn--ink btn--sm">
            Join the waitlist
          </a>
        </div>
      </header>
    </>
  );
}
