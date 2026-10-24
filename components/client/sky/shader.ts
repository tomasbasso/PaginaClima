// GLSL ES 1.00 sources of the living sky (compile on webgl and webgl2). Bundle constants only:
// never built at runtime nor fetched (T-03-01). Colors arrive as linear RGB from skyPalette().

/** Full-screen triangle: 3 vertices cover the viewport, no indices. */
export const VERTEX_SRC = `
attribute vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`

export const FRAGMENT_SRC = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 uRes;      // buffer px
uniform float uBandTop; // buffer px from the top: top edge of the horizon band (measured)
uniform float uHorizon; // buffer px from the top: horizon line (bottom of the sky box)
uniform float uScale;   // buffer px per CSS px
uniform vec3 uS1;       // S1..S5, linear RGB (skyPalette)
uniform vec3 uS2;
uniform vec3 uS3;
uniform vec3 uS4;
uniform vec3 uS5;
uniform float uGrain;   // 0 or 1
uniform vec3 uSun;      // x (0..1 of the width), strength (0..1), unused
uniform vec3 uMoon;     // x (0..1), yFrac (0 = top, 1 = horizon), strength (0..1)
uniform float uStars;   // global star alpha (sun altitude × weather), 0..1
uniform float uTwinkleT; // seconds, wrapped in CPU to [0, 420) (Pitfall 3)
uniform float uQuality; // 1 = full, >= 2 = no twinkle (governor level 2, static frames)

// C-1 cap with a margin under 0.075 (grain and rounding).
const float LMAX = 0.073;
// Ground below the horizon: #0e131c in linear RGB.
const vec3 GROUND = vec3(0.004391, 0.006512, 0.011612);
// sun #f4c06a and ink #fbfbf2 in linear RGB.
const vec3 SUN = vec3(0.904661, 0.527115, 0.144128);
const vec3 INK = vec3(0.964686, 0.964686, 0.887923);
const float TAU = 6.2831853;
// Stars (UI-SPEC capa 3, C-4): one candidate per STAR_CELL CSS px cell. 390 × 844 has ~420 cells;
// density falls linearly downwards (1 − 0.9·y) so ~70 % land in the upper half, ~100 in total.
const float STAR_CELL = 28.0;
const float STAR_DENSITY = 0.433;

float lum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

// Exact piecewise sRGB encoding (IEC 61966-2-1); WebGL shows the output as is.
vec3 toSrgb(vec3 c) {
  vec3 lo = c * 12.92;
  vec3 hi = 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055;
  return mix(lo, hi, step(vec3(0.0031308), c));
}

// Sine-free hash (Dave Hoskins): stable with large coordinates on fp16-ish mobile GPUs.
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec3 gradient(float y) {
  float p2 = 0.4 * uBandTop;
  float p4 = uHorizon - 0.4 * (uHorizon - uBandTop);
  if (y >= uHorizon) return GROUND;
  if (y < p2) return mix(uS1, uS2, y / max(p2, 1.0));
  if (y < uBandTop) return mix(uS2, uS3, (y - p2) / max(uBandTop - p2, 1.0));
  if (y < p4) return mix(uS3, uS4, (y - uBandTop) / max(p4 - uBandTop, 1.0));
  return mix(uS4, uS5, (y - p4) / max(uHorizon - p4, 1.0));
}

void main() {
  float y = uRes.y - gl_FragCoord.y; // 0 = top (gl_FragCoord has its origin at the bottom)
  vec3 c = gradient(y);

  vec2 p = vec2(gl_FragCoord.x, y); // buffer px, origin top-left

  // Sun glow (D-05, no disc): elliptical radial glow sitting on the horizon, rx <= 60 % of the
  // width, ry <= band height, sun colour towards S5. Whatever spills into the content zone is
  // scaled down by the clamp below.
  if (uSun.y > 0.0 && y < uHorizon) {
    vec2 q = vec2((p.x - uSun.x * uRes.x) / (0.6 * uRes.x), (y - uHorizon) / max(uHorizon - uBandTop, 1.0));
    float d = length(q);
    float g = exp(-3.0 * d * d) * (1.0 - smoothstep(0.6, 1.0, d)) * uSun.y;
    c = mix(c, mix(SUN, uS5, 0.35), 0.75 * g);
  }

  // Moon halo: very soft ink, peak luminance gain <= 0.02 (C-1 still wins in the content zone).
  if (uMoon.z > 0.0 && y < uHorizon) {
    vec2 q = (p - vec2(uMoon.x * uRes.x, uMoon.y * uHorizon)) / max(0.45 * min(uRes.x, uHorizon), 1.0);
    c += INK * (0.0207 * exp(-2.5 * dot(q, q)) * uMoon.z);
  }

  // Later plans add here, BEFORE the clamp: clouds, fog, rain.

  // Fixed grain, ±1.5 % of luminance, applied before the clamp (Pitfall 8).
  c *= 1.0 + (hash12(gl_FragCoord.xy) - 0.5) * 0.03 * uGrain;

  // C-1: scale the content zone down to LMAX without changing hue; 24 CSS px ramp at the band edge.
  float L = lum(c);
  float wContent = 1.0 - smoothstep(uBandTop - 24.0 * uScale, uBandTop, y);
  c *= mix(1.0, min(1.0, LMAX / max(L, 1e-5)), wContent);

  // Stars AFTER the clamp (C-4 exception: their limit is size and alpha). Sky zone only.
  if (uStars > 0.001 && y < uHorizon) {
    vec2 pCss = p / uScale;
    vec2 cell = floor(pCss / STAR_CELL);
    float yN = clamp((cell.y + 0.5) * STAR_CELL * uScale / max(uHorizon, 1.0), 0.0, 1.0);
    if (hash12(cell + 71.3) < STAR_DENSITY * (1.0 - 0.9 * yN)) {
      vec2 sCss = (cell + 0.15 + 0.7 * vec2(hash12(cell + 13.7), hash12(cell + 29.1))) * STAR_CELL;
      vec2 sBuf = floor(sCss * uScale) + 0.5; // snapped to a pixel centre
      // 1–1.5 CSS px; at least 1 buffer px wide, alpha compensated by coverage (Pitfall 6).
      float dBuf = (1.0 + 0.5 * hash12(cell + 47.9)) * uScale;
      float rBuf = max(0.5, 0.5 * dBuf);
      float mask = 1.0 - smoothstep(rBuf - 0.5, rBuf + 0.5, length(p - sBuf));
      float period = 3.0 + 4.0 * hash12(cell + 5.3);
      float amp = uQuality < 1.5 ? 0.25 : 0.0;
      float tw = 1.0 + amp * sin(TAU * (uTwinkleT / period + hash12(cell + 91.1)));
      float a = min(0.6, (0.2 + 0.4 * hash12(cell + 61.7)) * tw) * min(1.0, dBuf) * mask * uStars;
      c = mix(c, INK, a);
    }
  }

  // Later plans add here, AFTER the clamp: lightning (C-5), with its own cap.

  gl_FragColor = vec4(toSrgb(clamp(c, 0.0, 1.0)), 1.0);
}
`
