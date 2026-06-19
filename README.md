# Spectral

> Turn music into design tokens. Real-time audio analysis meets AI-driven color theory.

![MIT License](https://img.shields.io/badge/license-MIT-green)
![Built with Vite](https://img.shields.io/badge/built%20with-Vite%208-646CFF?logo=vite)
![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript)

Spectral analyzes music — live from your mic, an uploaded file, or a Spotify track — and generates a perceptually accurate color palette you can drop straight into Figma, CSS, or Tailwind. The colors aren't random: they're derived from the actual frequency content of the audio using OKLCH color math, with Claude handling the mood-to-palette reasoning.

---

## Table of Contents

- [Why Spectral](#why-spectral)
- [Demo](#demo)
- [Features](#features)
- [How it works](#how-it-works)
- [Getting started](#getting-started)
- [Usage](#usage)
- [Project structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

---

## Why Spectral

Most music visualizers are purely reactive — they flash colors at you but don't *interpret* the music. Spectral has three layers most projects skip:

1. **A reasoning layer** — Claude maps emotional context (valence, energy, tempo) to color theory rules before a single pixel is drawn.
2. **A perceptual color model** — OKLCH instead of HSL, so the output looks polished rather than oversaturated.
3. **Practical export** — the palette comes out as CSS variables, Figma tokens, and a Tailwind config block, making it immediately usable in real design work.

---

## Demo

> Coming soon — GIF of the canvas animation and export panel.

---

## Features

- **Two audio input paths** — live microphone or file upload via Web Audio API, or Spotify track lookup via Audio Features API
- **Real-time FFT visualization** — 2048-point FFT split into bass, mid, and high bands driving a canvas animation at ~60fps
- **Beat detection** — energy peak threshold on the bass band triggers saturation pulses
- **OKLCH color mapping** — perceptually uniform color model with exponential moving average smoothing to prevent jitter
- **AI palette generation** — Claude receives the Spotify feature vector and returns a structured palette spec (hue ranges, contrast ratio, harmony type, anchor color)
- **Design-ready export** — outputs CSS custom properties, Figma-compatible JSON tokens, a Tailwind `extend.colors` block, and a shareable URL

---

## How it works

### Audio → Color pipeline

The FFT output is split into three perceptual bands:

| Band | Range | Controls |
|---|---|---|
| Sub-bass / bass | 20–250 Hz | Hue shift + saturation |
| Midrange | 250 Hz–4 kHz | Brightness + contrast |
| Highs | 4 kHz–20 kHz | Palette temperature (warm vs. cool) |

Band energies are normalized, smoothed, and fed into OKLCH — a color space where equal numeric steps feel equally different to the human eye.

### Where Claude fits in

Claude runs **once per session**, not every frame. It receives the Spotify feature vector (`valence`, `energy`, `tempo`, `danceability`, `loudness`) and returns a JSON palette spec that defines the constraints the real-time animation operates within. Claude sets the rules; the Web Audio API plays inside them.

---

## Getting started

### Prerequisites

- Node.js 20+
- A [Spotify Developer](https://developer.spotify.com/dashboard) app (for Client ID and redirect URI)
- A Claude API key from [Anthropic](https://console.anthropic.com)

### Installation

```bash
git clone https://github.com/your-username/spectral.git
cd spectral/spectral
npm install
```

### Environment setup

```bash
cp .env.example .env
```

Fill in your keys:

```env
VITE_SPOTIFY_CLIENT_ID=your_spotify_client_id
VITE_SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
VITE_SPOTIFY_REDIRECT_URI=https://localhost:5173/
VITE_CLAUDE_API_KEY=your_claude_api_key
```

### Run

```bash
npm run dev
```

Open [https://localhost:5173](https://localhost:5173). The dev server uses a self-signed certificate — in Chrome/Edge, click the error page and type `thisisunsafe` to proceed.

---

## Usage

**Live audio**
1. Click "Use Microphone" and grant permission
2. Play music near your mic — the canvas animates in real time
3. Click "Export" when you find a palette you like

**Spotify track**
1. Log in with Spotify
2. Search for a track in the search panel
3. Click "Generate palette" — Claude analyzes the track's audio features and generates a constrained palette spec
4. The canvas animates within those constraints; export when ready

**Export formats**

```css
/* CSS custom properties */
--color-primary: #1a0a2e;
--color-accent: #7c3aed;
```

```json
// Figma design tokens
{ "color": { "primary": { "value": "#1a0a2e" }, "accent": { "value": "#7c3aed" } } }
```

```js
// tailwind.config.js
extend: { colors: { primary: '#1a0a2e', accent: '#7c3aed' } }
```

---

## Project structure

```
spectral/src/
├── audio/
│   ├── AudioEngine.ts       # AudioContext setup, mic and file source nodes
│   ├── fft-analyzer.ts      # FFT band splitting (bass / mid / high)
│   └── beat-detector.ts     # Energy peak threshold beat detection
├── color/
│   ├── oklch.ts             # OKLCH math, lerp, toHex
│   ├── palette-mapper.ts    # Band energies → OKLCH color
│   └── quantizer.ts         # OKLCH → sRGB quantization for export
├── AI/
│   └── palette-gen.ts       # Claude prompting and palette spec parsing
├── spotify/
│   ├── auth.ts              # PKCE OAuth flow
│   └── features.ts          # Audio Features API + track search
├── canvas/
│   └── visualizer.ts        # requestAnimationFrame loop, gradient render
├── export/
│   ├── token.ts             # CSS vars, Figma JSON, Tailwind block
│   └── share.ts             # Shareable URL encode/decode
├── styles/
│   └── retro.css            # UI component styles
└── ui/
    ├── Visualizer.tsx        # Canvas + audio controls
    ├── SpotifySearch.tsx     # Track search panel
    └── Gallery.tsx           # Saved palette history
```

---

## Contributing

1. Fork the repo and create a branch: `git checkout -b feature/your-feature`
2. Make your changes and ensure the build passes: `npm run build`
3. Open a pull request with a clear description of what changed and why

Bug reports and feature requests are welcome via [GitHub Issues](https://github.com/your-username/spectral/issues).

---

## License

MIT — see [LICENSE](LICENSE) for details.
