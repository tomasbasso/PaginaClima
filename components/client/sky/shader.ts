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

// C-1 cap with a margin under 0.075 (grain and rounding).
const float LMAX = 0.073;
// Ground below the horizon: #0e131c in linear RGB.
const vec3 GROUND = vec3(0.004391, 0.006512, 0.011612);

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

  // Later plans add here, BEFORE the clamp: sun/moon glow, clouds, fog, rain.

  // Fixed grain, ±1.5 % of luminance, applied before the clamp (Pitfall 8).
  c *= 1.0 + (hash12(gl_FragCoord.xy) - 0.5) * 0.03 * uGrain;

  // C-1: scale the content zone down to LMAX without changing hue; 24 CSS px ramp at the band edge.
  float L = lum(c);
  float wContent = 1.0 - smoothstep(uBandTop - 24.0 * uScale, uBandTop, y);
  c *= mix(1.0, min(1.0, LMAX / max(L, 1e-5)), wContent);

  // Later plans add here, AFTER the clamp: stars (C-4) and lightning (C-5), each with its own cap.

  gl_FragColor = vec4(toSrgb(clamp(c, 0.0, 1.0)), 1.0);
}
`
