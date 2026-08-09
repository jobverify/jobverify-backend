import assert from 'node:assert/strict'
import test from 'node:test'

const VERIFIED_CAREERS_HTML = `
<!doctype html>
<html lang="en">
  <body>
    <main>
      <h1>Shape the future of conversations</h1>
      <p>We are transforming how humans connect and converse with brands around the world using next-gen AI solutions.</p>
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

const loadModule = async () => {
  try {
    return await import('../../scraper/yellowmessenger/script.js')
  } catch {
    assert.fail('Expected Yellow Messenger workbook scraper module at ../../scraper/yellowmessenger/script.js')
  }
}

test('Yellow Messenger returns [] while the verified embedded Zoho careers surface remains in the dead-board state', async () => {
  const yellowMessenger = await loadModule()
  const scraper = yellowMessenger.createYellowMessengerScraper()

  const jobs = await scraper.run({
    loadLiveCareersContract: async () => ({
      careersHtml: VERIFIED_CAREERS_HTML,
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
  assert.match(yellowMessenger.VERIFIED_SURFACE_SUMMARY, /site:"https:\/\/careers\.yellow\.ai"/i)
  assert.match(yellowMessenger.VERIFIED_SURFACE_SUMMARY, /does not exist/i)
})

test('Yellow Messenger validates the current careers contract when loaded through fetchText', async () => {
  const yellowMessenger = await loadModule()
  const requestedUrls = []

  const jobs = await yellowMessenger.createYellowMessengerScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      return VERIFIED_CAREERS_HTML
    },
  })

  assert.deepEqual(requestedUrls, [yellowMessenger.CAREERS_URL])
  assert.deepEqual(jobs, [])
})
