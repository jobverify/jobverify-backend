import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const CAMBRIDGE_TECHNOLOGY_ENTERPRISES_CATALOG = {
  source: 'cambridgetechnologyenterprises',
  companyName: 'Cambridge Technology Enterprises',
  officialBrandName: 'Cambridge Technology',
  adapter: 'script',
  homepageUrl: 'https://www.ctepl.com/',
  companyCareerPage: 'https://www.ctepl.com/careers/',
  officialCareersLandingUrl: 'https://www.ctepl.com/careers/',
  officialJobsBoardUrl: 'https://cambridgetechnology.freshteam.com/jobs',
  detailUrlPattern: 'https://cambridgetechnology.freshteam.com/jobs/{opaque_id}/{slug}',
  atsPlatform: 'freshteam',
  countryFilter: 'India',
  paginationStrategy: 'official-homepage-plus-first-party-careers-landing-plus-public-freshteam-board',
  extractionStrategy: 'verified-homepage+verified-first-party-careers-landing+public-freshteam-board-or-zero-state+detail-page-apply-surface',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'ctepl.com',
  verifiedOn: '2026-08-15',
  verifiedPublicJobCount: 0,
  verifiedSurfaceSummary:
    'Verified on Saturday, August 15, 2026 that https://www.ctepl.com/ is the live first-party Cambridge Technology homepage, that its careers navigation now lands on https://www.ctepl.com/careers/, and that the first-party careers landing page hands candidates off to the public Freshteam board at https://cambridgetechnology.freshteam.com/jobs. During live verification from this environment, the Freshteam board continued to expose the public Careers and Open Positions surface, but no trustworthy public India openings were extracted from the verified handoff chain, so this provider currently returns an empty result until a stable public India inventory is observed.',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'cambridgetechnologyenterprises/jobs.json',
}

export default CAMBRIDGE_TECHNOLOGY_ENTERPRISES_CATALOG
