import browser from 'webextension-polyfill'

browser.runtime.sendMessage("debug:usage").catch((e) => {
  console.error("Message failed:", e)
})
