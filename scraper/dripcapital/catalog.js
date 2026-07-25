import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on July 15, 2026 that https://www.dripcapital.com/ is the live first-party Drip Capital homepage, that https://www.dripcapital.com/careers/, https://www.dripcapital.com/en-in/careers/, and https://www.dripcapital.com/en-us/careers/ are live first-party Nuxt careers shells, that https://assets.dripcapital.com/_nuxt/static/1783926833/careers/payload.js, https://assets.dripcapital.com/_nuxt/static/1783926833/en-in/careers/payload.js, and https://assets.dripcapital.com/_nuxt/static/1783926833/en-us/careers/payload.js returned empty route payloads during live checks, that https://www.dripcapital.com/jobs returned a first-party 404, and that https://www.dripcapital.com/robots.txt plus https://www.dripcapital.com/sitemap.xml only exposed the localized careers shell URL https://www.dripcapital.com/en-in/careers/ rather than role-level openings. There is no trustworthy public jobs surface on the first-party Drip Capital domain.'

export const DRIP_CAPITAL_CATALOG = {
  source: 'dripcapital',
  companyName: 'Drip Capital',
  officialBrandName: 'Drip Capital',
  adapter: 'script',
  homepageUrl: 'https://www.dripcapital.com/',
  companyCareerPage: 'https://www.dripcapital.com/en-in/careers/',
  careersPageUrl: 'https://www.dripcapital.com/en-in/careers/',
  legacyCareersPageUrl: 'https://www.dripcapital.com/careers/',
  usCareersPageUrl: 'https://www.dripcapital.com/en-us/careers/',
  legacyCareersPayloadUrl: 'https://assets.dripcapital.com/_nuxt/static/1783926833/careers/payload.js',
  indiaCareersPayloadUrl: 'https://assets.dripcapital.com/_nuxt/static/1783926833/en-in/careers/payload.js',
  usCareersPayloadUrl: 'https://assets.dripcapital.com/_nuxt/static/1783926833/en-us/careers/payload.js',
  jobsPageUrl: 'https://www.dripcapital.com/jobs',
  robotsTxtUrl: 'https://www.dripcapital.com/robots.txt',
  sitemapUrl: 'https://www.dripcapital.com/sitemap.xml',
  companyDomain: 'dripcapital.com',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy:
    'homepage-plus-legacy-and-localized-careers-shells-plus-payload-and-sitemap-validation',
  extractionStrategy:
    'verified-homepage+verified-legacy-and-localized-careers-shells+verified-empty-careers-payloads+verified-jobs-404+verified-robots-and-sitemap-no-role-urls',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'dripcapital/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default DRIP_CAPITAL_CATALOG
