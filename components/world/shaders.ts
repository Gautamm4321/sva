/**
 * Shaders for the hero: a painted dawn landscape (sky, sun, clouds, misty
 * ridges) behind the strands, drifting mist in front of them, and the
 * botanical sprites themselves.
 */

const NOISE = /* glsl */ `
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; }
  return v;
}
float ridge(float x, float seed) {
  float h = 0.0, a = 0.55, f = 1.0;
  for (int i = 0; i < 5; i++) {
    float n = noise(vec2(x * f, seed + float(i) * 7.0));
    n = 1.0 - abs(n * 2.0 - 1.0);
    h += a * n * n;
    f *= 2.15; a *= 0.48;
  }
  return h;
}
`;

export const screenVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const landscapeFragment = /* glsl */ `
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uPointer;
uniform float uScroll;
uniform vec3 uPaper;
varying vec2 vUv;
${NOISE}

void main() {
  vec2 uv = vUv;
  float asp = uRes.x / uRes.y;
  vec2 p = vec2(uv.x * asp, uv.y);
  vec2 par = uPointer * 0.012;
  float t = uTime;

  // Sky: cool linen above, warm dawn at the horizon.
  vec3 skyTop = vec3(0.79, 0.79, 0.77);
  vec3 skyHor = vec3(0.97, 0.86, 0.69);
  vec3 col = mix(skyHor, skyTop, smoothstep(0.38, 1.05, uv.y));

  // Sun, low and warm, partly veiled.
  vec2 sunP = vec2((asp > 1.0 ? 0.72 : 0.62) * asp, 0.5) + par * 0.4 + vec2(0.0, uScroll * 0.08);
  float sd = length(p - sunP);
  col += vec3(1.0, 0.82, 0.55) * (exp(-sd * sd * 14.0) * 0.5 + exp(-sd * 3.2) * 0.16);

  // Two drifting cloud decks.
  for (int k = 0; k < 2; k++) {
    if (uv.y < 0.44) break;
    float fk = float(k);
    vec2 cp = p * vec2(1.1, 3.4) * (1.0 + fk * 0.55) + vec2(t * (0.006 + fk * 0.005), fk * 4.3) + par * (1.0 + fk * 1.5);
    float c = fbm(cp);
    float band = smoothstep(0.46, 0.7, uv.y) * (0.75 + 0.25 * fk);
    float cl = smoothstep(0.5, 0.76, c) * band;
    vec3 shade = mix(vec3(0.7, 0.64, 0.6), vec3(1.0, 0.96, 0.9), smoothstep(0.52, 0.85, c));
    shade += vec3(0.25, 0.15, 0.02) * exp(-sd * 2.6) * 0.6;
    col = mix(col, shade, cl * 0.82);
  }

  // Ridges, nearest first: the first ridge that covers this pixel paints it,
  // so most pixels evaluate only one or two profiles. Sky above the tallest
  // ridge skips the loop entirely.
  vec3 haze = vec3(0.92, 0.84, 0.73);
  vec3 lay[5];
  lay[0] = vec3(0.72, 0.66, 0.66);
  lay[1] = vec3(0.6, 0.58, 0.54);
  lay[2] = vec3(0.46, 0.47, 0.4);
  lay[3] = vec3(0.32, 0.33, 0.26);
  lay[4] = vec3(0.19, 0.18, 0.14);
  float scrollLift = uScroll * 0.16;
  if (uv.y < 0.64 + scrollLift) {
    for (int ii = 0; ii < 5; ii++) {
      int i = 4 - ii;
      float fi = float(i);
      float depth = fi / 4.0;
      float base = 0.45 - fi * 0.085 + uScroll * (0.04 + fi * 0.03);
      if (uv.y > base + 0.16) continue;
      float amp = 0.1 + fi * 0.028;
      float x = p.x * (1.15 + fi * 0.5) + fi * 7.3 + par.x * (1.0 + fi * 4.0);
      float h = base + amp * ridge(x, fi * 13.0) - 0.03;
      if (uv.y < h) {
        vec3 lc = mix(lay[i], haze, (1.0 - depth) * 0.5);
        float tex = noise(p * vec2(38.0, 70.0) * (0.6 + depth) + fi * 3.0) * 0.6
                  + noise(p * vec2(90.0, 160.0) + fi) * 0.4;
        lc *= 0.9 + 0.16 * tex * (0.3 + depth);
        float crest = 1.0 - smoothstep(0.0, 0.025 + depth * 0.02, h - uv.y);
        lc += vec3(0.08, 0.06, 0.02) * crest * (1.0 - depth * 0.5);
        col = lc;
        // Valley mist pooling at the foot of this ridge.
        float mist = smoothstep(base + 0.02, base - 0.14, uv.y);
        mist *= smoothstep(0.25, 0.85, fbm(p * vec2(1.6, 5.0) + vec2(t * 0.012 * (1.0 + fi), fi * 2.0)));
        col = mix(col, haze, mist * (0.6 - depth * 0.25));
        break;
      }
    }
  }

  // The scene dissolves into paper through low cloud at the bottom.
  float bc = fbm(vec2(p.x * 2.4 + t * 0.01, uv.y * 3.0 + t * 0.004));
  float fade = smoothstep(0.17, 0.0, uv.y - (bc - 0.5) * 0.16);
  col = mix(col, uPaper, fade);

  col += (hash(uv * uRes + fract(t * 7.0)) - 0.5) * 0.022;
  gl_FragColor = vec4(col, 1.0);
}
`;

/** Mist drifting in front of the strands — sells the depth. */
export const mistFragment = /* glsl */ `
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uPointer;
uniform float uOpacity;
varying vec2 vUv;
${NOISE}

void main() {
  vec2 uv = vUv;
  vec2 p = vec2(uv.x * uRes.x / uRes.y, uv.y);
  float t = uTime;
  float n = fbm(p * vec2(1.4, 3.2) + vec2(t * 0.02, 0.0) + uPointer * 0.04);
  float n2 = fbm(p * vec2(2.6, 5.0) - vec2(t * 0.014, t * 0.003));
  float band = smoothstep(0.12, 0.3, uv.y) * smoothstep(0.62, 0.36, uv.y);
  float top = smoothstep(0.82, 1.0, uv.y) * 0.6;
  float a = smoothstep(0.48, 0.82, n * 0.65 + n2 * 0.35) * (band + top);
  gl_FragColor = vec4(vec3(0.97, 0.93, 0.87), a * uOpacity);
}
`;

export const spriteVertex = /* glsl */ `
attribute vec3 aPos;
attribute vec3 aDir;
attribute vec4 aInfo; // type, size, spin, unused

uniform float uCols;
uniform float uFocus;

varying vec2 vUv;
varying float vFog;
varying float vBlur;

void main() {
  vec4 vp = viewMatrix * vec4(aPos, 1.0);
  vec3 td = mat3(viewMatrix) * aDir;
  float ang = atan(td.y, td.x) + 1.5707963 + aInfo.z;
  float c = cos(ang), s = sin(ang);
  // Sprites hang from their node: offset so the top of the sprite is at the knot.
  vec2 q = position.xy - vec2(0.0, 0.45);
  vp.xy += mat2(c, s, -s, c) * q * aInfo.y;
  gl_Position = projectionMatrix * vp;
  float cell = aInfo.x;
  vec2 cc = vec2(mod(cell, uCols), floor(cell / uCols));
  vUv = (cc + vec2(uv.x, 1.0 - uv.y)) / uCols;
  vUv.y = 1.0 - vUv.y;
  float depth = -vp.z;
  vBlur = clamp(abs(depth - uFocus) * 0.24, 0.0, 1.0);
  vFog = clamp((depth - uFocus) * 0.11, 0.0, 0.6);
}
`;

export const spriteFragment = /* glsl */ `
uniform sampler2D uAtlas;
uniform vec3 uHaze;
varying vec2 vUv;
varying float vFog;
varying float vBlur;

void main() {
  vec4 t = texture2D(uAtlas, vUv, vBlur * 2.5);
  if (t.a < 0.03) discard;
  vec3 col = mix(t.rgb, uHaze, vFog);
  gl_FragColor = vec4(col, t.a * (1.0 - vBlur * 0.35));
}
`;
