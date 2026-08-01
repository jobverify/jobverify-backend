import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createBrowserFetchSession } from '../../scraper-support/shared/browserFetch.js'
import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import { AINDRA_SYSTEMS_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = AINDRA_SYSTEMS_CATALOG.source
export const COMPANY = AINDRA_SYSTEMS_CATALOG.companyName
export const HOMEPAGE_URL = AINDRA_SYSTEMS_CATALOG.companyCareerPage
export const CANDIDATE_HOMEPAGE_URLS = [
  HOMEPAGE_URL,
  'https://aindra.in/',
]
export const APPLICATION_EMAIL = AINDRA_SYSTEMS_CATALOG.applicationEmail
export const APPLICATION_URL = `mailto:${APPLICATION_EMAIL}`
export const PROVIDER_METADATA = AINDRA_SYSTEMS_CATALOG

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const BANGALORE_LOCATION = 'Bangalore, Karnataka, India'

const decodeHtml = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 16)))
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&#8217;|&rsquo;/gi, "'")
  .replace(/&#8211;|&ndash;/gi, '-')
  .replace(/&#8212;|&mdash;/gi, '-')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => {
  const normalized = decodeHtml(String(value ?? ''))
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  decodeHtml(String(value ?? ''))
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' '),
)

const slugify = (value) => normalizeWhitespace(value)
  ?.toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || null

const extractFirst = (html, pattern) => normalizeWhitespace(String(html ?? '').match(pattern)?.[1])

const extractListItems = (html) => [...String(html ?? '').matchAll(/<li>([\s\S]*?)<\/li>/gi)]
  .map((match) => stripTags(match[1]))
  .filter(Boolean)

const extractArticleText = (articleHtml, className) => stripTags(
  extractFirst(
    articleHtml,
    new RegExp(`<div class="${className}">([\\s\\S]*?)<\\/div>`, 'i'),
  ),
)

const extractQualification = (articleHtml) => stripTags(
  extractFirst(
    articleHtml,
    /<div class="qualification">[\s\S]*?<p>([\s\S]*?)<\/p>[\s\S]*?<\/div>/i,
  ),
)

const inferLocation = (value) => {
  const normalized = normalizeWhitespace(value)?.toLowerCase() || ''

  if (normalized.includes('bangalore')) {
    return {
      location: BANGALORE_LOCATION,
      city: 'Bangalore',
      country: 'India',
    }
  }

  return {
    location: null,
    city: null,
    country: 'India',
  }
}

const buildJobDescription = ({ summary, companyProfile }) => normalizeWhitespace(
  `${summary} ${companyProfile} Apply via ${APPLICATION_EMAIL}.`,
)

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')
  const text = stripTags(page)

  return /<title>\s*AINDRA1\s*\|\s*Home\s*<\/title>/i.test(page)
    && text.includes('We are an AI powered MedTech company')
    && text.includes('Join us at Aindra')
    && text.includes('contactus@aindra.in')
    && />\s*Careers\s*</i.test(page)
}

export const extractOpenings = (html, { sourceUrl = HOMEPAGE_URL } = {}) => {
  if (!hasOfficialHomepageSignal(html)) {
    throw new Error('Aindra Systems verified official homepage changed')
  }

  const openings = [...String(html ?? '').matchAll(/<article class="career-opening">([\s\S]*?)<\/article>/gi)]
    .map((match) => {
      const articleHtml = match[1]
      const title = extractFirst(articleHtml, /<h3>([\s\S]*?)<\/h3>/i)
      const summary = extractFirst(articleHtml, /<p class="summary">([\s\S]*?)<\/p>/i)
      const companyProfile = extractArticleText(articleHtml, 'company-profile')
      const experienceRequired = normalizeWhitespace(
        extractArticleText(articleHtml, 'experience')?.replace(/^Experience:\s*/i, ''),
      )
      const minimumQualification = extractQualification(articleHtml)
      const requiredSkills = extractListItems(
        extractFirst(articleHtml, /<div class="(?:key-skills|required-skills)">([\s\S]*?)<\/div>/i),
      )
      const applyUrl = normalizeWhitespace(
        extractFirst(articleHtml, /<a href="(mailto:contactus@aindra\.in)">contactus@aindra\.in<\/a>/i),
      )
      const identity = slugify(title)
      const { location, city, country } = inferLocation(`${summary} ${companyProfile}`)

      if (!title || !summary || !companyProfile || !applyUrl || !identity) {
        return null
      }

      return {
        title,
        company: COMPANY,
        department: null,
        location,
        city,
        country,
        jobId: `${SOURCE}-${identity}`,
        requisitionId: `${SOURCE}-${identity}`,
        sourceUrl,
        applyUrl,
        employmentType: null,
        experienceRequired,
        minimumQualification,
        preferredQualification: null,
        requiredSkills,
        postingDate: null,
        closingDate: null,
        jobDescription: buildJobDescription({ summary, companyProfile }),
      }
    })
    .filter(Boolean)

  if (openings.length === 0) {
    throw new Error('Aindra Systems verified public role list changed or disappeared')
  }

  return openings
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const isTrustedUnavailableFailure = (error) => {
  const message = String(error?.message ?? error ?? '').toLowerCase()

  return message.includes('enotfound')
    || message.includes('getaddrinfo')
    || message.includes('could not be resolved')
    || message.includes('unable to verify the first certificate')
    || message.includes('unable_to_verify_leaf_signature')
    || message.includes('err_cert_authority_invalid')
    || (message.includes('net::err_failed') && message.includes('aindra.in'))
    || message.includes('certificate')
}

const isBrowserFallbackError = (error) =>
  /HTTP (?:403|429)\b|fetch failed|timed out|timeout|could not connect|und_err_connect_timeout|ssl\/tls secure channel|econnreset|unable to/i
    .test(String(error?.message ?? error ?? ''))

export const createAindraSystemsScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchText = defaultFetchText, fetchBrowserText, now: overrideNow } = {}) {
    let browserSession = null

    const getBrowserSession = async () => {
      if (!browserSession) {
        browserSession = await createBrowserFetchSession({ userAgent: USER_AGENT })
      }

      return browserSession
    }

    const browserTextFetcher = fetchBrowserText || (async (url) => {
      const session = await getBrowserSession()
      return session.fetchText(url)
    })

    const fetchPageText = async (url) => {
      try {
        return await fetchText(url)
      } catch (error) {
        if (!isBrowserFallbackError(error)) {
          throw error
        }

        return browserTextFetcher(url)
      }
    }

    try {
      for (const url of CANDIDATE_HOMEPAGE_URLS) {
        try {
          const homepageHtml = await fetchPageText(url)
          const jobs = extractOpenings(homepageHtml, { sourceUrl: url })

          return jobs.map((job) => ({
            ...job,
            source: SOURCE,
            link: job.applyUrl || job.sourceUrl,
            scrapedAt: (overrideNow || now)(),
          }))
        } catch (error) {
          if (isTrustedUnavailableFailure(error)) {
            continue
          }

          throw error
        }
      }

      return []
    } finally {
      if (browserSession) {
        await browserSession.close()
      }
    }
  },
})

export const run = async (options = {}) => createAindraSystemsScraper().run(options)

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
