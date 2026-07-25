import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const THRYVE_DIGITAL_CATALOG = {
  source: 'thryvedigital',
  companyName: 'Thryve Digital',
  officialBrandName: 'Thryve Digital',
  adapter: 'script',
  homepageUrl: 'https://www.thryvedigital.com/',
  companyCareerPage: 'https://www.thryvedigital.com/',
  companyDomain: 'thryvedigital.com',
  atsPlatform: 'darwinbox',
  countryFilter: 'India',
  paginationStrategy: 'browser-session-darwinbox-pagination',
  extractionStrategy: 'verified-first-party-rebrand-page+darwinbox-listing-api',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  officialCareersHandoffUrl: 'https://tdh.darwinbox.in/ms/candidate/careers',
  darwinboxOrigin: 'https://tdh.darwinbox.in',
  darwinboxCompanyId: 'main',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that https://www.thryvedigital.com/ was the live first-party Thryve Digital careers surface, that it stated the company was rebranding itself to "enGen Global", and that its "Click here to explore opportunities" handoff pointed applicants to the official Darwinbox candidate host at https://tdh.darwinbox.in/ms/candidate/careers.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default THRYVE_DIGITAL_CATALOG
