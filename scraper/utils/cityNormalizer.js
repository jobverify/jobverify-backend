/**
 * @file City normalisation logic — maps raw scraped city strings to canonical names.
 * @module scraper/utils/cityNormalizer
 */

import { CANONICAL_CITIES } from './cities.js';

// Returns the canonical city name for a raw string; falls back to the trimmed original.
export const normalizeCity = (raw) => {
  if (!raw) return null;
  const trimmed = raw.trim();
  const lower = trimmed
    .toLowerCase()
    .replace(/[–—−]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

  if (lower.match(/^(?:\d+\s+locations?|multiple locations|various locations|unknown|none)$/i)) {
    return null;
  }

  // Strip common noisy prefixes/suffixes that break substring matching
  const cleanLower = lower
    .replace(/^dgs india\s*-\s*/, '')
    .replace(/^ind\s*-\s*/, '')
    .replace(/^ind-?/, '')
    .replace(/india,? ?/g, '')
    .replace(/,\s*\d{6}/, '')
    .trim();

  if (CANONICAL_CITIES[cleanLower]) {
    return CANONICAL_CITIES[cleanLower];
  }
  for (const key of Object.keys(CANONICAL_CITIES)) {
    if (cleanLower.includes(key)) {
      return CANONICAL_CITIES[key];
    }
  }
  return trimmed;
};
