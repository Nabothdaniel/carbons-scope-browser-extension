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
  action: {
    default_popup: "popup.html",
    default_icon: "assets/icon.png"
  },
  icons: {
    "128": "assets/icon.png"
  }
}

export default {
  manifest
}
