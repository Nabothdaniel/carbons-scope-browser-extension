/// <reference types="chrome"/>

export const getAllStorage = (): Promise<Record<string, number>> =>
  new Promise((resolve) => {
    chrome.storage.local.get(null, (items) => resolve(items as Record<string, number>))
  })
export const getTrackedDomains = (): Promise<string[]> =>
  new Promise((resolve) => {
    chrome.storage.local.get(["trackedDomains"], (res) => {
      resolve(res.trackedDomains || [])
    })
  })  