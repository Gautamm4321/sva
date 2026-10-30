import "server-only";
import type { WaitlistInput } from "./validate";

import nodemailer from "nodemailer";

/**
 * Email the team (info@svalabs.in by default) about each new waitlist signup.
 *
 * Two ways to send (the first one configured wins):
 *  A) Any mailbox via SMTP — e.g. a Gmail account with an App Password:
 *       SMTP_USER   the sending mailbox, e.g. you@gmail.com
 *       SMTP_PASS   its App Password (Google Account → Security → App passwords)
 *       SMTP_HOST   default smtp.gmail.com
 *       SMTP_PORT   default 465
 *  B) Resend's HTTP API:
 *       RESEND_API_KEY
 *
 * Env (both):
 *   WAITLIST_NOTIFY_TO    recipient(s), comma-separated  (default info@svalabs.in)
 *   WAITLIST_NOTIFY_FROM  Resend sender (default "svā labs <onboarding@resend.dev>").
 *                         The default only delivers to the email that owns the
 *                         Resend account; verify svalabs.in in Resend and use
 *                         e.g. "svā labs <waitlist@svalabs.in>" for production.
 */
export class NotifyError extends Error {}

const DEFAULT_TO = "info@svalabs.in";
const DEFAULT_FROM = "svā labs <onboarding@resend.dev>";

const smtpEnabled = () => Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);

export function notifyEnabled() {
  return smtpEnabled() || Boolean(process.env.RESEND_API_KEY);
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function notifySignup(input: WaitlistInput) {
  const to = (process.env.WAITLIST_NOTIFY_TO || DEFAULT_TO)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const from = process.env.WAITLIST_NOTIFY_FROM || DEFAULT_FROM;
  const when = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });
  const consent = input.consent ? "Yes" : "No";

  const text = [
    "New waitlist signup on svalabs.in",
    "",
    `Name:  ${input.name}`,
    `Email: ${input.email}`,
    `Marketing emails: ${consent}`,
    `Time:  ${when} IST`,
  ].join("\n");

  const row = (k: string, v: string) =>
    `<tr><td style="padding:6px 16px 6px 0;color:#7a6f66">${k}</td><td style="padding:6px 0;color:#2a201b">${v}</td></tr>`;
  const html = `<div style="font-family:Georgia,serif;max-width:520px;padding:24px;background:#efe9e3;color:#2a201b">
  <p style="letter-spacing:.14em;font-size:12px;text-transform:uppercase;color:#7a6f66;margin:0 0 8px">The waitlist</p>
  <h2 style="font-weight:normal;margin:0 0 18px">Someone wants to return.</h2>
  <table style="font-family:Arial,sans-serif;font-size:14px;border-collapse:collapse">
    ${row("Name", esc(input.name))}
    ${row("Email", `<a href="mailto:${esc(input.email)}" style="color:#2a201b">${esc(input.email)}</a>`)}
    ${row("Marketing emails", consent)}
    ${row("Time", `${esc(when)} IST`)}
  </table>
</div>`;

  const subject = `New waitlist signup: ${input.name}`;

  if (smtpEnabled()) {
    const user = process.env.SMTP_USER!;
    const port = Number(process.env.SMTP_PORT || 465);
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port,
      secure: port === 465,
      auth: { user, pass: process.env.SMTP_PASS!.replace(/\s+/g, "") },
      connectionTimeout: 8000,
      socketTimeout: 10000,
    });
    try {
      await transport.sendMail({ from: `"svā labs waitlist" <${user}>`, to, replyTo: input.email, subject, text, html });
    } catch (err) {
      throw new NotifyError(`smtp ${(err as { code?: string }).code ?? "error"}`);
    }
    return;
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) throw new NotifyError("no email sender configured");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to,
      reply_to: input.email,
      subject,
      text,
      html,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new NotifyError(`resend ${res.status}`);
}
