import assert from 'node:assert/strict'
import test from 'node:test'

const homepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Discover Dining Out Restaurants In Chennai And Book A Table</title>
    <link rel="canonical" href="https://www.swiggy.com/dineout" />
    <meta
      name="keywords"
      content="Swiggy Dineout, Dineout, Book A Table, Restaurants Near Me"
    />
  </head>
  <body>
    <main>
      <h1>Swiggy Dineout</h1>
      <p>Book a table and discover dining out experiences.</p>
    </main>
  </body>
</html>
`

const swiggyBusinessHtml = `
<!doctype html>
<html lang="en">
  <head><title>Our Business - Swiggy</title></head>
  <body>
    <main>
      <h1>Our Businesses</h1>
      <h2>Dineout</h2>
      <p>Dineout facilitates a user’s eating-out experience, through which users can discover restaurants, access menus and images, make reservations, benefit from attractive promotions, and make digital payments to such restaurants on our platform.</p>
    </main>
    <footer>Swiggy Limited</footer>
  </body>
</html>
`

const redirectedBlockedRouteHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>403 Forbidden</title>
  </head>
  <body>
    <h1>403 Forbidden</h1>
    <p>Access Denied</p>
  </body>
</html>
`

const redirectedRestaurantsRouteHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Best Restaurants Near Me In 2026 | Swiggy</title>
    <meta
      name="description"
      content="Find The Restaurants Serving Near Your Location. View Menus, Reviews And Ratings For The Best Restaurants Near You On Swiggy."
    />
  </head>
  <body>
    <main>
      <h1>Best Restaurants Near Me In 2026 | Swiggy</h1>
      <p>Restaurants Near Me</p>
      <p>For Dining Out</p>
      <p>Order Online</p>
      <p>Book a table</p>
    </main>
  </body>
</html>
`

const swiggyCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Swiggy Careers</title>
    <meta
      name="description"
      content="Check out the exciting job opportunities at Swiggy!"
    />
  </head>
  <body>
    <main>
      <h1>Swiggy Careers</h1>
      <script src="./assets/js/careers-integration.js"></script>
    </main>
  </body>
</html>
`

const careersIntegrationScript = `
const clientShortName = "swiggy";
let iFrameSrc = "https://" + clientShortName + ".mynexthire.com/employer/jobs/careers";
document.getElementById("careers-frame").src = iFrameSrc;
`

const templatedCareersIntegrationScript = `
function mnh_ci_onreadystatechange(pageType, clientShortName) {
  var firstSuffix = ((window.location.href + "").split("?")[1]);
  var urlSuffix = firstSuffix ? ("?" + firstSuffix) : "";
  urlSuffix += urlSuffix === "" ? "?src=careers&page=careers" : "&page=careers";
  iFrameSrc = "https://" + clientShortName + ".mynexthire.com/employer/jobs/careers";
  document.getElementById("mnhembedded").src = iFrameSrc + "#" + urlSuffix;
}
`

const jobsBoardHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Approved Jobs, powered by Smaclify Technologies!</title>
  </head>
  <body>
    <div id="careers-app"></div>
    <script src="/employer/ui/js/jobboard/careers.js"></script>
  </body>
</html>
`

const jobBoardDetailsJson = JSON.stringify({
  clientName: 'Swiggy',
  career_page_url: {
    url: {
      list: 'https://careers.swiggy.com/#/careers',
      jd: 'https://careers.swiggy.com/#/careers',
      application: 'https://careers.swiggy.com/#/careers/apply',
    },
    referral_url: {
      list: 'https://swiggy.mynexthire.com/employer/jobs/careers',
    },
  },
  requisition_custom_fields: {
    custom_fields: ['company', 'business_unit', 'department', 'Team_name'],
  },
})

const nestedJobBoardDetailsJson = JSON.stringify({
  clientName: 'Swiggy',
  tenantPreferencesMap: {
    career_page_url: {
      referral_url: [
        {
          url: 'https://swiggy.mynexthire.com/employer/referrals',
          pageType: 'application',
        },
        {
          url: 'https://swiggy.mynexthire.com/employer/referrals',
          pageType: 'jd',
        },
        {
          url: 'https://swiggy.mynexthire.com/employer/referrals',
          pageType: 'list',
        },
      ],
      url: [
        {
          url: 'https://careers.swiggy.com/#/careers/apply',
          pageType: 'application',
        },
        {
          url: 'https://careers.swiggy.com/#/careers',
          pageType: 'jd',
        },
        {
          url: 'https://careers.swiggy.com/#/careers',
          pageType: 'list',
        },
      ],
    },
  },
})

const trustworthyJobsHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Dineout Careers</title>
  </head>
  <body>
    <main>
      <h1>Open roles at Dineout</h1>
      <a href="https://jobs.example.com/dineout/software-engineer">Apply Now</a>
    </main>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/dineout/script.js')
  } catch {
    assert.fail('Expected Dineout scraper module at ../../scraper/dineout/script.js')
  }
}

test('Dineout constants and helpers stay pinned to the verified no-public-jobs contract', async () => {
  const dineout = await loadModule()

  assert.equal(dineout.COMPANY, 'Dineout')
  assert.equal(dineout.OFFICIAL_BRAND_NAME, 'Swiggy Dineout')
  assert.equal(dineout.PARENT_COMPANY_NAME, 'Swiggy')
  assert.equal(dineout.SOURCE, 'dineout')
  assert.equal(dineout.VERIFIED_AT, '2026-07-15')
  assert.equal(dineout.HOMEPAGE_URL, 'https://www.dineout.co.in/')
  assert.equal(dineout.CANONICAL_CONSUMER_SURFACE_URL, 'https://www.swiggy.com/dineout')
  assert.equal(dineout.OFFICIAL_BUSINESS_URL, 'https://www.swiggy.com/corporate/our-business/')
  assert.equal(dineout.CAREERS_URL, 'https://careers.swiggy.com/')
  assert.equal(
    dineout.CAREERS_INTEGRATION_SCRIPT_URL,
    'https://careers.swiggy.com/assets/js/careers-integration.js',
  )
  assert.equal(dineout.JOBS_BOARD_URL, 'https://swiggy.mynexthire.com/employer/jobs/careers')
  assert.equal(
    dineout.JOBS_BOARD_DETAILS_URL,
    'https://swiggy.mynexthire.com/employer/jobboard/details_by_shortname/get/swiggy/',
  )
  assert.equal(dineout.REDIRECTED_NO_TRUST_ROUTE_URL, 'https://www.swiggy.com/restaurants-near-me')
  assert.deepEqual(dineout.NO_TRUST_PUBLIC_JOB_ROUTE_URLS, [
    'https://www.dineout.co.in/careers',
    'https://www.dineout.co.in/careers/',
    'https://www.dineout.co.in/jobs',
    'https://www.dineout.co.in/jobs/',
    'https://www.dineout.co.in/work-with-us',
    'https://www.dineout.co.in/join-us',
  ])

  assert.equal(dineout.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(dineout.hasOfficialBusinessSignal(swiggyBusinessHtml), true)
  assert.equal(
    dineout.extractCanonicalConsumerSurfaceUrl(homepageHtml),
    'https://www.swiggy.com/dineout',
  )
  assert.equal(
    dineout.isVerifiedRedirectedNoTrustPublicJobRoute({
      status: 403,
      url: 'https://www.swiggy.com/restaurants-near-me',
      html: redirectedBlockedRouteHtml,
    }),
    true,
  )
  assert.equal(
    dineout.hasRedirectedRestaurantsNearMeSignal(redirectedRestaurantsRouteHtml),
    true,
  )
  assert.equal(
    dineout.isVerifiedRedirectedNoTrustPublicJobRoute({
      status: 200,
      url: 'https://www.swiggy.com/restaurants-near-me',
      html: redirectedRestaurantsRouteHtml,
    }),
    true,
  )
  assert.equal(dineout.hasParentCareersLandingSignal(swiggyCareersHtml), true)
  assert.equal(
    dineout.extractJobsBoardUrlFromIntegrationScript(careersIntegrationScript),
    'https://swiggy.mynexthire.com/employer/jobs/careers',
  )
  assert.equal(
    dineout.extractJobsBoardUrlFromIntegrationScript(templatedCareersIntegrationScript),
    'https://swiggy.mynexthire.com/employer/jobs/careers',
  )
  assert.equal(dineout.hasJobsBoardLandingSignal(jobsBoardHtml), true)
  assert.equal(dineout.hasVerifiedJobBoardDetailsSignal(jobBoardDetailsJson), true)
  assert.equal(dineout.hasVerifiedJobBoardDetailsSignal(nestedJobBoardDetailsJson), true)
  assert.equal(
    dineout.hasDineoutAttributablePublicRoles('Explore Dineout jobs and apply today'),
    true,
  )
})

test('Dineout returns no jobs only while the verified Swiggy handoff stays non-actionable for Dineout roles', async () => {
  const dineout = await loadModule()
  const requestedUrls = []

  const jobs = await dineout.createDineoutScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === dineout.OFFICIAL_BUSINESS_URL) {
        return { status: 200, url, html: swiggyBusinessHtml }
      }

      if (url === dineout.CAREERS_URL) {
        return { status: 200, url, html: swiggyCareersHtml }
      }

      if (url === dineout.CAREERS_INTEGRATION_SCRIPT_URL) {
        return { status: 200, url, html: careersIntegrationScript }
      }

      if (url === dineout.JOBS_BOARD_URL) {
        return { status: 200, url, html: jobsBoardHtml }
      }

      if (url === dineout.JOBS_BOARD_DETAILS_URL) {
        return { status: 200, url, html: jobBoardDetailsJson }
      }

      throw new Error(`Unexpected Dineout URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    dineout.OFFICIAL_BUSINESS_URL,
    dineout.CAREERS_URL,
    dineout.CAREERS_INTEGRATION_SCRIPT_URL,
    dineout.JOBS_BOARD_URL,
    dineout.JOBS_BOARD_DETAILS_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('Dineout uses secure Swiggy surfaces without requesting the expired legacy Dineout domain', async () => {
  const dineout = await loadModule()
  const requestedUrls = []

  const jobs = await dineout.createDineoutScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url.startsWith('https://www.dineout.co.in/')) {
        throw new Error(`Expired legacy domain must not be requested: ${url}`)
      }

      if (url === dineout.OFFICIAL_BUSINESS_URL) {
        return { status: 200, url, html: swiggyBusinessHtml }
      }

      if (url === dineout.CAREERS_URL) {
        return { status: 200, url, html: swiggyCareersHtml }
      }

      if (url === dineout.CAREERS_INTEGRATION_SCRIPT_URL) {
        return { status: 200, url, html: careersIntegrationScript }
      }

      if (url === dineout.JOBS_BOARD_URL) {
        return { status: 200, url, html: jobsBoardHtml }
      }

      if (url === dineout.JOBS_BOARD_DETAILS_URL) {
        return { status: 200, url, html: jobBoardDetailsJson }
      }

      throw new Error(`Unexpected Dineout URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    dineout.OFFICIAL_BUSINESS_URL,
    dineout.CAREERS_URL,
    dineout.CAREERS_INTEGRATION_SCRIPT_URL,
    dineout.JOBS_BOARD_URL,
    dineout.JOBS_BOARD_DETAILS_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('Dineout fails closed when the business or parent careers surfaces drift into public Dineout jobs', async () => {
  const dineout = await loadModule()

  const buildFetchPage = (overrides = {}) => async (url) => {
    if (Object.hasOwn(overrides, url)) return overrides[url]
    if (url === dineout.OFFICIAL_BUSINESS_URL) {
      return { status: 200, url, html: swiggyBusinessHtml }
    }
    if (url === dineout.CAREERS_URL) {
      return { status: 200, url, html: swiggyCareersHtml }
    }
    if (url === dineout.CAREERS_INTEGRATION_SCRIPT_URL) {
      return { status: 200, url, html: careersIntegrationScript }
    }
    if (url === dineout.JOBS_BOARD_URL) {
      return { status: 200, url, html: jobsBoardHtml }
    }
    if (url === dineout.JOBS_BOARD_DETAILS_URL) {
      return { status: 200, url, html: jobBoardDetailsJson }
    }
    throw new Error(`Unexpected Dineout URL: ${url}`)
  }

  await assert.rejects(
    dineout.createDineoutScraper().run({
      fetchPage: buildFetchPage({
        [dineout.OFFICIAL_BUSINESS_URL]: {
          status: 200,
          url: dineout.OFFICIAL_BUSINESS_URL,
          html: '<html><head><title>Placeholder</title></head><body>Welcome</body></html>',
        },
      }),
    }),
    /verified Swiggy business page/i,
  )

  await assert.rejects(
    dineout.createDineoutScraper().run({
      fetchPage: buildFetchPage({
        [dineout.CAREERS_URL]: {
          status: 200,
          url: dineout.CAREERS_URL,
          html: swiggyCareersHtml.replace('Swiggy Careers', 'Swiggy Careers - Dineout roles'),
        },
      }),
    }),
    /Dineout-attributable public roles|verified Swiggy careers landing page/i,
  )

  await assert.rejects(
    dineout.createDineoutScraper().run({
      fetchPage: buildFetchPage({
        [dineout.CAREERS_INTEGRATION_SCRIPT_URL]: {
          status: 200,
          url: dineout.CAREERS_INTEGRATION_SCRIPT_URL,
          html: careersIntegrationScript.replace(
            'https://" + clientShortName + ".mynexthire.com/employer/jobs/careers',
            'https://example.com/jobs',
          ),
        },
      }),
    }),
    /verified Swiggy careers integration/i,
  )

  await assert.rejects(
    dineout.createDineoutScraper().run({
      fetchPage: buildFetchPage({
        [dineout.JOBS_BOARD_DETAILS_URL]: {
          status: 200,
          url: dineout.JOBS_BOARD_DETAILS_URL,
          html: JSON.stringify({
            clientName: 'Swiggy',
            career_page_url: {
              url: {
                list: 'https://careers.swiggy.com/#/careers',
              },
            },
            note: 'Dineout openings are now live',
          }),
        },
      }),
    }),
    /Dineout-attributable public roles|verified Swiggy job board details/i,
  )
})
