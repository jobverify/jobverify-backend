import { CANONICAL_CITIES } from '../utils/cities.js'

const clean = value => typeof value === 'string' ? value.normalize('NFKC').replace(/\s+/g, ' ').trim() : ''
const display = new Intl.DisplayNames(['en'], { type: 'region' })
const codes = new Set(), names = new Map()
for (let a = 65; a <= 90; a++) for (let b = 65; b <= 90; b++) {
  const code = String.fromCharCode(a, b), name = display.of(code)
  if (name && name !== code && !['ZZ', 'EU', 'UN', 'XA', 'XB', 'QO'].includes(code)) {
    codes.add(code)
    names.set(name.toLowerCase(), code)
  }
}
names.set('united states of america', 'US')
names.set('usa', 'US')
names.set('uk', 'GB')

const fail = message => {
  throw Object.assign(new Error('API portal native location scope: ' + message), {
    incompleteScope: true, abortRetries: true,
  })
}
const explicitCountry = location => {
  const parts = location.split(',').map(clean), last = parts.at(-1)
  // A two-component raw label ending IN may mean a US state. The reviewed
  // standardized field supplies an ISO suffix; raw labels require a name or
  // an unambiguous three-component country-code position.
  return names.get(last.toLowerCase()) || (parts.length >= 3 && codes.has(last) ? last : null)
}
const standardizedCountry = location => {
  const parts = location.split(',').map(clean), last = parts.at(-1)
  if (![1, 3].includes(parts.length) || parts.some(part => !part) || !codes.has(last)) fail('unrecognized standardized country format')
  return last
}
const sameCity = (raw, standardized) => {
  const rawParts = raw.split(',').map(clean), standardizedParts = standardized.split(',').map(clean)
  if (rawParts.length > 2 || rawParts.length === 2
    && rawParts[1].toLowerCase() !== standardizedParts[1]?.toLowerCase()) return false
  const city = value => {
    const name = clean(value).toLowerCase()
    return clean(CANONICAL_CITIES[name] || name).toLowerCase()
  }
  const left = city(rawParts[0]), right = city(standardizedParts[0])
  return Boolean(left && right && left === right)
}

// Both arrays belong to this exact native role. A bare city is qualified only
// by its matching role-owned standardized city/country; other roles, employer
// headquarters and the requested search country cannot supply that evidence.
export const readEightfoldLocationScope = record => {
  if (!Array.isArray(record?.locations) || !record.locations.length
    || record.locations.some(value => !clean(value))) fail('native locations missing or malformed')
  const raw = record.locations.map(clean)
  const standardized = record.standardizedLocations
  if (standardized != null && (!Array.isArray(standardized) || standardized.length !== raw.length
    || standardized.some(value => !clean(value)))) fail('native location arrays disagree')
  const countries = raw.map((location, index) => {
    const explicit = explicitCountry(location)
    if (standardized == null) return explicit
    const normalized = clean(standardized[index]), code = standardizedCountry(normalized)
    if (explicit && explicit !== code) fail('contradictory explicit native country')
    if (!explicit && (normalized.split(',').length !== 3 || !sameCity(location, normalized))) fail('native city and standardized country are unaligned')
    return explicit || code
  })
  const indiaLocations = [...new Set(raw.filter((location, index) => countries[index] === 'IN'))]
  return { location: indiaLocations[0] || raw[0],
    country: indiaLocations.length ? 'India' : countries[0], indiaLocations,
    nativeLocations: [...record.locations],
    standardizedLocations: standardized == null ? null : [...standardized],
    unresolved: countries.some(country => country === null) }
}

export const nativeEightfoldLocationPairs = record => {
  readEightfoldLocationScope(record)
  return record.locations.map((location, index) => [clean(location), clean(record.standardizedLocations?.[index])])
    .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)))
}
