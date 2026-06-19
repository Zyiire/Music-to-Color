import { useState, useEffect } from 'react'
import { handleCallback, getToken } from './spotify/auth'
import { decodePalette } from './export/share'
import { SpotifySearch } from './ui/SpotifySearch'
import { Visualizer } from './ui/Visualizer'
import { Gallery } from './ui/Gallery'

export default function App() {
  const [token, setToken] = useState(getToken())
  const [saved, setSaved] = useState<{ palette: string[], name: string }[]>([])

  useEffect(() => {
    if (window.location.search.includes('code=')) {
      handleCallback().then(t => { if (t) setToken(t) })
    }
    const shared = new URLSearchParams(window.location.search).get('palette')
    if (shared) {
      const restored = decodePalette(shared)
      if (restored) setSaved(prev => [...prev, { palette: restored.palette, name: restored.trackName }])
    }
  }, [])

  return (
    <div className="min-h-screen bg-black text-white">
      <Visualizer token={token} onSave={(p, n) => setSaved(prev => [...prev, { palette: p, name: n }])} />
      {saved.length > 0 && <Gallery items={saved} />}
    </div>
  )
}