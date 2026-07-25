/**
 * @file Shared allowlist for the public job location scope exposed to the UI.
 * @module utils/publicJobLocationScope
 */

import { normalizeCity } from "../../scraper/utils/cityNormalizer.js";
import { CANONICAL_CITIES } from "../../scraper/utils/cities.js";

export const PUBLIC_JOB_ALLOWED_CITIES = Object.freeze([
  ...new Set(
    Object.values(CANONICAL_CITIES)
      .filter((city) => city && city !== "None")
      .sort((left, right) => left.localeCompare(right)),
  ),
  "Hazira",
]);

export const PUBLIC_JOB_ALLOWED_LOCATION_LABELS = Object.freeze([
  "IND-Trivandrum-Equifax Analytics-PEC",
  "India",
  "India Offsite",
  "India Offsite (ZIN99)",
]);

const INDIA_OFFSITE_REGEX = /^India Offsite(?:\s*\(.*\))?$/i;
const GROUPED_LOCATION_LABEL_REGEX =
  /^(?:\d+\s+locations?|multiple locations|various locations|unknown|none)(?:\s*,\s*(?:india|in|ind))?$/i;
const LOCATION_MARKUP_OR_CODE_REGEXES = Object.freeze([
  /<\/?\s*[a-z][\w:-]*(?:\s+[^<>]*)?>?/i,
  /\$\s*\(/,
  /\.\s*(?:val|text|html)\s*\(/i,
  /\b(?:document|window|querySelector|getElementById)\s*[.(]/i,
]);
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const buildExactRegex = (value) => new RegExp(`^${escapeRegex(value)}$`, "i");
const ALLOWED_CITY_SET = new Set(
  PUBLIC_JOB_ALLOWED_CITIES.map((city) => city.toLowerCase()),
);
const INDIA_COUNTRY_REGEXES = Object.freeze([
  buildExactRegex("India"),
  buildExactRegex("IN"),
  buildExactRegex("IND"),
]);
const SPECIAL_LOCATION_REGEXES = Object.freeze([
  buildExactRegex("IND-Trivandrum-Equifax Analytics-PEC"),
  buildExactRegex("India"),
  INDIA_OFFSITE_REGEX,
]);
const CANONICAL_CITY_REGEXES = Object.freeze([
  ...PUBLIC_JOB_ALLOWED_CITIES.map((city) => buildExactRegex(city)),
  ...SPECIAL_LOCATION_REGEXES,
]);
const INDIA_LOCATION_MARKER_REGEXES = Object.freeze([
  ...SPECIAL_LOCATION_REGEXES,
  /(?:^|,\s*)India(?:$|[\s,)(-])/i,
  /^IND[-\s(]/i,
]);
const ALLOWED_LOCATION_REGEXES = Object.freeze([
  ...CANONICAL_CITY_REGEXES,
  ...INDIA_LOCATION_MARKER_REGEXES,
]);

const matchesCountryValue = (value = "") => {
  const trimmed = String(value || "").trim();
  if (!trimmed) return false;
  return INDIA_COUNTRY_REGEXES.some((regex) => regex.test(trimmed));
};

const matchesSpecialLocationLabel = (value = "") => {
  const trimmed = String(value || "").trim();
  if (!trimmed) return false;
  return SPECIAL_LOCATION_REGEXES.some((regex) => regex.test(trimmed));
};

const matchesIndiaLocationMarker = (value = "") => {
  const trimmed = String(value || "").trim();
  if (!trimmed) return false;
  return INDIA_LOCATION_MARKER_REGEXES.some((regex) => regex.test(trimmed));
};

const isNoisyLocationCandidate = (value = "") => {
  const trimmed = String(value || "").replace(/\s+/g, " ").trim();
  if (!trimmed) return false;
  return (
    GROUPED_LOCATION_LABEL_REGEX.test(trimmed)
    || LOCATION_MARKUP_OR_CODE_REGEXES.some((regex) => regex.test(trimmed))
  );
};

const extractCityCandidate = (value = "") => {
  if (isNoisyLocationCandidate(value)) return null;
  if (matchesSpecialLocationLabel(value)) return "Remote";

  const normalized = normalizeCity(value);
  if (!normalized) return null;
  if (/^india$/i.test(normalized)) return null;
  return normalized;
};

export const getValidIndiaCityForJob = (job = {}) => {
  const country = typeof job.country === "string" ? job.country.trim() : "";
  const city = typeof job.city === "string" ? job.city.trim() : "";
  const location = typeof job.location === "string" ? job.location.trim() : "";
  const locations = Array.isArray(job.locations)
    ? job.locations.map((value) => String(value || "").trim()).filter(Boolean)
    : [];
  const explicitIndiaCountry = matchesCountryValue(country);
  const primaryCandidates = [city, location]
    .filter((value) => value && !isNoisyLocationCandidate(value));
  const locationCandidates = locations
    .filter((value) => !isNoisyLocationCandidate(value));
  const hasLocationHint = [...primaryCandidates, ...locationCandidates].some(Boolean);

  // First try the primary city/location fields
  for (const candidate of primaryCandidates) {
    if (matchesSpecialLocationLabel(candidate)) return "Remote";
    const normalized = extractCityCandidate(candidate);
    if (!normalized) continue;
    if (matchesIndiaLocationMarker(candidate)) return normalized;
    if (ALLOWED_CITY_SET.has(normalized.toLowerCase())) return normalized;
  }

  // Then try special labels
  if (matchesSpecialLocationLabel(city)) return "Remote"; // Map "India Offsite" etc to Remote
  if (matchesSpecialLocationLabel(location)) return "Remote";

  // Finally scan the locations array
  for (const value of locationCandidates) {
    if (matchesSpecialLocationLabel(value)) return "Remote";
    const normalizedValue = extractCityCandidate(value);
    if (!normalizedValue) continue;
    if (matchesIndiaLocationMarker(value)) return normalizedValue;
    if (ALLOWED_CITY_SET.has(normalizedValue.toLowerCase())) return normalizedValue;
  }

  if (explicitIndiaCountry && !hasLocationHint) return "Remote";
  if (primaryCandidates.some((value) => matchesIndiaLocationMarker(value))) return "Remote";
  if (locationCandidates.some((value) => matchesIndiaLocationMarker(value))) return "Remote";

  return null;
};

export const isJobInPublicLocationScope = (job = {}) => {
  return getValidIndiaCityForJob(job) !== null;
};

export const buildPublicJobLocationScope = () => ({
  $or: [
    { city: { $in: ALLOWED_LOCATION_REGEXES } },
    { location: { $in: ALLOWED_LOCATION_REGEXES } },
    { locations: { $in: ALLOWED_LOCATION_REGEXES } },
  ],
});

export const applyPublicJobLocationScope = (filters = {}) => ({
  $and: [filters, buildPublicJobLocationScope()],
});
