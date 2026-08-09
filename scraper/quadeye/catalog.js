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
  verifiedOn: '2026-08-04',
  verifiedSurfaceSummary:
    'Verified on Tuesday, August 4, 2026 that the official first-party careers page at https://www.quadeye.com/careers/ still embeds a Zoho Recruit widget via rec_embed_js.load with site:"https://quadeye.zohorecruit.in" and empty_job_msg:"No current Openings", while the public portal at https://quadeye.zohorecruit.in/jobs/Careers/ remained live with the current title "Jobs at PeoplePlus" and og:site_name "Quadeye". The public jobs API at https://quadeye.zohorecruit.in/recruit/v2/public/Job_Openings?pagename=Careers&source=CareerSite returned 7 current public India roles, with branded public detail pages still served on career.quadeye.com.',
}

export default QUADEYE_CATALOG
