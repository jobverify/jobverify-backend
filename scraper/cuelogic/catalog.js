import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Tuesday, August 4, 2026 that https://www.ltm.com/careers is still the live LTM careers landing page, but that both the legacy LTIMindtree jobs microsite at https://careers.ltimindtree.com/Microsite/content/View-Jobs/ and the CueLogic search URL at https://careers.ltimindtree.com/search/ now fail direct TLS validation on careers.ltimindtree.com because the host presents certificate-not-found.jobs2web.com. CueLogic therefore stays fail-closed until a trustworthy public jobs surface is restored.'

export const CUELOGIC_CATALOG = {
  source: 'cuelogic',
  companyName: 'Cuelogic',
  officialBrandName: 'LTM',
  adapter: 'script',
  homepageUrl: 'https://www.ltm.com/careers',
  companyCareerPage: 'https://careers.ltimindtree.com/search/',
  verifiedJobsMicrositeUrl: 'https://careers.ltimindtree.com/Microsite/content/View-Jobs/',
  brokenRedirectHost: 'careers.ltimindtree.com',
  brokenRedirectCertificateHost: 'certificate-not-found.jobs2web.com',
  companyDomain: 'careers.ltimindtree.com',
  atsPlatform: 'successfactors-empty-search-sentinel',
  countryFilter: 'India',
  paginationStrategy: 'single-parent-search-query',
  extractionStrategy:
    'verified-parent-successfactors-search-empty-state-or-fail-closed-upstream-tls-outage',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-08-04',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'cuelogic/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default CUELOGIC_CATALOG
