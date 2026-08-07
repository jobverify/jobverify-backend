import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Monday, August 3, 2026 that https://www.mindbowser.com/ is the official Mindbowser homepage, that the first-party careers page at https://www.mindbowser.com/careers/ still hands applicants to the HROne short link https://hr-1.in/829c17 even though the page now also contains a separate self-referential Apply Now link, and that this trusted handoff resolves to a public HROne board at career.hrone.cloud/career-portal for dc=mindbowser. A rendered capture of the public board still exposed 6 public vacancies including JO00115 Senior Business Analyst - US Healthcare Domain (4-7 Years), JO00114 Senior AI/ML Engineer (5-7 Years), JO00109 AI Engineer (Generative AI & Machine Learning), and JO00022 Technology Role.'

export const MINDBOWSER_CATALOG = {
  source: 'mindbowser',
  companyName: 'Mindbowser',
  officialBrandName: 'Mindbowser',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'mindbowser/jobs.json',
  officialHomepageUrl: 'https://www.mindbowser.com/',
  companyCareerPage: 'https://www.mindbowser.com/careers/',
  companyDomain: 'mindbowser.com',
  hroneShortUrl: 'https://hr-1.in/829c17',
  atsPlatform: 'hrone',
  countryFilter: 'India',
  paginationStrategy: 'official-careers-page-plus-public-hrone-board',
  extractionStrategy:
    'verified-official-careers-page+verified-public-hrone-board+rendered-job-cards',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedRenderedJobCount: 6,
  verifiedSampleJobId: 'JO00115',
  verifiedOn: '2026-08-03',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default MINDBOWSER_CATALOG
