import https from 'node:https'

export const CAREER_PAGE_URL = 'https://www.celette.com/'

const INDIA_OFFICE_PATTERN = /celette\s+india\s+pvt\s+ltd|coimbatore\s+641062\s*\/\s*india/i
const CAREER_LINK_PATTERN = /href=["'][^"']*(career|careers|emploi|job|jobs|recruit|join-us|vacan)[^"']*["']/i

const defaultFetchText = (url) =>
  new Promise((resolve, reject) => {
    const request = https.get(
      url,
      {
        headers: {
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
        },
      },
      (response) => {
        const chunks = []

        response.on('data', (chunk) => chunks.push(chunk))
        response.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8')

          if (response.statusCode !== 200) {
            reject(new Error(`HTTP ${response.statusCode} for ${url}`))
            return
          }

          resolve(body)
        })
      },
    )

    request.on('error', reject)
  })

export const hasIndiaOfficeSignal = (html) => INDIA_OFFICE_PATTERN.test(String(html || ''))

export const hasCareerLink = (html) => CAREER_LINK_PATTERN.test(String(html || ''))

export const extractOpenings = () => []

export const createCeletteScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const html = await fetchText(CAREER_PAGE_URL)

    if (!hasIndiaOfficeSignal(html)) {
      return []
    }

    return extractOpenings(html)
  },
})

export const run = async () => createCeletteScraper().run()
