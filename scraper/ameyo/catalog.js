import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const AMEYO_CATALOG = {
  source: 'ameyo',
  companyName: 'Ameyo',
  adapter: 'script',
  companyCareerPage: 'https://exotel.com/about-us/careers/',
  companyDomain: 'ameyo.com',
  atsPlatform: 'recruiterbox',
  countryFilter: 'India',
  paginationStrategy: 'verified-homepage-handoff-or-verified-homepage-522-outage-plus-upstream-recruiterbox-openings-json',
  extractionStrategy: 'verified-official-homepage-or-verified-homepage-522-outage+verified-exotel-careers-handoff+recruiterbox-openings-json',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  homepageUrl: 'https://www.ameyo.com/',
  officialCareersHandoffUrl: 'https://exotel.com/careers/',
  upstreamCareersCanonicalUrl: 'https://exotel.com/about-us/careers/',
  openingsApiUrl: 'https://app.recruiterbox.com/widget/2176/openings/',
  verifiedUpstreamJobUrl: 'https://app.recruiterbox.com/widget/2176/opening/701455/',
  verifiedCareers404Urls: [
    'https://www.ameyo.com/careers/',
    'https://www.ameyo.com/jobs/',
  ],
  upstreamCompanyName: 'Exotel Techcom Pvt Ltd',
  verifiedOn: '2026-07-28',
  verifiedSurfaceSummary:
    'Verified on July 28, 2026 that https://www.ameyo.com/ currently serves a Cloudflare/Kinsta 522 timeout page instead of the previously verified homepage, while the trusted upstream handoff at https://exotel.com/careers/ and the canonical careers surface at https://exotel.com/about-us/careers/ remain reachable and still expose Recruiterbox widget 2176. Verified that the public openings feed at https://app.recruiterbox.com/widget/2176/openings/ plus the live job detail payload at https://app.recruiterbox.com/widget/2176/opening/701455/ are reachable, and that /careers/ and /jobs/ on ameyo.com are still not the trusted public jobs surface.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default AMEYO_CATALOG
