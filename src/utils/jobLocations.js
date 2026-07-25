const NON_SPECIFIC_LOCATION_REGEX =
  /^(?:\d+\s+locations?|multiple locations|various locations|unknown|none)$/i

const LOCATION_SEPARATOR_REGEX = /\s*(?:\/|\||;)\s*/

const normalizeLocationValue = (value) => String(value || '').replace(/\s+/g, ' ').trim()

const unique = (values) => {
  const seen = new Set()
  const result = []

  for (const value of values) {
    const key = value.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(value)
  }

  return result
}

export const isGroupedLocationLabel = (value) => {
  const normalized = normalizeLocationValue(value)
  return normalized ? NON_SPECIFIC_LOCATION_REGEX.test(normalized) : false
}

const splitLocationValue = (value) => {
  const normalized = normalizeLocationValue(value)
  if (!normalized || isGroupedLocationLabel(normalized)) return []
  return normalized.includes('/')
    || normalized.includes('|')
    || normalized.includes(';')
    ? normalized.split(LOCATION_SEPARATOR_REGEX).map(normalizeLocationValue).filter(Boolean)
    : [normalized]
}

export const normalizeStoredLocations = (job = {}) => {
  const explicitLocations = Array.isArray(job.locations)
    ? unique(
      job.locations
        .map(normalizeLocationValue)
        .filter((value) => value && !isGroupedLocationLabel(value)),
    )
    : []

  if (explicitLocations.length > 0) {
    return explicitLocations
  }

  for (const candidate of [job.location, job.city]) {
    const parts = splitLocationValue(candidate)
    if (parts.length > 0) {
      return unique(parts)
    }
  }

  return []
}

export const getPrimaryStoredLocation = (job = {}) => {
  const [primaryLocation] = normalizeStoredLocations(job)
  if (primaryLocation) return primaryLocation

  const normalizedCity = normalizeLocationValue(job.city)
  if (normalizedCity && !isGroupedLocationLabel(normalizedCity)) {
    return normalizedCity
  }

  const normalizedLocation = normalizeLocationValue(job.location)
  if (normalizedLocation && !isGroupedLocationLabel(normalizedLocation)) {
    return normalizedLocation
  }

  return null
}

export const formatStoredLocationLabel = (job = {}) => {
  const locations = normalizeStoredLocations(job)
  if (locations.length > 0) {
    return locations.join(', ')
  }

  return getPrimaryStoredLocation(job)
}

export const mergeLocationOptions = (...lists) =>
  unique(
    lists
      .flat()
      .map(normalizeLocationValue)
      .filter((value) => value && !isGroupedLocationLabel(value)),
  ).sort((left, right) => left.localeCompare(right))
