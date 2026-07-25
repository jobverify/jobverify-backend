import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const INNOVAPPTIVE_CATALOG = {
  source: 'innovapptive',
  companyName: 'Innovapptive',
  officialBrandName: 'Innovapptive',
  adapter: 'script',
  homepageUrl: 'https://www.innovapptive.com/',
  companyCareerPage: 'https://www.innovapptive.com/company/careers',
  boardUrl: 'https://innovapptive.applytojob.com/apply',
  atsPlatform: 'official-careers-page-plus-applytojob-board',
  countryFilter: 'India',
  paginationStrategy: 'single-page',
  extractionStrategy: 'html-board',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'innovapptive.com',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that https://www.innovapptive.com/company/careers was the live first-party Innovapptive careers page and that it handed applicants to the public board at https://innovapptive.applytojob.com/apply. Verified that the public board exposed current openings including Associate Solution Consultant - EAM and Senior Engineer - iOS.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default INNOVAPPTIVE_CATALOG
