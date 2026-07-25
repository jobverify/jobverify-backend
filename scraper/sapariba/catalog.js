import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const SAP_ARIBA_CATALOG = {
  source: 'sapariba',
  companyName: 'SAP Ariba',
  adapter: 'script',
  modulePath: path.join(currentDir, 'script.js'),
  companyCareerPage: 'https://www.sap.com/about/careers.html',
  companyDomain: 'sap.com',
  careersUrl: 'https://www.sap.com/about/careers.html',
  officialBrandName: 'SAP Ariba',
  parentBrandName: 'SAP',
  atsPlatform: 'generic-parent-brand-careers-only',
  countryFilter: 'India',
  paginationStrategy: 'fail-closed',
  extractionStrategy: 'exact-name-absence-on-generic-sap-careers',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary: 'Saturday, July 18, 2026: SAP exposed only the generic SAP careers search surface and public SAP job detail pages. No trustworthy exact-name SAP Ariba public careers or jobs surface was available, so this provider stays fail-closed.',
}

export default SAP_ARIBA_CATALOG
