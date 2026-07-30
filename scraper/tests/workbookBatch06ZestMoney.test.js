import assert from 'node:assert/strict'
import test from 'node:test'

const VERIFIED_SURFACE_HTML = `
  <html>
    <body>
      <main>
        <section>
          <h1>Join the ZestMoney team!</h1>
          <p>
            We are building the world's most loved &amp; most accessible financial brand!
          </p>
          <a href="https://careers-zestmoney.icims.com/">SEE JOB OPENINGS</a>
        </section>
        <section>
          <h2>Ready to make a difference?</h2>
          <p>
            We have built a credit disbursal system that is seamless and end-to-end automated.
          </p>
        </section>
        <section>
          <h2>Work with people who bring out the best in you</h2>
        </section>
        <section>
          <h2>At ZestMoney, we are...</h2>
          <p>Innovative. Transparent. Authentic. Responsive. Fair.</p>
        </section>
        <section>
          <h2>Perks and Benefits</h2>
          <p>E-learning allowance</p>
        </section>
      </main>
    </body>
  </html>
`

const loadZestMoneyModule = async () => {
  try {
    return await import('../workbookbatch06/zestmoney.js')
  } catch {
    assert.fail('Expected ZestMoney scraper module at ../workbookbatch06/zestmoney.js')
  }
}

test('ZestMoney validates the verified careers surface and returns [] while the public contract remains non-enumerable', async () => {
  const zestmoney = await loadZestMoneyModule()
  let requestedUrl = null

  const jobs = await zestmoney.run({
    fetchHtml: async (url) => {
      requestedUrl = url
      return VERIFIED_SURFACE_HTML
    },
  })

  assert.equal(requestedUrl, zestmoney.CAREERS_URL)
  assert.deepEqual(jobs, [])
  assert.equal(zestmoney.SOURCE, 'zestmoney')
  assert.equal(zestmoney.COMPANY, 'ZestMoney')
  assert.equal(zestmoney.OFFICIAL_BRAND, 'ZestMoney')
  assert.equal(zestmoney.CAREERS_URL, 'https://www.zestmoney.in/join-us-1/')
  assert.equal(zestmoney.ICIMS_HANDOFF_URL, 'https://careers-zestmoney.icims.com/')
  assert.equal(
    zestmoney.DISPOSITION,
    'verified-public-careers-surface-with-dead-external-icims-handoff',
  )
  assert.match(
    zestmoney.VERIFIED_SURFACE_SUMMARY,
    /Verified on Saturday, July 25, 2026 that https:\/\/www\.zestmoney\.in\/join-us-1\/ was the live official public careers surface reviewed for ZestMoney/i,
  )
  assert.match(
    zestmoney.VERIFIED_SURFACE_SUMMARY,
    /standard public search paths returned 404/i,
  )
  assert.equal(
    zestmoney.extractVerifiedIcimsHandoffUrl(VERIFIED_SURFACE_HTML),
    'https://careers-zestmoney.icims.com/',
  )
})

test('ZestMoney rejects when the verified public careers surface markers disappear', async () => {
  const zestmoney = await loadZestMoneyModule()

  await assert.rejects(
    zestmoney.run({
      fetchHtml: async () => `
        <html>
          <body>
            <main>
              <h1>Careers</h1>
              <p>Explore opportunities with us.</p>
            </main>
          </body>
        </html>
      `,
    }),
    /verified public careers surface changed/i,
  )
})

test('ZestMoney rejects when the verified iCIMS handoff changes', async () => {
  const zestmoney = await loadZestMoneyModule()

  await assert.rejects(
    zestmoney.run({
      fetchHtml: async () => VERIFIED_SURFACE_HTML.replace(
        'https://careers-zestmoney.icims.com/',
        'https://boards.greenhouse.io/zestmoney/jobs/123',
      ),
    }),
    /verified iCIMS handoff changed/i,
  )
})

test('ZestMoney rejects when an enumerable ATS surface appears alongside the pinned handoff', async () => {
  const zestmoney = await loadZestMoneyModule()

  await assert.rejects(
    zestmoney.run({
      fetchHtml: async () => `
        ${VERIFIED_SURFACE_HTML}
        <a href="https://careers-zestmoney.icims.com/jobs/search?ss=1">Browse all jobs</a>
      `,
    }),
    /public jobs surface/i,
  )
})

test('ZestMoney rejects when first-party jobs signals appear on the verified careers surface', async () => {
  const zestmoney = await loadZestMoneyModule()

  await assert.rejects(
    zestmoney.run({
      fetchHtml: async () => `
        ${VERIFIED_SURFACE_HTML}
        <a href="/jobs/software-engineer">Software Engineer</a>
      `,
    }),
    /public jobs surface/i,
  )

  await assert.rejects(
    zestmoney.run({
      fetchHtml: async () => `
        ${VERIFIED_SURFACE_HTML}
        <script type="application/ld+json">
          {"@context":"https://schema.org","@type":"JobPosting","title":"Software Engineer"}
        </script>
      `,
    }),
    /JobPosting markup/i,
  )
})
