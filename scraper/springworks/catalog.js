import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const SPRINGWORKS_CATALOG = {
  source: 'springworks',
  companyName: 'Springworks',
  adapter: 'script',
  modulePath: path.join(currentDir, 'script.js'),
  companyCareerPage: 'https://www.springworks.in/about-us/',
  companyDomain: 'springworks.in',
  aboutUrl: 'https://www.springworks.in/about-us/',
  jobsUrl: 'https://app.goodfit.so/careers/springworks/jobs',
  handoffUrl: 'https://springworks.goodfit.so/careers/springworks',
  atsPlatform: 'goodfit-hosted-jobs',
  countryFilter: 'India',
  paginationStrategy: 'single-ssr-jobs-page',
  extractionStrategy: 'verified-first-party-handoff-plus-goodfit-ssr-card-parse',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary: 'Saturday, July 18, 2026: Springworks linked from its first-party about page to the Goodfit careers handoff, which resolved to an SSR jobs page showing public role cards including "Sales/ SDR Intern" and "Account Executive - Goodfit".',
}

export default SPRINGWORKS_CATALOG
