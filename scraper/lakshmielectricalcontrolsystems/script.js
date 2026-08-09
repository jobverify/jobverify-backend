import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'lakshmielectricalcontrolsystems'
export const COMPANY = 'Lakshmi Electrical Control Systems'
export const HOMEPAGE_URL = 'https://www.lecsindia.com/'
export const CONTACT_URL = 'https://www.lecsindia.com/contact-us/'
export const VERIFIED_ON = '2026-08-07'
export const VERIFIED_SURFACE_SUMMARY = 'Verified on Friday, August 7, 2026 that https://www.lecsindia.com/ and https://www.lecsindia.com/contact-us/ remained the live first-party Lakshmi Electrical Control Systems public surfaces. Both verified pages remained slow enough to require a direct extended-timeout fallback during live dry-run verification, but neither exposed a trustworthy careers link, public ATS handoff, role cards, or JobPosting markup.'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const CAREER_LIKE_LINK_PATTERN = /href=["']https?:\/\/(?:www\.)?lecsindia\.com\/(?:careers?|jobs?|join-us|work-with-us|openings?|vacanc(?:y|ies))(?:[\/#?][^"']*)?["']|href=["']\/(?:careers?|jobs?|join-us|work-with-us|openings?|vacanc(?:y|ies))(?:[\/#?][^"']*)?["']/i

const CAREER_LIKE_TEXT_PATTERN = />\s*(?:careers?|jobs?|job openings|current openings|join us|work with us)\s*</i

const PUBLIC_JOBS_SIGNAL_PATTERNS = [
  /"@type"\s*:\s*"JobPosting"/i,
  /\bcurrent openings\b/i,
  /\bopen positions\b/i,
  /\bjob openings\b/i,
  /\bsearch jobs\b/i,
  /\bapply now\b/i,
  /\bjob description\b/i,
  /\bjoin our team\b/i,
  /\bvacanc(?:y|ies)\b/i,
  /\bupload your resume\b/i,
  /\bsubmit (?:your )?resume\b/i,
  /\bresume upload\b/i,
  /boards\.greenhouse\.io/i,
  /jobs\.lever\.co/i,
  /ashbyhq\.com/i,
  /myworkdayjobs/i,
  /workdayjobs/i,
  /smartrecruiters/i,
  /jobvite/i,
  /zohorecruit/i,
]

const normalizeWhitespace = (value) =>
  String(value ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#39;|&apos;|&rsquo;|&lsquo;|&#x27;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, '&')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const normalizeText = (value) => normalizeWhitespace(value).toLowerCase()

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  attempts: 1,
  label: SOURCE,
  timeoutMs: 10000,
})

const defaultFetchTextWithExtendedTimeout = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  attempts: 1,
  label: SOURCE,
  timeoutMs: 90000,
})

const isExtendedTimeoutFallbackError = (error) =>
  /HTTP (?:403|429)\b|fetch failed|timed out|timeout|could not connect|und_err_connect_timeout|ssl\/tls secure channel|econnreset|unable to/i
    .test(String(error?.message ?? error ?? ''))

const fetchVerifiedText = async (
  url,
  fetchText,
  fetchTextWithExtendedTimeout,
) => {
  try {
    return await fetchText(url)
  } catch (error) {
    if (!isExtendedTimeoutFallbackError(error)) {
      throw error
    }

    return fetchTextWithExtendedTimeout(url)
  }
}

export const hasOfficialHomepageSignal = (html) => {
  const normalized = normalizeText(html)

  return normalized.includes('control panel manufacturers | smart meter manufacturers - lecs ltd')
    && normalized.includes('lakshmi electrical control systems limited (lecs)')
    && normalized.includes('control panels')
    && normalized.includes('engineering plastic components')
    && normalized.includes('smart meters')
    && normalized.includes('industries we serve')
    && normalized.includes('factory address lakshmi electrical control systems limited')
    && normalized.includes('arasur, coimbatore - 641 407 tamilnadu, india')
    && normalized.includes('info@lecsindia.com')
}

export const hasOfficialContactSignal = (html) => {
  const normalized = normalizeText(html)

  const hasLegacyContactBlock = normalized.includes('lakshmi electrical control systems limited, arasur, coimbatore - 641 407, tamilnadu, india')
    && normalized.includes("let's talk")
    && normalized.includes('other than business enquiry e-mail us')
    && normalized.includes('contact@lecsindia.com')

  const hasCurrentContactBlock = normalized.includes('get in touch')
    && normalized.includes('factory address')
    && normalized.includes('arasur, coimbatore - 641 407 tamilnadu, india')

  return normalized.includes('contact us')
    && normalized.includes('phone: +91-422-6616500')
    && normalized.includes('info@lecsindia.com')
    && (hasLegacyContactBlock || hasCurrentContactBlock)
}

export const hasFirstPartyCareerLikeLink = (html) =>
  CAREER_LIKE_LINK_PATTERN.test(String(html ?? ''))
  || CAREER_LIKE_TEXT_PATTERN.test(String(html ?? ''))

export const hasPublicJobsSignal = (html) =>
  PUBLIC_JOBS_SIGNAL_PATTERNS.some((pattern) => pattern.test(String(html ?? '')))

export const createLakshmiElectricalControlSystemsScraper = () => ({
  async run({
    fetchText = defaultFetchText,
    fetchTextWithExtendedTimeout = defaultFetchTextWithExtendedTimeout,
  } = {}) {
    const homepageHtml = await fetchVerifiedText(
      HOMEPAGE_URL,
      fetchText,
      fetchTextWithExtendedTimeout,
    )
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('Lakshmi Electrical Control Systems verified official homepage no longer matches the known public surface')
    }

    if (hasPublicJobsSignal(homepageHtml)) {
      throw new Error('Lakshmi Electrical Control Systems homepage now exposes public jobs')
    }

    if (hasFirstPartyCareerLikeLink(homepageHtml)) {
      throw new Error('Lakshmi Electrical Control Systems homepage now exposes a first-party careers or jobs path')
    }

    const contactHtml = await fetchVerifiedText(
      CONTACT_URL,
      fetchText,
      fetchTextWithExtendedTimeout,
    )
    if (!hasOfficialContactSignal(contactHtml)) {
      throw new Error('Lakshmi Electrical Control Systems verified official contact surface no longer matches the known public surface')
    }

    if (hasPublicJobsSignal(contactHtml)) {
      throw new Error('Lakshmi Electrical Control Systems contact surface now exposes public jobs')
    }

    if (hasFirstPartyCareerLikeLink(contactHtml)) {
      throw new Error('Lakshmi Electrical Control Systems contact surface now exposes a first-party careers or jobs path')
    }

    return []
  },
})

export const run = async (options = {}) => createLakshmiElectricalControlSystemsScraper().run(options)

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
