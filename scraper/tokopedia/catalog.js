import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Friday, July 17, 2026 that https://www.gotocompany.com/careers is the live shared GoTo careers page and currently lists only GoTo, Gojek, and GoTo Financial opportunities, not a distinct Tokopedia board. Also verified that the first-party fraud-warning page at https://www.gotocompany.com/en/news/press/goto-group-fake-job-listings still names https://tokopedia.darwinbox.com/ms/candidate/careers as the authorized Tokopedia career link, but the linked public Darwinbox route exposed only an opaque shell during verification and no trustworthy public listing or detail API contract was verifiable from the linked first-party surfaces. There is no trustworthy public jobs surface for the exact-name Tokopedia row right now, so this provider fails closed and returns no jobs until a stable verifiable Tokopedia public board appears.'

export const TOKOPEDIA_CATALOG = {
  source: 'tokopedia',
  companyName: 'Tokopedia',
  officialBrandName: 'Tokopedia',
  adapter: 'script',
  companyCareerPage: 'https://www.gotocompany.com/careers',
  officialCareersReferenceUrl: 'https://www.gotocompany.com/en/news/press/goto-group-fake-job-listings',
  officialCareersHandoffUrl: 'https://tokopedia.darwinbox.com/ms/candidate/careers',
  companyDomain: 'tokopedia.com',
  atsPlatform: 'shared-parent-careers-darwinbox-shell-unverifiable',
  countryFilter: 'Indonesia',
  paginationStrategy: 'verified-goto-careers-plus-authorized-darwinbox-shell-no-verifiable-public-board',
  extractionStrategy:
    'verified-goto-careers-page+verified-tokopedia-authorized-handoff+verified-opaque-darwinbox-shell+fail-closed-sentinel',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'tokopedia/jobs.json',
  modulePath: path.join(currentDir, 'script.js'),
}

export default TOKOPEDIA_CATALOG
