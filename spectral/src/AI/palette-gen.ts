import { GoogleGenerativeAI } from '@google/generative-ai'
import type { PaletteSpec } from '../color/palette-mapper'

const genai = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY)
const model = genai.getGenerativeModel({ model: 'gemini-2.5-flash' })

export type TrackFeatures = {
  valence: number; energy: number; tempo: number
  danceability: number; loudness: number
}

export async function generatePaletteSpec(features: TrackFeatures): Promise<PaletteSpec> {
  const prompt = `You are a color theorist. Given these Spotify audio features for a track:
- valence (happiness): ${features.valence.toFixed(2)}
- energy: ${features.energy.toFixed(2)}
- tempo: ${features.tempo.toFixed(0)} BPM
- danceability: ${features.danceability.toFixed(2)}
- loudness: ${features.loudness.toFixed(1)} dBFS

Return ONLY a JSON object (no markdown, no explanation) with this exact shape:
{
  "hueRange": [minHue, maxHue],
  "chromaMax": 0.0-0.4,
  "lightnessRange": [minL, maxL],
  "anchorHue": dominantHue
}

Hue is 0-360 (red=0, yellow=60, green=120, blue=240, purple=280).
High energy/valence = warm saturated hues. Low energy/valence = cool desaturated hues.`

  const result = await model.generateContent(prompt)
  const text = result.response.text().replace(/```json|```/g, '').trim()
  return JSON.parse(text) as PaletteSpec
}