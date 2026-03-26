import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter'
const OUTPUT_PATH = join(__dirname, '..', 'public', 'data', 'station-names.json')

const QUERY = `[out:json][timeout:300][bbox:41.0,-5.5,51.5,10.0];
nwr["ref:FR:prix-carburants"];
out tags;`

console.log('🔍 Fetching station names from Overpass...')

const res = await fetch(OVERPASS_ENDPOINT, {
  method: 'POST',
  body: `data=${encodeURIComponent(QUERY)}`,
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
})

if (!res.ok) {
  console.error(`❌ HTTP ${res.status}`)
  process.exit(1)
}

const data = await res.json()

const names = {}
for (const el of data.elements) {
  const ref = el.tags?.['ref:FR:prix-carburants']
  const name = el.tags?.brand ?? el.tags?.name ?? el.tags?.operator
  if (ref && name) names[ref] = name
}

mkdirSync(join(__dirname, '..', 'public', 'data'), { recursive: true })
writeFileSync(OUTPUT_PATH, JSON.stringify(names))

console.log(`✅ ${Object.keys(names).length} stations sauvegardées dans ${OUTPUT_PATH}`)
