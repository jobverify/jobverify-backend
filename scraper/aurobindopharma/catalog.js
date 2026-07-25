import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const AUROBINDO_PHARMA_CATALOG = {
  source: 'aurobindopharma',
  companyName: 'Aurobindo Pharma',
  officialBrandName: 'Aurobindo Pharma',
  legalEntityName: 'Aurobindo Pharma Limited',
  adapter: 'script',
  companyCareerPage: 'https://www.aurobindo.com/careers',
  homepageUrl: 'https://www.aurobindo.com/',
  careersPageUrl: 'https://www.aurobindo.com/careers',
  careersHandoffUrl: 'https://aurobindo.talentrecruit.com/Search/',
  careersHostUrl: 'https://aurobindo.talentrecruit.com/',
  atsPlatform: 'official-company-careers-broken-handoff',
  countryFilter: 'India',
  paginationStrategy: 'official-careers-page-plus-broken-talentrecruit-handoff-monitor',
  extractionStrategy: 'verified-homepage+verified-careers-page+broken-talentrecruit-handoff-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'aurobindo.com',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary:
    'Verified on July 15, 2026 that https://www.aurobindo.com/ is the live first-party homepage, that https://www.aurobindo.com/careers is the official careers page, and that this careers page hands off Work with us / Opportunities to https://aurobindo.talentrecruit.com/Search/. There is no trustworthy public jobs surface right now: direct public checks of the TalentRecruit handoff returned an IIS 404 page, while the TalentRecruit host root resolved only to a default IIS Windows Server shell rather than a stable public job board.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default AUROBINDO_PHARMA_CATALOG
