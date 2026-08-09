import { JOB_OPENINGS_URL, SOURCE, COMPANY } from './script.js'

export const provider = {
  source: SOURCE,
  companyName: COMPANY,
  adapter: 'script',
  modulePath: '../../scraper/cloverinfotech/script.js',
  companyCareerPage: JOB_OPENINGS_URL,
  atsPlatform: 'official-company-careers',
  countryFilter: 'India',
  paginationStrategy: 'official-job-openings-page-pagination',
  extractionStrategy:
    'verified-first-party-job-openings-page+india-role-filter+detail-pages+embedded-first-party-application-form',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'cloverinfotech.com',
}

export default provider

