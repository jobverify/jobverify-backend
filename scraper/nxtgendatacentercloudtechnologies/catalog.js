import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const NXTGEN_DATACENTER_CLOUD_TECHNOLOGIES_CATALOG = {
  source: 'nxtgendatacentercloudtechnologies',
  companyName: 'Nxtgen Datacenter Cloud Technologies',
  officialBrandName: 'NxtGen Datacenter & Cloud Technologies',
  adapter: 'script',
  homepageUrl: 'https://nxtgen.co.in/',
  companyCareerPage: 'https://nxtgen.co.in/careers',
  companyDomain: 'nxtgen.co.in',
  atsPlatform: 'official-company-careers',
  countryFilter: 'India',
  paginationStrategy: 'single-static-featured-jobs-page',
  extractionStrategy:
    'verified-first-party-careers-page+visible-featured-job-cards+same-page-apply-modals+pdf-detail-links',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://nxtgen.co.in/careers remained the live first-party NxtGen careers page, exposed a Featured Jobs block with same-page apply modals and downloadable PDF detail assets, and listed Customer Life Cycle Manager, Customer Relationship Manager, Network Architect, and Priority Support Consultant - Compute in Bengaluru.',
  dryRunFile: 'nxtgendatacentercloudtechnologies/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default NXTGEN_DATACENTER_CLOUD_TECHNOLOGIES_CATALOG
