import assert from 'node:assert/strict'
import test from 'node:test'

const loadBikayiModule = async () => {
  try {
    return await import('../bikayi/script.js')
  } catch {
    assert.fail('Expected Bikayi scraper module at ../bikayi/script.js')
  }
}

const notionShellHtml = `
  <html>
    <head>
      <title>Notion</title>
    </head>
    <body>
      <noscript>JavaScript must be enabled in order to use Notion.</noscript>
      <script src="/_assets/app-98df39fdab45903f.js"></script>
    </body>
  </html>
`

test('Bikayi recognizes the verified first-party redirect to the Notion memo shell without stable public job links', async () => {
  const bikayi = await loadBikayiModule()

  assert.equal(bikayi.SOURCE, 'bikayi')
  assert.equal(bikayi.COMPANY, 'Bikayi')
  assert.equal(bikayi.HOMEPAGE_URL, 'https://bikayi.com/')
  assert.equal(bikayi.CAREERS_URL, 'https://bikayi.com/careers')
  assert.equal(bikayi.EXPECTED_CAREERS_REDIRECT_URL, 'https://bikglobal.notion.site/bikayi-memo')
  assert.equal(
    bikayi.hasOfficialMemoRedirectSignal({
      url: 'https://bikglobal.notion.site/bikayi-memo',
      html: notionShellHtml,
    }),
    true,
  )
  assert.deepEqual(
    bikayi.extractSuspiciousPublicJobLinks(notionShellHtml, 'https://bikglobal.notion.site/bikayi-memo'),
    [],
  )
})

test('Bikayi returns no jobs only while the verified homepage and careers route both redirect to the ATS-free memo shell', async () => {
  const bikayi = await loadBikayiModule()
  const requestedUrls = []

  const jobs = await bikayi.createBikayiScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === bikayi.HOMEPAGE_URL) {
        return { status: 200, url: bikayi.EXPECTED_CAREERS_REDIRECT_URL, html: notionShellHtml }
      }

      if (url === bikayi.CAREERS_URL) {
        return {
          status: 200,
          url: 'https://bikglobal.notion.site/bikayi-memo',
          html: notionShellHtml,
        }
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [bikayi.HOMEPAGE_URL, bikayi.CAREERS_URL])
  assert.deepEqual(jobs, [])
})

test('Bikayi fails closed when the redirected careers surface exposes public ATS links', async () => {
  const bikayi = await loadBikayiModule()

  await assert.rejects(
    bikayi.createBikayiScraper().run({
      fetchPage: async (url) => {
        if (url === bikayi.HOMEPAGE_URL) {
          return { status: 200, url: bikayi.EXPECTED_CAREERS_REDIRECT_URL, html: notionShellHtml }
        }
        return {
          status: 200,
          url: 'https://bikglobal.notion.site/bikayi-memo',
          html: notionShellHtml.replace('</body>', '<a href="https://jobs.lever.co/bikayi/1">View role</a></body>'),
        }
      },
    }),
    /public ats links|stable public job links|public jobs/i,
  )
})
