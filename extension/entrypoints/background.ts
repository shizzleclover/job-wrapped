import { classifyEmails } from "../lib/api";
import type { ClassifyRequest } from "../shared/schema";

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message: unknown) => {
    const msg = message as { type?: string; id?: string; items?: ClassifyRequest["items"] };
    // Content scripts can't open tabs, so Gmail asks us to open the story page.
    if (msg.type === "open-wrapped" && typeof msg.id === "string") {
      const url = browser.runtime.getURL(`/wrapped.html?id=${encodeURIComponent(msg.id)}`);
      return browser.tabs.create({ url }).then(() => true);
    }
    // Requests from Gmail's page would be blocked by CORS; the background has the server's host permission.
    if (msg.type === "classify" && Array.isArray(msg.items)) return classifyEmails(msg.items);
  });
});
