import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const MONOCEPT_CATALOG = {
  source: 'monocept',
  companyName: 'Monocept',
  adapter: 'script',
  modulePath: path.join(currentDir, 'script.js'),
  companyCareerPage: 'https://www.monocept.com/careers',
  companyDomain: 'monocept.com',
  careersUrl: 'https://www.monocept.com/careers',
  handoffUrl: 'https://monocept.turbohire.co/careerpage/0e8227c1-c352-4202-8e40-c0aa16b6ca69',
  officialBrandName: 'Monocept',
  atsPlatform: 'turbohire-js-shell',
  countryFilter: 'India',
  paginationStrategy: 'fail-closed',
  extractionStrategy: 'verified-first-party-handoff-but-no-server-rendered-jobs',
  verifiedOn: '2026-08-03',
  verifiedSurfaceSummary: 'Monday, August 3, 2026: https://www.monocept.com/careers remained the live first-party Monocept careers page, now titled "Careers | Build the Future of Insurance | Monocept", and still linked to the same TurboHire handoff at https://monocept.turbohire.co/careerpage/0e8227c1-c352-4202-8e40-c0aa16b6ca69. The TurboHire page still rendered as a JS shell with career-page metadata but no trustworthy server-rendered jobs payloads, so this provider stays fail-closed.',
}

export default MONOCEPT_CATALOG
