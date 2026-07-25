import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const provider = {
  source: 'ivy',
  companyName: 'ivy',
  officialBrandName: 'Ivy Comptech',
  adapter: 'script',
  modulePath: path.join(currentDir, 'script.js'),
  companyCareerPage: 'https://ivy.global/',
  contactPageUrl: 'https://ivy.global/contact',
  companyDomain: 'ivy.global',
  atsPlatform: 'official-company-site-blocked-careers-surface',
  countryFilter: 'India',
  paginationStrategy: 'homepage-plus-contact-plus-blocked-careers-route-validation',
  extractionStrategy:
    'verified-ivy-global-homepage+verified-contact-entities+blocked-first-party-careers-routes-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  dryRunFile: 'ivy/jobs.json',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://ivy.global/ still identifies the first-party Ivy Comptech surface for the backlog row ivy, and that the contact page at https://ivy.global/contact still lists Ivy Comptech Private Limited, Ivy Software Development Services Private Limited, Ivy Global Shared Services Private Limited, and Ivy Mobitech Services Private Limited. The public jobs surface remained blocked from direct verification on the same date, so this local contract returns [] and fails closed if a structured first-party careers page becomes reachable later.',
}

export default provider
