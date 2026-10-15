import type { Metadata } from "next";
import type { ReactNode } from "react";
import release from "@/lib/release.json";
import { ExtensionsAddress, UnzipTabs } from "./client";

export const metadata: Metadata = {
  title: "Install · Job Hunt Wrapped",
  description: "Get Job Hunt Wrapped: a Spotify Wrapped-style story of your job hunt, built from your Gmail. Set up in two minutes.",
};

const sizeMb = (release.bytes / 1_000_000).toFixed(1);

export default function Install() {
  return (
    <main className="min-h-full flex-1 bg-[#0B0B10] text-[#F5F5F0]">
      <div className="mx-auto w-full max-w-2xl px-5 py-16 sm:py-24">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#C6FF3D]">Job Hunt Wrapped</p>
        <h1 className="mt-3 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">Your job hunt, wrapped.</h1>
        <p className="mt-4 text-lg leading-relaxed text-white/70">
          It reads your Gmail and turns your applications, rejections, ghostings and wins into a story you can share. Setup takes about two
          minutes.
        </p>

        <div className="mt-6 rounded-2xl border border-[#FFE14D]/30 bg-[#FFE14D]/10 p-4 text-sm leading-relaxed text-[#FFE14D] sm:hidden">
          This works on a computer, not a phone. Send this page to yourself and open it on your laptop.
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <a
            href="/downloads/job-hunt-wrapped.zip"
            download
            className="inline-flex items-center gap-2.5 rounded-full bg-[#C6FF3D] px-7 py-4 text-base font-extrabold text-[#0B0B10] shadow-[0_0_50px_rgba(198,255,61,0.35)] transition hover:brightness-95"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 3v12m0 0l-5-5m5 5l5-5M4 21h16" />
            </svg>
            Download
          </a>
          <span className="text-sm text-white/55">
            Version {release.version} · {sizeMb} MB · Chrome, Arc, Brave or Edge on a computer
          </span>
        </div>

        <ol className="mt-14 space-y-10">
          <Step n={1} title="Unzip it">
            <UnzipTabs />
          </Step>

          <Step n={2} title="Open your browser's extensions page">
            <ExtensionsAddress />
          </Step>

          <Step n={3} title="Turn on Developer mode">
            <p className="text-white/80">
              Find the <strong>Developer mode</strong> switch in the top-right corner (in Edge, it&apos;s in the left sidebar) and turn it on. A row
              of new buttons appears.
            </p>
            <Mock>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white/70">Extensions</span>
                <span className="flex items-center gap-2 text-sm text-white/80">
                  Developer mode
                  <span className="relative inline-block h-5 w-9 rounded-full bg-[#C6FF3D]">
                    <span className="absolute right-0.5 top-0.5 h-4 w-4 rounded-full bg-[#0B0B10]" />
                  </span>
                </span>
              </div>
            </Mock>
          </Step>

          <Step n={4} title="Click “Load unpacked” and pick the folder">
            <p className="text-white/80">
              Choose the <strong>job-hunt-wrapped</strong> folder you unzipped (the folder itself, not a file inside it), then click{" "}
              <strong>Select</strong>. Job Hunt Wrapped shows up in your list.
            </p>
            <Mock>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border-2 border-[#C6FF3D] px-3 py-1.5 text-sm font-semibold text-[#C6FF3D]">Load unpacked</span>
                <span className="rounded-full border border-white/15 px-3 py-1.5 text-sm text-white/40">Pack extension</span>
                <span className="rounded-full border border-white/15 px-3 py-1.5 text-sm text-white/40">Update</span>
              </div>
            </Mock>
            <p className="mt-3 text-sm text-white/55">
              Optional: click the puzzle-piece icon in your toolbar and pin Job Hunt Wrapped, so it&apos;s always one click away.
            </p>
          </Step>

          <Step n={5} title="Open Gmail and press play">
            <ul className="list-disc space-y-1.5 pl-5 text-white/80">
              <li>
                Go to{" "}
                <a href="https://mail.google.com" className="font-semibold text-[#C6FF3D] underline underline-offset-4">
                  Gmail
                </a>{" "}
                (refresh it if it was already open).
              </li>
              <li>
                Click <strong>Play your Job Wrapped</strong> in the bottom-right corner, pick how spicy you want it, and hit{" "}
                <strong>Scan my inbox</strong>.
              </li>
              <li>Gmail will flick through a few searches for up to a minute. Let it run.</li>
              <li>Untick anything it got wrong in the quick check, and your story opens in a new tab. Sound on.</li>
            </ul>
            <p className="mt-3 text-sm text-white/55">
              Want to see it first? Click the extension&apos;s icon and choose <strong>Watch the demo</strong>.
            </p>
          </Step>
        </ol>

        <section className="mt-16">
          <h2 className="text-2xl font-bold tracking-tight">If something&apos;s off</h2>
          <dl className="mt-5 space-y-5">
            <Faq q="“Manifest file is missing or unreadable”">
              You picked the wrong folder. Pick the <strong>job-hunt-wrapped</strong> folder that contains a file called manifest.json. If
              unzipping created a folder inside a folder, choose the inner one.
            </Faq>
            <Faq q="I don't see the button in Gmail">
              Refresh Gmail. If it&apos;s still missing, check the extension is switched on in your extensions page.
            </Faq>
            <Faq q="Chrome warns about developer mode extensions">
              That&apos;s normal for anything not installed from the Chrome Web Store. Dismiss it, and the extension keeps working.
            </Faq>
            <Faq q="It stopped working after a while">
              The browser runs it from the folder you picked. If that folder was moved or deleted, repeat steps 1 to 4.
            </Faq>
            <Faq q="My numbers look wrong">
              In the Gmail panel, click <strong>Download scan report</strong>. It lists every email that was counted and why. Send the person
              who shared this the rows that look wrong (only the ones you&apos;re comfortable sharing).
            </Faq>
            <Faq q="How do I update?">
              Download the new version from this page, unzip it over your old folder, then click the reload icon on Job Hunt Wrapped in your
              extensions page.
            </Faq>
            <Faq q="Does it work on Safari, Firefox or my phone?">Not yet: only Chrome, Arc, Brave and Edge on a computer.</Faq>
          </dl>
        </section>

        <section className="mt-16 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-lg font-bold">Your privacy, in short</h2>
          <p className="mt-2 leading-relaxed text-white/70">
            The extension only reads your email when you start a scan, and it does the counting in your browser. Only a summary goes to the AI
            that writes your story, and nothing is saved on a server. You choose whether email previews are shared.{" "}
            <a href="/privacy" className="font-semibold text-[#C6FF3D] underline underline-offset-4">
              Read the full privacy policy
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className="grid grid-cols-[2.5rem_1fr] gap-4">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#C6FF3D] text-lg font-extrabold text-[#0B0B10]">{n}</span>
      <div className="min-w-0 pt-1">
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
        <div className="mt-2 leading-relaxed">{children}</div>
      </div>
    </li>
  );
}

function Mock({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-[#15151C] p-4" aria-hidden>
      {children}
    </div>
  );
}

function Faq({ q, children }: { q: string; children: ReactNode }) {
  return (
    <div>
      <dt className="font-semibold">{q}</dt>
      <dd className="mt-1 leading-relaxed text-white/65">{children}</dd>
    </div>
  );
}
