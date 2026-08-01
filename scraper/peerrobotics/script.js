import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'peerrobotics'
export const COMPANY = 'Peer Robotics'
export const HOMEPAGE_URL = 'https://peerrobotics.ai/'
export const ABOUT_URL = 'https://peerrobotics.ai/about'
export const WELLFOUND_JOBS_URL = 'https://wellfound.com/company/peer-robotics/jobs'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#39;|&apos;|&#x27;/gi, "'")
  .replace(/&quot;/gi, '"')
  .replace(/[\u2018\u2019]/g, "'")
  .replace(/[\u201c\u201d]/g, '"')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,text/xml;q=0.9,*/*;q=0.8',
    },
  })

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}

export const hasOfficialHomepageSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml).toLowerCase()

  return rawHtml.includes('data-wf-domain="peerrobotics.ai"')
    && rawHtml.includes('<title>Peer Robotics | Collaborative Mobile Robots</title>')
    && normalized.includes('peer robotics | collaborative mobile robots')
    && normalized.includes('designed to work with humans')
    && normalized.includes('enabling automation using collaborative mobile robots')
    && normalized.includes('shaping the future of automation, with human-centric robots')
}

export const hasOfficialAboutSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml).toLowerCase()

  return rawHtml.includes('data-wf-domain="peerrobotics.ai"')
    && rawHtml.includes('<title>About Peer Robotics | Revolutionizing the Robotics Industry</title>')
    && normalized.includes('about peer robotics | revolutionizing the robotics industry')
    && normalized.includes('innovating a manufacturing future together')
    && normalized.includes("at peer robotics, we're revolutionizing manufacturing")
    && normalized.includes("where is peer robotics based out of?")
    && normalized.includes('we are headquartered out of the usa with our r&d center in india.')
}

export const extractWellfoundJobsUrl = (html) => {
  for (const match of String(html ?? '').matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>/gi)) {
    try {
      const url = new URL(match[1], ABOUT_URL)

      if (
        url.hostname === 'wellfound.com'
        && url.pathname.replace(/\/+$/, '') === '/company/peer-robotics/jobs'
      ) {
        return url.toString()
      }
    } catch {
      continue
    }
  }

  return null
}

export const isVerifiedWellfoundChallenge = (page) => {
  const rawHtml = String(page?.html ?? '')
  const normalized = normalizeWhitespace(rawHtml).toLowerCase()
  const responseUrl = String(page?.url ?? '')

  return Number(page?.status) === 403
    && normalized.includes('please enable js and disable any ad blocker')
    && rawHtml.toLowerCase().includes('captcha-delivery.com')
    && (
      responseUrl === WELLFOUND_JOBS_URL
      || responseUrl.startsWith('https://wellfound.com/')
    )
}

export const createPeerRoboticsScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)

    if (homepage.status !== 200 || !hasOfficialHomepageSignal(homepage.html)) {
      throw new Error('Peer Robotics official homepage no longer matches the verified first-party surface')
    }

    const aboutPage = await fetchPage(ABOUT_URL)

    if (aboutPage.status !== 200 || !hasOfficialAboutSignal(aboutPage.html)) {
      throw new Error('Peer Robotics official about page no longer matches the verified first-party hiring surface')
    }

    const wellfoundJobsUrl = extractWellfoundJobsUrl(aboutPage.html)
    if (wellfoundJobsUrl !== WELLFOUND_JOBS_URL) {
      throw new Error('Peer Robotics about page no longer exposes the verified hiring handoff')
    }

    const wellfoundBoard = await fetchPage(WELLFOUND_JOBS_URL)
    if (isVerifiedWellfoundChallenge(wellfoundBoard)) {
      return []
    }

    throw new Error('Peer Robotics Wellfound jobs board no longer matches the verified challenge-gated public surface')
  },
})

export const run = async (options = {}) => createPeerRoboticsScraper().run(options)

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
