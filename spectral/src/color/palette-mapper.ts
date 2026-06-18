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

  const h = hMin + bass * (hMax - hMin)
  const c = mid * spec.chromaMax
  const l = lMin + (1 - high) * (lMax - lMin)

  return { l, c, h }
}