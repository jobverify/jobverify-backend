import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-16T00:00:00.000Z'

const homepageHtml = `
<!doctype html>
<html lang="eng">
  <head>
    <title>JioHotstar - Watch TV Shows, Movies, Specials, Live Cricket &amp; Football</title>
    <meta
      name="description"
      content="JioHotstar is India’s largest premium streaming platform with more than 100,000 hours of drama and movies in 17 languages, and coverage of every major global sporting event"
    />
  </head>
  <body></body>
</html>
`

const currentHomepageHtml = homepageHtml.replace(
  /content="JioHotstar is [\s\S]*?global sporting event"/,
  'content="JioHotstar is India’s largest premium streaming platform with more than 100,000 hours of drama and movies in 17 languages, and coverage of every major global sporting event"',
)

const careersPageHtml = `
<!doctype html>
<html lang="en-US">
  <head>
    <title>JioStar - India’s Largest Media Conglomerate | Entertainment Reimagined</title>
  </head>
  <body>
    <script type="application/ld+json">
      {"description":"JioStar is India's largest media and entertainment conglomerate, formed through the merger of Reliance's Viacom18 and Disney Star India. It operates 120+ television channels and Jio Hotstar streaming platform, reaching over 800 million viewers weekly."}
    </script>
    <a target="_blank" href="https://jiostar.wd102.myworkdayjobs.com/JioStar">Careers</a>
  </body>
</html>
`

const workdayBoardPage = {
  status: 200,
  url: 'https://jiostar.wd102.myworkdayjobs.com/JioStar',
  html: `
    <!doctype html>
    <html lang="en-US">
      <head>
        <link rel="canonical" href="https://jiostar.wd102.myworkdayjobs.com/JioStar" />
        <meta
          name="description"
          property="og:description"
          content="Perched firmly at the nucleus of spellbinding content and innovative technology, JioStar is a leading global media &amp;amp; entertainment company that is reimagining the way audiences consume entertainment and sports."
        >
        <meta property="og:url" content="https://jiostar.wd102.myworkdayjobs.com/JioStar">
      </head>
      <body>
        <script>
          window.workday = window.workday || {
            tenant: "jiostar",
            siteId: "JioStar",
            appName: "cxs",
            isExternal: true
          };
        </script>
      </body>
    </html>
  `,
}

const firstPagePayload = {
  total: 22,
  jobPostings: [
    {
      title: 'Assistant Manager - Marketing, JioHotstar (South)',
      externalPath: '/job/Chennai---Kochar-Jade/Assistant-Manager---Marketing--JioHotstar--South-_JR11910',
      locationsText: 'Chennai - Kochar Jade',
      postedOn: 'Posted 30 Days Ago',
      bulletFields: ['JR11910'],
    },
    {
      title: 'Senior Director - Marketing, JioHotstar (South)',
      externalPath: '/job/Bengaluru---EGL/Senior-Director---Marketing--JioHotstar--South-_JR12076',
      locationsText: 'Bengaluru - EGL',
      postedOn: 'Posted Today',
      bulletFields: ['JR12076'],
    },
    ...Array.from({ length: 18 }, (_, index) => ({
      title: `Mock Hotstar Role ${index + 3}`,
      externalPath: `/job/Mumbai---OUC/Mock-Hotstar-Role-${index + 3}_JR20${index + 3}`,
      locationsText: 'Mumbai - OUC',
      postedOn: `Posted ${index + 1} Days Ago`,
      bulletFields: [`JR20${index + 3}`],
    })),
  ],
}

const secondPagePayload = {
  total: 22,
  jobPostings: [
    {
      title: 'Manager - Analytics',
      externalPath: '/job/Mumbai/Manager---Analytics_JR10336',
      locationsText: 'Mumbai',
      postedOn: 'Posted 20 Days Ago',
      bulletFields: ['JR10336'],
    },
    {
      title: 'Software Development Engineer II (Web) - VX',
      externalPath: '/job/Bengaluru/Software-Development-Engineer-II--Web----VX_JR10213',
      locationsText: 'Bengaluru',
      postedOn: 'Posted 30+ Days Ago',
      bulletFields: ['JR10213'],
    },
  ],
}

const loadModule = async () => {
  try {
    return await import('../../scraper/hotstar.workday/script.js')
  } catch {
    assert.fail('Expected Hotstar scraper module at ../../scraper/hotstar.workday/script.js')
  }
}

test('Hotstar pins the verified JioHotstar homepage, JioStar careers handoff, and keyworded Workday API contract', async () => {
  const hotstar = await loadModule()

  assert.equal(hotstar.SOURCE, 'hotstar')
  assert.equal(hotstar.COMPANY_NAME, 'Hotstar')
  assert.equal(hotstar.OFFICIAL_BRAND_NAME, 'JioHotstar')
  assert.equal(hotstar.HOMEPAGE_URL, 'https://www.hotstar.com/')
  assert.equal(hotstar.CAREERS_URL, 'https://www.jiostar.com/')
  assert.equal(hotstar.WORKDAY_BOARD_URL, 'https://jiostar.wd102.myworkdayjobs.com/JioStar')
  assert.equal(
    hotstar.JOBS_API_URL,
    'https://jiostar.wd102.myworkdayjobs.com/wday/cxs/jiostar/JioStar/jobs',
  )
  assert.equal(hotstar.VERIFIED_KEYWORD, 'JioHotstar')
  assert.equal(hotstar.hasOfficialHomepageSignal(currentHomepageHtml), true)
  assert.equal(hotstar.hasOfficialCareersSignal(careersPageHtml), true)
  assert.equal(
    hotstar.extractVerifiedWorkdayBoardUrl(careersPageHtml),
    'https://jiostar.wd102.myworkdayjobs.com/JioStar',
  )
  assert.equal(hotstar.hasOfficialWorkdayBoardSignal(workdayBoardPage), true)
  assert.deepEqual(
    JSON.parse(hotstar.buildKeywordSearchRequestBody({ offset: 20 })),
    {
      appliedFacets: {},
      limit: 20,
      offset: 20,
      searchText: 'JioHotstar',
    },
  )
  assert.deepEqual(
    hotstar.extractJobsFromPayload({
      total: 2,
      jobPostings: [
        firstPagePayload.jobPostings[0],
        firstPagePayload.jobPostings[1],
      ],
    }, FIXED_SCRAPED_AT),
    [
      {
        jobId: 'JR11910',
        title: 'Assistant Manager - Marketing, JioHotstar (South)',
        company: 'Hotstar',
        department: null,
        location: 'Chennai, India',
        city: 'Chennai',
        state: null,
        country: 'India',
        sourceUrl: 'https://jiostar.wd102.myworkdayjobs.com/JioStar/job/Chennai---Kochar-Jade/Assistant-Manager---Marketing--JioHotstar--South-_JR11910',
        applyUrl: 'https://jiostar.wd102.myworkdayjobs.com/JioStar/job/Chennai---Kochar-Jade/Assistant-Manager---Marketing--JioHotstar--South-_JR11910/apply',
        employmentType: null,
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: 'Posted 30 Days Ago',
        closingDate: null,
        jobDescription: null,
        requisitionId: 'JR11910',
        source: 'hotstar',
        link: 'https://jiostar.wd102.myworkdayjobs.com/JioStar/job/Chennai---Kochar-Jade/Assistant-Manager---Marketing--JioHotstar--South-_JR11910/apply',
        scrapedAt: FIXED_SCRAPED_AT,
      },
      {
        jobId: 'JR12076',
        title: 'Senior Director - Marketing, JioHotstar (South)',
        company: 'Hotstar',
        department: null,
        location: 'Bangalore, India',
        city: 'Bangalore',
        state: null,
        country: 'India',
        sourceUrl: 'https://jiostar.wd102.myworkdayjobs.com/JioStar/job/Bengaluru---EGL/Senior-Director---Marketing--JioHotstar--South-_JR12076',
        applyUrl: 'https://jiostar.wd102.myworkdayjobs.com/JioStar/job/Bengaluru---EGL/Senior-Director---Marketing--JioHotstar--South-_JR12076/apply',
        employmentType: null,
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: 'Posted Today',
        closingDate: null,
        jobDescription: null,
        requisitionId: 'JR12076',
        source: 'hotstar',
        link: 'https://jiostar.wd102.myworkdayjobs.com/JioStar/job/Bengaluru---EGL/Senior-Director---Marketing--JioHotstar--South-_JR12076/apply',
        scrapedAt: FIXED_SCRAPED_AT,
      },
    ],
  )
})

test('Hotstar run validates the verified handoff and paginates keyworded Workday results', async () => {
  const hotstar = await loadModule()
  const requestedPages = []
  const requestedBodies = []

  const jobs = await hotstar.createHotstarScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchPage: async (url) => {
      requestedPages.push(url)

      if (url === hotstar.HOMEPAGE_URL) {
        return { status: 200, url: 'https://www.hotstar.com/in', html: currentHomepageHtml }
      }

      if (url === hotstar.CAREERS_URL) {
        return { status: 200, url, html: careersPageHtml }
      }

      if (url === hotstar.WORKDAY_BOARD_URL) {
        return workdayBoardPage
      }

      throw new Error(`Unexpected Hotstar page URL: ${url}`)
    },
    fetchJson: async (url, body) => {
      assert.equal(url, hotstar.JOBS_API_URL)
      requestedBodies.push(JSON.parse(body))

      if (requestedBodies.length === 1) return firstPagePayload
      if (requestedBodies.length === 2) return secondPagePayload

      throw new Error(`Unexpected Hotstar jobs API call #${requestedBodies.length}`)
    },
  })

  assert.deepEqual(requestedPages, [
    hotstar.HOMEPAGE_URL,
    hotstar.CAREERS_URL,
    hotstar.WORKDAY_BOARD_URL,
  ])
  assert.deepEqual(requestedBodies, [
    JSON.parse(hotstar.buildKeywordSearchRequestBody({ offset: 0 })),
    JSON.parse(hotstar.buildKeywordSearchRequestBody({ offset: 20 })),
  ])
  assert.equal(jobs.length, 22)
  assert.deepEqual(
    jobs.slice(0, 2).map((job) => [job.title, job.location, job.requisitionId, job.source, job.scrapedAt]),
    [
      ['Assistant Manager - Marketing, JioHotstar (South)', 'Chennai, India', 'JR11910', 'hotstar', FIXED_SCRAPED_AT],
      ['Senior Director - Marketing, JioHotstar (South)', 'Bangalore, India', 'JR12076', 'hotstar', FIXED_SCRAPED_AT],
    ],
  )
  assert.deepEqual(
    jobs.slice(-2).map((job) => [job.title, job.location, job.requisitionId]),
    [
      ['Manager - Analytics', 'Mumbai, India', 'JR10336'],
      ['Software Development Engineer II (Web) - VX', 'Bangalore, India', 'JR10213'],
    ],
  )
})
