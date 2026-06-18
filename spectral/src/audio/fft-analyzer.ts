const EMA = 0.15

let prevBass = 0, prevMid = 0, prevHigh = 0

export function getBands(analyser: AnalyserNode) {
  const data = new Uint8Array(analyser.frequencyBinCount)
  analyser.getByteFrequencyData(data)

  const sampleRate = 44100
  const binHz = sampleRate / (analyser.fftSize)
  const bassEnd = Math.floor(250 / binHz)
  const midEnd  = Math.floor(4000 / binHz)

  const avg = (arr: Uint8Array, s: number, e: number) => {
    let sum = 0
    for (let i = s; i < e; i++) sum += arr[i]
    return sum / ((e - s) * 255)
  }

  const raw = {
    bass: avg(data, 0, bassEnd),
    mid:  avg(data, bassEnd, midEnd),
    high: avg(data, midEnd, data.length),
  }

  prevBass = prevBass + EMA * (raw.bass - prevBass)
  prevMid  = prevMid  + EMA * (raw.mid  - prevMid)
  prevHigh = prevHigh + EMA * (raw.high - prevHigh)

  return { bass: prevBass, mid: prevMid, high: prevHigh }
}