import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const INDIAMART_CATALOG = {
  source: 'indiamart',
  companyName: 'IndiaMART',
  officialBrandName: 'IndiaMART InterMESH Ltd.',
  adapter: 'script',
  modulePath: path.join(currentDir, 'script.js'),
  companyCareerPage: 'https://careers.indiamart.com/',
  homepageUrl: 'https://careers.indiamart.com/',
  leadershipJobsPageUrl: 'https://careers.indiamart.com/leadership-product-tech-corporate-roles.html',
  jobsBoardUrl: 'https://joblist.klimb.io/indiamart',
  klimbCustomerId: '5dd7966c6c4d197f68105048',
  companyDomain: 'indiamart.com',
  atsPlatform: 'klimb',
  countryFilter: 'India',
  paginationStrategy: 'server-rendered-first-page+lastPosId-json-pagination',
  extractionStrategy: 'verified-first-party-careers-microsite+verified-klimb-embed+public-board-html-and-json-pages',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  dryRunFile: 'indiamart/jobs.json',
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary:
    'Verified on July 16, 2026 that https://careers.indiamart.com/ is the official IndiaMART careers microsite, that https://careers.indiamart.com/leadership-product-tech-corporate-roles.html embeds the public Klimb board for company indiamart, and that the public board at https://joblist.klimb.io/indiamart server-renders current openings and supports additional lastPosId pagination requests. Verified detail pages such as https://joblist.klimb.io/indiamart/6a58d49959bf203aed056b9a?source=careers also expose stable public apply markers, so the scraper is implemented against the verified first-party careers chain plus the public Klimb board.',
}

export default INDIAMART_CATALOG
