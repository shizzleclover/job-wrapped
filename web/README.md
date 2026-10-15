# Job Hunt Wrapped: AI writer

A tiny Next.js server with one route, `POST /api/wrapped`. The browser extension in `../extension` sends job hunt stats and gets back the copy for every story slide.

```bash
npm install
echo "GOOGLE_GENERATIVE_AI_API_KEY=..." > .env.local   # optional
npm run dev
```

- With no key, or if Gemini fails, the route returns copy generated from the stats (`source: "fallback"`), so the story always plays.
- `GEMINI_MODEL` overrides the model (default `gemini-2.5-flash`).
- Requests are validated, limited to 100 KB, rate-limited per IP, and CORS only allows browser-extension and localhost origins.
- `lib/wrapped/` is generated from `../extension/shared/` by `npm run sync-shared`, which runs before `dev` and `build`. Edit the extension copy.
