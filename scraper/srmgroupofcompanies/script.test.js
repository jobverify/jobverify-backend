import assert from 'node:assert/strict'
import test from 'node:test'

const loadModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    assert.fail('Expected SRM Group of Companies scraper module at ./script.js')
  }
}

const officialGroupSurfaceHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>About Us | Our Markets | Our Partners | SRM Technologies</title>
  </head>
  <body>
    <main>
      <h1>Who We Are</h1>
      <p>Founded in 1998 as part of the SRM Group, SRM Technologies began as a technology services company and has evolved into a global engineering and digital transformation partner.</p>
      <h2>About SRM Group</h2>
      <p>A billion-dollar conglomerate with a formidable presence in the fields of education, transport, engineering, hospitality, infotainment and healthcare.</p>
      <p>SRM Group is known for its integrity, ethical practice and transparency, with its foundation built on deep-rooted values and ideas dedicated to building a collective and prosperous future.</p>
      <p>Education | “Transforming Lives through Education”</p>
      <p>Hospitality &amp; Transport | “Unforgettable Stays and Seamless Travel Experiences”</p>
      <p>Healthcare | “Advanced Tertiary Healthcare for a Healthier Tomorrow”</p>
    </main>
  </body>
</html>
`

const officialCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers | Work Culture | SRM Technologies</title>
  </head>
  <body>
    <main>
      <h1>Careers</h1>
      <h2>Become A Part Of Our Growth Journey</h2>
      <h3>Featured Roles</h3>
      <a href="https://careers.srmtech.com/jobs/Careers">Click here to find your dream job!</a>
      <h2>Why SRM Tech?</h2>
      <p>At SRM Tech, you will get to be part of a thriving workforce of innovators and doers.</p>
      <p>Whether you are starting from the base or a seasoned professional, SRM Tech has a place for you!</p>
      <h2>Join a Certified Great Place to Work!</h2>
      <a href="https://careers.srmtech.com/jobs/Careers">View Open Positions</a>
    </main>
  </body>
</html>
`

const officialHandoffRedirectChain = [
  {
    url: 'https://careers.srmtech.com/jobs/Careers',
    status: 302,
    location: 'https://careers.srmtech.com/html/portal.html',
  },
  {
    url: 'https://careers.srmtech.com/html/portal.html',
    status: 302,
    location: 'https://careers.srmtech.com/recruit/IAMSecurityError.do?isload=true',
  },
  {
    url: 'https://careers.srmtech.com/recruit/IAMSecurityError.do?isload=true',
    status: 302,
    location: 'https://careers.srmtech.com/recruit/login.sas?serviceurl=%2Frecruit%2FIAMSecurityError.do%3Fisload%3Dtrue',
  },
  {
    url: 'https://careers.srmtech.com/recruit/login.sas?serviceurl=%2Frecruit%2FIAMSecurityError.do%3Fisload%3Dtrue',
    status: 302,
    location: 'https://accounts.zoho.com/signin?servicename=ZohoRecruit&hide_signup=false&serviceurl=%2Frecruit%2FIAMSecurityError.do%3Fisload%3Dtrue&hide_secure=true',
  },
]

test('SRM Group of Companies sentinel pins the verified SRM-affiliated group page, careers page, and non-public handoff contract', async () => {
  const srm = await loadModule()

  assert.equal(srm.SOURCE, 'srmgroupofcompanies')
  assert.equal(srm.COMPANY, 'SRM Group of Companies')
  assert.equal(srm.GROUP_SURFACE_URL, 'https://www.srmtech.com/who-we-are/')
  assert.equal(srm.CAREERS_PAGE_URL, 'https://www.srmtech.com/careers/')
  assert.equal(srm.CAREERS_HANDOFF_URL, 'https://careers.srmtech.com/jobs/Careers')
  assert.equal(srm.hasOfficialGroupSurfaceSignal(officialGroupSurfaceHtml), true)
  assert.equal(srm.hasOfficialCareersPageSignal(officialCareersHtml), true)
  assert.equal(srm.hasExpectedHandoffRedirectChain(officialHandoffRedirectChain), true)
})

test('SRM Group of Companies sentinel returns no jobs while the verified careers handoff stays non-public', async () => {
  const srm = await loadModule()
  const requestedTexts = []
  const requestedChains = []

  const jobs = await srm.createSrmGroupOfCompaniesScraper().run({
    fetchText: async (url) => {
      requestedTexts.push(url)

      if (url === srm.GROUP_SURFACE_URL) {
        return officialGroupSurfaceHtml
      }

      if (url === srm.CAREERS_PAGE_URL) {
        return officialCareersHtml
      }

      throw new Error(`Unexpected text URL: ${url}`)
    },
    traceRedirectChain: async (url) => {
      requestedChains.push(url)

      if (url === srm.CAREERS_HANDOFF_URL) {
        return officialHandoffRedirectChain
      }

      throw new Error(`Unexpected chain URL: ${url}`)
    },
  })

  assert.deepEqual(requestedTexts, [
    srm.GROUP_SURFACE_URL,
    srm.CAREERS_PAGE_URL,
  ])
  assert.deepEqual(requestedChains, [srm.CAREERS_HANDOFF_URL])
  assert.deepEqual(jobs, [])
})

test('SRM Group of Companies default fetches are bounded by AbortSignals across page and redirect checks', async () => {
  const srm = await loadModule()
  const originalFetch = globalThis.fetch
  const fetchCalls = []
  const redirectLocations = new Map([
    [
      srm.CAREERS_HANDOFF_URL,
      'https://careers.srmtech.com/html/portal.html',
    ],
    [
      'https://careers.srmtech.com/html/portal.html',
      'https://careers.srmtech.com/recruit/IAMSecurityError.do?isload=true',
    ],
    [
      'https://careers.srmtech.com/recruit/IAMSecurityError.do?isload=true',
      'https://careers.srmtech.com/recruit/login.sas?serviceurl=%2Frecruit%2FIAMSecurityError.do%3Fisload%3Dtrue',
    ],
    [
      'https://careers.srmtech.com/recruit/login.sas?serviceurl=%2Frecruit%2FIAMSecurityError.do%3Fisload%3Dtrue',
      'https://accounts.zoho.com/signin?servicename=ZohoRecruit&hide_signup=false&serviceurl=%2Frecruit%2FIAMSecurityError.do%3Fisload%3Dtrue&hide_secure=true',
    ],
  ])

  globalThis.fetch = async (url, options = {}) => {
    fetchCalls.push({ url, options })

    if (url === srm.GROUP_SURFACE_URL) {
      return {
        text: async () => officialGroupSurfaceHtml,
      }
    }

    if (url === srm.CAREERS_PAGE_URL) {
      return {
        text: async () => officialCareersHtml,
      }
    }

    if (redirectLocations.has(url)) {
      return {
        status: 302,
        headers: {
          get: (name) => name.toLowerCase() === 'location'
            ? redirectLocations.get(url)
            : null,
        },
      }
    }

    throw new Error(`Unexpected URL: ${url}`)
  }

  try {
    const jobs = await srm.createSrmGroupOfCompaniesScraper().run()

    assert.deepEqual(jobs, [])
    assert.deepEqual(fetchCalls.map((call) => call.url), [
      srm.GROUP_SURFACE_URL,
      srm.CAREERS_PAGE_URL,
      srm.CAREERS_HANDOFF_URL,
      'https://careers.srmtech.com/html/portal.html',
      'https://careers.srmtech.com/recruit/IAMSecurityError.do?isload=true',
      'https://careers.srmtech.com/recruit/login.sas?serviceurl=%2Frecruit%2FIAMSecurityError.do%3Fisload%3Dtrue',
    ])
    assert.equal(fetchCalls.every((call) => call.options.signal instanceof AbortSignal), true)
    assert.equal(fetchCalls.slice(0, 2).every((call) => call.options.redirect === 'follow'), true)
    assert.equal(fetchCalls.slice(2).every((call) => call.options.redirect === 'manual'), true)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('SRM Group of Companies sentinel fails closed when the group, careers, or handoff surface drifts', async () => {
  const srm = await loadModule()

  await assert.rejects(
    srm.createSrmGroupOfCompaniesScraper().run({
      fetchText: async (url) => {
        if (url === srm.GROUP_SURFACE_URL) {
          return '<html><head><title>Unexpected</title></head><body>No SRM group markers</body></html>'
        }

        if (url === srm.CAREERS_PAGE_URL) {
          return officialCareersHtml
        }

        throw new Error(`Unexpected text URL: ${url}`)
      },
      traceRedirectChain: async () => officialHandoffRedirectChain,
    }),
    /verified SRM Group surface/i,
  )

  await assert.rejects(
    srm.createSrmGroupOfCompaniesScraper().run({
      fetchText: async (url) => {
        if (url === srm.GROUP_SURFACE_URL) {
          return officialGroupSurfaceHtml
        }

        if (url === srm.CAREERS_PAGE_URL) {
          return `
            <html>
              <head>
                <title>Careers | Work Culture | SRM Technologies</title>
              </head>
              <body>
                <main>
                  <h1>Careers</h1>
                  <p>Featured Roles</p>
                </main>
              </body>
            </html>
          `
        }

        throw new Error(`Unexpected text URL: ${url}`)
      },
      traceRedirectChain: async () => officialHandoffRedirectChain,
    }),
    /verified SRM careers page/i,
  )

  await assert.rejects(
    srm.createSrmGroupOfCompaniesScraper().run({
      fetchText: async (url) => {
        if (url === srm.GROUP_SURFACE_URL) {
          return officialGroupSurfaceHtml
        }

        if (url === srm.CAREERS_PAGE_URL) {
          return officialCareersHtml
        }

        throw new Error(`Unexpected text URL: ${url}`)
      },
      traceRedirectChain: async () => ([
        {
          url: srm.CAREERS_HANDOFF_URL,
          status: 200,
          location: null,
        },
      ]),
    }),
    /non-public Zoho Recruit handoff/i,
  )
})
