const HISTORY = 43
const THRESHOLD = 1.4
const history: number[] = []

export function detectBeat(bass: number): boolean {
  history.push(bass)
  if (history.length > HISTORY) history.shift()
  const avg = history.reduce((a, b) => a + b, 0) / history.length
  return bass > avg * THRESHOLD
}