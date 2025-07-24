import browser from "webextension-polyfill"

let currentTabId: number | null = null
let startTime = Date.now()
let isIdle = false // ✅ NEW: Idle state

interface ChangeInfo {
  url?: string
  [key: string]: any
}

interface Tab {
  id?: number
  url?: string
  [key: string]: any
}

interface TabActiveInfo {
  tabId: number
  windowId: number
}

interface DebugUsageMessage {
  type: "debug:usage"
}

// 🔧 Helper to extract domain
function getDomain(url: string): string | null {
  try {
    return new URL(url).hostname
  } catch {
    return null
  }
}

function normalizeDomain(domain: string) {
  return domain.replace(/^www\./, "")
}

// ✅ NEW: Track time spent (if not idle)
async function trackTimeSpent(tabId: number | null, start: number) {
  if (tabId === null || isIdle) return // ✅ Ignore if idle

  try {
    const tab = await browser.tabs.get(tabId)
    if (!tab.url) return

    const rawDomain = getDomain(tab.url)
    if (!rawDomain) return
    const domain = normalizeDomain(rawDomain)

    const { allowedDomains = [] } = await browser.storage.local.get("allowedDomains")
    if (!allowedDomains.includes(domain)) return

    const res = await browser.storage.local.get(domain)
    const total = res[domain] || 0

    await browser.storage.local.set({ [domain]: total + (Date.now() - start) })
  } catch (err) {
    console.error("Error tracking time:", err)
  }
}

// ✅ NEW: Idle detection
browser.idle.setDetectionInterval(60)
browser.idle.onStateChanged.addListener((state) => {
  isIdle = state !== "active"
})

// 🟡 When tab is activated
browser.tabs.onActivated.addListener(async (activeInfo: TabActiveInfo) => {
  await trackTimeSpent(currentTabId, startTime)

  currentTabId = activeInfo.tabId
  startTime = Date.now()
})

// 🟡 When URL changes within same tab
browser.tabs.onUpdated.addListener((tabId: number, changeInfo: ChangeInfo) => {
  if (tabId === currentTabId && changeInfo.url) {
    startTime = Date.now()
  }
})

// 🟡 Dev debug message handler
browser.runtime.onMessage.addListener(async (msg: DebugUsageMessage | string) => {
  if (msg === "debug:usage") {
    const data: Record<string, unknown> = await browser.storage.local.get(null)
    console.log("Storage dump:", data)
  }
})

// 🟡 Reset tracking on startup
browser.runtime.onStartup.addListener(() => {
  currentTabId = null
  startTime = Date.now()
})

// ✅ NEW: Auto sync to server every 5 mins
setInterval(async () => {
  const { allowedDomains = [] } = await browser.storage.local.get("allowedDomains")
  const allData = await browser.storage.local.get(null)

  console.log("Syncing usage data:", allData)

  const usageData: Record<string, number> = {}

  for (const domain of allowedDomains) {
    if (allData[domain]) {
      usageData[domain] = allData[domain]
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
          // Replace this with real token logic
          Authorization: `Bearer ${process.env.ACCESS_TOKEN || "your-access-token-here"}`, 
        },
        body: JSON.stringify({ usage: usageData }),
      })

      // ✅ Reset stored time for synced domains
      for (const domain of Object.keys(usageData)) {
        await browser.storage.local.set({ [domain]: 0 })
      }
    } catch (err) {
      console.error("Failed to sync usage:", err)
    }
  }
   */
}, 5 * 60 * 1000) // Every 5 minutes

console.log("Plasmo background service worker running")

chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed.")
})
