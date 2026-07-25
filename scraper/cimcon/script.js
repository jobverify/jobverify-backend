export const CAREERS_PAGE_URL = 'https://cimcon.com/about-us/careers/'

export const hasEmailOnlyOpenings = (html) => (
  /CIMCON Software/i.test(html || '')
  && /Current Openings/i.test(html || '')
  && /hr@cimcon\.com/i.test(html || '')
)

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.text()
}

export const createCimconScraper = () => ({
  async run(options = {}) {
    const fetchText = options.fetchText || defaultFetchText
    const careersHtml = await fetchText(CAREERS_PAGE_URL)

    if (!hasEmailOnlyOpenings(careersHtml)) {
      throw new Error('CIMCON careers page no longer exposes the expected email-only openings notice')
    }

    return []
  },
})

export const run = async (options = {}) => createCimconScraper().run(options)
