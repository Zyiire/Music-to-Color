export type AudioMoodFeatures = {
  energy: number      // 0-1 overall level
  brightness: number  // 0-1 share of high frequencies
  bassiness: number   // 0-1 share of low frequencies
  dynamics: number    // 0-1 how much the level fluctuates
  tempo: number       // rough BPM estimate from beat events
}

type Sample = { bass: number; mid: number; high: number; beat: boolean; t: number }

const WINDOW_MS = 15_000

// Collects per-frame band levels so a window of audio can be summarized
// into mood features for the AI.
export class MoodAggregator {
  private samples: Sample[] = []

  add(bass: number, mid: number, high: number, beat: boolean) {
    const t = performance.now()
    this.samples.push({ bass, mid, high, beat, t })
    while (this.samples.length && t - this.samples[0].t > WINDOW_MS) {
      this.samples.shift()
    }
  }

  hasEnoughData(): boolean {
    if (this.samples.length < 60) return false
    return this.samples[this.samples.length - 1].t - this.samples[0].t > 3000
  }

  summarize(): AudioMoodFeatures {
    const n = this.samples.length
    if (n === 0) return { energy: 0, brightness: 0, bassiness: 0, dynamics: 0, tempo: 0 }

    let bassSum = 0, midSum = 0, highSum = 0, beats = 0
    const levels: number[] = []
    for (const s of this.samples) {
      bassSum += s.bass
      midSum += s.mid
      highSum += s.high
      if (s.beat) beats++
      levels.push((s.bass + s.mid + s.high) / 3)
    }

    const energy = levels.reduce((a, b) => a + b, 0) / n
    const variance = levels.reduce((a, b) => a + (b - energy) ** 2, 0) / n
    const total = bassSum + midSum + highSum || 1
    const spanMs = this.samples[n - 1].t - this.samples[0].t || 1
    // Consecutive frames over the beat threshold count as one hit, roughly.
    const tempo = Math.min(220, (beats / 4 / (spanMs / 60_000)))

    return {
      energy: Math.min(1, energy * 2.5),
      brightness: highSum / total,
      bassiness: bassSum / total,
      dynamics: Math.min(1, Math.sqrt(variance) * 8),
      tempo: Math.round(tempo),
    }
  }
}
