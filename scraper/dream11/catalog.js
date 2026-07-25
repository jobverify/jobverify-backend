import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  "Verified on July 15, 2026 that https://www.dream11.com/ is the live Dream11 homepage and that its Careers footer link points to https://www.dreamsports.group/careers/. Verified that https://www.dream11.com/careers, https://www.dream11.com/careers/, https://www.dream11.com/jobs, and https://www.dream11.com/join-us all return to the Dream11 homepage, while https://www.dream11.com/about-us/careers returns a first-party 404 page. Verified that the parent-brand careers route https://www.dreamsports.group/careers redirects to https://www.dreamsports.group/lifeatdreamsports, whose canonical remains https://www.dreamsports.group/careers and whose current public content is a Dream Sports brand-and-culture page headed 'Game On. Build Big.' with Dream11 employee testimonials such as Research Scientist, Dream11 and Software Development Engineer II - ML Platform, Dream11, but without any trustworthy public jobs board or application links. Verified that likely alternate parent jobs routes including https://www.dreamsports.group/jobs, https://www.dreamsports.group/openings, https://www.dreamsports.group/careers/jobs, https://www.dreamsports.group/careers/openings, https://www.dreamsports.group/lifeatdreamsports/jobs, and https://www.dreamsports.group/lifeatdreamsports/openings return 404 on the verified date, so there is no trustworthy public jobs surface attributable to Dream11 right now."

export const DREAM11_CATALOG = {
  source: 'dream11',
  companyName: 'Dream11',
  officialBrandName: 'Dream11',
  parentCompanyName: 'Dream Sports',
  adapter: 'script',
  homepageUrl: 'https://www.dream11.com/',
  companyCareerPage: 'https://www.dreamsports.group/careers',
  parentCareersLandingUrl: 'https://www.dreamsports.group/lifeatdreamsports',
  linkedCareersUrl: 'https://www.dreamsports.group/careers/',
  parentCompanyDomain: 'dreamsports.group',
  companyDomain: 'dream11.com',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy: 'verified-dream11-homepage-plus-parent-dream-sports-careers-handoff',
  extractionStrategy:
    'verified-dream11-homepage+verified-dream11-direct-careers-routes-return-home-or-404+verified-parent-dream-sports-careers-redirect+verified-parent-careers-brand-page-without-public-jobs+verified-alternate-routes-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'dream11/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default DREAM11_CATALOG
