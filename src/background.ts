import browser from "webextension-polyfill";

let currentTabId: number | null = null;
let startTime = Date.now();
let isIdle = false;

let lastActivityTime = Date.now();
const idleThreshold = 60 * 1000; // 1 min

function updateActivityTime() {
  lastActivityTime = Date.now();
  if (isIdle) {
    isIdle = false;
    console.log("[Idle] User is active again");
  }
}

function onActivity() {
  if (isIdle) {
    isIdle = false;
    console.log("[Idle] User is now active");
  }
  lastActivityTime = Date.now();
}

function checkIdleFallback() {
  const now = Date.now();
  if (!isIdle && now - lastActivityTime > idleThreshold) {
    isIdle = true;
    console.log("[Idle] User is now idle (manual fallback)");
  }
}

// Fallback: Start manual idle checking for Firefox
setInterval(checkIdleFallback, 5000);

// Handle content script messages for manual idle detection
browser.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "user-activity") {
    updateActivityTime();
  }
});

interface ChangeInfo {
  url?: string;
  [key: string]: any;
}

interface Tab {
  id?: number;
  url?: string;
  [key: string]: any;
}

interface TabActiveInfo {
  tabId: number;
  windowId: number;
}

interface DebugUsageMessage {
  type: "debug:usage";
}

function getDomain(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function normalizeDomain(domain: string) {
  return domain.replace(/^www\./, "");
}

async function trackTimeSpent(tabId: number | null, start: number) {
  if (tabId === null || isIdle) return;

  try {
    const tabs = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    const tab = tabs[0];

    // Tab may not exist or URL may be undefined or browser-specific
    if (
      !tab ||
      !tab.url ||
      tab.url.startsWith("about:") ||
      tab.url.startsWith("chrome:") ||
      tab.url.startsWith("moz-extension:")
    ) {
      console.warn("Tab not found or no valid URL:", tab);
      return;
    }

    const rawDomain = getDomain(tab.url);
    if (!rawDomain) return;

    const domain = normalizeDomain(rawDomain);
    const { allowedDomains = [] } = await browser.storage.local.get(
      "allowedDomains"
    );
    if (!allowedDomains.includes(domain)) return;

    const res = await browser.storage.local.get(domain);
    const total = res[domain] || 0;

    await browser.storage.local.set({ [domain]: total + (Date.now() - start) });
  } catch (err) {
    console.error("Error tracking time:", err);
  }
}

// ✅ Chrome idle support
if (browser.idle?.setDetectionInterval) {
  browser.idle.setDetectionInterval(60);
  browser.idle.onStateChanged.addListener((state) => {
    isIdle = state !== "active";
    console.log("[Idle API] State changed:", state);
  });
}

// 🟡 Tab switched
browser.tabs.onActivated.addListener(async (activeInfo: TabActiveInfo) => {
  if (isIdle) {
    isIdle = false;
    console.log("[Idle] User is now active from tab switch");
  }

  await trackTimeSpent(currentTabId, startTime);
  currentTabId = activeInfo.tabId;
  startTime = Date.now();
});

// 🟡 URL updated
browser.tabs.onUpdated.addListener((tabId: number, changeInfo: ChangeInfo) => {
  if (tabId === currentTabId && changeInfo.url) {
    if (isIdle) {
      isIdle = false;
      console.log("[Idle] User is now active from URL update");
    }
    startTime = Date.now();
  }
});

// 🟡 Debug message
browser.runtime.onMessage.addListener(
  async (msg: DebugUsageMessage | string) => {
    if (msg === "debug:usage") {
      const data: Record<string, unknown> = await browser.storage.local.get(
        null
      );
      console.log("Storage dump:", data);
    }
  }
);

// 🟡 On startup
browser.runtime.onStartup.addListener(() => {
  currentTabId = null;
  startTime = Date.now();
});

// ✅ Sync data every 5 minutes
setInterval(async () => {
  const { allowedDomains = [] } = await browser.storage.local.get(
    "allowedDomains"
  );
  const allData = await browser.storage.local.get(null);

  const usageData: Record<string, number> = {};
  for (const domain of allowedDomains) {
    if (allData[domain]) {
      usageData[domain] = allData[domain];
    }
  }

  /**
   * 
   * if (Object.keys(usageData).length > 0) {
    try {
      await fetch("https://your-api.com/api/usage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.ACCESS_TOKEN || "your-access-token-here"}`,
        },
        body: JSON.stringify({ usage: usageData }),
      })

      for (const domain of Object.keys(usageData)) {
        await browser.storage.local.set({ [domain]: 0 })
      }
    } catch (err) {
      console.error("Failed to sync usage:", err)
    }
  }
   */
}, 5 * 60 * 1000);

console.log("Plasmo background service worker running");

chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed.");
});
