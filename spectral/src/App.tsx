import { useState, useEffect } from 'react'
import { handleCallback, getToken } from './spotify/auth'
import { decodePalette } from './export/share'
import { Visualizer } from './ui/Visualizer'
import { Gallery } from './ui/Gallery'
import './styles/retro.css'

type SavedPalette = {
  palette: string[]
  name: string
}

export default function App() {
  const [token, setToken] = useState<string | null>(getToken())
  const [saved, setSaved] = useState<SavedPalette[]>([])

  useEffect(() => {
    // 1. Handle the Spotify OAuth redirect
    if (window.location.search.includes('code=')) {
      handleCallback().then((t) => {
        if (t) setToken(t)
      })
    }

    // 2. Restore a shared palette if the URL carries one
    const shared = new URLSearchParams(window.location.search).get('palette')
    if (shared) {
      const restored = decodePalette(shared)
      if (restored) {
        setSaved((prev) => [...prev, { palette: restored.palette, name: restored.trackName }])
      }
    }
  }, [])

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #1a1f3a 0%, #2d3a5e 50%, #1a1f3a 100%)',
        padding: '32px 16px',
        boxSizing: 'border-box',
      }}
    >
      <header style={{ maxWidth: 760, margin: '0 auto 24px', textAlign: 'center' }}>
        <h1
          style={{
            fontFamily: "'Tahoma', sans-serif",
            fontSize: 34,
            fontWeight: 'bold',
            color: '#fff',
            margin: 0,
            letterSpacing: '1px',
            textShadow: '0 2px 4px rgba(0,0,0,0.5), 0 0 18px rgba(127,119,221,0.4)',
          }}
        >
          ✦ SPECTRAL ✦
        </h1>
        <p
          style={{
            fontFamily: "'Tahoma', sans-serif",
            fontSize: 12,
            color: '#aab4d4',
            margin: '6px 0 0',
            letterSpacing: '0.5px',
          }}
        >
          turn any song into a living color palette
        </p>
      </header>

      <Visualizer
        token={token}
        onSave={(palette, name) =>
          setSaved((prev) => [...prev, { palette, name }])
        }
      />

      {saved.length > 0 && <Gallery items={saved} />}

      <footer
        style={{
          maxWidth: 760,
          margin: '24px auto 0',
          textAlign: 'center',
          fontFamily: "'Tahoma', sans-serif",
          fontSize: 10,
          color: '#6a76a4',
        }}
      >
        built with web audio · oklch · gemini — {new Date().getFullYear()}
      </footer>
    </div>
  )
}