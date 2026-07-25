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
  paginationStrategy: 'verified-homepage-handoff-plus-upstream-recruiterbox-openings-json',
  extractionStrategy: 'verified-official-homepage+verified-exotel-careers-handoff+recruiterbox-openings-json',
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
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary:
    'Verified on July 15, 2026 that https://www.ameyo.com/ is the live Ameyo homepage, that its Careers navigation hands job seekers to https://exotel.com/careers/, and that the live public careers surface resolves on Exotel at https://exotel.com/about-us/careers/. Verified that the Exotel careers page exposes Recruiterbox widget 2176 and that the public openings feed at https://app.recruiterbox.com/widget/2176/openings/ plus the live job detail payload at https://app.recruiterbox.com/widget/2176/opening/701455/ are reachable. Verified separately that /careers/ and /jobs/ on ameyo.com are first-party 404 routes rather than the public jobs surface.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default AMEYO_CATALOG
