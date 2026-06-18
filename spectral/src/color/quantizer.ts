import quantize from 'quantize'
import { formatHex } from 'culori'

export function extractPalette(canvas: HTMLCanvasElement, count = 5): string[] {
    const ctx = canvas.getContext('2d')!
    const { width, height } = canvas
    const data = ctx.getImageData(0, 0, width, height).data
    const pixels: [number, number, number][] = []
  
    for (let i = 0; i < data.length; i += 16) {
      pixels.push([data[i], data[i + 1], data[i + 2]])
    }
  
    const map = quantize(pixels, count)
    return map ? map.palette().map(([r, g, b]) =>
      formatHex({ mode: 'rgb', r: r/255, g: g/255, b: b/255 }) ?? '#000'
    ) : []
  }