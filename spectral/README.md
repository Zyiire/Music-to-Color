# Spectral

A music-driven color palette generator that maps audio to perceptually accurate color using real-time DSP, OKLCH color math, and Claude for mood-to-palette reasoning. Built for designers who want design tokens that actually feel like the music.

---

## How it works

### Two input paths

**Live audio (mic or file upload)**
The Web Audio API creates an `AudioContext`, attaches an `AnalyserNode` with an FFT size of 2048+, and produces a frequency bin array roughly every 16ms. This drives the real-time canvas animation.

**Spotify track**
The Spotify Audio Features endpoint returns pre-computed values for a track — `valence` (emotional positivity), `energy` (intensity), `tempo` (BPM), `danceability`, and `loudness` (dBFS). These drive the palette generation via Claude.

Both paths converge at the same analysis and rendering layer, but serve different purposes: live audio animates, Spotify features set the emotional context.

---

### Frequency → Color mapping

The FFT output is split into three perceptual bands:

| Band | Range | Maps to |
|---|---|---|
| Sub-bass / bass | 20–250 Hz | Hue shift + saturation |
| Midrange | 250 Hz–4 kHz | Brightness + contrast |
| Highs | 4 kHz–20 kHz | Palette temperature (warm vs. cool) |

Band energies are normalized and smoothed with an exponential moving average to prevent jitter, then fed into **OKLCH** — a perceptually uniform color model where equal numeric steps feel equally different to the human eye. This is what separates the output from naive HSL color assignment.

---

### Where Claude fits in

Claude runs **once per session** (or when a Spotify track loads), not every frame. It receives the Spotify feature vector and returns a structured JSON palette spec:

- Which hue ranges suit this track's emotional profile
- What contrast ratio to maintain
- Whether to use analogous or complementary harmony
- What the anchor color should be

This spec becomes the constraint set the real-time animation operates within. Claude sets the rules; the Web Audio API plays inside them.

---

### Canvas animation loop

A `requestAnimationFrame` loop pulls live FFT data, applies OKLCH transforms constrained by the Claude-generated spec, and renders to a `<canvas>`. The palette is a living gradient that breathes with the music — not static swatches.

Beat detection uses a simple energy peak threshold on the bass band to trigger brief saturation pulses. Frame-to-frame `lerp` interpolation keeps transitions smooth and prevents strobing.

---

### Export layer

After a session ends or a track is analyzed, dominant palette colors are quantized from OKLCH back to sRGB and exported as:

- **CSS custom properties** — `--color-primary`, `--color-accent`, etc.
- **Figma design tokens** — JSON format
- **Tailwind config block** — drop into `extend.colors`
- **Shareable URL** — encodes the palette and track attribution

---

## Tech stack

- **React 19 + TypeScript** — UI and component layer
- **Vite** — dev server and build tooling
- **Tailwind CSS v4** — styling
- **Web Audio API** — real-time FFT analysis
- **OKLCH** — perceptual color model for all color math
- **Spotify Web API** — audio feature vectors
- **Claude API** — mood-to-color-theory reasoning

---

## Getting started

```bash
cd spectral
npm install
npm run dev
```

Copy `.env.example` to `.env` and fill in your keys:

```
VITE_SPOTIFY_CLIENT_ID=
VITE_SPOTIFY_CLIENT_SECRET=
VITE_CLAUDE_API_KEY=
```

---

## Project structure

```
spectral/
├── src/
│   ├── audio/
│   │   └── AudioEngine.ts     # Web Audio API — mic and file input, FFT analysis
│   ├── color/                 # OKLCH math, band mapping, palette generation
│   ├── claude/                # Claude prompting and palette spec parsing
│   ├── spotify/               # Audio Features API integration
│   ├── canvas/                # Animation loop, beat detection, lerp rendering
│   └── export/                # CSS tokens, Figma JSON, Tailwind config, URL encoder
```
