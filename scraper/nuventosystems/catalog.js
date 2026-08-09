import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const NUVENTO_SYSTEMS_CATALOG = {
  source: 'nuventosystems',
  companyName: 'Nuvento Systems',
  officialBrandName: 'Nuvento',
  adapter: 'script',
  homepageUrl: 'https://nuvento.com/',
  careersHubUrl: 'https://nuvento.com/careers/',
  companyCareerPage: 'https://nuvento.com/careers/kochi/',
  resumeEmails: [
    'naseeba.parvin@nuvento.com',
    'anindita.ghosal@nuvento.com',
  ],
  companyDomain: 'nuvento.com',
  atsPlatform: 'first-party-india-careers-page',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-india-careers-page',
  extractionStrategy: 'verified-first-party-careers-hub+india-careers-page-inline-role-sections',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-08-03',
  verifiedSurfaceSummary:
    'Verified on Monday, August 3, 2026 that https://nuvento.com/careers/ remained the live first-party Nuvento careers hub, that its Careers In INDIA handoff now points to the relative /careers/kochi/ route, and that https://nuvento.com/careers/kochi/ publicly listed eight accordion-based India openings including Digital Marketing Lead, Finance Executive, Senior Release Manager, Senior DevOps / Platform Engineer, US Finance & Accounts / Senior Executive, IT/Sr/JR Recruiter, Team Lead -Python, and Sales and Marketing Intern (Paid Internship). This local provider reads those first-party India accordion role sections directly from the verified careers page.',
  modulePath: path.join(currentDir, 'script.js'),
  dryRunFile: 'nuventosystems/jobs.json',
}

export default NUVENTO_SYSTEMS_CATALOG
