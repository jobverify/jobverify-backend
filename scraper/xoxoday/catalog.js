import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const KEKA_IDENTIFIER = '1d58bf68-c78d-495e-8a38-d17ff1298707'

export const XOXODAY_CATALOG = {
  source: 'xoxoday',
  companyName: 'Xoxoday',
  officialBrandName: 'Xoxoday',
  adapter: 'script',
  companyCareerPage: 'https://www.xoxoday.com/careers',
  kekaCareerPageUrl: 'https://nreach.keka.com/careers/',
  kekaIdentifier: KEKA_IDENTIFIER,
  jobsApiUrl: `https://nreach.keka.com/careers/api/embedjobs/default/active/${KEKA_IDENTIFIER}`,
  companyDomain: 'xoxoday.com',
  atsPlatform: 'keka-embed-api',
  countryFilter: 'Global',
  paginationStrategy: 'first-party-careers-shell-plus-keka-embed-jobs-api',
  extractionStrategy: 'verified-first-party-careers-page+verified-keka-shell+official-keka-embed-jobs-api+global-roles',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedPublicJobCount: 39,
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.xoxoday.com/careers remained the first-party Xoxoday careers page with the "Live listings, straight from our applicant tracking system" section, that https://nreach.keka.com/careers/ remained the public Keka shell tied to identifier 1d58bf68-c78d-495e-8a38-d17ff1298707, and that the live Keka jobs payload returned 39 public openings including Key Account Manager - Enetrprise Sales, Mumbai and SDET Engineer - Automation.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default XOXODAY_CATALOG
