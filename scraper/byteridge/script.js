import https from 'node:https'

export const CAREER_PAGE_URL = 'https://byteridge.com/careers/'

const TALENT_POOL_PATTERN = /submit\s+your\s+cv|upload\s+your\s+profile/i

const fetchTextWithHttps = (url) =>
  new Promise((resolve, reject) => {
    const request = https.get(
      url,
      {
        headers: {
          Accept: 'text/html,application/xhtml+xml',
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

export const extractOpenings = (html) => {
  const content = String(html || '')
  if (TALENT_POOL_PATTERN.test(content)) return []
  return []
}

export const createByteridgeScraper = () => ({
  async run({ fetchText = fetchTextWithHttps } = {}) {
    const html = await fetchText(CAREER_PAGE_URL)
    return extractOpenings(html)
  },
})

export const run = async () => createByteridgeScraper().run()
