import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { runWorkdayScraper } from '../../scraper-support/myworkday/engine.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'renaultgroup'
export const COMPANY = 'Renault Group'
export const HOMEPAGE_URL = 'https://www.renaultgroup.com/en/'
export const CAREERS_URL = 'https://www.renaultgroup.com/en/careers/'
export const WORKDAY_BOARD_URL = 'https://alliancewd.wd3.myworkdayjobs.com/en-US/renault-group-careers'
export const WORKDAY_JOBS_API_URL =
  'https://alliancewd.wd3.myworkdayjobs.com/wday/cxs/alliancewd/renault-group-careers/jobs'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&amp;/gi, '&')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

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

const defaultRunWorkday = (options) => runWorkdayScraper(options)

export const hasOfficialHomepageSignal = (html) => {
  const normalized = normalizeWhitespace(html).toLowerCase()

  return normalized.includes('renault group')
    && normalized.includes('careers')
    && normalized.includes('news about the group')
    && normalized.includes('legal notices')
    && normalized.includes('security and confidentiality')
}

export const hasOfficialCareersSignal = (html) => {
  const normalized = normalizeWhitespace(html).toLowerCase()

  return normalized.includes('a career at the centre of the automotive revolution')
    && normalized.includes('joining renault group means being part of a pioneering automotive company')
    && normalized.includes('find your next job')
    && normalized.includes('view our offers')
    && normalized.includes('reknow university')
}

export const hasOfficialWorkdayBoardSignal = (html) => {
  const page = String(html ?? '')

  return /<link rel="canonical" href="https:\/\/alliancewd\.wd3\.myworkdayjobs\.com\/(?:en-US\/)?renault-group-careers/i.test(page)
    && /property="og:title" content="Careers \| Renault Group"/i.test(page)
    && /property="og:description" content="Since 1889, Renault Group has relied on a legacy of innovation/i.test(page)
    && /tenant:\s*"alliancewd"/i.test(page)
    && /siteId:\s*"renault-group-careers"/i.test(page)
    && /requestLocale:\s*"en-US"/i.test(page)
    && /appName:\s*"cxs"/i.test(page)
}

export const createRenaultGroupScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({
    fetchPage = defaultFetchPage,
    runWorkday = defaultRunWorkday,
  } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)
    if (homepage.status !== 200 || !hasOfficialHomepageSignal(homepage.html)) {
      throw new Error('Renault Group verified official homepage no longer matches the trusted first-party surface')
    }

    const careersPage = await fetchPage(CAREERS_URL)
    if (careersPage.status !== 200 || !hasOfficialCareersSignal(careersPage.html)) {
      throw new Error('Renault Group verified careers page no longer matches the trusted first-party surface')
    }

    const workdayBoard = await fetchPage(WORKDAY_BOARD_URL)
    if (workdayBoard.status !== 200 || !hasOfficialWorkdayBoardSignal(workdayBoard.html)) {
      throw new Error('Renault Group verified Workday board no longer matches the trusted public jobs surface')
    }

    const jobs = await runWorkday({
      company: COMPANY,
      source: SOURCE,
      baseUrl: WORKDAY_BOARD_URL,
      scraperDir: currentDir,
    })

    return jobs.map((job) => ({
      ...job,
      company: COMPANY,
      source: SOURCE,
      scrapedAt: now(),
    }))
  },
})

export const run = async (options = {}) => createRenaultGroupScraper(options).run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
