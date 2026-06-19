export function encodePalette(palette: string[], trackName: string): string {
    const data = JSON.stringify({ palette, trackName })
    return btoa(encodeURIComponent(data)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  }
  
  export function decodePalette(encoded: string): { palette: string[], trackName: string } | null {
    try {
      const data = decodeURIComponent(atob(encoded.replace(/-/g, '+').replace(/_/g, '/')))
      return JSON.parse(data)
    } catch { return null }
  }
  
  export function buildShareURL(palette: string[], trackName: string): string {
    const encoded = encodePalette(palette, trackName)
    return `${window.location.origin}?palette=${encoded}`
  }