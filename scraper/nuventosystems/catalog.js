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
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://nuvento.com/careers/ is the live first-party Nuvento careers hub and that its Careers In INDIA handoff resolves to https://nuvento.com/careers/kochi/, where Nuvento publicly listed inline openings including Team Lead -Python and Sales and Marketing Intern (Paid Internship). This local provider reads those first-party inline role sections directly from the verified India careers page.',
  modulePath: path.join(currentDir, 'script.js'),
  dryRunFile: 'nuventosystems/jobs.json',
}

export default NUVENTO_SYSTEMS_CATALOG
