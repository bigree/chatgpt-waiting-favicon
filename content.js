(() => {
  const WAITING_ICON = makeIcon("#f59e0b", "#111827", "...");
  const IDLE_ICON = null;
  const CHECK_INTERVAL_MS = 750;

  let originalIcons = null;
  let waiting = false;
  let debounceTimer = null;

  function makeIcon(background, foreground, label) {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
        <rect width="64" height="64" rx="14" fill="${background}"/>
        <circle cx="20" cy="32" r="5" fill="${foreground}">
          <animate attributeName="opacity" values="0.25;1;0.25" dur="1s" repeatCount="indefinite" begin="0s"/>
        </circle>
        <circle cx="32" cy="32" r="5" fill="${foreground}">
          <animate attributeName="opacity" values="0.25;1;0.25" dur="1s" repeatCount="indefinite" begin="0.15s"/>
        </circle>
        <circle cx="44" cy="32" r="5" fill="${foreground}">
          <animate attributeName="opacity" values="0.25;1;0.25" dur="1s" repeatCount="indefinite" begin="0.3s"/>
        </circle>
        <title>${label}</title>
      </svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  function faviconLinks() {
    return Array.from(document.querySelectorAll('link[rel~="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]'));
  }

  function snapshotOriginalIcons() {
    if (originalIcons) return;
    originalIcons = faviconLinks().map((link) => ({
      link,
      href: link.getAttribute("href"),
      rel: link.getAttribute("rel"),
      type: link.getAttribute("type")
    }));
  }

  function setFavicon(href) {
    snapshotOriginalIcons();
    const links = faviconLinks();
    let link = document.querySelector('link[data-chatgpt-waiting-favicon="true"]');
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("data-chatgpt-waiting-favicon", "true");
      document.head.appendChild(link);
    }

    for (const iconLink of [...links, link]) {
      iconLink.rel = "icon";
      iconLink.type = "image/svg+xml";
      iconLink.href = href;
    }
    link.href = href;
  }

  function restoreFavicon() {
    const injected = document.querySelector('link[data-chatgpt-waiting-favicon="true"]');
    if (injected) injected.remove();
    if (!originalIcons) return;

    for (const item of originalIcons) {
      if (!item.link.isConnected) continue;
      if (item.href === null) item.link.removeAttribute("href");
      else item.link.setAttribute("href", item.href);
      if (item.rel === null) item.link.removeAttribute("rel");
      else item.link.setAttribute("rel", item.rel);
      if (item.type === null) item.link.removeAttribute("type");
      else item.link.setAttribute("type", item.type);
    }
  }

  function visible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
  }

  function textMatches(el, patterns) {
    const text = [
      el.getAttribute("aria-label"),
      el.getAttribute("title"),
      el.textContent
    ].filter(Boolean).join(" ").toLowerCase();
    return patterns.some((pattern) => text.includes(pattern));
  }

  function isGenerating() {
    const testIdStopButton = document.querySelector('[data-testid="stop-button"], [data-testid*="stop-button"]');
    if (visible(testIdStopButton)) {
      return true;
    }

    const buttons = Array.from(document.querySelectorAll("button"));
    const stopButton = buttons.find((button) => visible(button) && textMatches(button, [
      "stop generating",
      "stop streaming",
      "stop response",
      "stop responding",
      "回答を停止",
      "停止",
      "生成を停止",
      "ストリーミングを停止"
    ]));
    if (stopButton) return true;

    return false;
  }

  function applyState(nextWaiting) {
    if (waiting === nextWaiting) return;
    waiting = nextWaiting;
    document.documentElement.dataset.chatgptWaitingFavicon = waiting ? "waiting" : "idle";
    if (waiting) setFavicon(WAITING_ICON);
    else restoreFavicon(IDLE_ICON);
  }

  function scheduleCheck() {
    window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => applyState(isGenerating()), 120);
  }

  const observer = new MutationObserver(scheduleCheck);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["aria-label", "disabled", "aria-disabled", "data-testid", "class"]
  });

  window.setInterval(scheduleCheck, CHECK_INTERVAL_MS);
  scheduleCheck();
})();
