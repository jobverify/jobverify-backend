import assert from 'node:assert/strict'
import test from 'node:test'

const VERIFIED_SURFACE_HTML = `
  <html>
    <body>
      <main>
        <h1>Shape the future of conversations</h1>
        <p>
          We are transforming how humans connect and converse with brands around
          the world using next-gen AI solutions.
        </p>
        <h2>Life at Yellow.ai.</h2>
        <h2>The Yellow Code.</h2>
        <p>Where culture meets purpose.</p>
        <a href="#we-re-hiring">Explore open positions</a>
        <p>Chief Executive Officer and Co-founder, Yellow.ai</p>
        <div id="we-re-hiring">
          <div id="rec_job_listing_div"></div>
          <script src="https://static.zohocdn.com/recruit/embed_careers_site/javascript/v1.1/embed_jobs.js"></script>
          <script>
            rec_embed_js.load({
              widget_id:"rec_job_listing_div",
              page_name:"Careers",
              source:"CareerSite",
              site:"https://careers.yellow.ai",
              empty_job_msg:"No current Openings"
            });
          </script>
        </div>
      </main>
    </body>
  </html>
`

const loadYellowMessengerModule = async () => {
  try {
    return await import('../../scraper/yellowmessenger/script.js')
  } catch {
    assert.fail(
      'Expected Yellow Messenger scraper module at ../../scraper/yellowmessenger/script.js',
    )
  }
}

test('Yellow Messenger validates the verified Yellow.ai embedded Zoho loader contract before returning []', async () => {
  const yellowMessenger = await loadYellowMessengerModule()

  const jobs = await yellowMessenger.createYellowMessengerScraper().run({
    loadLiveCareersContract: async () => ({
      careersHtml: VERIFIED_SURFACE_HTML,
    }),
  })

  assert.deepEqual(jobs, [])
  assert.equal(yellowMessenger.SOURCE, 'yellowmessenger')
  assert.equal(yellowMessenger.COMPANY, 'Yellow Messenger')
  assert.equal(yellowMessenger.OFFICIAL_BRAND, 'Yellow.ai')
  assert.equal(yellowMessenger.CAREERS_URL, 'https://yellow.ai/career/')
  assert.equal(yellowMessenger.EMBEDDED_ZOHO_SITE_URL, 'https://careers.yellow.ai')
  assert.equal(
    yellowMessenger.DISPOSITION,
    'verified-rebrand-careers-surface-plus-dead-zohorecruit-embed-return-empty',
  )
  assert.match(
    yellowMessenger.VERIFIED_SURFACE_SUMMARY,
    /Verified on Sunday, August 2, 2026/i,
  )
  assert.match(yellowMessenger.VERIFIED_SURFACE_SUMMARY, /empty_job_msg:"No current Openings"/i)
  assert.match(yellowMessenger.VERIFIED_SURFACE_SUMMARY, /does not exist/i)
})

test('Yellow Messenger rejects when the verified Yellow.ai rebrand careers surface disappears', async () => {
  const yellowMessenger = await loadYellowMessengerModule()

  await assert.rejects(
    yellowMessenger.createYellowMessengerScraper().run({
      loadLiveCareersContract: async () => ({
        careersHtml: `
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
    }),
    /verified official rebrand careers surface/i,
  )
})

test('Yellow Messenger rejects when the verified Zoho loader contract disappears', async () => {
  const yellowMessenger = await loadYellowMessengerModule()

  await assert.rejects(
    yellowMessenger.createYellowMessengerScraper().run({
      loadLiveCareersContract: async () => ({
        careersHtml: VERIFIED_SURFACE_HTML.replace(
          'site:"https://careers.yellow.ai"',
          'site:"https://other.yellow.ai"',
        ),
      }),
    }),
    /verified embedded Zoho loader contract/i,
  )
})
