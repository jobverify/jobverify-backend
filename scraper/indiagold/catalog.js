import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const INDIAGOLD_CATALOG = {
  source: 'indiagold',
  companyName: 'Indiagold',
  officialBrandName: 'indiagold',
  adapter: 'script',
  modulePath: path.join(currentDir, 'script.js'),
  companyCareerPage: 'https://indiagold.co/join-us',
  homepageUrl: 'https://indiagold.co/',
  careersApiUrl:
    'https://indiagold.zohorecruit.in/recruit/v2/public/Job_Openings?pagename=Careers&source=CareerSite&extra_fields=%5B%22State%22%2C%22Salary%22%2C%22Industry%22%5D',
  generalApplicationFormUrl:
    'https://indiagold.zohorecruit.in/forms/38b7f90a5d50181c7e90b5fb206f7906c671dc7d5b1e459876d880446809e996',
  companyDomain: 'indiagold.co',
  atsPlatform: 'zohorecruit',
  countryFilter: 'India',
  paginationStrategy: 'single-public-api-request',
  extractionStrategy: 'verified-first-party-careers-page+public-zohorecruit-job-openings-api',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  dryRunFile: 'indiagold/jobs.json',
  verifiedOn: '2026-08-02',
  verifiedSurfaceSummary:
    'Verified on August 2, 2026 that https://indiagold.co/join-us is the official indiagold careers page, that it advertises SEE ALL POSITIONS and the Great Places to Work Certified join-us wrapper, and that the branded Zoho Recruit API still returns 24 current India jobs including Collections Executive, Sales Officer (DSA) - Karimnagar, Warangal, Nizamabad & Khammam, and Senior DevOps Engineer.',
}

export default INDIAGOLD_CATALOG
