import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const ADITYA_BIRLA_CAPITAL_CATALOG = {
  source: 'adityabirlacapital',
  companyName: 'Aditya Birla Capital',
  adapter: 'script',
  companyCareerPage: 'https://www.adityabirlacapital.com/careers',
  officialJobsPage: 'https://www.adityabirlacapital.com/careers/jobs',
  resumeHandoffUrl: 'https://abgcareers.peoplestrong.com/register',
  companyDomain: 'adityabirlacapital.com',
  atsPlatform: 'official-company-careers',
  countryFilter: 'India',
  paginationStrategy: 'first-party-blogajax-page-parameter',
  extractionStrategy:
    'official-careers-page+official-jobs-page+blogajax-json+same-domain-detail-routes+mixed-iona-peoplestrong-apply-handoffs',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-14',
  verifiedSurfaceSummary:
    'Verified on July 14, 2026 that Aditya Birla Capital publishes careers on https://www.adityabirlacapital.com/careers, public listings on https://www.adityabirlacapital.com/careers/jobs, paginated jobs JSON from https://www.adityabirlacapital.com/careers/jobs?blogAjax=1&jobTitle=&location=&businessline=&function=&experience=&page=0, first-party detail routes under https://www.adityabirlacapital.com/careers/sitecore/content/abcl/abcareers/home/jobs/job-details/, and mixed public apply handoffs to abccareers.iona.ai for non-ABG job codes plus abgcareers.peoplestrong.com for ABG-prefixed job codes.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default ADITYA_BIRLA_CAPITAL_CATALOG
