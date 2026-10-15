export default defineBackground(() => {
  // Content scripts can't open tabs, so Gmail asks us to open the story page.
  browser.runtime.onMessage.addListener((message: unknown) => {
    const msg = message as { type?: string; id?: string };
    if (msg.type === "open-wrapped" && typeof msg.id === "string") {
      const url = browser.runtime.getURL(`/wrapped.html?id=${encodeURIComponent(msg.id)}`);
      return browser.tabs.create({ url }).then(() => true);
    }
  });
});
