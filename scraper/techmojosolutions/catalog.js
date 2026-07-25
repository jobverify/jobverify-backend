import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const TECHMOJO_SOLUTIONS_CATALOG = {
  source: 'techmojosolutions',
  companyName: 'TechMojo Solutions',
  officialBrandName: 'TechMojo',
  adapter: 'script',
  companyCareerPage: 'https://jobs.techmojo.com/jobs',
  companyDomain: 'techmojo.com',
  atsPlatform: 'official-company-jobs-portal',
  countryFilter: 'India',
  paginationStrategy: 'single-page-first-party-jobs-portal',
  extractionStrategy: 'verified-jobs-portal-shell+anchor-card-extraction+hyderabad-role-normalization',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that the branded first-party portal at https://jobs.techmojo.com/jobs exposed public TechMojo openings in Hyderabad, Telangana, including Java Developer (Work from Office), SRE Lead, and Member of Technical Staff(PHP) (Work from Office). The local scraper therefore reads the first-party jobs portal directly and normalizes the Hyderabad role cards.',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'techmojosolutions/jobs.json',
}

export default TECHMOJO_SOLUTIONS_CATALOG
