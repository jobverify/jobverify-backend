const WELLFOUND_HOST_PATTERN = /(^|\.)wellfound\.com$/i
const WELLFOUND_JOB_PATH_PATTERN = /^\/jobs\/(\d+)-[a-z0-9-]+/i
const WELLFOUND_COMPANY_JOBS_PATH_PATTERN = /^\/company\/[^/?#]+\/jobs\/?$/i

const normalizeForMatch = (value) =>
  String(value || '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .toLowerCase()

const normalizeSlug = (value) =>
  normalizeForMatch(value)
    .split(/\s+/)
    .filter(Boolean)
    .join('-')

const decodeHtml = (value = '') =>
  String(value)
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(Number.parseInt(code, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')

const stripTags = (value = '') =>
  decodeHtml(String(value).replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()

const getAbsoluteUrl = (href, baseUrl) => {
  try {
    return new URL(decodeHtml(href), baseUrl).toString()
  } catch {
    return null
  }
}

const getUrlHost = (value) => {
  try {
    return new URL(value).hostname
  } catch {
    return ''
  }
}

const getUrlPath = (value) => {
  try {
    return new URL(value).pathname
  } catch {
    return ''
  }
}

const extractAnchors = ({ html, baseUrl }) => {
  const anchors = []
  const anchorPattern = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi
  let match

  while ((match = anchorPattern.exec(String(html || ''))) !== null) {
    const [, attributes, body] = match
    const hrefMatch = attributes.match(/\bhref\s*=\s*(["'])(.*?)\1/i)
    if (!hrefMatch) continue

    const href = getAbsoluteUrl(hrefMatch[2], baseUrl)
    if (!href) continue

    anchors.push({
      href,
      text: stripTags(body),
      index: match.index,
    })
  }

  return anchors
}

const hasWellfoundHost = (url) => WELLFOUND_HOST_PATTERN.test(getUrlHost(url))

const isWellfoundJobUrl = (url) =>
  hasWellfoundHost(url) && WELLFOUND_JOB_PATH_PATTERN.test(getUrlPath(url))

const isWellfoundCompanyJobsUrl = (url) =>
  hasWellfoundHost(url) && WELLFOUND_COMPANY_JOBS_PATH_PATTERN.test(getUrlPath(url))

const getJobIdFromUrl = (url) => {
  const match = getUrlPath(url).match(WELLFOUND_JOB_PATH_PATTERN)
  return match?.[1] || url
}

const isIndiaLocation = (value = '') =>
  /\bindia\b|bengaluru|bangalore|remote/i.test(value)

const getCityFromLocation = (value = '') => {
  const normalized = String(value || '').trim()
  if (!normalized) return 'Bangalore'
  if (/remote/i.test(normalized)) return 'Remote'
  return normalized.split(',')[0]?.trim() || 'Bangalore'
}

const getRemoteStatus = (value = '') => {
  if (/remote/i.test(value)) return 'Remote'
  if (/hybrid/i.test(value)) return 'Hybrid'
  return 'On-site'
}

const extractFieldText = (snippet, patterns) => {
  for (const pattern of patterns) {
    const match = snippet.match(pattern)
    const value = stripTags(match?.[1] || '')
    if (value) return value
  }

  return null
}

const extractJobSnippet = ({ html, anchorIndex }) => {
  const start = Math.max(
    html.lastIndexOf('<article', anchorIndex),
    html.lastIndexOf('<li', anchorIndex),
    html.lastIndexOf('<div', anchorIndex),
    0,
  )
  const nextArticle = html.indexOf('<article', anchorIndex + 1)
  const nextListItem = html.indexOf('<li', anchorIndex + 1)
  const nextContainer = [nextArticle, nextListItem]
    .filter((index) => index > anchorIndex)
    .sort((left, right) => left - right)[0]
  const end = nextContainer > -1 ? nextContainer : Math.min(html.length, anchorIndex + 2000)

  return html.slice(start, end)
}

export const findCompanyJobsUrl = ({ html, companyName, baseUrl }) => {
  const normalizedCompanyName = normalizeForMatch(companyName)
  const companySlug = normalizeSlug(companyName)
  const anchors = extractAnchors({ html, baseUrl })

  const matchingJobsLink = anchors.find((anchor) => {
    if (!isWellfoundCompanyJobsUrl(anchor.href)) return false

    const path = getUrlPath(anchor.href).toLowerCase()
    const text = normalizeForMatch(anchor.text)

    return path.includes(`/company/${companySlug}/jobs`)
      || text.includes(normalizedCompanyName)
      || normalizedCompanyName.includes(text)
  })

  if (matchingJobsLink) return matchingJobsLink.href

  const matchingCompanyLink = anchors.find((anchor) => {
    if (!hasWellfoundHost(anchor.href)) return false

    const path = getUrlPath(anchor.href).toLowerCase()
    const text = normalizeForMatch(anchor.text)

    return path === `/company/${companySlug}`
      || text === normalizedCompanyName
  })

  if (!matchingCompanyLink) return null

  const companyUrl = new URL(matchingCompanyLink.href)
  companyUrl.pathname = companyUrl.pathname.replace(/\/?$/, '/jobs')
  companyUrl.search = ''
  companyUrl.hash = ''
  return companyUrl.toString()
}

export const extractWellfoundJobs = ({ html, provider, jobsUrl }) => {
  const anchors = extractAnchors({ html, baseUrl: jobsUrl })
  const jobs = []
  const seen = new Set()

  for (const anchor of anchors) {
    if (!isWellfoundJobUrl(anchor.href) || seen.has(anchor.href)) continue

    const snippet = extractJobSnippet({ html: String(html || ''), anchorIndex: anchor.index })
    const location = extractFieldText(snippet, [
      /<[^>]+\bdata-location\b[^>]*>([\s\S]*?)<\/[^>]+>/i,
      /<[^>]+class=["'][^"']*(?:location|job-location)[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/i,
      /\b((?:Bengaluru|Bangalore|Remote)[^<]{0,80}India)\b/i,
    ])

    if (location && !isIndiaLocation(location)) continue

    const title = anchor.text
    if (!title) continue

    const jobId = getJobIdFromUrl(anchor.href)
    const jobLocation = location || 'Bangalore, India'

    jobs.push({
      title,
      company: provider.companyName,
      location: jobLocation,
      city: getCityFromLocation(jobLocation),
      country: 'India',
      link: anchor.href,
      applyUrl: anchor.href,
      sourceUrl: anchor.href,
      source: provider.source,
      jobId,
      requisitionId: jobId,
      department: null,
      employmentType: extractFieldText(snippet, [
        /\b(Full-time|Full time|Part-time|Part time|Internship|Contract)\b/i,
      ]),
      jobDescription: extractFieldText(snippet, [
        /<p\b[^>]*>([\s\S]*?)<\/p>/i,
      ]),
      remoteStatus: getRemoteStatus(jobLocation),
      atsPlatform: provider.atsPlatform || 'wellfound-directory',
    })
    seen.add(anchor.href)
  }

  return jobs
}

export const isChallengeGatedDirectoryPage = (html = '') =>
  /please enable javascript|verify you are human|captcha|challenge-platform|cf-browser-verification/i
    .test(String(html))

export const createAggregateHiringSignalJob = ({ provider, sourceUrl }) => {
  const openingCount = Number(provider.wellfoundOpeningsShown || 0)
  const openingText = `${openingCount} current opening${openingCount === 1 ? '' : 's'}`
  const locationEvidence = provider.locationEvidence || 'Bangalore hiring signal'

  return {
    title: `Current openings at ${provider.companyName}`,
    company: provider.companyName,
    location: 'Bangalore, India',
    city: 'Bangalore',
    country: 'India',
    link: sourceUrl,
    applyUrl: sourceUrl,
    sourceUrl,
    source: provider.source,
    jobId: `${provider.source}-current-openings`,
    requisitionId: `${provider.source}-current-openings`,
    department: null,
    employmentType: null,
    jobDescription: `${provider.companyName} showed ${openingText} on ${provider.directorySourceType || 'the verified hiring directory'} at ${provider.companyCareerPage}. ${locationEvidence}. Verified on ${provider.verifiedOn}.`,
    publicExperienceChecked: true,
    remoteStatus: null,
    atsPlatform: provider.atsPlatform || 'wellfound-directory',
  }
}

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'User-Agent': 'JobifyScraper/1.0',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.text()
}

export const createWellfoundDirectoryScraper = (provider) => ({
  async run({ fetchText = defaultFetchText } = {}) {
    let jobsUrl = provider.companyCareerPage

    try {
      const directoryHtml = await fetchText(provider.companyCareerPage)
      jobsUrl = findCompanyJobsUrl({
        html: directoryHtml,
        companyName: provider.companyName,
        baseUrl: provider.companyCareerPage,
      }) || provider.companyCareerPage

      if (jobsUrl !== provider.companyCareerPage) {
        const jobsHtml = await fetchText(jobsUrl)
        if (!isChallengeGatedDirectoryPage(jobsHtml)) {
          const jobs = extractWellfoundJobs({ html: jobsHtml, provider, jobsUrl })
          if (jobs.length > 0) return jobs
        }
      }
    } catch {
      jobsUrl = provider.companyCareerPage
    }

    return [createAggregateHiringSignalJob({ provider, sourceUrl: jobsUrl })]
  },
})
