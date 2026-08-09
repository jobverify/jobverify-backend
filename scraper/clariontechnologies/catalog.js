import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const CLARION_TECHNOLOGIES_CATALOG = {
  source: 'clariontechnologies',
  companyName: 'Clarion Technologies',
  officialBrandName: 'Clarion Technologies',
  adapter: 'script',
  modulePath: path.join(currentDir, 'script.js'),
  homepageUrl: 'https://www.clariontech.com/',
  companyCareerPage: 'https://www.clariontech.com/careers',
  featuredJobsUrl: 'https://jobs.clariontechnologies.co.in:444/featured-job',
  openingsUrl: 'https://www.clariontech.com/open-positions',
  atsPlatform: 'official-careers-page-plus-featured-jobs-iframe',
  countryFilter: 'India',
  paginationStrategy: 'official-careers-handoff-plus-single-featured-jobs-surface-validation',
  extractionStrategy: 'verified-careers-page+verified-featured-jobs-iframe-with-scoped-insecure-tls-fallback-return-empty-until-parser-is-promoted',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'clariontech.com',
  dryRunFile: 'clariontechnologies/jobs.json',
  verifiedOn: '2026-08-07',
  verifiedSurfaceSummary:
    'Verified on Friday, August 7, 2026 that https://www.clariontech.com/careers was the live first-party Clarion Technologies careers page, that it still embedded the public featured-jobs iframe at https://jobs.clariontechnologies.co.in:444/featured-job, that the iframe still exposed current openings with Apply Now links into https://www.clariontech.com/open-position-detail, and that the iframe host currently requires a scoped insecure-TLS retry because its certificate chain does not verify in Node.',
}

export default CLARION_TECHNOLOGIES_CATALOG
