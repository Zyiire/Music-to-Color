import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai'
import type { PaletteSpec } from '../color/palette-mapper'
import type { AudioMoodFeatures } from '../audio/mood-features'

let model: GenerativeModel | null = null

function getModel(): GenerativeModel | null {
  const key = import.meta.env.VITE_GEMINI_API_KEY
  if (!key) return null
  if (!model) {
    // The "-latest" alias tracks the current flash model, so retired
    // version names (like gemini-2.5-flash) can't 404 the app again.
    model = new GoogleGenerativeAI(key).getGenerativeModel({ model: 'gemini-flash-latest' })
  }
  return model
}

export type TrackFeatures = {
  valence: number; energy: number; tempo: number
  danceability: number; loudness: number
}

const SPEC_FORMAT = `Return ONLY a JSON object (no markdown, no explanation) with this exact shape:
{
  "hueRange": [minHue, maxHue],
  "chromaMax": 0.0-0.4,
  "lightnessRange": [minL, maxL],
  "anchorHue": dominantHue
}

Hue is 0-360 on the full color wheel: red=0/360, orange=30, yellow=60, green=120,
teal=180, blue=240, purple=280, magenta=320. Use the ENTIRE wheel across different
moods — do not default to blue. minHue may exceed 360 to wrap around red
(e.g. [330, 400] spans magenta through orange).

Guidelines:
- Pick the hue region that matches the emotional mood: joy/excitement = yellows and
  oranges, aggression/intensity = reds and magentas, calm/nature = greens and teals,
  melancholy = blues and purples, dreamlike = purples and pinks.
- Make hueRange span at least 60 degrees so the visual breathes.
- chromaMax below 0.15 looks gray on screen. Use 0.25-0.4 for anything with energy;
  only go lower for genuinely muted, somber moods.
- Keep lightnessRange within 0.3-0.9.`

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v))
}

// Guard against malformed AI output so a bad response can't wedge the visuals.
function sanitizeSpec(raw: unknown): PaletteSpec {
  const s = raw as Partial<PaletteSpec>
  if (
    !Array.isArray(s.hueRange) || s.hueRange.length !== 2 ||
    !Array.isArray(s.lightnessRange) || s.lightnessRange.length !== 2 ||
    typeof s.chromaMax !== 'number' || typeof s.anchorHue !== 'number'
  ) {
    throw new Error('Palette spec missing required fields')
  }
  const hMin = clamp(s.hueRange[0], 0, 360)
  return {
    hueRange: [hMin, clamp(s.hueRange[1], hMin, hMin + 360)],
    chromaMax: clamp(s.chromaMax, 0.12, 0.4),
    lightnessRange: [
      clamp(s.lightnessRange[0], 0.2, 0.9),
      clamp(s.lightnessRange[1], 0.3, 0.95),
    ],
    anchorHue: clamp(s.anchorHue, 0, 360),
  }
}

async function requestSpec(prompt: string): Promise<PaletteSpec> {
  const m = getModel()
  if (!m) throw new Error('VITE_GEMINI_API_KEY is not set')
  const result = await m.generateContent(prompt)
  const text = result.response.text().replace(/```json|```/g, '').trim()
  return sanitizeSpec(JSON.parse(text))
}

export async function generatePaletteSpec(features: TrackFeatures): Promise<PaletteSpec> {
  const prompt = `You are a color theorist. Given these Spotify audio features for a track:
- valence (happiness): ${features.valence.toFixed(2)}
- energy: ${features.energy.toFixed(2)}
- tempo: ${features.tempo.toFixed(0)} BPM
- danceability: ${features.danceability.toFixed(2)}
- loudness: ${features.loudness.toFixed(1)} dBFS

Decide the emotional mood of this track, then design a color palette for it.

${SPEC_FORMAT}`
  return requestSpec(prompt)
}

export async function generatePaletteSpecFromAudio(features: AudioMoodFeatures): Promise<PaletteSpec> {
  const prompt = `You are a color theorist listening to live audio. Measured over the last few seconds:
- overall energy: ${features.energy.toFixed(2)} (0 = silence, 1 = loud)
- brightness (treble share): ${features.brightness.toFixed(2)}
- bassiness (low-end share): ${features.bassiness.toFixed(2)}
- dynamics (level fluctuation): ${features.dynamics.toFixed(2)}
- estimated tempo: ${features.tempo} BPM

Decide the emotional mood of this sound, then design a color palette for it.

${SPEC_FORMAT}`
  return requestSpec(prompt)
}

// Local fallback when the AI is unavailable: maps mood features straight onto
// the color wheel so the visuals still cover the full spectrum.
export function heuristicSpecFromAudio(features: AudioMoodFeatures): PaletteSpec {
  // Warmth from energy: calm sounds sit in teal/blue (200), energetic in red/orange (0-40).
  const warmth = clamp(features.energy * 0.7 + features.dynamics * 0.3, 0, 1)
  const anchorHue = (200 - warmth * 200 + features.brightness * 60 + 360) % 360
  return {
    hueRange: [anchorHue - 40, anchorHue + 50],
    chromaMax: 0.2 + features.energy * 0.17,
    lightnessRange: [0.35 + features.brightness * 0.15, 0.75 + features.brightness * 0.15],
    anchorHue,
  }
}
