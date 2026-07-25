import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const CAMBRIDGE_TECHNOLOGY_ENTERPRISES_CATALOG = {
  source: 'cambridgetechnologyenterprises',
  companyName: 'Cambridge Technology Enterprises',
  officialBrandName: 'Cambridge Technology',
  adapter: 'script',
  homepageUrl: 'https://www.cambridgetech.com/',
  companyCareerPage: 'https://www.cambridgetech.com/',
  officialJobsBoardUrl: 'https://cambridgetechnology.freshteam.com/jobs',
  detailUrlPattern: 'https://cambridgetechnology.freshteam.com/jobs/{opaque_id}/{slug}',
  atsPlatform: 'freshteam',
  countryFilter: 'India',
  paginationStrategy: 'official-homepage-plus-public-freshteam-board',
  extractionStrategy: 'verified-homepage-handoff+public-freshteam-board+detail-page-apply-surface',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'cambridgetech.com',
  verifiedOn: '2026-07-18',
  verifiedPublicJobCount: 8,
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.cambridgetech.com/ was the live first-party Cambridge Technology homepage, that its careers CTA labeled "See Open Positions" linked directly to the public Freshteam board at https://cambridgetechnology.freshteam.com/jobs, and that the board publicly exposed eight openings including Business Analyst, Microsoft Dynamics 365 F&O, Senior Qlik Developer, Sofware Quality Assurance, SecOps & Governance Engineer, Inside Sales, Technical Support Engineer, and Senior Engineer / Lead - EDI.',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'cambridgetechnologyenterprises/jobs.json',
}

export default CAMBRIDGE_TECHNOLOGY_ENTERPRISES_CATALOG
