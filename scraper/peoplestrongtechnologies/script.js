import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { PEOPLESTRONG_TECHNOLOGIES_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = PEOPLESTRONG_TECHNOLOGIES_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const JOB_LIST_URL = PROVIDER_METADATA.jobListUrl
export const ALTERNATE_JOB_LIST_URL = PROVIDER_METADATA.alternateJobListUrl
export const JOBS_API_URL = PROVIDER_METADATA.jobsApiUrl
export const SAMPLE_JOB_DETAIL_URL = PROVIDER_METADATA.sampleJobDetailUrl
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
  })

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}

const defaultFetchApiText = async (url) => {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Origin: HOMEPAGE_URL.replace(/\/$/, ''),
      Referer: HOMEPAGE_URL,
      'User-Agent': USER_AGENT,
      Accept: 'application/json,text/plain,*/*',
      'Content-Type': 'application/json',
    },
  })

  return {
    status: response.status,
    text: await response.text(),
  }
}

export const hasPublicPortalShell = (html = '') => {
  const rawHtml = String(html ?? '')

  return /<title>\s*Candidate Portal\s*<\/title>/i.test(rawHtml)
    && /main-[A-Z0-9]+\.js/i.test(rawHtml)
    && /assets\/css\/styles_v2\.css/i.test(rawHtml)
}

export const hasBrokenJobsApiSignal = (text = '') => (
  /Could not find method getRequisitionListWithPaginationBySolrBundle/i.test(String(text ?? ''))
)

export const createPeopleStrongTechnologiesScraper = () => ({
  async run({
    fetchPage = defaultFetchPage,
    fetchApiText = defaultFetchApiText,
  } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)
    if (homepage.status !== 200 || !hasPublicPortalShell(homepage.html)) {
      throw new Error('PeopleStrong verified public portal shell no longer matches the known first-party surface')
    }

    const primaryListPage = await fetchPage(JOB_LIST_URL)
    if (primaryListPage.status !== 404 || !hasPublicPortalShell(primaryListPage.html)) {
      throw new Error('PeopleStrong primary public jobs list route no longer matches the verified broken shell state')
    }

    const alternateListPage = await fetchPage(ALTERNATE_JOB_LIST_URL)
    if (alternateListPage.status !== 404 || !hasPublicPortalShell(alternateListPage.html)) {
      throw new Error('PeopleStrong alternate public jobs list route no longer matches the verified broken shell state')
    }

    const sampleDetailPage = await fetchPage(SAMPLE_JOB_DETAIL_URL)
    if (sampleDetailPage.status !== 200 || !hasPublicPortalShell(sampleDetailPage.html)) {
      throw new Error('PeopleStrong sample public detail route no longer matches the verified first-party shell')
    }

    const apiResponse = await fetchApiText(JOBS_API_URL)
    if (apiResponse.status !== 200 || !hasBrokenJobsApiSignal(apiResponse.text)) {
      throw new Error('PeopleStrong public jobs API no longer matches the verified broken state')
    }

    return []
  },
})

export const run = async (options = {}) => createPeopleStrongTechnologiesScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
