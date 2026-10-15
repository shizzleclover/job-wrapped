# Job Hunt Wrapped: extension

Scans Gmail for job application emails and plays a Spotify Wrapped-style story about your job hunt.

```bash
npm install
npm run dev        # launches Chrome with the extension loaded
```

1. Start the AI writer in `../web` (`npm run dev`). Without it, the story still plays with copy written from your stats.
2. Open Gmail and click **Play your Job Wrapped** in the bottom-right corner.
3. The story opens in a new tab. The popup can replay your last one, or show a demo.

## Layout

- `entrypoints/gmail.content/` scans Gmail (`scraper.ts`) and shows the launcher.
- `lib/classify.ts` sorts emails into applied, rejected, interview, assessment and offer, and pulls out company, role and hiring platform.
- `lib/analyze.ts` turns emails into the metrics in `shared/schema.ts`.
- `entrypoints/wrapped/` is the story page; slides live in `components/story/`.
- `shared/` is the contract with the server. It's copied into `web/lib/wrapped/` with `npm run sync-shared`.

## Previewing the story without Gmail

Open `wrapped.html?demo=1` from the extension (or the popup's "Watch the demo"). Extra query params:
`spice=linkedin_safe|crispy|unhinged`, `slide=<n>`, `paused=1`, `autoplay=1`.
