const OFFSCREEN_DOCUMENT = "offscreen.html";

async function ensureOffscreenDocument() {
  if (!chrome.offscreen) return false;

  const offscreenUrl = chrome.runtime.getURL(OFFSCREEN_DOCUMENT);
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
    documentUrls: [offscreenUrl]
  });

  if (contexts.length > 0) return true;

  await chrome.offscreen.createDocument({
    url: OFFSCREEN_DOCUMENT,
    reasons: ["AUDIO_PLAYBACK"],
    justification: "Play a short completion sound when ChatGPT finishes responding."
  });
  return true;
}

chrome.runtime.onMessage.addListener((message) => {
  if (!message || message.type !== "chatgpt-waiting-favicon:complete") return;

  ensureOffscreenDocument()
    .then((ready) => {
      if (ready) chrome.runtime.sendMessage({ type: "chatgpt-waiting-favicon:play-sound" });
    })
    .catch(() => {});
});
