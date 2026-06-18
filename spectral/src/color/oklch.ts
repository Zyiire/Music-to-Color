import { oklch, rgb, clampChroma, interpolate, formatHex } from 'culori'

export type OKLCHColor = { l: number; c: number; h: number }

export function toHex(color: OKLCHColor): string {
  const clamped = clampChroma({ mode: 'oklch', ...color }, 'oklch', 'rgb')
  return formatHex({ mode: 'rgb', ...rgb(clamped) }) ?? '#000000'
}

export function lerpOKLCH(a: OKLCHColor, b: OKLCHColor, t: number): OKLCHColor {
  const mix = interpolate([
    { mode: 'oklch', ...a },
    { mode: 'oklch', ...b },
  ], 'oklch')
  const result = mix(t) as any
  return { l: result.l, c: result.c, h: result.h ?? 0 }
}