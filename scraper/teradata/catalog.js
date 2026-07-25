import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const TERADATA_CATALOG = {
  source: 'teradata',
  companyName: 'Teradata',
  officialBrandName: 'Teradata',
  adapter: 'script',
  modulePath: path.join(currentDir, 'script.js'),
  companyCareerPage: 'https://www.teradata.com/about-us/careers',
  companyDomain: 'teradata.com',
  jobsApiUrl: 'https://careers.teradata.com/graphql',
  atsPlatform: 'gr8people-graphql',
  countryFilter: 'India',
  paginationStrategy: 'single-graphql-search-request',
  extractionStrategy: 'verified-first-party-careers-page+gr8people-graphql-search+india-location-filter',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.teradata.com/about-us/careers is the live first-party Teradata careers page and that its Explore careers handoff resolves to https://careers.teradata.com/jobs. Live verification on the same date confirmed the public GraphQL search contract on careers.teradata.com returning open postings and India aggregations, including India roles such as Senior Applied Data Scientist and Product Legal Counsel.',
}

export default TERADATA_CATALOG
