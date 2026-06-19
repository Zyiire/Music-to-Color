import { getBands } from '../audio/fft-analyzer'
import { detectBeat } from '../audio/beat-detector'
import { mapBandsToColor } from '../color/palette-mapper'
import { toHex, lerpOKLCH, type OKLCHColor } from '../color/oklch'
import type { PaletteSpec } from '../color/palette-mapper'

let rafId: number
let currentColor: OKLCHColor = { l: 0.5, c: 0.1, h: 240 }
let pulseAlpha = 0

export function startLoop(
  canvas: HTMLCanvasElement,
  analyser: AnalyserNode,
  spec: PaletteSpec
) {
  const ctx = canvas.getContext('2d')!
  const { width: W, height: H } = canvas

  function frame() {
    const { bass, mid, high } = getBands(analyser)
    const beat = detectBeat(bass)
    if (beat) pulseAlpha = 0.35

    const target = mapBandsToColor(bass, mid, high, spec)
    currentColor = lerpOKLCH(currentColor, target, 0.08)

    const grad = ctx.createLinearGradient(0, 0, W, H)
    grad.addColorStop(0, toHex(currentColor))
    grad.addColorStop(1, toHex({ ...currentColor, h: currentColor.h + 40 }))

    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, H)

    if (pulseAlpha > 0.01) {
      ctx.fillStyle = `rgba(255,255,255,${pulseAlpha.toFixed(3)})`
      ctx.fillRect(0, 0, W, H)
      pulseAlpha *= 0.85
    }

    rafId = requestAnimationFrame(frame)
  }

  frame()
  return () => cancelAnimationFrame(rafId)
}