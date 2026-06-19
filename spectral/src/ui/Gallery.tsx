import { useState } from 'react'
import { toCSSVars, toTailwind } from '../export/token'
import { buildShareURL } from '../export/share'
import '../styles/retro.css'

type SavedPalette = {
  palette: string[]
  name: string
}

type Props = {
  items: SavedPalette[]
}

type Toast = { id: number; text: string }

export function Gallery({ items }: Props) {
  const [toasts, setToasts] = useState<Toast[]>([])

  function flash(text: string) {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, text }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 1800)
  }

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text)
      flash(`${label} copied`)
    } catch {
      flash('Copy failed')
    }
  }

  function splitName(full: string): { title: string; sub: string } {
    const idx = full.indexOf(' — ')
    if (idx === -1) return { title: full, sub: '' }
    return { title: full.slice(0, idx), sub: full.slice(idx + 3) }
  }

  return (
    <div className="retro-window" style={{ maxWidth: 760, margin: '16px auto 0' }}>
      <div className="retro-titlebar">
        <div className="retro-titlebar-label">
          <span className="retro-led" />
          <span>Spectral — saved palettes</span>
        </div>
        <div className="retro-titlebar-controls">
          <div className="retro-titlebar-btn">_</div>
          <div className="retro-titlebar-btn">×</div>
        </div>
      </div>

      <div style={{ padding: 14 }}>
        {items.length === 0 ? (
          <div className="retro-loading">No palettes saved yet — generate one to get started.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
            {items.map((item, idx) => {
              const { title, sub } = splitName(item.name)
              return (
                <div
                  key={idx}
                  style={{
                    background: 'linear-gradient(180deg,#eaeaef,#d2d2da)',
                    border: '1px solid #8a8a96',
                    borderRadius: 4,
                    boxShadow: 'inset 0 1px 0 #fff',
                    padding: 9,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      height: 48,
                      borderRadius: 2,
                      overflow: 'hidden',
                      border: '1px solid rgba(0,0,0,0.25)',
                      marginBottom: 8,
                    }}
                  >
                    {item.palette.map((hex, i) => (
                      <div
                        key={i}
                        title={`${hex.toUpperCase()} — click to copy`}
                        onClick={() => copy(hex.toUpperCase(), hex.toUpperCase())}
                        style={{ flex: 1, background: hex, cursor: 'pointer' }}
                      />
                    ))}
                  </div>

                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 'bold',
                      color: '#1a1a24',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {title}
                  </div>
                  <div style={{ fontSize: 9, color: '#6a6a78', marginBottom: 8, minHeight: 11 }}>{sub}</div>

                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      className="retro-btn"
                      style={{ flex: 1, padding: '4px 0', fontSize: 9 }}
                      onClick={() => copy(toCSSVars(item.palette), 'CSS variables')}
                    >
                      CSS
                    </button>
                    <button
                      className="retro-btn"
                      style={{ flex: 1, padding: '4px 0', fontSize: 9 }}
                      onClick={() => copy(toTailwind(item.palette), 'Tailwind config')}
                    >
                      Tailwind
                    </button>
                    <button
                      className="retro-btn-primary"
                      style={{ flex: 1, padding: '4px 0', fontSize: 9 }}
                      onClick={() => copy(buildShareURL(item.palette, item.name), 'Share link')}
                    >
                      Share
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="retro-statusbar">
        <span>{items.length} palette{items.length === 1 ? '' : 's'} saved</span>
        <span>click a swatch to copy hex</span>
      </div>

      {/* Retro toast notifications */}
      {toasts.length > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            zIndex: 1000,
          }}
        >
          {toasts.map((t) => (
            <div
              key={t.id}
              style={{
                fontFamily: 'Tahoma, sans-serif',
                fontSize: 11,
                fontWeight: 'bold',
                color: '#fff',
                background: 'linear-gradient(180deg,#3d6bb5,#2d5499)',
                border: '1px solid #1a3a6a',
                borderRadius: 4,
                padding: '6px 14px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.3)',
                textShadow: '0 1px 1px rgba(0,0,0,0.3)',
              }}
            >
              <i className="ti ti-check" style={{ fontSize: 11, verticalAlign: -1, marginRight: 4 }} aria-hidden="true" />
              {t.text}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}