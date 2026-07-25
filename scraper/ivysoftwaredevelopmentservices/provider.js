import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const provider = {
  source: 'ivysoftwaredevelopmentservices',
  companyName: 'IVY SOFTWARE DEVELOPMENT SERVICES',
  officialBrandName: 'Ivy Software Development Services Private Limited',
  adapter: 'script',
  modulePath: path.join(currentDir, 'script.js'),
  companyCareerPage: 'https://ivy.global/',
  contactPageUrl: 'https://ivy.global/contact',
  companyDomain: 'ivy.global',
  atsPlatform: 'official-company-site-blocked-careers-surface',
  countryFilter: 'India',
  paginationStrategy: 'homepage-plus-contact-plus-blocked-careers-route-validation',
  extractionStrategy:
    'verified-ivy-global-homepage+verified-contact-entity+blocked-first-party-careers-routes-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  dryRunFile: 'ivysoftwaredevelopmentservices/jobs.json',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that the first-party Ivy Comptech contact page at https://ivy.global/contact still lists Ivy Software Development Services Private Limited alongside the other Ivy legal entities, which safely collapses this backlog row onto the shared ivy.global corporate surface shared with ivy. The public jobs surface remained blocked from direct verification on the same date, so this local contract returns [] and fails closed until a trustworthy first-party careers listing becomes reachable.',
}

export default provider
