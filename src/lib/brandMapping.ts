import brandDomains from './brand-domains.json'

export const BRAND_LOGO_DOMAINS: Record<string, string> = brandDomains

export const normalizeBrand = (name: string): string | null => {
  const n = name.toLowerCase().trim()

  // ── Carburants ────────────────────────────────────────────────────────────

  // TotalEnergies (inclut Total, Elf, Fina qui sont des marques du groupe)
  if (
    n.includes('totalenergies') ||
    n.includes('totalénergies') ||
    n.includes('total energie') ||
    n.includes('total energies') ||
    n.includes('total excellium') ||
    n.includes('total access') ||
    n.includes('total acces') ||
    n.includes('total contact') ||
    n.includes('total petrol') ||
    n.includes('access - total') ||
    n === 'total' ||
    n === 'elf' ||
    n === 'fina' ||
    n.startsWith('fina -')
  )
    return 'TotalEnergies'

  // Esso
  if (n.includes('esso')) return 'Esso'

  // Shell
  if (n === 'shell') return 'Shell'

  // BP
  if (n === 'bp') return 'BP'

  // AVIA
  if (n.includes('aviaxpress') || n.includes('avia xpress') || n === 'avia')
    return 'AVIA'

  // Gulf
  if (n === 'gulf') return 'Gulf'

  // ENI — Agip est l'ancienne marque ENI
  if (n === 'eni' || n === 'agip') return 'ENI'

  // Dyneff
  if (n.includes('dyneff')) return 'Dyneff'

  // Elan
  if (n.includes('elan') || n.includes('élan')) return 'Elan'
  
  // AS24
  if (n === 'as24' || n === 'as 24') return 'AS24'

  // Colruyt / DATS 24
  if (n.includes('colruyt') || n.includes('dats 24') || n.includes('dats24'))
    return 'Colruyt'

  // Q8
  if (n.includes('q8')) return 'Q8'

  // Rompetrol
  if (n.includes('rompetrol')) return 'Rompetrol'

  // Migrol
  if (n.includes('migrol')) return 'Migrol'

  // Igol
  if (n.includes('igol')) return 'Igol'

  // OIL!
  if (n === 'oil!') return 'OIL!'

  // PowerFuel
  if (n.includes('powerfuel')) return 'PowerFuel'

  // Fuel For Planet
  if (n.includes('fuel for planet')) return 'Fuel For Planet'

  // ── Grande distribution ───────────────────────────────────────────────────

  // E.Leclerc
  if (n.includes('leclerc')) return 'E.Leclerc'

  // Intermarché — "mousquetaires" couvre tout le groupe
  if (
    n.includes('intermarché') ||
    n.includes('intermarchés') ||
    n.includes('intermache') ||
    n.includes('inter marché') ||
    n.includes('mousquetaires') ||
    n.includes('mousquetaire')
  )
    return 'Intermarché'

  // Système U — Utile, Vival, Ecomarchés, 8àHuit non (Carrefour)
  if (
    n.includes('système u') ||
    n.includes('systeme u') ||
    n.includes('magasins u') ||
    n.includes('hyper u') ||
    n.includes('super u') ||
    n.includes('u express') ||
    n.includes('u carburant') ||
    n.includes('station u') ||
    n.includes('écomarché') ||
    n.includes('ecomarché') ||
    n.includes('utile') ||
    n === 'u'
  )
    return 'Système U'

  // Carrefour — inclut les enseignes du groupe (8àHuit, Shopi, Gamm Vert)
  if (
    n.includes('carrefour') ||
    n.includes('8 à huit') ||
    n.includes('huit à 8') ||
    n === 'shopi' ||
    n.includes('gamm vert') ||
    n.includes('champion')
  )
    return 'Carrefour'

  // Auchan — Simply Market fait partie du groupe
  if (n.includes('auchan') || n.includes('simply')) return 'Auchan'

  // Casino — Géant Casino, Leader Price fait partie du groupe Casino
  if (n.includes('casino') || n.includes('géant casino') || n.includes('vival')) return 'Casino'

  // Leader Price (Casino group)
  if (n.includes('leader price')) return 'Leader Price'

  // Lidl
  if (n.includes('lidl')) return 'Lidl'

  // Aldi
  if (n.includes('aldi')) return 'Aldi'

  // Netto
  if (n.includes('netto')) return 'Netto'

  // Match
  if (n.includes('match')) return 'Match'

  // Monoprix
  if (n.includes('monoprix')) return 'Monoprix'

  // Proxi
  if (n.includes('proxi')) return 'Proxi'

  // Spar
  if (n.includes('spar')) return 'Spar'

  // CocciMarket / Coccinelle
  if (n.includes('coccimarket') || n.includes('coccinelle')) return 'CocciMarket'

  // G20 (épiceries parisiennes indépendantes fédérées)
  if (n === 'g20' || n === 'g 20') return 'G20'

  // Cora
  if (n.includes('cora')) return 'Cora'

  // Costco
  if (n.includes('costco')) return 'Costco'

  // Bi1 (ex Atac/Champion Bourgogne)
  if (n.includes('bi1')) return 'Bi1'

  // ── Auto ──────────────────────────────────────────────────────────────────

  // Roady (réseau auto Intermarché — logo propre)
  if (n.includes('roady')) return 'Roady'

  // Peugeot
  if (n.includes('peugeot')) return 'Peugeot'

  // Citroën
  if (n.includes('citroën') || n.includes('citroen')) return 'Citroën'

  // Renault
  if (n.includes('renault')) return 'Renault'

  return null
}
