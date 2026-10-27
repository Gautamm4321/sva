import { PIECES } from "@/lib/content";
import InterludeStage from "./InterludeStage";

const moments = [
  { k: "Midday", text: "The headache that won’t let go." },
  { k: "Bedtime", text: "The restless mind that won’t settle." },
  { k: "Every day", text: "The spaces you live and work in." },
];

/** The pull-back: every piece in a row, like a shelf of rituals in the making. */
export default function Interlude() {
  return (
    <section id="lineup" className="lineup" aria-labelledby="lineup-title">
      <InterludeStage>
        <div className="lineup__head">
          <p className="mono">02 — In the making</p>
          <h2 id="lineup-title" className="lineup__title">
            Life doesn’t pause, <em>so we bring wellness into the pauses.</em>
          </h2>
        </div>

        <ol className="moments">
          {moments.map((m, i) => (
            <li key={m.k} className="moment" data-step-min={i + 1}>
              <span className="mono moment__k">{m.k}</span>
              <span className="moment__t">{m.text}</span>
            </li>
          ))}
        </ol>

        <ul className="lineup__labels" aria-label="Products in the making">
          {PIECES.map((p, i) => (
            <li key={p.key} className="lineup__label" data-index={i}>
              <span className="mono">{String(i).padStart(2, "0")}</span> {i === 0 ? "svā — the self" : p.name}
            </li>
          ))}
        </ul>
      </InterludeStage>
    </section>
  );
}
