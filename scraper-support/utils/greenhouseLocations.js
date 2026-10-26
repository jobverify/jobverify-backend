import { isIndiaJob } from './indiaLocationFilter.js'

export const NATIVE_INDIA_LOCATION = /\bindia\b|\bbengaluru\b|\bbangalore\b|\bhyderabad\b|\bpune\b|\bgurugram\b|\bgurgaon\b|\bmumbai\b|\bchennai\b|\bnoida\b|\bdelhi\b|\bahmedabad\b/i
const WORK_MODE = /^(?:hybrid|in[- ]office|on[- ]site)(?:\s*[;,]\s*(?:hybrid|in[- ]office|on[- ]site))*$/i
const LOCATION_FIELD = /^(?:(?:job(?: posting)?|office)\s+)?(?:locations?|countries|country|offices?)(?:\s*\(for website only\))?$/i
const COUNTRY_FIELD = /^(?:(?:job(?: posting)?|office)\s+)?(?:countries|country)(?:\s*\(for website only\))?$/i
const fail = () => { throw new Error('Invalid Greenhouse inventory: malformed native locations') }

export const greenhouseCountryLabels = record => (Array.isArray(record?.metadata) ? record.metadata : [])
  .filter(entry => COUNTRY_FIELD.test(entry?.name || ''))
  .flatMap(entry => Array.isArray(entry.value) ? entry.value : entry.value == null ? [] : [entry.value])
  .map(value => typeof value === 'string' ? (/^(?:IN|IND)$/i.test(value.trim()) ? 'India' : value.trim()) : value)

export const hasUnhandledGreenhouseGeography = record => (Array.isArray(record?.metadata) ? record.metadata : [])
  .some(entry => /location|country|countries|office|region|geograph/i.test(entry?.name || '')
    && !LOCATION_FIELD.test(entry.name)
    && (Array.isArray(entry.value) ? entry.value : [entry.value])
      .some(value => value != null && String(value).trim() !== ''))

export const hasNativeIndiaLocation = label => typeof label === 'string'
  && NATIVE_INDIA_LOCATION.test(label) && isIndiaJob({ location: label,
    ...(/\bindia\b/i.test(label) ? { country: 'India' } : {}),
  })

export const greenhouseLocationLabels = (record = {}) => {
  const labels = []
  if (record.metadata != null && !Array.isArray(record.metadata)) fail()
  for (const entry of record.metadata || []) {
    if (!LOCATION_FIELD.test(entry?.name || '')) continue
    const values = Array.isArray(entry.value) ? entry.value : entry.value == null ? [] : [entry.value]
    for (const value of values) {
      if (typeof value !== 'string') fail()
      if (value.trim()) labels.push(COUNTRY_FIELD.test(entry.name) && /^(?:IN|IND)$/i.test(value.trim()) ? 'India' : value.trim())
    }
  }
  if (record.offices != null && !Array.isArray(record.offices)) fail()
  for (const office of record.offices || []) {
    if (!office || typeof office !== 'object' || Array.isArray(office)) fail()
    const label = office.location || office.name
    if (label != null && typeof label !== 'string') fail()
    if (label?.trim()) labels.push(label.trim())
  }
  const primary = record.location?.name
  if (primary != null && typeof primary !== 'string') fail()
  // A workplace arrangement is not another geographic location. Keep it as
  // unknown only when the feed supplies no real native location at all.
  if (primary?.trim() && (!WORK_MODE.test(primary.trim()) || !labels.length)) labels.push(primary.trim())
  return [...new Set(labels)]
}

export const selectGreenhouseLocation = record => {
  const labels = greenhouseLocationLabels(record)
  if (hasNativeIndiaLocation(record?.location?.name)) return record.location.name.trim()
  return labels.find(hasNativeIndiaLocation) || labels[0] || null
}
