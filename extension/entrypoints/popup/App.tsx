import { useEffect, useState } from "react";
import { latestWrappedId } from "../../lib/storage";

const open = (path: `/wrapped.html${string}`) => browser.tabs.create({ url: browser.runtime.getURL(path) });

export default function App() {
  const [latest, setLatest] = useState<string | null>(null);

  useEffect(() => {
    latestWrappedId().then(setLatest);
  }, []);

  return (
    <div className="popup">
      <div className="badge">Job Hunt Wrapped</div>
      <h1>Your job hunt, wrapped.</h1>
      <p>Open Gmail and hit the glowing button in the bottom-right corner to scan your inbox.</p>
      <button className="primary" onClick={() => browser.tabs.create({ url: "https://mail.google.com" })}>
        Open Gmail →
      </button>
      {latest && (
        <button className="secondary" onClick={() => open(`/wrapped.html?id=${encodeURIComponent(latest)}`)}>
          Replay my last Wrapped
        </button>
      )}
      <button className="link" onClick={() => open("/wrapped.html?demo=1")}>
        Watch the demo
      </button>
    </div>
  );
}
