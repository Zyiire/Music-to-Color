import { useState, useEffect, useRef } from 'react'
import { searchTrack, getAudioFeatures } from '../spotify/features'
import type { TrackFeatures } from '../ai/palette-gen'
import '../styles/retro.css'

type SpotifyTrack = {
  id: string
  name: string
  artists: { name: string }[]
  album: { name: string; images: { url: string }[] }
}

type Props = {
  onTrackSelect: (features: TrackFeatures, trackName: string) => void
}

export function SpotifySearch({ onTrackSelect }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SpotifyTrack[]>([])
  const [selected, setSelected] = useState<SpotifyTrack | null>(null)
  const [searching, setSearching] = useState(false)
  const [generating, setGenerating] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.trim().length < 2) {
      setResults([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const tracks = await searchTrack(query)
        setResults(tracks)
      } catch (err) {
        console.error('Search failed:', err)
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 350)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  async function handleGenerate() {
    if (!selected) return
    setGenerating(true)
    try {
      const features = await getAudioFeatures(selected.id)
      const trackName = `${selected.name} — ${selected.artists.map(a => a.name).join(', ')}`
      onTrackSelect(features as TrackFeatures, trackName)
    } catch (err) {
      console.error('Could not load audio features:', err)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="retro-window" style={{ maxWidth: 380 }}>
      <div className="retro-titlebar">
        <div className="retro-titlebar-label">
          <span className="retro-led" />
          <span>Spectral — track finder</span>
        </div>
        <div className="retro-titlebar-controls">
          <div className="retro-titlebar-btn">_</div>
          <div className="retro-titlebar-btn">×</div>
        </div>
      </div>

      <div className="retro-body">
        <div className="retro-label">Search for a track</div>
        <div className="retro-search-row">
          <div className="retro-inset retro-search-field">
            <i className="ti ti-search" style={{ fontSize: 13, color: '#888', flexShrink: 0 }} aria-hidden="true" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="artist — track name"
              aria-label="Search for a track"
            />
          </div>
          <button className="retro-btn" disabled={searching}>
            {searching ? '...' : 'Go'}
          </button>
        </div>

        <div className="retro-label">Results</div>
        <div className="retro-inset retro-results">
          {searching && results.length === 0 && (
            <div className="retro-loading">
              <span className="retro-spinner" /> searching spotify...
            </div>
          )}
          {!searching && results.length === 0 && query.trim().length >= 2 && (
            <div className="retro-loading">no tracks found</div>
          )}
          {!searching && results.length === 0 && query.trim().length < 2 && (
            <div className="retro-loading">type to search...</div>
          )}
          {results.map((track) => (
            <div
              key={track.id}
              className={`retro-result-row${selected?.id === track.id ? ' selected' : ''}`}
              onClick={() => setSelected(track)}
            >
              {track.album.images?.[0]?.url ? (
                <img className="retro-result-art" src={track.album.images[0].url} alt="" />
              ) : (
                <div className="retro-result-art" />
              )}
              <div className="retro-result-meta">
                <div className="retro-result-title">{track.name}</div>
                <div className="retro-result-sub">
                  {track.artists.map(a => a.name).join(', ')} — {track.album.name}
                </div>
              </div>
              <i className="ti ti-player-play retro-result-icon" aria-hidden="true" />
            </div>
          ))}
        </div>

        <div className="retro-footer">
          <div className="retro-footer-text">
            {selected ? (
              <>
                <i className="ti ti-check" style={{ fontSize: 11, verticalAlign: -1 }} aria-hidden="true" />{' '}
                Selected: <b>{selected.name}</b>
              </>
            ) : (
              'No track selected'
            )}
          </div>
          <button
            className="retro-btn-primary"
            onClick={handleGenerate}
            disabled={!selected || generating}
          >
            {generating ? 'Working...' : 'Generate palette →'}
          </button>
        </div>
      </div>

      <div className="retro-statusbar">
        <span>{results.length} track{results.length === 1 ? '' : 's'} found</span>
        <span>● connected to spotify</span>
      </div>
    </div>
  )
}