---
name: Pampa Cielo Editorial
colors:
  surface: '#0e131c'
  surface-dim: '#0e131c'
  surface-bright: '#343943'
  surface-container-lowest: '#090e17'
  surface-container-low: '#171c25'
  surface-container: '#1b2029'
  surface-container-high: '#252a34'
  surface-container-highest: '#30353f'
  on-surface: '#dee2ef'
  on-surface-variant: '#c0c8cd'
  inverse-surface: '#dee2ef'
  inverse-on-surface: '#2c303a'
  outline: '#8a9297'
  outline-variant: '#40484c'
  surface-tint: '#93cfeb'
  primary: '#b0e5ff'
  on-primary: '#003546'
  primary-container: '#8ecae6'
  on-primary-container: '#0a566e'
  inverse-primary: '#24657e'
  secondary: '#e3beb7'
  on-secondary: '#422a26'
  secondary-container: '#5b403b'
  on-secondary-container: '#d1ada6'
  tertiary: '#cedfff'
  on-tertiary: '#183153'
  tertiary-container: '#acc3ed'
  on-tertiary-container: '#395074'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#bde9ff'
  primary-fixed-dim: '#93cfeb'
  on-primary-fixed: '#001f2a'
  on-primary-fixed-variant: '#004d64'
  secondary-fixed: '#ffdad4'
  secondary-fixed-dim: '#e3beb7'
  on-secondary-fixed: '#2b1612'
  on-secondary-fixed-variant: '#5b403b'
  tertiary-fixed: '#d5e3ff'
  tertiary-fixed-dim: '#b0c7f1'
  on-tertiary-fixed: '#001b3c'
  on-tertiary-fixed-variant: '#30476a'
  background: '#0e131c'
  on-background: '#dee2ef'
  surface-variant: '#30353f'
typography:
  display-hero:
    fontFamily: Playfair Display
    fontSize: 96px
    fontWeight: '400'
    lineHeight: 96px
    letterSpacing: -0.03em
  display-hero-mobile:
    fontFamily: Playfair Display
    fontSize: 64px
    fontWeight: '400'
    lineHeight: 68px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Playfair Display
    fontSize: 44px
    fontWeight: '400'
    lineHeight: 52px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '400'
    lineHeight: 38px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Playfair Display
    fontSize: 24px
    fontWeight: '400'
    lineHeight: 32px
    letterSpacing: 0em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '300'
    lineHeight: 28px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.14em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 10px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.18em
spacing:
  gutter: 1.5rem
  gutter-desktop: 2.5rem
  margin: 1.5rem
  margin-tablet: 3rem
  margin-desktop: 5rem
  space-xs: 0.375rem
  space-sm: 0.75rem
  space-md: 1.5rem
  space-lg: 2.5rem
  space-xl: 4.5rem
---

## Brand & Style

This design system treats meteorological observation as contemplative, literary journalism. Designed explicitly for Winifreda—a quiet agrarian settlement in the vast plains of La Pampa, Argentina—the interface evokes the infinite horizon, solitude, and shifting light of the Southern Cone's interior. 

The aesthetic is that of a prestige broadsheet or literary quarterly projected onto an unbroken, living sky. Rather than presenting utility-first widgets or mechanical telemetry grids, the system crafts a typographic tapestry where temperature, barometric shift, and seasonal wind patterns (such as the dry *Pampero* or the humid *Norte*) are recorded with literary grace.

Key styling principles:
- **Atmospheric Continuity:** The interface is not partitioned into discrete modules or floating frosted cards. The entire viewport functions as a continuous sky canvas ranging from high atmospheric azure down to dusty horizon peach and silhouette charcoal.
- **Literary Hierarchy:** Meteorological data is scaled with extreme contrast—monumental high-contrast serif headlines paired with delicate, tracking-expanded sans-serif captions.
- **Restraint and Craft:** Absence of visual noise, glossy surfaces, skeuomorphic weather illustrations, or heavy drop shadows. Structure is achieved purely through hairline borders, generous negative space, and disciplined typographic alignment.

## Colors

The palette directly models the vast, unbroken transition of twilight over the Argentine flatlands during spring:
- **Primary (`#8ecae6`):** Spring Azure. Used for focal meteorological markers, primary readouts, and active navigational highlights.
- **Secondary (`#fcd5ce`):** Horizon Peach. Evokes low sunset dust and prairie dusk; applied to thermodynamic accents, wind vectors, secondary alerts, and warm textual anchors.
- **Tertiary (`#1d3557`):** Deep Pampas Twilight. Structural depth tone used for subtle field washes, atmospheric depth maps, and grounded container tints.
- **Neutral (`#0f141d`):** Silhouette Charcoal. The deep, ink-like baseline mirroring ombré silhouettes of windbreak poplars, windmills, and soil at dusk.

### Functional Typography & Hairline Tokens
- **Text Ink Primary:** `#fbfbf2` (Parchment white) for monumental temperature figures and primary headlines.
- **Text Ink Muted:** `rgba(251, 251, 242, 0.70)` for subheadings, narrative poetry, and descriptive conditions.
- **Text Ink Subtle:** `rgba(251, 251, 242, 0.45)` for metadata, timestamps, units, and coordinates.
- **Hairline Borders:** `rgba(251, 251, 242, 0.12)` providing structural discipline without disrupting the gradient canvas.

## Typography

The typographic scale pairs the dramatic, literary character of **Playfair Display** with the neutral precision of **Plus Jakarta Sans**. 

- **Display & Headlines:** Set in Playfair Display. The numbers for temperature, rainfall, and atmospheric pressure behave as focal editorial art. Italic forms are reserved exclusively for poetic weather narratives and epigraphs (e.g., *"El viento Pampero limpia el horizonte al atardecer"*).
- **Body & Captions:** Set in Plus Jakarta Sans with light weight (`300`) and open leading. Paragraphs must read like literary dispatches rather than machine logs.
- **Labels & Micro-data:** Micro-copy (coordinates `36.2307° S, 64.2500° W`, elevation, wind bearings, humidity indexes) is set uppercase in small sizes (`10px`–`12px`) with prominent tracking (`0.14em`–`0.18em`) to mirror archival print publications.

## Layout & Spacing

The layout philosophy mirrors the Argentine pampa: unconstrained, flat, and breathing with horizontal space. 

- **Grid System:** An asymmetrical 12-column fluid grid on desktop that simplifies to a single-column poetic flow on mobile. Data points align along clean editorial axes rather than being boxed into tiles.
- **Vertical Rhythm:** Generous vertical intervals (`space-xl` / `4.5rem`) separate atmospheric chapters (e.g., *Current Conditions*, *The 24-Hour Horizon*, *The 7-Day Almanac*, *Wind & Soil Moisture*).
- **Hairline Partitioning:** Where separation is mandatory, use horizontal hairline rules (`1px` width with `rgba(251, 251, 242, 0.12)`) spanning either the full container width or deliberate 4-column sub-spans. Vertical rules are used strictly to delineate typographic metric pairs (e.g., Dew Point against Barometer).
- **Responsive Adaptation:**
  - **Mobile (< 768px):** Linear column flow with edge margins of `1.5rem`. The current temperature assumes the top cover anchor, followed by a narrative condition line and stacked metrics.
  - **Desktop (>= 1024px):** A balanced dual-hemisphere layout. The left 6 columns remain locked with monumental real-time display and atmospheric narrative; the right 6 columns present the temporal progression, soil telemetry, and wind roses.

## Elevation & Depth

This design system deliberately rejects card elevation, frosted glassmorphism, and synthetic shadows. Depth is created entirely through:

1. **Continuous Chromatic Gradient Canvas:** The background is an expansive vertical linear gradient starting from zenith blue (`#1d3557` blending into `#264653`), transitioning to soft daylight sky (`#8ecae6`), and settling into a warm twilight glow (`#fceade` and `#fcd5ce`) over a silhouette ground (`#0f141d`). Content rests directly on this continuous atmosphere.
2. **Atmospheric Layering (Z-Index through Contrast):** Primary readouts (pure parchment `#fbfbf2`) step immediately forward into the foreground, while contextual narratives (`70% opacity`) and structural hairline grids (`12% opacity`) recede into ambient space.
3. **Ghost Boundaries:** When grouping is required for temporal timelines, items sit within unbordered, transparent zones defined only by baseline alignment and hairline dividers.

## Shapes

The shape system is strictly architectural and sharp (`roundedness: 0`). 

- **Corners:** Radii across buttons, input fields, markers, and line separators are set to `0px`. Rectilinear precision reflects print heritage and prevents the interface from skewing casual or gadget-oriented.
- **Accents & Indicators:** Vector indicators (wind compasses, solar arcs, humidity lines) utilize pure geometric lines, diamond pointers, or single-pixel stroke markers.
- **Tags & Status Tokens:** Rendered as crisp, rectangular label tags bordered by `1px` translucent strokes, never pill-shaped or rounded.

## Components

### 1. Primary Action & Directional Buttons
- **Style:** Rectilinear bounding box with a `1px` hairline border in `rgba(251, 251, 242, 0.3)`. Transparent background.
- **Text:** Uppercase `label-lg`, tracked `0.14em`, set in `#fbfbf2`.
- **Hover State:** Background shifts to `rgba(251, 251, 242, 0.08)` with border color shifting to `#8ecae6`.

### 2. Meteorological Chips & Badges
- **Style:** Compact, rectangular frames (`0px` radius) with `space-xs` vertical padding and `space-sm` horizontal padding.
- **Fill:** Bare background with hairline border `rgba(251, 251, 242, 0.2)`.
- **Content:** Monospaced or tracked sans label (`label-sm`) conveying status: e.g., `PAMPERO / 42 KM/H`, `HORIZONTE DESPEJADO`.

### 3. Chronological Hourly Reel & Forecast Lists
- **Structure:** Flat horizontal sequence (hourly) or clean tabular list (extended days) without container surfaces.
- **Dividers:** Hairline rules (`1px` solid `rgba(251, 251, 242, 0.12)`) sit strictly below each day entry.
- **Columns:** Date and weekday in `headline-md` (Playfair Display), condition description in `body-md` (Plus Jakarta Sans), high/low ranges aligned right in `Playfair Display` numerals.

### 4. Input Fields (Location & Date Lookups)
- **Style:** Bottom hairline border only (`1px` solid `rgba(251, 251, 242, 0.3)`). Zero background fill.
- **Typography:** Active text in `body-lg` (`#fbfbf2`), placeholder text in muted ink (`rgba(251, 251, 242, 0.4)`).
- **Focus:** Bottom hairline transitions to `#8ecae6` with no outline box.

### 5. Checkboxes & Radio Selectors
- **Checkbox:** Crisp `14px x 14px` square with `1px` solid border (`rgba(251, 251, 242, 0.4)`). Active state renders a clean solid inner square of `#8ecae6`.
- **Radio Button:** Crisp `12px x 12px` diamond outline. Active state displays an interior filled diamond of `#fcd5ce`.

### 6. Editorial Atmosphere Callout (Custom Component)
- **Role:** Replaces generic warning cards with literary broadsheet dispatches regarding agricultural weather impacts (frost, soil saturation, hail risk in the Pampas).
- **Presentation:** A 2-column wide block framed left by a `2px` vertical rule in `#fcd5ce`. Headline set in `headline-md` italic, body set in `body-md` with tracking, citing meteorological confidence and telemetry origin.