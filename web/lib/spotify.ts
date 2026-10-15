import type { Track } from "@/lib/wrapped/schema";

// App-only (client credentials) access: enough for search, no user login needed.
// We only show metadata and art with a link back, and never stream audio ourselves.

const TIMEOUT_MS = 4000;
let token: { value: string; expiresAt: number } | null = null;
const cache = new Map<string, Track | null>();

async function accessToken(): Promise<string | null> {
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !secret) return null;
  if (token && token.expiresAt > Date.now() + 60_000) return token.value;

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Spotify token request failed: ${res.status}`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  token = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return token.value;
}

interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: { images: Array<{ url: string; width: number | null }> };
  external_urls: { spotify: string };
}

async function search(query: string, auth: string): Promise<SpotifyTrack | null> {
  const url = `https://api.spotify.com/v1/search?${new URLSearchParams({ q: query, type: "track", limit: "1" })}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${auth}` }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`Spotify search failed: ${res.status}`);
  const json = (await res.json()) as { tracks?: { items?: SpotifyTrack[] } };
  return json.tracks?.items?.[0] ?? null;
}

/** Finds the theme song on Spotify. Returns null when Spotify isn't configured or nothing matches. */
export async function findTrack(song: { title: string; artist: string }): Promise<Track | null> {
  const key = `${song.title}|${song.artist}`.toLowerCase();
  if (cache.has(key)) return cache.get(key)!;
  try {
    const auth = await accessToken();
    if (!auth) return null;
    const clean = (s: string) => s.replace(/["]/g, "").trim();
    const hit = (await search(`track:"${clean(song.title)}" artist:"${clean(song.artist)}"`, auth)) ?? (await search(`${clean(song.title)} ${clean(song.artist)}`, auth));
    const track: Track | null = hit
      ? {
          id: hit.id,
          title: hit.name,
          artist: hit.artists.map((a) => a.name).join(", "),
          albumArt: [...hit.album.images].sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0]?.url ?? null,
          url: hit.external_urls.spotify,
        }
      : null;
    cache.set(key, track);
    return track;
  } catch (err) {
    console.error("Spotify lookup failed:", err);
    return null;
  }
}
