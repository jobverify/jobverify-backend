import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const GATI_CATALOG = {
  source: 'gati',
  companyName: 'Gati',
  adapter: 'script',
  homepageUrl: 'https://www.gati.com/',
  companyCareerPage: 'https://www.allcargologistics.com/about-us/careers',
  officialCareersHandoffUrl: 'https://gatikwe.darwinbox.in/ms/candidate/careers',
  darwinboxOrigin: 'https://gatikwe.darwinbox.in',
  darwinboxCompanyId: 'main',
  companyDomain: 'allcargologistics.com',
  atsPlatform: 'darwinbox',
  countryFilter: 'India',
  paginationStrategy:
    'gati-homepage-redirect-plus-parent-careers-page-plus-broken-darwinbox-monitor',
  extractionStrategy:
    'verified-gati-homepage-redirect+verified-parent-careers-page+broken-darwinbox-tenant-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary:
    'Verified on July 16, 2026 that https://www.gati.com/ redirects to the Allcargo Logistics homepage at https://www.allcargologistics.com/, that the parent careers page at https://www.allcargologistics.com/about-us/careers links to the public Darwinbox handoff https://gatikwe.darwinbox.in/ms/candidate/careers, and that the corresponding listing API remains in the verified invalid subdomain: gatikwe state rather than exposing a trustworthy public jobs board.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default GATI_CATALOG
