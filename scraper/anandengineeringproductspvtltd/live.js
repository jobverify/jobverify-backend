import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

export const SOURCE = 'anandengineeringproductspvtltd'
export const COMPANY_NAME = 'Anand Engineering Products Pvt Ltd.'
export const HOMEPAGE_URL = 'https://anandengg.in/'
export const CAREERS_URL = 'https://anandengg.in/open-positions/'

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; JobverifyCareerScraper/1.0)',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 20000,
})

const decodeHtml = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([a-f0-9]+);/gi, (_, n) => String.fromCodePoint(Number.parseInt(n, 16)))
  .replace(/&amp;/gi, '&')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&quot;/gi, '"')
  .replace(/&apos;|&#39;/gi, "'")

const textFromHtml = (value) => decodeHtml(String(value ?? '')
  .replace(/<br\s*\/?\s*>/gi, ' ')
  .replace(/<[^>]+>/g, ' '))
  .replace(/\s+/g, ' ')
  .trim()

export const hasHomepageSignal = (html) => {
  const page = String(html ?? '')
  return /<title>\s*Anand Engineering\s*\|\s*Heavy Steel Fabrication\s*&amp;\s*Manufacturing\s*<\/title>/i.test(page)
    && /href=["']https:\/\/anandengg\.in\/open-positions\/["']/i.test(page)
    && /admin@anandengg\.in/i.test(page)
    && /Thuvakudi/i.test(page)
}

const listingUrl = (page) => page === 1 ? CAREERS_URL : `${CAREERS_URL}${page}/`

export const parseListingPage = (html, page) => {
  const document = String(html ?? '')
  const expectedUrl = listingUrl(page)
  const canonical = document.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)?.[1]
  const anchor = document.match(/<div\b[^>]*class=["']e-load-more-anchor["'][^>]*data-page=["'](\d+)["'][^>]*data-max-page=["'](\d+)["']/i)
  if (!/<title>\s*Open Positions - Anand Engineering\s*<\/title>/i.test(document)
    || canonical !== CAREERS_URL
    || Number(anchor?.[1]) !== page
    || !Number.isInteger(Number(anchor?.[2]))
    || Number(anchor?.[2]) < page
    || Number(anchor?.[2]) > 100) {
    throw new Error(`Anand Engineering verified first-party listing changed: ${expectedUrl}`)
  }

  const cardRx = /<div\b(?=[^>]*data-elementor-type=["']loop-item["'])(?=[^>]*class=["'][^"']*\bjob-opening\b[^"']*["'])[^>]*>/gi
  const starts = [...document.matchAll(cardRx)]
  if (starts.length === 0) throw new Error(`Anand Engineering listing cards missing: ${expectedUrl}`)
  const cards = starts.map((match, index) => {
    const slice = document.slice(match.index, starts[index + 1]?.index ?? document.length)
    const jobId = match[0].match(/\bpost-(\d+)\b/)?.[1]
    const title = textFromHtml(slice.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1])
    const applyUrl = slice.match(/href=["'](https:\/\/anandengg\.in\/job-opening\/[a-z0-9-]+\/?)["']/i)?.[1]
    const cardText = textFromHtml(slice)
    const dateText = cardText.match(/\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}\b/i)?.[0]
    const postingDate = dateText ? new Date(`${dateText} GMT`).toISOString().slice(0, 10) : null
    const experienceRequired = cardText.match(/\b\d+\s*(?:[-–]\s*\d+)?\s+Years\b/i)?.[0] || null
    if (!jobId || !title || !applyUrl) throw new Error(`Anand Engineering first-party job link or card changed: ${expectedUrl}`)
    return { jobId, title, applyUrl, postingDate, experienceRequired }
  })
  return { cards, maxPage: Number(anchor[2]) }
}

export const parseJobDetail = (html, card) => {
  const document = String(html ?? '')
  const canonical = document.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)?.[1]
  const title = textFromHtml(document.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1])
  const descriptionHtml = document.match(/<h3\b[^>]*>\s*(?:<strong>)?Job Description(?:<\/strong>)?\s*<\/h3>([\s\S]*?)<\/div>/i)?.[1]
  const jobDescription = textFromHtml(descriptionHtml)
  if (canonical !== card.applyUrl || title !== card.title || !jobDescription
    || !/<form\b[^>]*name=["']Career Form["']/i.test(document)
    || !/Application Form/i.test(document)) {
    throw new Error(`Anand Engineering verified job detail changed: ${card.applyUrl}`)
  }
  return {
    source: SOURCE,
    company: COMPANY_NAME,
    title,
    jobId: card.jobId,
    requisitionId: card.jobId,
    sourceUrl: card.applyUrl,
    applyUrl: card.applyUrl,
    link: card.applyUrl,
    location: 'India',
    country: 'India',
    postingDate: card.postingDate,
    experienceRequired: card.experienceRequired,
    jobDescription,
  }
}

export const createAnandEngineeringProductsScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const homepage = await fetchText(HOMEPAGE_URL)
    if (!hasHomepageSignal(homepage)) throw new Error('Anand Engineering verified official homepage changed')

    const cards = []
    let maxPage = 1
    for (let page = 1; page <= maxPage; page += 1) {
      const parsed = parseListingPage(await fetchText(listingUrl(page)), page)
      maxPage = parsed.maxPage
      cards.push(...parsed.cards)
    }

    const jobs = []
    const seen = new Set()
    for (const card of cards) {
      if (seen.has(card.jobId)) continue
      seen.add(card.jobId)
      const detail = parseJobDetail(await fetchText(card.applyUrl), card)
      jobs.push({ ...detail, scrapedAt: new Date().toISOString() })
    }
    return jobs
  },
})

export const run = async (options = {}) => createAnandEngineeringProductsScraper().run(options)
