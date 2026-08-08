import assert from 'node:assert/strict'
import test from 'node:test'

const loadYellowMessengerModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    assert.fail('Expected Yellow Messenger scraper module at ./script.js')
  }
}

const officialCareersHtml = `
<!doctype html>
<html lang="en">
  <body>
    <main>
      <h1>Shape the future of conversations</h1>
      <section>Life at Yellow.ai</section>
      <section>The Yellow Code</section>
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

test('Yellow Messenger validates the current embedded Zoho loader contract', async () => {
  const yellowMessenger = await loadYellowMessengerModule()

  assert.equal(yellowMessenger.SOURCE, 'yellowmessenger')
  assert.doesNotThrow(() => yellowMessenger.assertVerifiedOfficialRebrandSurface(officialCareersHtml))
  assert.doesNotThrow(() => yellowMessenger.assertVerifiedEmbeddedZohoLoader(officialCareersHtml))
})

test('Yellow Messenger returns no jobs while the embedded public board is dead', async () => {
  const yellowMessenger = await loadYellowMessengerModule()

  const jobs = await yellowMessenger.createYellowMessengerScraper().run({
    loadLiveCareersContract: async () => ({
      careersHtml: officialCareersHtml,
    }),
  })

  assert.deepEqual(jobs, [])
})

test('Yellow Messenger validates the live contract loaded through an HTTP fetcher', async () => {
  const yellowMessenger = await loadYellowMessengerModule()
  const requestedUrls = []

  const jobs = await yellowMessenger.createYellowMessengerScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      return officialCareersHtml
    },
  })

  assert.deepEqual(requestedUrls, [yellowMessenger.CAREERS_URL])
  assert.deepEqual(jobs, [])
})
