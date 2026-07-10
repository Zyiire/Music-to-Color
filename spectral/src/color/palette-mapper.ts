import type { OKLCHColor } from './oklch'

export type PaletteSpec = {
  hueRange: [number, number]
  chromaMax: number
  lightnessRange: [number, number]
  anchorHue: number
}

export function mapBandsToColor(
  bass: number,
  mid: number,
  high: number,
  spec: PaletteSpec
): OKLCHColor {
  const [hMin, hMax] = spec.hueRange
  const [lMin, lMax] = spec.lightnessRange

  // Band levels rarely exceed ~0.5 after smoothing, so stretch them to get
  // real travel across the spec's ranges.
  const drive = (v: number) => Math.min(1, v * 1.8)

  const h = hMin + drive(bass) * (hMax - hMin)
  // Chroma keeps a floor of 40% of the spec's max — quiet passages should
  // desaturate, not collapse to gray.
  const c = spec.chromaMax * (0.4 + 0.6 * drive(mid))
  const l = lMin + (1 - drive(high)) * (lMax - lMin)

  return { l, c, h }
}