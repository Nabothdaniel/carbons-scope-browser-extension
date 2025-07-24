// plasmo.config.ts

const manifest = {
  manifest_version: 3,
  name: "Time Tracker",
  version: "1.0.0",
  description: "Track time spent on websites.",
  permissions: ["tabs", "storage"],
  background: {
    service_worker: "background.ts"
  },
  contentScripts: [
    {
      matches: ["<all_urls>"],
      js: ["src/debug.ts","src/content.ts","browser-polyfill.min.js"],
      run_at: "document_start"
    }
  ],
  action: {
    default_icon: "assets/icon.png"
  },
  icons: {
    "128": "assets/icon.png"
  }
}

export default {
  manifest
}
