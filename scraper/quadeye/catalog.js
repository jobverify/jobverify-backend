import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const QUADEYE_CATALOG = {
  source: 'quadeye',
  companyName: 'QuadEye',
  officialBrandName: 'Quadeye',
  adapter: 'script',
  modulePath: path.join(currentDir, 'script.js'),
  homepageUrl: 'https://www.quadeye.com/',
  companyCareerPage: 'https://www.quadeye.com/careers/',
  careersPortalUrl: 'https://quadeye.zohorecruit.in/jobs/Careers/',
  careersApiUrl:
    'https://quadeye.zohorecruit.in/recruit/v2/public/Job_Openings?pagename=Careers&source=CareerSite',
  careersDetailHost: 'career.quadeye.com',
  companyDomain: 'quadeye.com',
  atsPlatform: 'zohorecruit',
  countryFilter: 'India',
  paginationStrategy: 'official-careers-page-plus-embedded-zoho-handoff-plus-public-zoho-api',
  extractionStrategy:
    'verified-first-party-careers-page+embedded-zohorecruit-widget+public-job-openings-api',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  dryRunFile: 'quadeye/jobs.json',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that the official first-party careers page at https://www.quadeye.com/careers/ embeds a Zoho Recruit widget via rec_embed_js.load with site:"https://quadeye.zohorecruit.in" and empty_job_msg:"No current Openings", while the public portal at https://quadeye.zohorecruit.in/jobs/Careers/ and the public jobs API at https://quadeye.zohorecruit.in/recruit/v2/public/Job_Openings?pagename=Careers&source=CareerSite were both live. The verified public API returned 21 public India roles at verification time, with branded public detail pages served on career.quadeye.com.',
}

export default QUADEYE_CATALOG
