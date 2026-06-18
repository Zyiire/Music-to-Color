import { getToken } from './auth'

const BASE = 'https://api.spotify.com/v1'
const headers = () => ({ Authorization: `Bearer ${getToken()}` })

export async function searchTrack(query: string) {
    const res = await fetch(`${BASE}/search?q=${encodeURIComponent(query)}&type=track&limit=5`, { headers: headers() })
    const data = await res.json()
    return data.tracks?.items ?? []
  }

  export async function getAudioFeatures(trackId: string) {
    const res = await fetch(`${BASE}/audio-features/${trackId}`, { headers: headers() })
    return res.json()
  }
  