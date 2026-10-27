import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT } from "@/lib/content";

export const metadata: Metadata = {
  title: "Privacy policy — svā labs",
  description: "How svā labs handles the details you share when joining the waitlist.",
  alternates: { canonical: "/privacy" },
};

const UPDATED = "27 October 2026";

export default function Privacy() {
  return (
    <main className="legal">
      <header className="legal__head">
        <Link href="/" className="legal__back mono">
          ← svā labs
        </Link>
        <p className="mono">Last updated {UPDATED}</p>
      </header>

      <h1 className="display">Privacy policy</h1>

      <section>
        <h2>Who we are</h2>
        <p>
          svā labs (“we”, “us”) runs this website. You can reach us at{" "}
          <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a> or at {CONTACT.address}.
        </p>
      </section>

      <section>
        <h2>What we collect</h2>
        <p>When you join the waitlist we collect only:</p>
        <ul>
          <li>your name,</li>
          <li>your email address,</li>
          <li>whether you agreed to receive marketing emails, and when you agreed.</li>
        </ul>
        <p>
          We do not ask for anything else. To protect the form from automated abuse we briefly process a one-way hash
          of your IP address for rate limiting; it is not stored with your details. If bot protection (Cloudflare
          Turnstile) is enabled, Cloudflare processes technical data about your browser for that check.
        </p>
      </section>

      <section>
        <h2>Why we use it</h2>
        <p>
          With your consent, we use your name and email to tell you when svā labs launches and to send occasional
          news about our products and rituals. We do not sell your information, and we do not share it with anyone
          for their own marketing.
        </p>
      </section>

      <section>
        <h2>Where it is kept</h2>
        <p>
          Your details are stored in a secured database operated for us by our hosting and database providers,
          accessible only to svā labs. If we later use an email service to send our newsletter, your details will be
          shared with that provider only for that purpose.
        </p>
      </section>

      <section>
        <h2>How long we keep it</h2>
        <p>
          We keep your details until you unsubscribe or ask us to delete them, or until the waitlist is no longer
          needed — whichever comes first.
        </p>
      </section>

      <section>
        <h2>Your choices</h2>
        <p>
          You can withdraw your consent at any time — every email we send will include an unsubscribe link, or you
          can write to <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>. You can also ask us to show you,
          correct or delete the information we hold about you, and we will respond promptly.
        </p>
      </section>

      <section>
        <h2>Cookies</h2>
        <p>
          This site does not set advertising or analytics cookies.
        </p>
      </section>

      <section>
        <h2>Changes</h2>
        <p>If we change this policy we will update the date above. Material changes will be notified by email.</p>
      </section>
    </main>
  );
}
