import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const KRG_TECHNOLOGIES_CATALOG = {
  source: 'krgtechnologies',
  companyName: 'KRG Technologies',
  officialBrandName: 'KRG Technologies',
  adapter: 'script',
  modulePath: path.join(currentDir, 'script.js'),
  homepageUrl: 'https://www.krgtech.com/',
  companyCareerPage: 'https://www.krgtech.com/career.aspx',
  currentOpeningsUrl: 'https://www.krgtech.com/Jobs.aspx',
  externalBoardUrl: 'https://talenthire.ceipal.com/Jobs/listing/ODI0MA==',
  atsPlatform: 'official-current-openings-page-plus-ceipal-iframe',
  countryFilter: 'India',
  paginationStrategy: 'verified-current-openings-page-plus-public-iframe-validation-return-empty',
  extractionStrategy: 'verified-careers-page+verified-current-openings-iframe-handoff+external-board-unresolved-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'krgtech.com',
  dryRunFile: 'krgtechnologies/jobs.json',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that https://www.krgtech.com/career.aspx remained the live first-party KRG Technologies careers page and that https://www.krgtech.com/Jobs.aspx exposed a Current Openings page with an embedded public CEIPAL listing iframe at https://talenthire.ceipal.com/Jobs/listing/ODI0MA==.',
}

export default KRG_TECHNOLOGIES_CATALOG
