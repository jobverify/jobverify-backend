export const CAREER_PAGE_URL = 'https://www.federal.bank.in/careers'
export const CAREERS_PORTAL_URL = 'https://federalbankcareers.zappyhire.com/'

const CAREERS_TITLE_PATTERN = /<title>\s*Careers at Federal Bank\b[^<]*<\/title>/i
const CAREERS_WELCOME_PATTERN = /Career\s*-\s*Welcome/i
const EXPLORE_OPPORTUNITIES_LINK_PATTERN = /href=["']https:\/\/federalbankcareers\.zappyhire\.com\/?["'][^>]*>\s*Explore Opportunities\s*</i

export const hasOfficialCareersSurface = (html) => {
  const page = String(html ?? '')

  return CAREERS_TITLE_PATTERN.test(page)
    && CAREERS_WELCOME_PATTERN.test(page)
    && EXPLORE_OPPORTUNITIES_LINK_PATTERN.test(page)
}

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; JobverifyCareerScraper/1.0)',
      Accept: 'text/html,application/xhtml+xml',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.text()
}

export const createFederalBankScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const html = await fetchText(CAREER_PAGE_URL)

    if (!hasOfficialCareersSurface(html)) {
      throw new Error('Federal Bank official careers surface changed; refusing to assume no public listings')
    }

    return []
  },
})

export const run = async () => createFederalBankScraper().run()
