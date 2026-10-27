const pillars = [
  {
    n: "i",
    title: "Scent",
    body: "Clean, plant-powered remedies made from natural ingredients — to turn ordinary moments into small rituals of reconnection.",
  },
  {
    n: "ii",
    title: "Sound",
    body: "No harsh additives. No noise. Just what your senses need to slow down, breathe, and listen inward.",
  },
  {
    n: "iii",
    title: "Nature",
    body: "Self-care that feels like coming home to yourself — rooted in the plants it begins with.",
  },
];

export default function Philosophy() {
  return (
    <section id="philosophy" className="paper philosophy" aria-labelledby="philosophy-title">
      <div className="rule-row">
        <span className="mono">01 — Philosophy</span>
        <span className="mono">svā labs</span>
      </div>

      <div className="philosophy__statement">
        <h2 id="philosophy-title" className="display reveal">
          <em>svā</em> means self.
        </h2>
        <p className="philosophy__sub reveal" style={{ ["--d" as string]: "120ms" }}>
          It’s where our name comes from, and where every product begins. A sensorial wellness brand built on a simple
          belief: self-care should feel like coming home to yourself.
        </p>
      </div>

      <ol className="pillars">
        {pillars.map((p, i) => (
          <li key={p.title} className="pillar reveal" style={{ ["--d" as string]: `${i * 110}ms` }}>
            <span className="pillar__n" aria-hidden>
              {p.n}
            </span>
            <h3 className="pillar__title">{p.title}</h3>
            <p className="pillar__body">{p.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
