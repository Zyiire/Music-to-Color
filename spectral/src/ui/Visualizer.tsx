import { useState, useRef, useEffect, useCallback } from 'react'
import { AudioEngine } from '../audio/AudioEngine'
import { startLoop } from '../canvas/visualizer'
import { generatePaletteSpec } from '../ai/palette-gen'
import { extractPalette } from '../color/quantizer'
import { SpotifySearch } from './SpotifySearch'
import type { PaletteSpec } from '../color/palette-mapper'
import type { TrackFeatures } from '../ai/palette-gen'
import '../styles/retro.css'

type Source = 'spotify' | 'mic' | 'file'

type Props = {
  token: string | null
  onSave: (palette: string[], trackName: string) => void
}

// A neutral default so the canvas can animate before any AI spec arrives.
const DEFAULT_SPEC: PaletteSpec = {
  hueRange: [220, 280],
  chromaMax: 0.18,
  lightnessRange: [0.35, 0.75],
  anchorHue: 250,
}

export function Visualizer({ token, onSave }: Props) {
  const [source, setSource] = useState<Source>('spotify')
  const [trackName, setTrackName] = useState<string>('')
  const [palette, setPalette] = useState<string[]>([])
  const [running, setRunning] = useState(false)
  const [status, setStatus] = useState('idle')

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<AudioEngine | null>(null)
  const stopLoopRef = useRef<(() => void) | null>(null)
  const specRef = useRef<PaletteSpec>(DEFAULT_SPEC)
  const audioElRef = useRef<HTMLAudioElement | null>(null)

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

  const beginLoop = useCallback((spec: PaletteSpec) => {
    const engine = engineRef.current
    const canvas = canvasRef.current
    if (!engine || !canvas) return
    const analyser = engine.getAnalyser()
    if (!analyser) return

    stopLoopRef.current?.()
    stopLoopRef.current = startLoop(canvas, analyser, spec)
    setRunning(true)
  }, [])

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
    beginLoop(specRef.current)
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
    beginLoop(specRef.current)
  }

  // --- File path ---
  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setSource('file')
    setTrackName(file.name.replace(/\.[^/.]+$/, ''))

    if (!audioElRef.current) audioElRef.current = new Audio()
    const el = audioElRef.current
    el.src = URL.createObjectURL(file)

    if (!engineRef.current) engineRef.current = new AudioEngine()
    engineRef.current.connectFile(el)
    engineRef.current.resume()
    await el.play()

    specRef.current = DEFAULT_SPEC
    setStatus('live')
    beginLoop(specRef.current)
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
    <div className="retro-window" style={{ maxWidth: 760, margin: '0 auto' }}>
      <div className="retro-titlebar">
        <div className="retro-titlebar-label">
          <span className="retro-led" />
          <span>Spectral — visualizer</span>
        </div>
        <div className="retro-titlebar-controls">
          <div className="retro-titlebar-btn">_</div>
          <div className="retro-titlebar-btn">×</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, padding: 14 }}>
        {/* ---- Canvas side ---- */}
        <div style={{ flex: 1.4, minWidth: 0 }}>
          <div
            className="retro-inset"
            style={{ height: 230, position: 'relative', overflow: 'hidden', background: '#000' }}
          >
            <canvas
              ref={canvasRef}
              width={420}
              height={230}
              style={{ width: '100%', height: '100%', display: 'block' }}
            />
            {trackName && (
              <div
                style={{
                  position: 'absolute', top: 8, left: 9,
                  background: 'rgba(0,0,0,0.45)', borderRadius: 2,
                  padding: '2px 7px', fontSize: 10, color: '#fff', fontWeight: 'bold',
                }}
              >
                <i className="ti ti-player-play" style={{ fontSize: 10, verticalAlign: -1 }} aria-hidden="true" />{' '}
                {trackName}
              </div>
            )}
            {!running && (
              <div
                style={{
                  position: 'absolute', inset: 0, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  color: '#888', fontSize: 11, fontFamily: 'Tahoma, sans-serif',
                }}
              >
                pick a source to begin
              </div>
            )}
          </div>
        </div>

        {/* ---- Control panel side ---- */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 11 }}>
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
              <label
                className={source === 'file' ? 'retro-btn-primary' : 'retro-btn'}
                style={{ flex: 1, padding: '5px 0', textAlign: 'center', cursor: 'pointer' }}
              >
                <i className="ti ti-file-music" style={{ fontSize: 11, verticalAlign: -1 }} aria-hidden="true" /> File
                <input type="file" accept="audio/*" onChange={handleFile} style={{ display: 'none' }} />
              </label>
            </div>
          </div>

          {/* Spotify mode nests the search panel; mic/file skip it */}
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
                  <div style={{ fontSize: 9, color: '#6a6a78' }}>{source === 'mic' ? 'microphone input' : 'local file'}</div>
                </div>
              </div>
            </div>
          )}

          <div style={{ flex: 1 }}>
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
      </div>

      <div className="retro-statusbar">
        <span>{running ? '● live' : '○ idle'} — {status}</span>
        <span>{source} input</span>
      </div>
    </div>
  )
}