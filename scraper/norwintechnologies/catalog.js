import { fileURLToPath } from 'node:url'

const modulePath = fileURLToPath(new URL('./script.js', import.meta.url))

export const NORWIN_TECHNOLOGIES_CATALOG = {
  source: 'norwintechnologies',
  companyName: 'Norwin Technologies',
  officialBrandName: 'Norwin Technologies',
  adapter: 'script',
  modulePath,
  companyCareerPage: 'https://norwintechnologies.com/careers/',
  officialJobsBoardUrl: 'https://norwin.hire.trakstar.com/',
  trakstarJobsHost: 'https://norwin.hire.trakstar.com',
  companyDomain: 'norwintechnologies.com',
  atsPlatform: 'trakstar',
  countryFilter: 'India',
  paginationStrategy: 'single-trakstar-board-root',
  extractionStrategy: 'verified-careers-page+norwin-branded-trakstar-board',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://norwintechnologies.com/careers/ was the official careers page and that the Norwin-branded Trakstar board at https://norwin.hire.trakstar.com/ exposed listings including Sr, Storage Ops on the public jobs board.',
}

export default NORWIN_TECHNOLOGIES_CATALOG
