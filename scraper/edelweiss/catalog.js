import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on July 15, 2026 that https://www.edelweissfin.com/ is the live first-party Edelweiss homepage and links Careers to https://www.edelweissfin.com/edelweisscareers. Verified in a browser that the first-party careers page titled "Careers At Edelweiss" is an informational employer-branding surface with "CAREERS AT EDELWEISS", "LIFE AT EDELWEISS", and a resume handoff telling candidates to send CVs to GroupTalent.Acquisition@edelweissfin.com, but it does not expose public job cards, role detail pages, ATS handoffs, or JobPosting markup. Verified that direct automated fetches to https://www.edelweissfin.com/, https://www.edelweissfin.com/edelweisscareers, https://www.edelweissfin.com/robots.txt, https://www.edelweissfin.com/sitemap.xml, https://www.edelweissfin.com/careers, https://www.edelweissfin.com/career, https://www.edelweissfin.com/jobs, https://www.edelweissfin.com/join-us, and https://www.edelweissfin.com/work-with-us returned Akamai Access Denied / 403 responses during live checks. No trustworthy public jobs surface is currently available for Edelweiss.'

export const EDELWEISS_CATALOG = {
  source: 'edelweiss',
  companyName: 'Edelweiss',
  officialBrandName: 'Edelweiss',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'edelweiss/jobs.json',
  homepageUrl: 'https://www.edelweissfin.com/',
  companyCareerPage: 'https://www.edelweissfin.com/edelweisscareers',
  companyDomain: 'edelweissfin.com',
  applicationEmail: 'GroupTalent.Acquisition@edelweissfin.com',
  applicationUrl: 'mailto:GroupTalent.Acquisition@edelweissfin.com',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy:
    'verified-homepage-plus-browser-verified-careers-page-plus-akamai-blocked-direct-fetch-routes',
  extractionStrategy:
    'verified-first-party-homepage+verified-browser-careers-page-email-resume-handoff-without-public-listings+verified-akamai-blocked-direct-fetch-routes-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default EDELWEISS_CATALOG
