"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { validate, type FieldErrors, NAME_MAX, EMAIL_MAX } from "@/lib/waitlist/validate";

type Status = "idle" | "sending" | "joined" | "already" | "error";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
    };
  }
}

export default function WaitlistForm({ turnstileSiteKey }: { turnstileSiteKey: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState("");
  const [firstName, setFirstName] = useState("");
  const mountedAt = useRef(0);
  const tsBox = useRef<HTMLDivElement>(null);
  const tsId = useRef<string | null>(null);
  const tsToken = useRef("");
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);

  const renderTurnstile = () => {
    if (!turnstileSiteKey || !tsBox.current || !window.turnstile || tsId.current) return;
    tsId.current = window.turnstile.render(tsBox.current, {
      sitekey: turnstileSiteKey,
      theme: "light",
      appearance: "interaction-only",
      callback: (t: string) => (tsToken.current = t),
      "expired-callback": () => (tsToken.current = ""),
    });
  };

  useEffect(() => {
    if (status === "joined" || status === "already") resultRef.current?.focus();
  }, [status]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "sending") return;
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name") ?? ""),
      email: String(fd.get("email") ?? ""),
      consent: fd.get("consent") === "on",
      company: String(fd.get("company") ?? ""),
      elapsed: Date.now() - mountedAt.current,
      turnstileToken: tsToken.current || undefined,
    };

    const check = validate(payload);
    setErrors(check.errors);
    if (!check.ok) {
      setStatus("idle");
      setMessage("");
      const first = (["name", "email", "consent"] as const).find((k) => check.errors[k]);
      if (first) document.getElementById(`wl-${first}`)?.focus();
      return;
    }

    setStatus("sending");
    setMessage("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        status?: string;
        errors?: FieldErrors;
        message?: string;
      };
      if (res.ok && data.ok) {
        setFirstName(check.value.name.split(" ")[0]);
        setStatus(data.status === "already" ? "already" : "joined");
        return;
      }
      if (data.errors) setErrors(data.errors);
      setMessage(data.message || "Something went wrong. Please try again.");
      setStatus("error");
      if (tsId.current) window.turnstile?.reset(tsId.current);
    } catch {
      setMessage("We couldn’t reach the waitlist. Check your connection and try again.");
      setStatus("error");
    }
  }

  if (status === "joined" || status === "already") {
    return (
      <div className="wl-done" ref={resultRef} tabIndex={-1} role="status">
        <p className="mono">{status === "joined" ? "You’re on the list" : "Already with us"}</p>
        <p className="wl-done__title">
          {status === "joined" ? (
            <>
              Thank you, <em>{firstName}.</em>
            </>
          ) : (
            <>
              Welcome back, <em>{firstName}.</em>
            </>
          )}
        </p>
        <p className="wl-done__body">
          {status === "joined"
            ? "We’ll write when the first svā rituals are ready. Until then — breathe."
            : "This email is already on the waitlist, so there’s nothing more to do. We’ll be in touch."}
        </p>
      </div>
    );
  }

  const sending = status === "sending";

  return (
    <form className="wl" onSubmit={onSubmit} noValidate aria-describedby="wl-message">
      {turnstileSiteKey && (
        <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" onReady={renderTurnstile} />
      )}

      <div className={`field${errors.name ? " has-error" : ""}`}>
        <label htmlFor="wl-name">Name</label>
        <input
          id="wl-name"
          name="name"
          type="text"
          autoComplete="name"
          maxLength={NAME_MAX}
          required
          placeholder="Your name"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? "wl-name-err" : undefined}
          onInput={() => errors.name && setErrors((e) => ({ ...e, name: undefined }))}
        />
        {errors.name && (
          <p className="field__error" id="wl-name-err">
            {errors.name}
          </p>
        )}
      </div>

      <div className={`field${errors.email ? " has-error" : ""}`}>
        <label htmlFor="wl-email">Email</label>
        <input
          id="wl-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          maxLength={EMAIL_MAX}
          required
          placeholder="you@example.com"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "wl-email-err" : undefined}
          onInput={() => errors.email && setErrors((e) => ({ ...e, email: undefined }))}
        />
        {errors.email && (
          <p className="field__error" id="wl-email-err">
            {errors.email}
          </p>
        )}
      </div>

      {/* Honeypot: hidden from people and assistive tech. */}
      <div className="hp" aria-hidden="true">
        <label htmlFor="wl-company">Company</label>
        <input id="wl-company" name="company" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className={`consent${errors.consent ? " has-error" : ""}`}>
        <input
          id="wl-consent"
          name="consent"
          type="checkbox"
          required
          aria-invalid={!!errors.consent}
          aria-describedby={errors.consent ? "wl-consent-err" : undefined}
          onChange={() => errors.consent && setErrors((e) => ({ ...e, consent: undefined }))}
        />
        <label htmlFor="wl-consent">
          Yes, I’d like emails from svā labs about our launch and new rituals. I can unsubscribe at any time. See our{" "}
          <a href="/privacy">privacy policy</a>.
        </label>
        {errors.consent && (
          <p className="field__error" id="wl-consent-err">
            {errors.consent}
          </p>
        )}
      </div>

      {turnstileSiteKey && <div ref={tsBox} className="ts" />}

      <div className="wl__actions">
        <button type="submit" className="btn btn--ink btn--lg" disabled={sending} aria-busy={sending}>
          {sending ? (
            <>
              <span className="spinner" aria-hidden /> Joining…
            </>
          ) : (
            "Join the waitlist"
          )}
        </button>
        <p id="wl-message" className={`wl__message${status === "error" ? " is-error" : ""}`} role="alert">
          {message}
        </p>
      </div>
    </form>
  );
}
