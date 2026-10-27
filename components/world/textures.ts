import * as THREE from "three";

/**
 * All textures are drawn at runtime on canvases: the glyph atlas for the
 * strands, the svā seal face, product labels and the linen wall. No image
 * assets to license or download.
 */

export const INK = "#2B211B";
export const PAPER = "#EDE6DC";
export const GOLD = "#DCAE77";
export const COCOA = "#24130C";

const SERIF = '"Cormorant", "Cormorant Garamond", Georgia, serif';
const SANS = '"Inter Tight", "Helvetica Neue", Arial, sans-serif';

export async function fontsReady() {
  if (typeof document === "undefined" || !document.fonts) return;
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load(`500 64px ${SERIF}`, "svā"),
        document.fonts.load(`300 64px ${SERIF}`, "svā"),
        document.fonts.load(`400 32px ${SANS}`, "CALM"),
      ]),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch {
    /* fall back to whatever is available */
  }
}

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!] as const;
}

function tex(c: HTMLCanvasElement, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}

/* ───────────────────────────── Glyph atlas ─────────────────────────── */

export const ATLAS_COLS = 8;
const CELL = 96;
const CHARS = "abcdefghijklmnopqrstuvwxyzā·-’";
export const BEAD_LAVENDER = CHARS.length;
export const BEAD_CHAMOMILE = CHARS.length + 1;
export const BEAD_VETIVER = CHARS.length + 2;
export const GLYPH_SPACE = -1;

export function glyphIndex(ch: string): number {
  if (ch === " ") return GLYPH_SPACE;
  const i = CHARS.indexOf(ch.toLowerCase());
  return i === -1 ? CHARS.indexOf("·") : i;
}

export function makeGlyphAtlas() {
  const [c, g] = canvas(ATLAS_COLS * CELL, ATLAS_COLS * CELL);
  g.textAlign = "center";
  g.textBaseline = "middle";
  const cell = (i: number) => [(i % ATLAS_COLS) * CELL + CELL / 2, Math.floor(i / ATLAS_COLS) * CELL + CELL / 2] as const;

  g.fillStyle = INK;
  g.font = `500 ${CELL * 0.9}px ${SERIF}`;
  [...CHARS].forEach((ch, i) => {
    const [x, y] = cell(i);
    g.fillText(ch, x, y - CELL * 0.06);
  });

  // Lavender sprig: a stem with paired buds narrowing to the tip.
  {
    const [x, y] = cell(BEAD_LAVENDER);
    g.save();
    g.translate(x, y);
    g.strokeStyle = "#5E6B45";
    g.lineWidth = 2.2;
    g.beginPath();
    g.moveTo(0, -CELL * 0.44);
    g.lineTo(0, CELL * 0.44);
    g.stroke();
    for (let k = 0; k < 7; k++) {
      const yy = -CELL * 0.05 + k * CELL * 0.065;
      const s = 1 - k * 0.09;
      g.fillStyle = k % 2 ? "#7D6A9E" : "#9585B5";
      for (const side of [-1, 1]) {
        g.beginPath();
        g.ellipse(side * 6 * s, yy, 6 * s, 9.5 * s, side * 0.5, 0, Math.PI * 2);
        g.fill();
      }
    }
    g.restore();
  }
  // Chamomile: white petals around a yellow heart, fine ink edge.
  {
    const [x, y] = cell(BEAD_CHAMOMILE);
    g.save();
    g.translate(x, y);
    for (let k = 0; k < 14; k++) {
      g.save();
      g.rotate((k / 14) * Math.PI * 2);
      g.beginPath();
      g.ellipse(0, -CELL * 0.22, 6.5, CELL * 0.17, 0, 0, Math.PI * 2);
      g.fillStyle = "#FBF8F2";
      g.fill();
      g.strokeStyle = "rgba(43,33,27,.35)";
      g.lineWidth = 1;
      g.stroke();
      g.restore();
    }
    g.beginPath();
    g.arc(0, 0, CELL * 0.13, 0, Math.PI * 2);
    g.fillStyle = "#E2B23C";
    g.fill();
    g.restore();
  }
  // Vetiver: a small tuft of root-grass.
  {
    const [x, y] = cell(BEAD_VETIVER);
    g.save();
    g.translate(x, y + CELL * 0.4);
    g.strokeStyle = "#9A7443";
    g.lineCap = "round";
    for (let k = -4; k <= 4; k++) {
      g.lineWidth = 2.4 - Math.abs(k) * 0.2;
      g.beginPath();
      g.moveTo(k * 1.5, 0);
      g.quadraticCurveTo(k * 4, -CELL * 0.4, k * 7 + 2, -CELL * (0.78 - Math.abs(k) * 0.04));
      g.stroke();
    }
    g.restore();
  }

  const t = tex(c);
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

/* ───────────────────────────── svā seal face ───────────────────────── */

export function makeSealTexture() {
  const S = 1024;
  const [c, g] = canvas(S, S);
  const grd = g.createRadialGradient(S * 0.42, S * 0.38, S * 0.05, S / 2, S / 2, S * 0.55);
  grd.addColorStop(0, "#3A2218");
  grd.addColorStop(1, "#1E0F09");
  g.fillStyle = grd;
  g.fillRect(0, 0, S, S);
  // Paper grain.
  const img = g.getImageData(0, 0, S, S);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 12;
    img.data[i] += n;
    img.data[i + 1] += n * 0.8;
    img.data[i + 2] += n * 0.6;
  }
  g.putImageData(img, 0, 0);

  g.save();
  g.translate(S / 2, S / 2);
  g.rotate(-Math.PI / 2); // cylinder cap UVs are a quarter-turn off
  g.strokeStyle = GOLD;
  g.fillStyle = GOLD;
  g.lineWidth = 5;
  g.beginPath();
  g.arc(0, 0, S * 0.455, 0, Math.PI * 2);
  g.stroke();
  g.font = `400 ${S * 0.3}px ${SERIF}`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("svā", 0, -S * 0.02);
  g.restore();
  return tex(c);
}

/* ──────────────────────────────── Labels ───────────────────────────── */

/** Label strip for a cylinder seen side-on: text runs along the length. */
export function makeLabel(
  lines: { text: string; size: number; font?: "serif" | "sans"; spacing?: number; gap?: number }[],
  color: string,
  w = 1024,
  h = 256,
) {
  const [c, g] = canvas(w, h);
  g.clearRect(0, 0, w, h);
  g.fillStyle = color;
  g.textBaseline = "middle";
  g.textAlign = "left";
  let x = w * 0.08;
  for (const l of lines) {
    g.font = `${l.font === "sans" ? 400 : 400} ${l.size}px ${l.font === "sans" ? SANS : SERIF}`;
    if ("letterSpacing" in g) (g as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${l.spacing ?? 0}px`;
    g.fillText(l.text, x, h / 2);
    x += g.measureText(l.text).width + (l.gap ?? 40);
  }
  return tex(c);
}

/** A centered stacked label (front face of a flacon, candle sticker…). */
export function makeStackLabel(
  lines: { text: string; size: number; font?: "serif" | "sans"; spacing?: number }[],
  color: string,
  bg: string | null,
  w = 512,
  h = 512,
) {
  const [c, g] = canvas(w, h);
  if (bg) {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
  }
  g.fillStyle = color;
  g.textAlign = "center";
  g.textBaseline = "middle";
  const total = lines.reduce((s, l) => s + l.size * 1.35, 0);
  let y = h / 2 - total / 2;
  for (const l of lines) {
    g.font = `400 ${l.size}px ${l.font === "sans" ? SANS : SERIF}`;
    if ("letterSpacing" in g) (g as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${l.spacing ?? 0}px`;
    y += (l.size * 1.35) / 2;
    g.fillText(l.text, w / 2, y);
    y += (l.size * 1.35) / 2;
  }
  return tex(c);
}

/* ──────────────────────────────── Wall ─────────────────────────────── */

/** Linen paper tile: fine woven noise, tiled across the backdrop. */
export function makeLinen() {
  const S = 256;
  const [c, g] = canvas(S, S);
  g.fillStyle = PAPER;
  g.fillRect(0, 0, S, S);
  const img = g.getImageData(0, 0, S, S);
  const d = img.data;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = (y * S + x) * 4;
      // Whole cycles per tile, so the weave tiles without a seam.
      const weave = (Math.sin((x * Math.PI * 2 * 80) / S) * 0.5 + Math.sin((y * Math.PI * 2 * 86) / S) * 0.5) * 2.2;
      const n = (Math.random() - 0.5) * 9 + weave;
      d[i] += n;
      d[i + 1] += n;
      d[i + 2] += n * 0.9;
    }
  }
  g.putImageData(img, 0, 0);
  const t = tex(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
