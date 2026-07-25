import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SENSEHQ_CATALOG = {
  source: 'sensehq',
  companyName: 'SenseHQ',
  officialBrandName: 'Sense HQ',
  adapter: 'script',
  homepageUrl: 'https://www.sensehq.com/',
  companyCareerPage: 'https://www.sensehq.com/careers',
  verifiedJobsPageUrl: 'https://sensehr.sensehq.com/careers/jobs',
  sampleJobUrl: 'https://sensehr.sensehq.com/careers/jobs/217',
  companyDomain: 'sensehq.com',
  atsPlatform: 'sensehq',
  countryFilter: 'India',
  jobsDataSource: '__NEXT_DATA__.props.pageProps.jobsData.jobs',
  paginationStrategy: 'verified-sensehq-board-next-data-root-page-only',
  extractionStrategy:
    'verified-sensehq-next-data+open-job-filter+india-country-filter+first-party-detail-url-build',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that https://www.sensehq.com/careers is the live first-party SenseHQ careers landing page and that the public SenseHQ board at https://sensehr.sensehq.com/careers/jobs exposes 14 open jobs through the embedded __NEXT_DATA__ payload on the root board page, including DevOps Engineer and Technical Support Representative. The same verified board also exposed a United States role, Implementation Consultant, so this provider conservatively filters the verified first-party payload to India jobs only and builds canonical first-party detail URLs under https://sensehr.sensehq.com/careers/jobs/.',
  dryRunFile: 'sensehq/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default SENSEHQ_CATALOG
