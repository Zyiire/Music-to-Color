const SCOPES = 'user-read-private'
const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID
const REDIRECT = import.meta.env.VITE_SPOTIFY_REDIRECT_URI

async function sh256(plain: string) {
    const data = new TextEncoder().encode(plain)
    return crypto.subtle.digest('SHA-256', data)
}

function base64url(buffer: ArrayBuffer) {
    return btoa(String.fromCharCode(...new Uint8Array(buffer))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

export async function login() {
    const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)).buffer)
    const challenge = base64url(await sh256(verifier))
    sessionStorage.setItem('spotify_auth_verifier', verifier)

    const url = new URL('https://accounts.spotify.com/authorize')
    url.searchParams.set('client_id', CLIENT_ID)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('redirect_uri', REDIRECT)
    url.searchParams.set('scope', SCOPES)
    url.searchParams.set('code_challenge_method', 'S256')
    url.searchParams.set('code_challenge', challenge)
    window.location.href = url.toString()
}

export async function handleCallback(): Promise<string | null> {
    const code = new URLSearchParams(window.location.search).get('code')
    const verifier = sessionStorage.getItem('pkce_verifier')
    if (!code || !verifier) return null
  
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code, redirect_uri: REDIRECT,
        client_id: CLIENT_ID, code_verifier: verifier,
      }),
    })
    const data = await res.json()
    sessionStorage.setItem('spotify_token', data.access_token)
    window.history.replaceState({}, '', '/')
    return data.access_token
  }
  
  export function getToken() { return sessionStorage.getItem('spotify_token') }
  