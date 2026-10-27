import { CONTACT } from "@/lib/content";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__mark">
        <span className="site-footer__word" aria-label="svā labs">
          svā
        </span>
        <span className="mono">return to self</span>
      </div>

      <div className="site-footer__cols">
        <div>
          <p className="mono site-footer__h">Write to us</p>
          <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
        </div>
        <div>
          <p className="mono site-footer__h">Studio</p>
          <p>{CONTACT.address}</p>
        </div>
        <div>
          <p className="mono site-footer__h">Your expertise is welcome</p>
          <p>
            Formulation, contract manufacturing, packaging &amp; print, distribution, product design, branding and
            marketing — <a href={`mailto:${CONTACT.email}`}>say hello</a>.
          </p>
        </div>
      </div>

      <div className="site-footer__base mono">
        <span>© {new Date().getFullYear()} svā labs</span>
        <a href="/privacy">Privacy policy</a>
      </div>
    </footer>
  );
}
