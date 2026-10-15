# Job Hunt Wrapped

A Spotify Wrapped-style story of your job hunt, built from your Gmail.

- **`extension/`** is the browser extension. It scans Gmail, crunches the stats in the browser and plays the story. See its README.
- **`web/`** is the AI writer, a small Next.js app with one API route that turns stats into story copy. It's deployed on Vercel.

## Local development

```bash
cd web && npm install && npm run dev            # API on http://localhost:3000
cd extension && npm install && npm run dev      # launches Chrome with the extension
```

## Release

1. Deploy `web/` to Vercel (Root Directory: `web`, env: `GOOGLE_GENERATIVE_AI_API_KEY`).
2. `cp extension/.env.production.example extension/.env.production` and set your Vercel URL.
3. `cd extension && npm run zip`. Upload the zip from `.output/` to the Chrome Web Store, or share it for "Load unpacked".

The privacy policy lives at `/privacy` on the deployed site.
