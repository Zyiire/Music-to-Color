import { useState, useRef, useEffect, useCallback } from 'react'
import { AudioEngine } from '../audio/AudioEngine'
import { startLoop } from '../canvas/visualizer'
import { generatePaletteSpec, generatePaletteSpecFromAudio, heuristicSpecFromAudio } from '../ai/palette-gen'
import { MoodAggregator } from '../audio/mood-features'
import { extractPalette } from '../color/quantizer'
import { SpotifySearch } from './SpotifySearch'
import type { PaletteSpec } from '../color/palette-mapper'
import type { TrackFeatures } from '../ai/palette-gen'
import '../styles/retro.css'

type Source = 'spotify' | 'mic'

type Props = {
  token: string | null
  onSave: (palette: string[], trackName: string) => void
  gallery?: React.ReactNode
}

// A vivid starter spec so the canvas has real color before the first AI
// mood reading arrives (the AI replaces this within seconds).
const DEFAULT_SPEC: PaletteSpec = {
  hueRange: [180, 330],
  chromaMax: 0.28,
  lightnessRange: [0.4, 0.8],
  anchorHue: 255,
}

// How often we ask the AI to re-read the mood of the live audio.
const MOOD_REFRESH_MS = 15_000

const SIDEBAR_WIDTH = 320

export function Visualizer({ token, onSave, gallery }: Props) {
  const [source, setSource] = useState<Source>('spotify')
  const [trackName, setTrackName] = useState<string>('')
  const [palette, setPalette] = useState<string[]>([])
  const [running, setRunning] = useState(false)
  const [status, setStatus] = useState('idle')
  const [panelOpen, setPanelOpen] = useState(true)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<AudioEngine | null>(null)
  const stopLoopRef = useRef<(() => void) | null>(null)
  const specRef = useRef<PaletteSpec>(DEFAULT_SPEC)
  const moodRef = useRef(new MoodAggregator())
  const moodBusyRef = useRef(false)

  // Keep the canvas backing store matched to the window so the loop
  // renders edge to edge at native resolution.
  useEffect(() => {
    const fit = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])

  // Tear down the animation loop and audio context on unmount.
  useEffect(() => {
    return () => {
      stopLoopRef.current?.()
    }
  }, [])

  // Sample the canvas every second to keep the live palette readout fresh.
  useEffect(() => {
    if (!running) return
    const interval = setInterval(() => {
      if (canvasRef.current) {
        const colors = extractPalette(canvasRef.current, 5)
        if (colors.length) setPalette(colors)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [running])

  const beginLoop = useCallback(() => {
    const engine = engineRef.current
    const canvas = canvasRef.current
    if (!engine || !canvas) return
    const analyser = engine.getAnalyser()
    if (!analyser) return

    stopLoopRef.current?.()
    stopLoopRef.current = startLoop(
      canvas,
      analyser,
      () => specRef.current,
      (bass, mid, high, beat) => moodRef.current.add(bass, mid, high, beat)
    )
    setRunning(true)
  }, [])

  // While live, periodically summarize the audio and ask the AI what mood it
  // hears; the new spec swaps in mid-animation via specRef. If the AI is
  // unavailable, a local heuristic keeps the colors moving across the wheel.
  useEffect(() => {
    if (!running) return
    const interval = setInterval(async () => {
      const mood = moodRef.current
      if (!mood.hasEnoughData() || moodBusyRef.current) return
      const features = mood.summarize()
      moodBusyRef.current = true
      try {
        specRef.current = await generatePaletteSpecFromAudio(features)
      } catch (err) {
        console.warn('AI mood read failed, using heuristic palette:', err)
        specRef.current = heuristicSpecFromAudio(features)
      } finally {
        moodBusyRef.current = false
      }
    }, MOOD_REFRESH_MS)
    return () => clearInterval(interval)
  }, [running])

  // --- Spotify path: AI generates the spec, then the loop starts ---
  async function handleTrackSelect(features: TrackFeatures, name: string) {
    setStatus('generating palette...')
    setTrackName(name)
    try {
      const spec = await generatePaletteSpec(features)
      specRef.current = spec
    } catch (err) {
      console.error('Palette generation failed, using default spec:', err)
      specRef.current = DEFAULT_SPEC
    }
    // Spotify gives us features but not raw audio for the FFT,
    // so the mic drives the live animation while the AI spec sets the mood.
    if (!engineRef.current) {
      engineRef.current = new AudioEngine()
      await engineRef.current.connectMic()
    }
    engineRef.current.resume()
    setStatus('live')
    beginLoop()
  }

  // --- Mic path ---
  async function startMic() {
    setSource('mic')
    setTrackName('Live microphone')
    if (!engineRef.current) engineRef.current = new AudioEngine()
    await engineRef.current.connectMic()
    engineRef.current.resume()
    specRef.current = DEFAULT_SPEC
    setStatus('live')
    beginLoop()
  }

  function handleSave() {
    if (!canvasRef.current) return
    const colors = extractPalette(canvasRef.current, 5)
    if (colors.length) {
      setPalette(colors)
      onSave(colors, trackName || 'Untitled session')
    }
  }

  return (
    <>
      {/* ---- Full-page sandbox canvas ---- */}
      <canvas
        ref={canvasRef}
        style={{ position: 'fixed', inset: 0, display: 'block', background: '#000' }}
      />

      {/* ---- Title + track overlay, top-left ---- */}
      <div style={{ position: 'fixed', top: 18, left: 22, zIndex: 5, pointerEvents: 'none' }}>
        <div
          style={{
            fontFamily: 'Tahoma, sans-serif', fontSize: 22, fontWeight: 'bold',
            color: '#fff', letterSpacing: 1,
            textShadow: '0 2px 4px rgba(0,0,0,0.6), 0 0 18px rgba(127,119,221,0.5)',
          }}
        >
          ✦ SPECTRAL ✦
        </div>
        {trackName && (
          <div
            style={{
              display: 'inline-block', marginTop: 6,
              background: 'rgba(0,0,0,0.45)', borderRadius: 2,
              padding: '2px 8px', fontSize: 11, color: '#fff',
              fontFamily: 'Tahoma, sans-serif', fontWeight: 'bold',
            }}
          >
            <i className="ti ti-player-play" style={{ fontSize: 10, verticalAlign: -1 }} aria-hidden="true" />{' '}
            {trackName}
          </div>
        )}
      </div>

      {!running && (
        <div
          style={{
            position: 'fixed', inset: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            color: '#888', fontSize: 13, fontFamily: 'Tahoma, sans-serif',
            pointerEvents: 'none', zIndex: 4,
          }}
        >
          pick a source to begin
        </div>
      )}

      {/* ---- Panel toggle, always visible ---- */}
      <button
        className="retro-btn"
        style={{
          position: 'fixed', top: 18,
          right: panelOpen ? SIDEBAR_WIDTH + 28 : 18,
          zIndex: 20, padding: '4px 10px',
        }}
        onClick={() => setPanelOpen((v) => !v)}
      >
        {panelOpen ? '▶ hide' : '◀ panel'}
      </button>

      {/* ---- Floating control sidebar ---- */}
      {panelOpen && (
        <div
          style={{
            position: 'fixed', top: 14, right: 14, bottom: 14,
            width: SIDEBAR_WIDTH, zIndex: 10,
            display: 'flex', flexDirection: 'column', gap: 12,
            overflowY: 'auto',
          }}
        >
          <div className="retro-window" style={{ flexShrink: 0 }}>
            <div className="retro-titlebar">
              <div className="retro-titlebar-label">
                <span className="retro-led" />
                <span>Spectral — controls</span>
              </div>
              <div className="retro-titlebar-controls">
                <div className="retro-titlebar-btn" onClick={() => setPanelOpen(false)}>_</div>
                <div className="retro-titlebar-btn" onClick={() => setPanelOpen(false)}>×</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 11, padding: 14 }}>
              <div>
                <div className="retro-label">Source</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    className={source === 'spotify' ? 'retro-btn-primary' : 'retro-btn'}
                    style={{ flex: 1, padding: '5px 0' }}
                    onClick={() => setSource('spotify')}
                  >
                    <i className="ti ti-brand-spotify" style={{ fontSize: 11, verticalAlign: -1 }} aria-hidden="true" /> Spotify
                  </button>
                  <button
                    className={source === 'mic' ? 'retro-btn-primary' : 'retro-btn'}
                    style={{ flex: 1, padding: '5px 0' }}
                    onClick={startMic}
                  >
                    <i className="ti ti-microphone" style={{ fontSize: 11, verticalAlign: -1 }} aria-hidden="true" /> Mic
                  </button>
                </div>
              </div>

              {/* Spotify mode nests the search panel; mic skips it */}
              {source === 'spotify' && (
                <div>
                  {token ? (
                    <SpotifySearch onTrackSelect={handleTrackSelect} />
                  ) : (
                    <div className="retro-inset" style={{ padding: 10, fontSize: 11, color: '#6a6a78' }}>
                      Connect Spotify to search tracks.
                    </div>
                  )}
                </div>
              )}

              {source !== 'spotify' && (
                <div>
                  <div className="retro-label">Now playing</div>
                  <div className="retro-inset" style={{ padding: '7px 9px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div
                      style={{
                        width: 30, height: 30, borderRadius: 2,
                        background: 'linear-gradient(135deg,#ff9a3c,#d4537e)',
                        border: '1px solid rgba(0,0,0,0.25)', flexShrink: 0,
                      }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 'bold', color: '#1a1a24', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {trackName || '—'}
                      </div>
                      <div style={{ fontSize: 9, color: '#6a6a78' }}>microphone input</div>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <div className="retro-label">Live palette</div>
                <div className="retro-inset" style={{ padding: 8 }}>
                  <div style={{ display: 'flex', gap: 5, marginBottom: 7 }}>
                    {(palette.length ? palette : ['#2a2a38', '#3a3a48', '#4a4a58', '#5a5a68', '#6a6a78']).map((hex, i) => (
                      <div
                        key={i}
                        style={{ flex: 1, height: 34, background: hex, borderRadius: 2, border: '1px solid rgba(0,0,0,0.2)' }}
                      />
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#6a6a78', fontFamily: 'monospace' }}>
                    <span>{palette[0]?.toUpperCase() ?? '—'}</span>
                    <span>{palette.length} swatches</span>
                  </div>
                </div>
              </div>

              <button className="retro-btn-primary" style={{ width: '100%', padding: '7px 0' }} onClick={handleSave} disabled={!running}>
                <i className="ti ti-bookmark" style={{ fontSize: 12, verticalAlign: -2 }} aria-hidden="true" /> Save this palette
              </button>
            </div>

            <div className="retro-statusbar">
              <span>{running ? '● live' : '○ idle'} — {status}</span>
              <span>{source} input</span>
            </div>
          </div>

          {gallery}
        </div>
      )}
    </>
  )
}
