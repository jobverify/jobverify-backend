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
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary: 'Saturday, July 18, 2026: Monocept careers linked from the first-party https://www.monocept.com/careers page into TurboHire, but the public TurboHire surface rendered as an app shell without trustworthy server-rendered jobs payloads, so this provider stays fail-closed.',
}

export default MONOCEPT_CATALOG
