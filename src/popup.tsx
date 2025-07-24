import { useEffect, useState } from "react"

function formatMs(ms: number) {
  const mins = Math.floor(ms / 60000)
  const secs = Math.floor((ms % 60000) / 1000)
  return `${mins}m ${secs}s`
}

export default function Popup() {
  const [usage, setUsage] = useState<{ [domain: string]: number }>({})


  useEffect(() => {
    console.log('working as expected')
    const win = window as Window & { chrome?: any }

    if (typeof window !== "undefined" && win.chrome && win.chrome.storage) {
      win.chrome.storage.local.get(["trackedDomains"], (res: any) => {
        const tracked = res.trackedDomains || []

        win.chrome.storage.local.get(null, (allData: any) => {
          const filteredUsage = Object.fromEntries(
            Object.entries(allData).filter(
              ([key, val]) =>
                tracked.includes(key) && typeof val === "number"
            )
          )
          setUsage(filteredUsage as { [domain: string]: number })
        })
      })
    }
  }, [])

  const totalTime = Object.values(usage).reduce((sum, ms) => sum + ms, 0)

  return (
    <div className="p-4 w-[300px]">
      <h1 className="text-lg font-bold mb-2">Time Spent</h1>
      <h2 className="text-sm text-gray-600 mb-2">
        Total: <span className="font-semibold">{formatMs(totalTime)}</span>
      </h2>

      {Object.keys(usage).length === 0 ? (
        <p className="text-gray-500 text-sm">No tracking data yet.</p>
      ) : (
        <ul className="text-sm space-y-1">
          {Object.entries(usage)
            .sort((a, b) => b[1] - a[1])
            .map(([domain, ms]) => (
              <li key={domain} className="flex justify-between">
                <span>{domain}</span>
                <span>{formatMs(ms)}</span>
              </li>
            ))}
        </ul>
      )}
    </div>
  )
}
