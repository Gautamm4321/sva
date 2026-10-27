/**
 * Strand glyphs. Each instance is a camera-facing quad at a strand node,
 * rotated in screen space to follow the strand — so letters read upright at
 * rest and turn with the strand when it swings or twists.
 */
export const glyphVertex = /* glsl */ `
attribute vec3 aPos;
attribute vec3 aDir;
attribute float aGlyph;

uniform float uSize;
uniform float uCols;
uniform float uFocus;

varying vec2 vUv;
varying float vFog;
varying float vSkip;

void main() {
  vSkip = aGlyph < 0.0 ? 1.0 : 0.0;
  vec4 vp = viewMatrix * vec4(aPos, 1.0);
  vec3 td = mat3(viewMatrix) * aDir;
  float ang = atan(td.y, td.x) + 1.5707963;
  float c = cos(ang), s = sin(ang);
  vec2 corner = mat2(c, s, -s, c) * position.xy * uSize;
  vp.xy += corner;
  gl_Position = projectionMatrix * vp;

  float g = max(aGlyph, 0.0);
  vec2 cell = vec2(mod(g, uCols), floor(g / uCols));
  vUv = (cell + vec2(uv.x, 1.0 - uv.y)) / uCols;
  vUv.y = 1.0 - vUv.y;
  // Strands further back than the piece's front read lighter (air between).
  vFog = clamp((-vp.z - uFocus) * 0.32, 0.0, 0.55);
}
`;

export const glyphFragment = /* glsl */ `
uniform sampler2D uAtlas;
uniform vec3 uPaper;
varying vec2 vUv;
varying float vFog;
varying float vSkip;

void main() {
  if (vSkip > 0.5) discard;
  vec4 t = texture2D(uAtlas, vUv);
  if (t.a < 0.04) discard;
  vec3 col = mix(t.rgb, uPaper, vFog);
  gl_FragColor = vec4(col, t.a * (1.0 - vFog * 0.4));
}
`;

/**
 * Soft shadows of the strands on the paper wall: each node is projected along
 * the key light onto the wall plane as a blurred blob that widens (and fades)
 * with its distance from the wall — a cheap, convincing penumbra.
 */
export const shadowVertex = /* glsl */ `
attribute vec3 aPos;
attribute float aGlyph;

uniform vec3 uLight;
uniform float uWall;
uniform float uSize;

varying vec2 vUv;
varying float vStrength;

void main() {
  float t = (uWall - aPos.z) / uLight.z;
  vec3 p = aPos + uLight * t;
  p.z = uWall + 0.002;
  float dist = max(aPos.z - uWall, 0.0);
  float s = uSize * (2.6 + dist * 1.3);
  vec4 vp = viewMatrix * vec4(p, 1.0);
  vp.xy += position.xy * s;
  gl_Position = projectionMatrix * vp;
  vUv = uv;
  vStrength = (aGlyph < 0.0 ? 0.0 : 1.0) / (1.0 + dist * 0.9);
}
`;

export const shadowFragment = /* glsl */ `
uniform vec3 uInk;
uniform float uOpacity;
varying vec2 vUv;
varying float vStrength;

void main() {
  vec2 q = vUv * 2.0 - 1.0;
  float a = exp(-dot(q, q) * 2.6) * uOpacity * vStrength;
  if (a < 0.003) discard;
  gl_FragColor = vec4(uInk, a);
}
`;
