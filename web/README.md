# Job Hunt Wrapped: AI writer

A small Next.js app behind the Job Hunt Wrapped browser extension.

- `POST /api/wrapped` takes job hunt stats and returns the copy for every story slide, plus the theme song on Spotify.
- `/s/<card>` is a public share page. The card data lives in the URL itself, so nothing is stored, and `opengraph-image` renders the link preview.
- `/privacy` is the privacy policy.

```bash
npm install
npm run dev
```

## Environment

| Variable | Needed | What it does |
|---|---|---|
| `GOOGLE_GENERATIVE_AI_API_KEY` | Recommended | Gemini writes the copy. Without it, copy is generated from the stats. |
| `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` | Optional | Finds the theme song on Spotify for cover art and the player. Create an app at developer.spotify.com/dashboard. |
| `GEMINI_MODEL` | Optional | Defaults to `gemini-2.5-flash`. |
| `NEXT_PUBLIC_SITE_URL` | Optional | Public URL for link previews. On Vercel it defaults to the production domain. |
| `NEXT_PUBLIC_INSTALL_URL` | Optional | Where "Get your own Wrapped" points, e.g. your Chrome Web Store listing. |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Optional | Contact on the privacy page. |

If Gemini or Spotify fail, the route falls back gracefully: the story always plays.
Requests are validated, limited to 100 KB, rate-limited per IP, and CORS only allows browser-extension and localhost origins.

`lib/wrapped/` is generated from `../extension/shared/` by `npm run sync-shared`, which runs before `dev` and `build`. Edit the extension copy.
