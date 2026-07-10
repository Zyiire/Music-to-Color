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

  // The visualizer owns the whole viewport; controls and the gallery
  // float in its sidebar.
  return (
    <Visualizer
      token={token}
      onSave={(palette, name) =>
        setSaved((prev) => [...prev, { palette, name }])
      }
      gallery={saved.length > 0 ? <Gallery items={saved} /> : null}
    />
  )
}