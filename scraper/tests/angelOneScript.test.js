import assert from 'node:assert/strict'
import test from 'node:test'

const careersHtml = `
  <html>
    <head>
      <title>Angel One Careers | Join a Leading Fintech Company in India</title>
      <link rel="canonical" href="https://www.angelone.in/careers" />
    </head>
    <body>
      <section id="careers-page">
        <h1>Shape The Future of Fintech</h1>
        <script>self.__next_f.push([1,"\\"jobs\\":[],\\"department\\":\\"\\""])</script>
        <label for="departments">Departments</label>
        <select id="departments"></select>
        <section id="open-positions">
          <small>JOBS</small>
          <h2>Open Positions</h2>
          <div class="nhPir6"></div>
        </section>
      </section>
    </body>
  </html>
`

const loadAngelOneModule = async () => {
  try {
    return await import('../angelone/script.js')
  } catch {
    assert.fail('Expected Angel One scraper module at ../angelone/script.js')
  }
}

test('Angel One sentinels recognize the verified careers shell with embedded empty jobs', async () => {
  const angelOne = await loadAngelOneModule()

  assert.equal(angelOne.SOURCE, 'angelone')
  assert.equal(angelOne.COMPANY, 'Angel One')
  assert.equal(angelOne.CAREERS_URL, 'https://www.angelone.in/careers')
  assert.equal(angelOne.hasVerifiedCareersShellSignal(careersHtml), true)
  assert.equal(angelOne.hasEmbeddedEmptyJobsSignal(careersHtml), true)
  assert.equal(angelOne.hasOpenJobCards(careersHtml), false)
})

test('Angel One returns no jobs only while the verified first-party zero-openings shell holds', async () => {
  const angelOne = await loadAngelOneModule()
  const requestedUrls = []

  const jobs = await angelOne.createAngelOneScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      return careersHtml
    },
  })

  assert.deepEqual(requestedUrls, [angelOne.CAREERS_URL])
  assert.deepEqual(jobs, [])
})

test('Angel One fails closed when the careers shell changes materially or exposes openings', async () => {
  const angelOne = await loadAngelOneModule()

  await assert.rejects(
    angelOne.createAngelOneScraper().run({
      fetchText: async () => '<html><body><h1>Unexpected</h1></body></html>',
    }),
    /verified first-party zero-openings shell/i,
  )

  await assert.rejects(
    angelOne.createAngelOneScraper().run({
      fetchText: async () => careersHtml.replace('\\"jobs\\":[]', '\\"jobs\\":[{\\"title\\":\\"SDE\\"}]'),
    }),
    /embedded empty jobs payload/i,
  )

  await assert.rejects(
    angelOne.createAngelOneScraper().run({
      fetchText: async () => `${careersHtml}<a href="/careers/job/123">Software Engineer</a>`,
    }),
    /now exposes public openings/i,
  )
})
