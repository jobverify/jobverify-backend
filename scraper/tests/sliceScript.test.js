import assert from 'node:assert/strict'
import test from 'node:test'

const SLICE_BANK_CAREERS_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers | We go big. We go beyond | slice</title>
  </head>
  <body>
    <main>
      <h1>Unleash your potential.</h1>
      <a href="https://slice.bank.in/careers/open-positions">See all open positions</a>
      <h2>Our mission</h2>
      <p>We aim to build an ecosystem for the youth that solves all their financial needs and make their lives epic!</p>
      <p>15 million+ registered users</p>
      <p>1000+ employees</p>
    </main>
    <footer>
      <p>slice small finance bank ltd</p>
      <p>Corporate office address: No. 9 Ashford Park View, 80 ft Road, Koramangala, 3rd Block, Bangalore, Karnataka, 560034</p>
      <p>Contact us</p>
    </footer>
  </body>
</html>
`

const SLICE_BANK_APPLY_HTML = `
<!doctype html>
<html lang="en">
  <body>
    <p>slice small finance bank ltd</p>
    <p>Corporate office address: No. 9 Ashford Park View, 80 ft Road, Koramangala, 3rd Block, Bangalore, Karnataka, 560034</p>
    <p>Contact us</p>
  </body>
</html>
`

const SLICE_CAREERS_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Slice Careers - Open for Talent</title>
  </head>
  <body>
    <main>
      <h1>THE WORLD'S BEST IDEAS THRIVE HERE</h1>
      <p>Looking to bring world-class products to small business counters? Welcome to Slice.</p>
      <p>Many companies talk about being mission-driven. We live it. Ilir Sela started Slice in 2015 to modernize his friends' and family's New York City pizzerias.</p>
      <p>Today, we'd be joining a global team empowering over 20,000 shops and the families behind them.</p>
      <h2>Career Opportunities</h2>
      <a href="https://about.slicelife.com">about.slicelife.com</a>
    </main>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../slice/script.js')
  } catch {
    assert.fail('Expected Slice scraper module at ../slice/script.js')
  }
}

test('Slice pins the verified exact-name ambiguity contract to two different first-party careers surfaces', async () => {
  const slice = await loadModule()

  assert.equal(slice.SOURCE, 'slice')
  assert.equal(slice.COMPANY, 'Slice')
  assert.equal(slice.OFFICIAL_BRAND_NAME, 'Slice')
  assert.equal(slice.VERIFIED_ON, '2026-07-17')
  assert.equal(slice.SLICE_BANK_CAREERS_URL, 'https://slice.bank.in/careers/')
  assert.equal(slice.SLICE_BANK_APPLY_URL, 'https://slice.bank.in/careers/apply')
  assert.equal(slice.SLICE_ALT_CAREERS_URL, 'https://slice.careers/')
  assert.equal(slice.hasVerifiedSliceBankCareersSignal(SLICE_BANK_CAREERS_HTML), true)
  assert.equal(slice.hasVerifiedSliceBankApplySignal(SLICE_BANK_APPLY_HTML), true)
  assert.equal(slice.hasVerifiedAlternateSliceCareersSignal(SLICE_CAREERS_HTML), true)
})

test('Slice run returns [] only while the exact backlog row still maps to two different verified first-party companies', async () => {
  const slice = await loadModule()
  const requestedUrls = []

  const jobs = await slice.createSliceScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === slice.SLICE_BANK_CAREERS_URL) {
        return { status: 200, url, html: SLICE_BANK_CAREERS_HTML }
      }

      if (url === slice.SLICE_BANK_APPLY_URL) {
        return { status: 200, url, html: SLICE_BANK_APPLY_HTML }
      }

      if (url === slice.SLICE_ALT_CAREERS_URL) {
        return { status: 200, url, html: SLICE_CAREERS_HTML }
      }

      throw new Error(`Unexpected Slice URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    slice.SLICE_BANK_CAREERS_URL,
    slice.SLICE_BANK_APPLY_URL,
    slice.SLICE_ALT_CAREERS_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('Slice fails closed when either verified first-party company surface changes materially', async () => {
  const slice = await loadModule()

  await assert.rejects(
    slice.createSliceScraper().run({
      fetchPage: async (url) => {
        if (url === slice.SLICE_BANK_CAREERS_URL) {
          return {
            status: 200,
            url,
            html: SLICE_BANK_CAREERS_HTML.replace('slice small finance bank ltd', 'slice bank'),
          }
        }

        if (url === slice.SLICE_BANK_APPLY_URL) {
          return { status: 200, url, html: SLICE_BANK_APPLY_HTML }
        }

        return { status: 200, url, html: SLICE_CAREERS_HTML }
      },
    }),
    /verified slice bank careers page/i,
  )

  await assert.rejects(
    slice.createSliceScraper().run({
      fetchPage: async (url) => {
        if (url === slice.SLICE_BANK_CAREERS_URL) {
          return { status: 200, url, html: SLICE_BANK_CAREERS_HTML }
        }

        if (url === slice.SLICE_BANK_APPLY_URL) {
          return { status: 200, url, html: SLICE_BANK_APPLY_HTML }
        }

        return {
          status: 200,
          url,
          html: SLICE_CAREERS_HTML.replace('Ilir Sela', 'Slice Founder'),
        }
      },
    }),
    /verified alternate Slice careers page/i,
  )
})
