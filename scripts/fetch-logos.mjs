import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const LOGOS_DIR = join(__dirname, '..', 'public', 'logos')
const BRAND_DOMAINS_PATH = join(__dirname, '..', 'src', 'lib', 'brand-domains.json')

const WIKIDATA_API = 'https://www.wikidata.org/w/api.php'
const COMMONS_API = 'https://commons.wikimedia.org/w/api.php'
const WIKIMEDIA_FILE_URL = 'https://commons.wikimedia.org/wiki/Special:FilePath'
const GOOGLE_FAVICON_URL = 'https://www.google.com/s2/favicons'
const USER_AGENT = 'FaisTonPlein/1.0 (logo-fetcher)'
const MIN_FAVICON_SIZE = 500

// Passer --overwrite pour forcer le re-téléchargement de tous les logos (ex: corriger Auchan)
const OVERWRITE = process.argv.includes('--overwrite')

// Q IDs Wikidata hardcodés pour les marques avec problèmes de désambiguïsation.
// À compléter si une marque reste introuvable après un premier run.
const WIKIDATA_ID_OVERRIDES = {
  // 'Intermarché': 'Q860826',  // Groupement des Mousquetaires
  // 'Cora': 'Q3006634',
}

// Domaines alternatifs pour le fallback Google favicon
const DOMAIN_OVERRIDES = {
  'Gulf': 'gulf-europe.com',
  'OIL!': 'oil-energie.fr',
}

// ─── Utils ────────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const slugify = (name) =>
  name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '')

const fetchUA = (url) =>
  fetch(url, { headers: { 'User-Agent': USER_AGENT }, redirect: 'follow' })

// Score de "squareness" : 1.0 = carré parfait, ~0.3 = logo texte très large
const squarenessScore = (width, height) => {
  if (!width || !height) return 0
  return 1 / Math.max(width / height, height / width)
}

// ─── Wikidata ─────────────────────────────────────────────────────────────────

const searchWikidata = async (term, language = 'en') => {
  const params = new URLSearchParams({
    action: 'wbsearchentities',
    search: term,
    language,
    type: 'item',
    limit: '5',
    format: 'json',
  })
  const res = await fetchUA(`${WIKIDATA_API}?${params}`)
  if (!res.ok) throw new Error(`Wikidata search HTTP ${res.status}`)
  const data = await res.json()
  return data.search ?? []
}

const fetchClaims = async (entityId) => {
  const params = new URLSearchParams({
    action: 'wbgetentities',
    ids: entityId,
    props: 'claims',
    format: 'json',
  })
  const res = await fetchUA(`${WIKIDATA_API}?${params}`)
  if (!res.ok) throw new Error(`Wikidata claims HTTP ${res.status}`)
  const data = await res.json()
  return data.entities?.[entityId]?.claims ?? {}
}

// Collecte TOUS les noms de fichiers P154 depuis tous les entités candidates
const collectP154Candidates = async (brandName) => {
  const overrideId = WIKIDATA_ID_OVERRIDES[brandName]
  const candidates = []
  const checkedIds = new Set()

  const processEntities = async (entities) => {
    for (const entity of entities) {
      if (checkedIds.has(entity.id)) continue
      checkedIds.add(entity.id)
      await sleep(100)
      try {
        const claims = await fetchClaims(entity.id)
        for (const claim of claims.P154 ?? []) {
          const filename = claim.mainsnak?.datavalue?.value
          if (filename) candidates.push(filename)
        }
      } catch { /* essayer l'entité suivante */ }
    }
  }

  if (overrideId) {
    await processEntities([{ id: overrideId }])
  } else {
    // Recherche en anglais puis en français si aucun candidat trouvé
    await processEntities(await searchWikidata(brandName, 'en'))
    if (!candidates.length) {
      await processEntities(await searchWikidata(brandName, 'fr'))
    }
  }

  return candidates
}

// ─── Wikimedia Commons ────────────────────────────────────────────────────────

const getImageDimensions = async (filename) => {
  try {
    const params = new URLSearchParams({
      action: 'query',
      titles: `File:${filename}`,
      prop: 'imageinfo',
      iiprop: 'size',
      format: 'json',
    })
    const res = await fetchUA(`${COMMONS_API}?${params}`)
    if (!res.ok) return null
    const data = await res.json()
    const info = Object.values(data.query.pages)[0]?.imageinfo?.[0]
    return info ? { width: info.width, height: info.height } : null
  } catch {
    return null
  }
}

const downloadFromWikimedia = async (filename) => {
  const url = `${WIKIMEDIA_FILE_URL}/${encodeURIComponent(filename)}?width=256`
  const res = await fetchUA(url)
  if (!res.ok) throw new Error(`Wikimedia download HTTP ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

// Sélectionne le logo le plus carré parmi tous les candidats P154
const fetchLogoFromWikidata = async (brandName) => {
  const candidates = await collectP154Candidates(brandName)
  if (!candidates.length) return null

  // Score chaque candidat par squareness sans télécharger
  const scored = []
  for (const filename of candidates) {
    await sleep(50)
    const dims = await getImageDimensions(filename)
    const score = dims ? squarenessScore(dims.width, dims.height) : 0.5
    scored.push({ filename, score, dims })
  }

  // Trier du plus carré au moins carré
  scored.sort((a, b) => b.score - a.score)

  if (scored.length > 1) {
    const info = scored.map(s => `${s.filename} (${s.score.toFixed(2)})`).join(', ')
    process.stdout.write(`[${info}] `)
  }

  for (const { filename } of scored) {
    try {
      const buffer = await downloadFromWikimedia(filename)
      if (buffer?.length > 0) return buffer
    } catch { /* essayer le suivant */ }
  }

  return null
}

// ─── Google S2 favicon ────────────────────────────────────────────────────────

const fetchLogoFromGoogle = async (brandName, domain) => {
  const effectiveDomain = DOMAIN_OVERRIDES[brandName] ?? domain
  const params = new URLSearchParams({ domain: effectiveDomain, sz: '128' })
  const res = await fetch(`${GOOGLE_FAVICON_URL}?${params}`, { redirect: 'follow' })
  if (!res.ok) throw new Error(`Google favicon HTTP ${res.status}`)
  const buffer = Buffer.from(await res.arrayBuffer())
  if (buffer.length < MIN_FAVICON_SIZE)
    throw new Error(`Favicon trop petite (${buffer.length} bytes)`)
  return buffer
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const processOneBrand = async (brandName, domain) => {
  const slug = slugify(brandName)
  const outputPath = join(LOGOS_DIR, `${slug}.png`)

  if (!OVERWRITE && existsSync(outputPath)) {
    console.log(`⏭️  ${brandName} → déjà présent, skip`)
    return 'skip'
  }

  process.stdout.write(`🔍 ${brandName}... `)

  try {
    const buffer = await fetchLogoFromWikidata(brandName)
    if (buffer) {
      writeFileSync(outputPath, buffer)
      console.log(`✅ Wikidata`)
      return 'wikidata'
    }
  } catch (err) {
    process.stdout.write(`(Wikidata: ${err.message}) `)
  }

  try {
    const buffer = await fetchLogoFromGoogle(brandName, domain)
    writeFileSync(outputPath, buffer)
    console.log(`⚠️  Google favicon`)
    return 'google'
  } catch (err) {
    process.stdout.write(`(Google: ${err.message}) `)
  }

  console.log(`❌ introuvable`)
  return 'not_found'
}

const main = async () => {
  mkdirSync(LOGOS_DIR, { recursive: true })

  const brandDomains = JSON.parse(readFileSync(BRAND_DOMAINS_PATH, 'utf-8'))
  const brands = Object.entries(brandDomains)

  if (OVERWRITE) console.log('⚠️  Mode --overwrite : tous les logos seront re-téléchargés\n')
  console.log(`🚀 Traitement de ${brands.length} marques...\n`)

  const stats = { wikidata: 0, google: 0, not_found: [], skip: 0 }

  for (const [brandName, domain] of brands) {
    const result = await processOneBrand(brandName, domain)
    if (result === 'wikidata') stats.wikidata++
    else if (result === 'google') stats.google++
    else if (result === 'not_found') stats.not_found.push(brandName)
    else if (result === 'skip') stats.skip++
    await sleep(300)
  }

  console.log('\n📊 Résumé :')
  console.log(`✅ Wikidata  : ${stats.wikidata} marques`)
  console.log(`⚠️  Google   : ${stats.google} marques`)
  if (stats.skip > 0) console.log(`⏭️  Skip     : ${stats.skip} marques (déjà présentes)`)
  if (stats.not_found.length > 0)
    console.log(`❌ Introuvables : ${stats.not_found.length} → [${stats.not_found.join(', ')}]`)
  else
    console.log(`❌ Introuvables : 0`)
}

main()
