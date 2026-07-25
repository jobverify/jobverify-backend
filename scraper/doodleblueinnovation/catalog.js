import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const DOODLEBLUE_INNOVATION_CATALOG = {
  source: 'doodleblueinnovation',
  companyName: 'doodleblue innovation',
  officialBrandName: 'doodleblue Innovations Pvt. Ltd.',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  companyCareerPage: 'https://www.doodleblue.com/careers/openings/',
  companyDomain: 'doodleblue.com',
  atsPlatform: 'first-party-openings-page',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-openings-page',
  extractionStrategy: 'first-party-html-role-headings+shared-meta-line+apply-route-extraction',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.doodleblue.com/careers/openings/ is doodleblue innovation\'s live first-party openings page and that the public HTML lists current role headings with shared Chennai, India / Full time / experienced metadata plus a first-party apply route.',
}

export default DOODLEBLUE_INNOVATION_CATALOG
