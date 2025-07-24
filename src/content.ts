// In content.ts

import browser from 'webextension-polyfill';


document.addEventListener("mousemove", () => {
  browser.runtime.sendMessage({ type: "user-activity" })
})

document.addEventListener("keydown", () => {
  browser.runtime.sendMessage({ type: "user-activity" })
})
