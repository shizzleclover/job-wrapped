export default function Home() {
  const hasKey = Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim());
  return (
    <main className="mx-auto flex min-h-full max-w-xl flex-1 flex-col justify-center gap-4 px-6 py-24">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Job Hunt Wrapped</p>
      <h1 className="text-4xl font-bold tracking-tight">The AI writer is running.</h1>
      <p className="text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
        The browser extension posts your job hunt stats to <code className="rounded bg-black/5 px-1.5 py-0.5 dark:bg-white/10">/api/wrapped</code>{" "}
        and gets back the copy for each slide.
      </p>
      <p className="text-sm text-zinc-500">
        {hasKey
          ? "Gemini key found. Copy is written by AI."
          : "No GOOGLE_GENERATIVE_AI_API_KEY set. Copy is generated from the stats without AI."}
      </p>
    </main>
  );
}
