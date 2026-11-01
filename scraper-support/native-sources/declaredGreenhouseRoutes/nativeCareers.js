import { readFileSync } from 'node:fs'
import { createNativeGreenhouseScraper, nativeSourceMetadata } from '../declaredGreenhouse/nativeCareers.js'
import { requireNative } from '../declaredGreenhouse/nativeData.js'
export const NATIVE_ROUTE_PROFILES = JSON.parse(readFileSync(new URL('./profiles.json', import.meta.url)))
export const nativeRouteMetadata = (profile, previous = {}) => ({ ...nativeSourceMetadata(profile, previous),
  countryFilter: profile.countryFilter, verifiedInventoryStatus: 'unverified', zeroResultPolicy: 'coverage-gap', backfillMode: 'discovery-only',
  boardIdentityVerified: false, officialBindingVerifiedAt: null, bindingEvidence: null, runtimeInventoryVerification: false,
  nativeRouteProfile: profile.source, scraperTimeoutMs: 900000, companyDomain: new URL(profile.primaryURL).hostname.replace(/^www\./, ''),
  paginationStrategy: 'paired-current-native-and-published-own-route-original-GETs',
  extractionStrategy: 'full-native-and-published-route-models-before-country-selection' })
export const createNativeRouteScraper = (profile, defaults = {}) => ({ name: profile.source, async run(passed = {}) {
  const options = { ...defaults, ...passed }, { onAudit = () => {}, onRecords = () => {}, now = () => new Date().toISOString() } = options
  options.signal?.throwIfAborted()
  const observedAt = now();requireNative(typeof observedAt === 'string' && Number.isFinite(Date.parse(observedAt)), 'invalid observation clock')
  return createNativeGreenhouseScraper(profile).run({ ...options, now: () => observedAt,
    onAudit: async audit => { await onAudit(structuredClone(audit));await onRecords(structuredClone(audit.observations)) } })
} })
