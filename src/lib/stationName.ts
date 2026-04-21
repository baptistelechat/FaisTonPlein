let cache: Record<string, string> | null = null
let pending: Promise<Record<string, string>> | null = null

export async function getStationNamesDb(): Promise<Record<string, string>> {
  if (cache) return cache
  if (!pending) {
    pending = fetch('/data/station-names.json')
      .then((r) => r.json() as Promise<Record<string, string>>)
      .then((data) => {
        cache = data
        return data
      })
      .catch(() => {
        pending = null
        return {}
      })
  }
  return pending
}
