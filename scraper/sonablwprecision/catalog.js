import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Friday, July 17, 2026 that https://sonacomstar.com/career is the live official Sona Comstar career page for the exact-name Sona BLW Precision row, that it currently exposes only the generic resume-upload copy "Explore A career with sona comstar", "We are always eager to meet fresh talent.", and "Upload Resume", and that there is no trustworthy public jobs surface, public ATS listing, or public job detail link on that page. The legal-entity footer on https://sonacomstar.com/pages/about-us still identifies the company as Sona BLW Precision Forgings Limited and links the cautionary notice PDF at https://api.procuzy.com/sonacomstar/public/pdf/cautionary_notice_against_fake_employment_or_offers_etc.pdf, so this provider intentionally fails closed and returns an empty array until a trustworthy public jobs surface appears.'

export const SONA_BLW_PRECISION_CATALOG = {
  source: 'sonablwprecision',
  companyName: 'Sona BLW Precision',
  officialBrandName: 'Sona BLW Precision Forgings Limited (Sona Comstar)',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'sonablwprecision/jobs.json',
  companyCareerPage: 'https://sonacomstar.com/career',
  officialCompanyPageUrl: 'https://sonacomstar.com/pages/about-us',
  officialCulturePageUrl: 'https://sonacomstar.com/our-culture',
  cautionNoticeUrl:
    'https://api.procuzy.com/sonacomstar/public/pdf/cautionary_notice_against_fake_employment_or_offers_etc.pdf',
  companyDomain: 'sonacomstar.com',
  atsPlatform: 'official-company-site-resume-upload-no-public-jobs',
  countryFilter: 'India',
  paginationStrategy: 'verified-career-page-plus-legal-entity-footer-checks',
  extractionStrategy:
    'verified-career-page+footer-legal-entity+cautionary-notice-no-public-jobs-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default SONA_BLW_PRECISION_CATALOG
