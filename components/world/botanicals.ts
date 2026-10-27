import * as THREE from "three";

/**
 * Botanical sprite atlas, drawn on a canvas at runtime — lavender, chamomile,
 * leaves, vetiver, petals and small gold beads. No image assets.
 */

export const COLS = 4;
const CELL = 128;

export enum Bot {
  Lavender = 0,
  Chamomile = 1,
  Leaf = 2,
  Vetiver = 3,
  Bud = 4,
  Bead = 5,
  Petal = 6,
  LeafPair = 7,
}

/** World-space size of each sprite (height). */
export const BOT_SIZE: Record<Bot, number> = {
  [Bot.Lavender]: 0.42,
  [Bot.Chamomile]: 0.24,
  [Bot.Leaf]: 0.22,
  [Bot.Vetiver]: 0.44,
  [Bot.Bud]: 0.11,
  [Bot.Bead]: 0.07,
  [Bot.Petal]: 0.15,
  [Bot.LeafPair]: 0.26,
};

function cellCenter(i: number) {
  return [(i % COLS) * CELL + CELL / 2, Math.floor(i / COLS) * CELL + CELL / 2] as const;
}

function lavender(g: CanvasRenderingContext2D) {
  g.strokeStyle = "#5F6B47";
  g.lineWidth = 2.4;
  g.lineCap = "round";
  g.beginPath();
  g.moveTo(0, -60);
  g.quadraticCurveTo(3, 0, 0, 60);
  g.stroke();
  // Whorls of buds, densest and darkest toward the tip (bottom when hanging).
  for (let k = 0; k < 11; k++) {
    const y = -6 + k * 6.2;
    const s = 1 - Math.abs(k - 6) * 0.06;
    for (const side of [-1, 1]) {
      const grd = g.createLinearGradient(0, y - 8, 0, y + 8);
      grd.addColorStop(0, "#A897C7");
      grd.addColorStop(1, "#6D5A93");
      g.fillStyle = grd;
      g.beginPath();
      g.ellipse(side * 5.5 * s, y, 5.2 * s, 8.4 * s, side * 0.55, 0, Math.PI * 2);
      g.fill();
    }
  }
}

function chamomile(g: CanvasRenderingContext2D) {
  for (let k = 0; k < 16; k++) {
    g.save();
    g.rotate((k / 16) * Math.PI * 2);
    const grd = g.createLinearGradient(0, -10, 0, -54);
    grd.addColorStop(0, "#EDE7DA");
    grd.addColorStop(1, "#FFFDF8");
    g.fillStyle = grd;
    g.beginPath();
    g.ellipse(0, -33, 8.5, 22, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "rgba(90,70,50,.22)";
    g.lineWidth = 1;
    g.stroke();
    g.restore();
  }
  const c = g.createRadialGradient(-4, -4, 2, 0, 0, 17);
  c.addColorStop(0, "#F6CF5A");
  c.addColorStop(1, "#C98E1E");
  g.fillStyle = c;
  g.beginPath();
  g.arc(0, 0, 16, 0, Math.PI * 2);
  g.fill();
}

function leaf(g: CanvasRenderingContext2D, color = "#7D8A5B", dark = "#56613B") {
  const grd = g.createLinearGradient(-20, 0, 20, 0);
  grd.addColorStop(0, dark);
  grd.addColorStop(0.5, color);
  grd.addColorStop(1, dark);
  g.fillStyle = grd;
  g.beginPath();
  g.moveTo(0, -56);
  g.bezierCurveTo(30, -26, 26, 30, 0, 58);
  g.bezierCurveTo(-26, 30, -30, -26, 0, -56);
  g.fill();
  g.strokeStyle = "rgba(40,45,25,.45)";
  g.lineWidth = 1.4;
  g.beginPath();
  g.moveTo(0, -50);
  g.lineTo(0, 54);
  g.stroke();
}

function vetiver(g: CanvasRenderingContext2D) {
  g.lineCap = "round";
  for (let k = -5; k <= 5; k++) {
    g.strokeStyle = k % 2 ? "#A9834F" : "#8E6A3C";
    g.lineWidth = 2.6 - Math.abs(k) * 0.2;
    g.beginPath();
    g.moveTo(k * 1.2, -60);
    g.quadraticCurveTo(k * 3.5, 0, k * 7.5 + Math.sin(k) * 4, 58 - Math.abs(k) * 4);
    g.stroke();
  }
}

function bud(g: CanvasRenderingContext2D) {
  const grd = g.createLinearGradient(0, -40, 0, 40);
  grd.addColorStop(0, "#B3A2D0");
  grd.addColorStop(1, "#6A5690");
  g.fillStyle = grd;
  g.beginPath();
  g.ellipse(0, 0, 26, 44, 0, 0, Math.PI * 2);
  g.fill();
}

function bead(g: CanvasRenderingContext2D) {
  const grd = g.createRadialGradient(-14, -16, 4, 0, 0, 46);
  grd.addColorStop(0, "#FFF1D2");
  grd.addColorStop(0.35, "#E2B57D");
  grd.addColorStop(1, "#8F6236");
  g.fillStyle = grd;
  g.beginPath();
  g.arc(0, 0, 44, 0, Math.PI * 2);
  g.fill();
}

function petal(g: CanvasRenderingContext2D) {
  const grd = g.createLinearGradient(0, -50, 0, 50);
  grd.addColorStop(0, "#F4E6D6");
  grd.addColorStop(1, "#DDBFA3");
  g.fillStyle = grd;
  g.beginPath();
  g.moveTo(0, 54);
  g.bezierCurveTo(44, 20, 34, -50, 0, -40);
  g.bezierCurveTo(-34, -50, -44, 20, 0, 54);
  g.fill();
  g.strokeStyle = "rgba(120,80,50,.25)";
  g.lineWidth = 1.2;
  g.stroke();
}

function leafPair(g: CanvasRenderingContext2D) {
  g.strokeStyle = "#5C6740";
  g.lineWidth = 2.2;
  g.beginPath();
  g.moveTo(0, -60);
  g.lineTo(0, 60);
  g.stroke();
  for (const [side, y, r] of [
    [-1, -18, -0.7],
    [1, 14, 0.7],
  ] as const) {
    g.save();
    g.translate(side * 16, y);
    g.rotate(r);
    g.scale(0.5, 0.62);
    leaf(g, "#8C9868", "#5E6A43");
    g.restore();
  }
}

export function makeBotanicalAtlas() {
  const c = document.createElement("canvas");
  c.width = c.height = COLS * CELL;
  const g = c.getContext("2d")!;
  const draws: ((g: CanvasRenderingContext2D) => void)[] = [];
  draws[Bot.Lavender] = lavender;
  draws[Bot.Chamomile] = chamomile;
  draws[Bot.Leaf] = (gg) => leaf(gg);
  draws[Bot.Vetiver] = vetiver;
  draws[Bot.Bud] = bud;
  draws[Bot.Bead] = bead;
  draws[Bot.Petal] = petal;
  draws[Bot.LeafPair] = leafPair;
  draws.forEach((draw, i) => {
    const [x, y] = cellCenter(i);
    g.save();
    g.translate(x, y);
    draw(g);
    g.restore();
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.anisotropy = 4;
  return t;
}
