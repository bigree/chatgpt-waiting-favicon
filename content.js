(() => {
  const WAITING_ICON = makeIcon("#f59e0b", "#111827", "...");
  const DONE_ICON = makeDoneIcon("#22c55e", "#ffffff");
  const IDLE_ICON = null;
  const CHECK_INTERVAL_MS = 750;

  let originalIconSpecs = null;
  let state = "idle";
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

  function makeDoneIcon(background, foreground) {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
        <rect width="64" height="64" rx="14" fill="${background}"/>
        <path d="M18 33.5 28 43l19-23" fill="none" stroke="${foreground}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
        <title>done</title>
      </svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  function faviconLinks() {
    return Array.from(document.querySelectorAll('link[rel~="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]'));
  }

  function normalFaviconHref() {
    return new URL("/favicon.ico", window.location.origin).href;
  }

  function isWaitingIconHref(href) {
    if (!href) return false;
    return href === WAITING_ICON || href.includes("f59e0b") || href.includes("%23f59e0b");
  }

  function isDoneIconHref(href) {
    if (!href) return false;
    return href === DONE_ICON || href.includes("22c55e") || href.includes("%2322c55e");
  }

  function isStatusIconHref(href) {
    return isWaitingIconHref(href) || isDoneIconHref(href);
  }

  function hasStatusFavicon() {
    return faviconLinks().some((link) => {
      return link.matches('[data-chatgpt-status-favicon="true"], [data-chatgpt-waiting-favicon="true"]') || isStatusIconHref(link.href);
    });
  }

  function snapshotOriginalIcons() {
    if (originalIconSpecs) return;
    originalIconSpecs = faviconLinks()
      .filter((link) => !link.matches('[data-chatgpt-status-favicon="true"], [data-chatgpt-waiting-favicon="true"]'))
      .map((link) => ({
      href: isStatusIconHref(link.href) ? normalFaviconHref() : link.getAttribute("href"),
      rel: link.getAttribute("rel"),
      sizes: link.getAttribute("sizes"),
      type: link.getAttribute("type")
    }));
    if (originalIconSpecs.length === 0) {
      originalIconSpecs = [{
        href: normalFaviconHref(),
        rel: "icon",
        sizes: null,
        type: "image/x-icon"
      }];
    }
  }

  function setFavicon(href) {
    snapshotOriginalIcons();
    const links = faviconLinks();
    let link = document.querySelector('link[data-chatgpt-status-favicon="true"]');
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("data-chatgpt-status-favicon", "true");
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
    snapshotOriginalIcons();
    for (const link of faviconLinks()) {
      if (link.matches('[data-chatgpt-status-favicon="true"], [data-chatgpt-waiting-favicon="true"]') || isStatusIconHref(link.href)) {
        link.remove();
      }
    }

    const specs = originalIconSpecs && originalIconSpecs.length > 0 ? originalIconSpecs : [{
      href: normalFaviconHref(),
      rel: "icon",
      sizes: null,
      type: "image/x-icon"
    }];

    for (const spec of specs) {
      const link = document.createElement("link");
      link.rel = spec.rel || "icon";
      if (spec.href) link.href = isStatusIconHref(spec.href) ? normalFaviconHref() : spec.href;
      else link.href = normalFaviconHref();
      if (spec.sizes) link.setAttribute("sizes", spec.sizes);
      if (spec.type) link.type = spec.type;
      document.head.appendChild(link);
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

  function composerRoot() {
    const prompt = document.querySelector("#prompt-textarea");
    return prompt ? prompt.closest("form") : document.querySelector("form");
  }

  function hasVisibleShortText(root, patterns) {
    if (!root) return false;
    const nodes = Array.from(root.querySelectorAll("span, div, p")).filter(visible);
    return nodes.some((node) => {
      const text = (node.textContent || "").trim().toLowerCase();
      return text.length > 0 && text.length <= 80 && patterns.some((pattern) => text.includes(pattern));
    });
  }

  function userIsViewingTab() {
    return document.visibilityState === "visible" && document.hasFocus();
  }

  function playCompleteSound() {
    try {
      chrome.runtime.sendMessage({ type: "chatgpt-waiting-favicon:complete" });
    } catch (_) {
      // Sound is best-effort; favicon state should never depend on it.
    }
  }

  function isGenerating() {
    const testIdStopButton = document.querySelector('[data-testid="stop-button"], [data-testid*="stop-button"]');
    if (visible(testIdStopButton)) {
      return true;
    }

    const buttons = Array.from(document.querySelectorAll("button"));
    const stopButton = buttons.find((button) => {
      if (!visible(button)) return false;
      const label = [
        button.getAttribute("aria-label"),
        button.getAttribute("title")
      ].filter(Boolean).join(" ").toLowerCase();
      return [
      "stop generating",
      "stop streaming",
      "stop response",
      "stop responding",
      "回答を停止",
      "生成を停止",
      "ストリーミングを停止"
      ].some((pattern) => label.includes(pattern));
    });
    if (stopButton) return true;

    return false;
  }

  function isUploading() {
    const root = composerRoot();
    if (!root) return false;

    const visibleProgress = Array.from(root.querySelectorAll('[role="progressbar"], progress')).some(visible);
    if (visibleProgress) return true;

    const busyElement = Array.from(root.querySelectorAll('[aria-busy="true"]')).some(visible);
    if (busyElement) return true;

    const visibleSpinner = Array.from(root.querySelectorAll(".animate-spin, .motion-safe\\:animate-spin, [class*='spinner']")).some(visible);
    if (visibleSpinner) return true;

    return hasVisibleShortText(root, [
      "uploading",
      "upload in progress",
      "アップロード中",
      "アップロードしています",
      "処理中",
      "ファイルを処理中"
    ]);
  }

  function isBusy() {
    return isGenerating() || isUploading();
  }

  function acknowledgeDoneIfViewed() {
    if (state !== "done" || !userIsViewingTab()) return;
    state = "idle";
    document.documentElement.dataset.chatgptWaitingFavicon = "idle";
    restoreFavicon(IDLE_ICON);
  }

  function applyState(nextWaiting) {
    if (nextWaiting) {
      if (state !== "waiting") {
        state = "waiting";
        document.documentElement.dataset.chatgptWaitingFavicon = "waiting";
      }
      setFavicon(WAITING_ICON);
      return;
    }

    if (state === "waiting") {
      playCompleteSound();
      if (userIsViewingTab()) {
        state = "idle";
        document.documentElement.dataset.chatgptWaitingFavicon = "idle";
        restoreFavicon(IDLE_ICON);
      } else {
        state = "done";
        document.documentElement.dataset.chatgptWaitingFavicon = "done";
        setFavicon(DONE_ICON);
      }
      return;
    }

    if (state === "done") {
      acknowledgeDoneIfViewed();
      if (state === "done") setFavicon(DONE_ICON);
      return;
    }

    if (hasStatusFavicon()) restoreFavicon(IDLE_ICON);
  }

  function scheduleCheck() {
    window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => applyState(isBusy()), 120);
  }

  const observer = new MutationObserver(scheduleCheck);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["aria-label", "disabled", "aria-disabled", "data-testid", "class"]
  });

  window.setInterval(scheduleCheck, CHECK_INTERVAL_MS);
  window.addEventListener("focus", acknowledgeDoneIfViewed);
  document.addEventListener("visibilitychange", acknowledgeDoneIfViewed);
  window.addEventListener("pageshow", acknowledgeDoneIfViewed);
  scheduleCheck();
})();
