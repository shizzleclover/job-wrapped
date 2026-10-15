"use client";

import { useState } from "react";

const BROWSERS = [
  { id: "chrome", label: "Chrome", url: "chrome://extensions" },
  { id: "arc", label: "Arc", url: "arc://extensions" },
  { id: "brave", label: "Brave", url: "brave://extensions" },
  { id: "edge", label: "Edge", url: "edge://extensions" },
] as const;

/** Browsers block links to chrome:// pages, so we hand people the address to paste instead. */
export function ExtensionsAddress() {
  const [browser, setBrowser] = useState<(typeof BROWSERS)[number]["id"]>("chrome");
  const [copied, setCopied] = useState(false);
  const current = BROWSERS.find((b) => b.id === browser)!;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(current.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked: the address is visible to copy by hand */
    }
  };

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Your browser">
        {BROWSERS.map((b) => (
          <button
            key={b.id}
            role="tab"
            aria-selected={browser === b.id}
            onClick={() => setBrowser(b.id)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
              browser === b.id ? "bg-[#F5F5F0] text-[#0B0B10]" : "bg-white/10 text-white/75 hover:text-white"
            }`}
          >
            {b.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/40 p-1.5 pl-4">
        <code className="flex-1 truncate font-mono text-[15px] text-[#C6FF3D]">{current.url}</code>
        <button onClick={copy} className="rounded-xl bg-[#C6FF3D] px-4 py-2 text-sm font-bold text-[#0B0B10] transition hover:brightness-95">
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="text-sm text-white/55">Paste it into your address bar and press Enter.</p>
    </div>
  );
}

export function UnzipTabs() {
  const [os, setOs] = useState<"mac" | "windows">("mac");
  return (
    <div className="mt-4">
      <div className="flex gap-2" role="tablist" aria-label="Your computer">
        {(["mac", "windows"] as const).map((id) => (
          <button
            key={id}
            role="tab"
            aria-selected={os === id}
            onClick={() => setOs(id)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
              os === id ? "bg-[#F5F5F0] text-[#0B0B10]" : "bg-white/10 text-white/75 hover:text-white"
            }`}
          >
            {id === "mac" ? "Mac" : "Windows"}
          </button>
        ))}
      </div>
      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-white/80">
        {os === "mac" ? (
          <>
            <li>
              Double-click <strong>job-hunt-wrapped.zip</strong> in your Downloads. A <strong>job-hunt-wrapped</strong> folder appears next to it.
            </li>
            <li>Drag that folder into Documents, so you don&apos;t delete it by accident.</li>
          </>
        ) : (
          <>
            <li>
              Right-click <strong>job-hunt-wrapped.zip</strong> in Downloads, choose <strong>Extract All…</strong>, then <strong>Extract</strong>.
            </li>
            <li>Move the new folder into Documents, so you don&apos;t delete it by accident.</li>
          </>
        )}
      </ul>
    </div>
  );
}
