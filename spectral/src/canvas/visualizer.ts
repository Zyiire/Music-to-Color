import { getBands } from '../audio/fft-analyzer'
import { detectBeat } from '../audio/beat-detector'
import { mapBandsToColor } from '../color/palette-mapper'
import { lerpOKLCH, type OKLCHColor } from '../color/oklch'
import { rgb, clampChroma } from 'culori'
import type { PaletteSpec } from '../color/palette-mapper'

export type BandsListener = (bass: number, mid: number, high: number, beat: boolean) => void

// Size of one simulation cell in screen pixels. Bigger = faster + softer.
const CELL = 4
// Wave decay per step: lower dies faster. ~0.96 fades a splash in about half a second.
const DAMPING = 0.96
// Points of the audio waveform ring stirring the water each frame.
const RING_POINTS = 140

let rafId: number
let currentColor: OKLCHColor = { l: 0.55, c: 0.12, h: 240 }
let rotation = 0

function toRGB(color: OKLCHColor): [number, number, number] {
  const c = rgb(clampChroma({ mode: 'oklch', ...color }, 'oklch', 'rgb'))
  return c ? [c.r * 255, c.g * 255, c.b * 255] : [0, 0, 0]
}

export function startLoop(
  canvas: HTMLCanvasElement,
  analyser: AnalyserNode,
  getSpec: () => PaletteSpec,
  onBands?: BandsListener
) {
  const ctx = canvas.getContext('2d')!
  const wave = new Uint8Array(analyser.fftSize)

  // --- Water height field (two buffers ping-ponging the wave equation) ---
  let gw = 0, gh = 0
  let cur = new Float32Array(0)
  let prev = new Float32Array(0)
  let image: ImageData | null = null
  const buffer = document.createElement('canvas')
  const bctx = buffer.getContext('2d')!

  function fitGrid() {
    const w = Math.max(4, Math.ceil(canvas.width / CELL))
    const h = Math.max(4, Math.ceil(canvas.height / CELL))
    if (w === gw && h === gh) return
    gw = w
    gh = h
    cur = new Float32Array(gw * gh)
    prev = new Float32Array(gw * gh)
    image = bctx.createImageData(gw, gh)
    buffer.width = gw
    buffer.height = gh
  }

  function splash(gx: number, gy: number, radius: number, force: number) {
    const r = Math.max(1, radius)
    const x0 = Math.max(1, Math.floor(gx - r))
    const x1 = Math.min(gw - 2, Math.ceil(gx + r))
    const y0 = Math.max(1, Math.floor(gy - r))
    const y1 = Math.min(gh - 2, Math.ceil(gy + r))
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const d = Math.hypot(x - gx, y - gy) / r
        if (d < 1) cur[y * gw + x] += force * (Math.cos(d * Math.PI) + 1) * 0.5
      }
    }
  }

  // --- Cursor interaction: moving the pointer stirs the water ---
  let pointerX = -1, pointerY = -1
  function onPointerMove(e: PointerEvent) {
    const gx = e.clientX / CELL
    const gy = e.clientY / CELL
    if (pointerX >= 0) {
      const speed = Math.hypot(gx - pointerX, gy - pointerY)
      // Faster strokes push harder, capped so wild swipes don't blow out.
      splash(gx, gy, 2.4, Math.min(2.2, 0.25 + speed * 0.28))
    }
    pointerX = gx
    pointerY = gy
  }
  function onPointerDown(e: PointerEvent) {
    splash(e.clientX / CELL, e.clientY / CELL, 5, 4) // a real plunge
  }
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerdown', onPointerDown)

  function frame() {
    fitGrid()
    const W = canvas.width
    const H = canvas.height
    const cgx = gw / 2
    const cgy = gh / 2

    const { bass, mid, high } = getBands(analyser)
    const beat = detectBeat(bass)
    onBands?.(bass, mid, high, beat)
    analyser.getByteTimeDomainData(wave)

    const spec = getSpec()
    currentColor = lerpOKLCH(currentColor, mapBandsToColor(bass, mid, high, spec), 0.08)
    const [r1, g1, b1] = toRGB(currentColor)
    const [r2, g2, b2] = toRGB({ ...currentColor, h: currentColor.h + 40 })

    // --- The music stirs the water along a slowly turning waveform ring ---
    const energy = (bass + mid + high) / 3
    rotation += 0.0025 + energy * 0.012
    const ringRadius = Math.min(gw, gh) * 0.26 * (1 + bass * 0.25)
    for (let i = 0; i < RING_POINTS; i++) {
      const t = i / RING_POINTS
      const amp = (wave[Math.floor(t * (wave.length - 1))] - 128) / 128
      if (Math.abs(amp) < 0.02) continue
      const angle = t * Math.PI * 2 + rotation
      splash(
        cgx + Math.cos(angle) * ringRadius,
        cgy + Math.sin(angle) * ringRadius,
        1.6,
        amp * (0.12 + mid * 0.9)
      )
    }
    // Beats plunge the center like a dropped stone.
    if (beat) splash(cgx, cgy, 6, 2.6 + bass * 2)

    // --- Propagate the wave equation ---
    for (let y = 1; y < gh - 1; y++) {
      const row = y * gw
      for (let x = 1; x < gw - 1; x++) {
        const i = row + x
        prev[i] = ((cur[i - 1] + cur[i + 1] + cur[i - gw] + cur[i + gw]) / 2 - prev[i]) * DAMPING
      }
    }
    const swap = cur
    cur = prev
    prev = swap

    // --- Shade the surface: mood color, crest highlights, trough shadows ---
    const px = image!.data
    // Calm water sits as a dark tint of the mood color.
    const br = r1 * 0.09, bg = g1 * 0.09, bb = b1 * 0.09
    for (let y = 0; y < gh; y++) {
      const row = y * gw
      for (let x = 0; x < gw; x++) {
        const i = row + x
        const h = cur[i]
        // Horizontal gradient fakes light refracting off the surface.
        const gx = x > 0 && x < gw - 1 ? cur[i + 1] - cur[i - 1] : 0
        const lum = Math.min(1, Math.abs(h) * 0.9 + Math.max(0, gx) * 1.4)
        // Crests lean toward the hue-shifted color, troughs stay on the base.
        const m = Math.min(1, Math.max(0, 0.5 + h * 0.8))
        const o = i * 4
        px[o]     = Math.min(255, br + lum * ((r1 + (r2 - r1) * m) - br))
        px[o + 1] = Math.min(255, bg + lum * ((g1 + (g2 - g1) * m) - bg))
        px[o + 2] = Math.min(255, bb + lum * ((b1 + (b2 - b1) * m) - bb))
        px[o + 3] = 255
      }
    }
    bctx.putImageData(image!, 0, 0)
    ctx.imageSmoothingEnabled = true
    ctx.drawImage(buffer, 0, 0, gw, gh, 0, 0, W, H)

    rafId = requestAnimationFrame(frame)
  }

  frame()
  return () => {
    cancelAnimationFrame(rafId)
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerdown', onPointerDown)
  }
}
