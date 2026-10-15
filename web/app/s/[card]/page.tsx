import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { decodeShare } from "@/lib/wrapped/share";

const INSTALL_URL = process.env.NEXT_PUBLIC_INSTALL_URL || "/";

export async function generateMetadata({ params }: { params: Promise<{ card: string }> }): Promise<Metadata> {
  const { card: token } = await params;
  const card = decodeShare(token);
  if (!card) return { title: "Job Hunt Wrapped" };
  const title = `${card.a} · My ${card.y} Job Hunt Wrapped`;
  const description = `${card.s.apps} applications, ${card.s.int} interviews, ${card.s.ghost}% ghosted. “${card.t}”`;
  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default function SharePage({ params }: { params: Promise<{ card: string }> }) {
  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center gap-10 bg-[#0B0B10] px-4 py-16 text-[#F5F5F0]">
      <Suspense fallback={<div className="aspect-[1200/630] w-full max-w-3xl animate-pulse rounded-3xl bg-white/5" />}>
        <Card params={params} />
      </Suspense>
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <h1 className="text-3xl font-bold tracking-tight">How did your job hunt really go?</h1>
        <p className="text-zinc-400">Job Hunt Wrapped reads your Gmail and turns your applications, ghostings and wins into a story.</p>
        <a href={INSTALL_URL} className="rounded-full bg-[#C6FF3D] px-7 py-3.5 font-bold text-[#0B0B10] transition hover:brightness-95">
          Get your own Wrapped
        </a>
      </div>
    </main>
  );
}

async function Card({ params }: { params: Promise<{ card: string }> }) {
  const { card: token } = await params;
  const card = decodeShare(token);
  if (!card) notFound();
  return (
    // eslint-disable-next-line @next/next/no-img-element -- generated per link, nothing for next/image to optimize
    <img
      src={`/s/${token}/opengraph-image`}
      alt={`${card.a}: ${card.s.apps} applications, ${card.s.int} interviews, ${card.s.ghost}% ghosted`}
      width={1200}
      height={630}
      className="h-auto w-full max-w-3xl rounded-3xl shadow-[0_30px_100px_rgba(0,0,0,0.5)]"
    />
  );
}
