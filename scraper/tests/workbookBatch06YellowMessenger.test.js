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
        <a href="#we-re-hiring">Join the mission</a>
        <h2>Life at Yellow.ai.</h2>
        <h2>The Yellow Code.</h2>
        <p>Where culture meets purpose.</p>
        <h2>Where do you want to grow? We'll get you there.</h2>
        <a href="#we-re-hiring">Explore open positions</a>
        <p>Chief Executive Officer and Co-founder, Yellow.ai</p>
        <p>Copyright 2026 Bitonic Technology Labs Inc</p>
      </main>
    </body>
  </html>
`

const VERIFIED_ZOHO_BOARD_TEXT = `
HOME JOBS
Find the career of your dreams
Current Openings
GTM recruiter Position filled
Powered by
`

const VERIFIED_CLOSED_PAYLOAD = {
  code: 'success',
  data: [
    {
      Posting_Title: 'GTM recruiter',
      Job_Opening_Name: 'GTM recruiter',
      Is_Locked: true,
      Publish: false,
      Keep_on_Career_Site: true,
      City: 'Bangalore South',
      State: 'Karnataka',
      Country: 'India',
      Job_Type: 'Full time',
      Job_Description: 'About Yellow.ai We are a global leader in Conversational AI.',
      Date_Opened: '04/02/2025',
      $url: 'https://yellow.zohorecruit.in/jobs/Careers/157454000000803145/GTM-recruiter?source=CareerSite',
      id: '157454000000803145',
    },
  ],
}

const loadYellowMessengerModule = async () => {
  try {
    return await import('../workbookbatch06/yellowmessenger.js')
  } catch {
    assert.fail(
      'Expected Yellow Messenger scraper module at ../workbookbatch06/yellowmessenger.js',
    )
  }
}

test('Yellow Messenger validates the verified Yellow.ai plus Zoho Recruit contract before returning []', async () => {
  const yellowMessenger = await loadYellowMessengerModule()

  const scraper = yellowMessenger.createYellowMessengerScraper({
    now: () => '2026-07-26T00:00:00.000Z',
  })

  const jobs = await scraper.run({
    loadLiveCareersContract: async () => ({
      careersHtml: VERIFIED_SURFACE_HTML,
      boardUrl: yellowMessenger.ZOHO_PORTAL_URL,
      boardText: VERIFIED_ZOHO_BOARD_TEXT,
      payload: VERIFIED_CLOSED_PAYLOAD,
    }),
  })

  assert.deepEqual(jobs, [])
  assert.equal(yellowMessenger.SOURCE, 'yellowmessenger')
  assert.equal(yellowMessenger.COMPANY, 'Yellow Messenger')
  assert.equal(yellowMessenger.OFFICIAL_BRAND, 'Yellow.ai')
  assert.equal(yellowMessenger.CAREERS_URL, 'https://yellow.ai/career/')
  assert.equal(yellowMessenger.ZOHO_PORTAL_URL, 'https://yellow.zohorecruit.in/jobs/Careers')
  assert.equal(
    yellowMessenger.ZOHO_API_URL,
    'https://yellow.zohorecruit.in/recruit/v2/public/Job_Openings?pagename=Careers&source=CareerSite',
  )
  assert.equal(
    yellowMessenger.DISPOSITION,
    'verified-rebrand-careers-surface-plus-public-zohorecruit-board',
  )
  assert.match(
    yellowMessenger.VERIFIED_SURFACE_SUMMARY,
    /Verified on Sunday, July 26, 2026/i,
  )
  assert.match(yellowMessenger.VERIFIED_SURFACE_SUMMARY, /Yellow Messenger/i)
  assert.match(yellowMessenger.VERIFIED_SURFACE_SUMMARY, /Zoho Recruit/i)
  assert.match(yellowMessenger.VERIFIED_SURFACE_SUMMARY, /Publish false and Is_Locked true/i)
})

test('Yellow Messenger rejects when the verified Yellow.ai rebrand careers surface disappears', async () => {
  const yellowMessenger = await loadYellowMessengerModule()

  const scraper = yellowMessenger.createYellowMessengerScraper()

  await assert.rejects(
    scraper.run({
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
        boardUrl: yellowMessenger.ZOHO_PORTAL_URL,
        boardText: VERIFIED_ZOHO_BOARD_TEXT,
        payload: VERIFIED_CLOSED_PAYLOAD,
      }),
    }),
    /verified official rebrand careers surface/i,
  )
})

test('Yellow Messenger rejects when the verified Zoho Recruit board surface disappears', async () => {
  const yellowMessenger = await loadYellowMessengerModule()

  const scraper = yellowMessenger.createYellowMessengerScraper()

  await assert.rejects(
    scraper.run({
      loadLiveCareersContract: async () => ({
        careersHtml: VERIFIED_SURFACE_HTML,
        boardUrl: yellowMessenger.ZOHO_PORTAL_URL,
        boardText: 'Join our team',
        payload: VERIFIED_CLOSED_PAYLOAD,
      }),
    }),
    /verified Zoho Recruit board changed/i,
  )
})

test('Yellow Messenger rejects when the public Zoho Recruit payload drifts', async () => {
  const yellowMessenger = await loadYellowMessengerModule()

  const scraper = yellowMessenger.createYellowMessengerScraper()

  await assert.rejects(
    scraper.run({
      loadLiveCareersContract: async () => ({
        careersHtml: VERIFIED_SURFACE_HTML,
        boardUrl: yellowMessenger.ZOHO_PORTAL_URL,
        boardText: VERIFIED_ZOHO_BOARD_TEXT,
        payload: {
          code: 'success',
          data: [
            {
              ...VERIFIED_CLOSED_PAYLOAD.data[0],
              $url: 'https://other.zohorecruit.in/jobs/Careers/1/Other?source=CareerSite',
              Job_Description: 'About another company.',
            },
          ],
        },
      }),
    }),
    /public Zoho Recruit payload changed/i,
  )
})
