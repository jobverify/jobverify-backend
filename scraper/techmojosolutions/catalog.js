import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const TECHMOJO_SOLUTIONS_CATALOG = {
  source: 'techmojosolutions',
  companyName: 'TechMojo Solutions',
  officialBrandName: 'TechMojo',
  adapter: 'script',
  companyCareerPage: 'https://techmojo.com/company/careers/',
  publicJobsUrl: 'https://9am.careers/',
  publicCompanyBoardUrl: 'https://9am.careers/jobs/techmojo-solutions',
  companyDomain: 'techmojo.com',
  atsPlatform: '9am-careers-public-payload',
  countryFilter: 'India',
  paginationStrategy: 'first-party-handoff-plus-9am-root-payload',
  extractionStrategy: 'verified-techmojo-careers-page+9am-embedded-jobsdata+techmojo-slug-filter',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-09-14',
  verifiedSurfaceSummary:
    'Verified on Monday, September 14, 2026 that https://techmojo.com/company/careers/ is the live first-party TechMojo careers page, that it links current opportunities to https://9am.careers/jobs/techmojo-solutions, and that the public 9am root payload at https://9am.careers/ embeds open TECHMOJO SOLUTIONS records with displaySlug techmojo-solutions. The company-specific board URL returned an empty 404 to direct fetches, so the local scraper verifies the first-party handoff and reads the public root payload directly.',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'techmojosolutions/jobs.json',
}

export default TECHMOJO_SOLUTIONS_CATALOG
