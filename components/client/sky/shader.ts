// GLSL ES 1.00 sources of the living sky (compile on webgl and webgl2). Bundle constants only:
// never built at runtime nor fetched (T-03-01). Colors arrive as linear RGB from skyPalette().

/** Full-screen triangle: 3 vertices cover the viewport, no indices. */
export const VERTEX_SRC = `
attribute vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`

/**
 * Periods (CSS px) of the noise fields and of the offsets the renderer wraps in CPU (Pattern 4,
 * Pitfall 3). The noise lattice repeats exactly every period, so the wrap never shows.
 */
export const CLOUD_PERIOD_PX = 1536
export const FOG_PERIOD_PX = 1024
/** Rain offsets wrap here; it is a multiple of both layers' streak spacing (600 and 400 px). */
export const RAIN_PERIOD_PX = 1200

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
uniform float uCover;   // cloud cover 0..1, interpolated (skyParams)
uniform vec2 uCloudOffset; // CSS px, near / far cloud layer, wrapped in CPU to [0, CLOUD_PERIOD)
uniform float uNight;   // 0 = day/twilight, 1 = night (sun <= -12 deg): clouds only +0.01 of L
uniform float uFog;     // fog 0..1, interpolated
uniform float uFogOffset; // CSS px, wrapped in CPU to [0, FOG_PERIOD)
uniform float uRain;    // rain density 0..1, interpolated (halved at governor level 2)
uniform float uRainTilt; // radians from the vertical, + = falling towards the right
uniform vec2 uRainOffset; // CSS px along the fall, near / far layer, wrapped in CPU to [0, RAIN_PERIOD)
uniform vec3 uFlash;    // lightning: x (0..1 of the width), amplitude (lightningEnvelope), radius (buffer px)
uniform vec3 uFlashColor; // FLASH_RGB_LINEAR (storm + ink, not pure white)
uniform float uFlashContent; // CONTENT_FLASH_FACTOR: share of the flash allowed over the content zone

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
// Clouds (UI-SPEC capa 4): two fbm layers, lattice cells in CSS px. CLOUD_PERIOD / cell must be an
// integer so the noise wraps exactly with the offset.
const float CLOUD_PERIOD = ${CLOUD_PERIOD_PX}.0;
const float CLOUD_CELL_NEAR = 192.0; // 8 cells per period
const float CLOUD_CELL_FAR = 256.0;  // 6 cells per period
// Fog (capa 5): undulating top edge, 8 cells per period.
const float FOG_PERIOD = ${FOG_PERIOD_PX}.0;
const float FOG_CELL = 128.0;
// Rain (capa 6, D-07): streaks in columns of the rotated space, one streak every RAIN_REP px of a
// column. Visible streaks ≈ area / (column × spacing) × density, rotation-invariant: at 390 × 844
// near 390·844/(8·600) ≈ 69 + far 390·844/(10·400) ≈ 82 → ≈ 151 ≤ 160 at intensity 1 (T-03-11).
const float RAIN_COL_NEAR = 8.0;
const float RAIN_REP_NEAR = 600.0;
const float RAIN_COL_FAR = 10.0;
const float RAIN_REP_FAR = 400.0;
const float RAIN_DENSITY_MAX = 1.0;

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

// Value noise, periodic in x every 'per' lattice cells (integer), smooth (C1) interpolation.
float vnoise(vec2 x, float per) {
  vec2 i = floor(x);
  vec2 f = fract(x);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float i0 = mod(i.x, per);
  float i1 = mod(i.x + 1.0, per);
  float a = hash12(vec2(i0, i.y));
  float b = hash12(vec2(i1, i.y));
  float c = hash12(vec2(i0, i.y + 1.0));
  float d = hash12(vec2(i1, i.y + 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// 4 fixed octaves (no data-dependent loop, T-03-11). Each octave doubles the frequency and the
// period in cells, so the sum keeps the same period in px. Output normalised to 0..1.
float fbm(vec2 x, float per) {
  float v = 0.0;
  float a = 0.5;
  for (int k = 0; k < 4; k++) {
    v += a * vnoise(x, per);
    x = x * 2.0 + vec2(0.0, 17.3); // shift in y only: keeps the x period
    per *= 2.0;
    a *= 0.5;
  }
  return v / 0.9375;
}

// Cloud density for a noise value: nothing at cover 0, a full blanket at cover 1 (D-04: soft
// fields, no outline).
float cloudDensity(float n) {
  float thr = mix(0.85, -0.1, uCover);
  return smoothstep(thr, thr + 0.35, n) * smoothstep(0.0, 0.08, uCover);
}

// Alpha of one rain layer at r (rotated CSS px: x across the fall, y along it). Each column is on
// or off by hash, with its own phase, length (12–24 CSS px), lateral jitter and base alpha.
float rainLayer(vec2 r, float off, float colW, float rep, float seed) {
  float col = floor(r.x / colW);
  if (hash12(vec2(col, seed)) >= uRain * RAIN_DENSITY_MAX) return 0.0;
  float len = 12.0 + 12.0 * hash12(vec2(col, seed + 1.7));
  float phase = rep * hash12(vec2(col, seed + 3.1));
  float v = mod(r.y - off - phase, rep); // 0 = tail end … len = head of the streak
  if (v > len) return 0.0;
  float cx = (col + 0.2 + 0.6 * hash12(vec2(col, seed + 5.9))) * colW;
  // 1 CSS px wide: at least 1 buffer px, alpha compensated by coverage, smoothstep AA (Pitfall 6).
  float wBuf = uScale;
  float halfW = max(0.5, 0.5 * wBuf);
  float dBuf = abs(r.x - cx) * uScale;
  float mask = 1.0 - smoothstep(halfW - 0.5, halfW + 0.5, dBuf);
  float ends = smoothstep(0.0, 4.0, v) * (1.0 - smoothstep(len - 2.0, len, v));
  float a = 0.10 + 0.15 * hash12(vec2(col, seed + 7.3)); // 0.10–0.25 in ink
  return a * min(1.0, wBuf) * mask * ends;
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

  // Content-zone weight (1 above the band, 24 CSS px ramp at its edge); used by the weather layers
  // and by the C-1 clamp below.
  float wContent = 1.0 - smoothstep(uBandTop - 24.0 * uScale, uBandTop, y);
  vec2 pc = p / uScale; // CSS px
  float bandT = clamp((y - uBandTop) / max(uHorizon - uBandTop, 1.0), 0.0, 1.0);

  // Clouds (capa 4, D-04/D-08): two fbm layers drifting with the real wind (offsets in CPU), the
  // far one slower. Day/twilight: a touch lighter than the sky, the lower part in the band lit from
  // below with S4/S5. Night: at most +0.01 of L over the background. The clamp keeps them <= S3 in
  // the content zone.
  float cloudA = 0.0; // cloud alpha at this pixel, reused by the lightning (light from inside)
  if (uCover > 0.001 && y < uHorizon) {
    vec3 nightCol = c + vec3(0.01);
    vec3 topCol = mix(uS2, uS3, 0.6) * 1.12 + 0.003;
    vec3 under = mix(uS4, uS5, bandT);
    float aMax = mix(0.55, 0.9, uCover);

    float nF = fbm(vec2((pc.x + uCloudOffset.y) / CLOUD_CELL_FAR, pc.y / 150.0 + 31.7), CLOUD_PERIOD / CLOUD_CELL_FAR);
    vec3 colF = mix(mix(topCol, under, 0.85 * bandT * (1.0 - 0.5 * nF)), nightCol, uNight);
    float aF = 0.6 * aMax * cloudDensity(nF);
    c = mix(c, colF, aF);

    float nN = fbm(vec2((pc.x + uCloudOffset.x) / CLOUD_CELL_NEAR, pc.y / 120.0), CLOUD_PERIOD / CLOUD_CELL_NEAR);
    vec3 colN = mix(mix(topCol, under, 0.85 * bandT * (1.0 - 0.5 * nN)), nightCol, uNight);
    float aN = aMax * cloudDensity(nN);
    c = mix(c, colN, aN);
    cloudA = max(aF, aN);
  }

  // Fog (capa 5, D-13): low haze in ink rising from the horizon up to the band edge and fading,
  // undulating slowly. It sits behind the SVG silhouette (the canvas is behind). Over the content
  // zone only a veil <= +0.01 of L, never a layer in front of the text.
  if (uFog > 0.001 && y < uHorizon) {
    float fx = (pc.x + uFogOffset) / FOG_CELL;
    float wave = 0.65 * vnoise(vec2(fx, 3.1), FOG_PERIOD / FOG_CELL) + 0.35 * vnoise(vec2(fx * 2.0, 9.7), 2.0 * FOG_PERIOD / FOG_CELL);
    float fogA = uFog * mix(0.10, 0.25, bandT) * smoothstep(0.0, 0.55, bandT + 0.2 * (wave - 0.5)) * (1.0 - wContent);
    c = mix(c, INK, fogA);
    c += vec3(0.008 * uFog * wContent);
  }

  // Rain (capa 6, D-07/D-08): thin straight streaks tilted by the wind, two depth layers (near
  // faster and brighter). Density ∝ real intensity. Capped at 0.18 alpha over the content zone
  // (0.25 × 0.72). Frozen when the offsets do not move (static frames). Still 1 draw call.
  if (uRain > 0.001 && y < uHorizon) {
    float sT = sin(uRainTilt);
    float cT = cos(uRainTilt);
    // Fall direction (sT, cT) in screen space (y down) maps to r = (0, 1).
    vec2 r = vec2(pc.x * cT - pc.y * sT, pc.x * sT + pc.y * cT);
    float aR = rainLayer(r, uRainOffset.x, RAIN_COL_NEAR, RAIN_REP_NEAR, 11.0);
    aR = max(aR, 0.6 * rainLayer(r + vec2(3.7, 0.0), uRainOffset.y, RAIN_COL_FAR, RAIN_REP_FAR, 23.0));
    c = mix(c, INK, aR * mix(1.0, 0.72, wContent));
  }

  // Fixed grain, ±1.5 % of luminance, applied before the clamp (Pitfall 8).
  c *= 1.0 + (hash12(gl_FragCoord.xy) - 0.5) * 0.03 * uGrain;

  // C-1: scale the content zone down to LMAX without changing hue; 24 CSS px ramp at the band edge.
  float L = lum(c);
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

  // Lightning AFTER the clamp (C-5 exception, D-07): a diffuse brightening centred inside the band
  // that spills upwards with a soft falloff. No bolt, no zigzag, no full-screen flash. The added
  // luminance is lum(uFlashColor) × amplitude × falloff × zone ≤ FLASH_MAX_DELTA_L (< 0.08) since
  // every factor is ≤ 1; over the content zone the zone factor is uFlashContent (≤ 0.10 absolute).
  // Clouds there light up a bit more (from inside) without exceeding the cap. The SVG silhouette
  // sits in front of the canvas, so it stays in backlight without changing colour (D-13).
  if (uFlash.y > 0.0 && y < uHorizon) {
    float bandH = max(uHorizon - uBandTop, 1.0);
    vec2 fc = vec2(uFlash.x * uRes.x, uBandTop + 0.55 * bandH);
    float dy = y - fc.y;
    float ry = dy < 0.0 ? 1.6 * uFlash.z : 0.6 * bandH;
    vec2 q = vec2((p.x - fc.x) / max(uFlash.z, 1.0), dy / max(ry, 1.0));
    float g = exp(-2.0 * dot(q, q));
    float zone = mix(uFlashContent, 1.0, smoothstep(uBandTop - 24.0 * uScale, uBandTop + 0.25 * bandH, y));
    c += uFlashColor * (uFlash.y * g * zone * mix(0.7, 1.0, cloudA));
  }

  gl_FragColor = vec4(toSrgb(clamp(c, 0.0, 1.0)), 1.0);
}
`
