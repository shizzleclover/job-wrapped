import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy · Job Hunt Wrapped",
  description: "What the Job Hunt Wrapped extension reads, what it sends, and what it keeps.",
};

const CONTACT = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "murewatajala@gmail.com";
const UPDATED = "October 15, 2026";

export default function Privacy() {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-20 leading-relaxed text-zinc-800 dark:text-zinc-200">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Job Hunt Wrapped</p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight text-zinc-950 dark:text-white">Privacy Policy</h1>
      <p className="mt-2 text-sm text-zinc-500">Last updated {UPDATED}</p>

      <Section title="The short version">
        <p>
          The extension reads job-related emails in your Gmail, counts them in your browser, and turns the counts into a story. Only a summary
          goes to our server, which passes it to an AI model to write the jokes. Nothing is stored on our server. We don&apos;t sell or share your data.
        </p>
      </Section>

      <Section title="What the extension reads">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            When you click <strong>Scan my inbox</strong>, it runs Gmail searches in your open Gmail tab and reads the sender, subject line, the
            short preview and the date of matching emails: application confirmations, rejections, interview invites and offers.
          </li>
          <li>
            If you leave <strong>Include emails I sent</strong> on, it also reads the subject and preview of job-related emails you sent, and
            checks whether the people you emailed wrote back.
          </li>
          <li>It never opens full emails or attachments, and it never sends, deletes or changes anything in your mailbox.</li>
          <li>It only runs when you start a scan. It doesn&apos;t read your email in the background.</li>
        </ul>
      </Section>

      <Section title="What leaves your browser">
        <p>To write your story, the extension sends our server:</p>
        <ul className="mt-2 list-disc space-y-2 pl-5">
          <li>Your stats: counts, percentages, dates and times, plus the names of companies, roles and hiring platforms.</li>
          <li>
            Only if <strong>Let the AI read a few email previews</strong> is on: up to 36 subject lines and previews from emails companies sent
            you.
          </li>
        </ul>
        <p className="mt-3">
          Text from emails <em>you</em> sent is never sent anywhere. Only counts and company names from them are used. Email addresses are never
          sent.
        </p>
        <p className="mt-3">
          Our server forwards this to Google&apos;s Gemini API to generate the story text, then returns the result. It doesn&apos;t save your data
          to any database. Google processes API requests under the{" "}
          <a className="underline" href="https://ai.google.dev/gemini-api/terms">
            Gemini API terms
          </a>
          . Like any web server, our hosting provider may keep short-lived request logs (such as IP address and time) for security and debugging.
        </p>
      </Section>

      <Section title="What's stored">
        <p>
          Your stats and story are saved in your browser&apos;s extension storage, so you can replay your Wrapped. They stay on your device and are
          deleted when you uninstall the extension.
        </p>
      </Section>

      <Section title="Google user data">
        <p>
          The extension&apos;s use of information read from Gmail is limited to generating your Job Hunt Wrapped story. It isn&apos;t used for
          advertising, isn&apos;t sold, and isn&apos;t used to train AI models by us.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions or deletion requests:{" "}
          {CONTACT ? (
            <a className="underline" href={`mailto:${CONTACT}`}>
              {CONTACT}
            </a>
          ) : (
            "contact details coming soon."
          )}
        </p>
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold text-zinc-950 dark:text-white">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}
