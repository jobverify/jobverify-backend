import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildWorkdayAppliedFacets,
  buildWorkdaySearchUrl,
  extractCity,
  fetchWorkdayJobsApiPage,
  hasWorkdayOutageSignal,
  matchesWorkdayLocationPattern,
  shouldFetchWorkdayJobDetail,
  shouldContinueWorkdayJobsApiPagination,
  WorkdayUpstreamOutageError,
} from '../myworkday/engine.js'

test('buildWorkdaySearchUrl appends the India locationCountry filter when the base URL has no query', () => {
  assert.equal(
    buildWorkdaySearchUrl(
      'https://example.wd5.myworkdayjobs.com/en-US/External',
      'c4f78be1a8f14da0ab49ce1162348a5e',
    ),
    'https://example.wd5.myworkdayjobs.com/en-US/External?locationCountry=c4f78be1a8f14da0ab49ce1162348a5e',
  )
})

test('buildWorkdaySearchUrl appends the India locationCountry filter when the base URL already has other query params', () => {
  assert.equal(
    buildWorkdaySearchUrl(
      'https://example.wd5.myworkdayjobs.com/en-US/External?locations=abc123',
      'c4f78be1a8f14da0ab49ce1162348a5e',
    ),
    'https://example.wd5.myworkdayjobs.com/en-US/External?locations=abc123&locationCountry=c4f78be1a8f14da0ab49ce1162348a5e',
  )
})

test('buildWorkdaySearchUrl preserves prefiltered country queries from official career pages', () => {
  const existing = 'https://sec.wd3.myworkdayjobs.com/en-US/Samsung_Careers?locations=189767dd6c9201b802603c83a5292c78&Location_Country=c4f78be1a8f14da0ab49ce1162348a5e&hiringCompany=189767dd6c9201554f3e5312a7290a85'

  assert.equal(
    buildWorkdaySearchUrl(existing, 'c4f78be1a8f14da0ab49ce1162348a5e'),
    existing,
  )
})

test('buildWorkdaySearchUrl can skip the default country query for boards that reject the generic India facet', () => {
  assert.equal(
    buildWorkdaySearchUrl(
      'https://marvell.wd1.myworkdayjobs.com/en-US/MarvellCareers',
      null,
    ),
    'https://marvell.wd1.myworkdayjobs.com/en-US/MarvellCareers',
  )
})

test('buildWorkdayAppliedFacets maps the default India filter to the Workday country facet', () => {
  assert.deepEqual(
    buildWorkdayAppliedFacets(
      'https://cadence.wd1.myworkdayjobs.com/External_Careers',
      'c4f78be1a8f14da0ab49ce1162348a5e',
    ),
    {
      Location_Country: ['c4f78be1a8f14da0ab49ce1162348a5e'],
    },
  )
})

test('buildWorkdayAppliedFacets preserves existing Workday facet params from prefiltered career pages', () => {
  assert.deepEqual(
    buildWorkdayAppliedFacets(
      'https://sec.wd3.myworkdayjobs.com/en-US/Samsung_Careers?locations=189767dd6c9201b802603c83a5292c78&Location_Country=c4f78be1a8f14da0ab49ce1162348a5e&hiringCompany=189767dd6c9201554f3e5312a7290a85',
      'c4f78be1a8f14da0ab49ce1162348a5e',
    ),
    {
      locations: ['189767dd6c9201b802603c83a5292c78'],
      Location_Country: ['c4f78be1a8f14da0ab49ce1162348a5e'],
      hiringCompany: ['189767dd6c9201554f3e5312a7290a85'],
    },
  )
})

test('buildWorkdayAppliedFacets can omit the default country facet for boards that need post-filtering instead', () => {
  assert.deepEqual(
    buildWorkdayAppliedFacets(
      'https://marvell.wd1.myworkdayjobs.com/en-US/MarvellCareers',
      null,
    ),
    {},
  )
})

test('extractCity prefers the city segment for country-first Workday locations and normalizes virtual India jobs as remote', () => {
  assert.equal(extractCity('India, Bangalore'), 'Bangalore')
  assert.equal(extractCity('Virtual India'), 'Remote')
})

test('matchesWorkdayLocationPattern can enforce India-only results when Workday query params are insufficient', () => {
  assert.equal(
    matchesWorkdayLocationPattern(
      {
        location: '2 Locations',
        locations: ['Bengaluru, India', 'Mumbai, India'],
      },
      'india|bengaluru|bangalore|mumbai',
    ),
    true,
  )

  assert.equal(
    matchesWorkdayLocationPattern(
      {
        location: 'USA - Remote',
        locations: [],
      },
      'india|bengaluru|bangalore|mumbai',
    ),
    false,
  )
})

test('shouldContinueWorkdayJobsApiPagination keeps paging when Workday returns a full page but zero total on later offsets', () => {
  assert.equal(
    shouldContinueWorkdayJobsApiPagination({
      jobsCount: 20,
      offsetAfterPage: 40,
      payloadTotal: 0,
      pageSize: 20,
    }),
    true,
  )
})

test('shouldContinueWorkdayJobsApiPagination stops when Workday returns a short final page', () => {
  assert.equal(
    shouldContinueWorkdayJobsApiPagination({
      jobsCount: 4,
      offsetAfterPage: 84,
      payloadTotal: 0,
      pageSize: 20,
    }),
    false,
  )
})

test('shouldFetchWorkdayJobDetail skips obvious non-matching summary locations but keeps grouped labels for detail inspection', () => {
  assert.equal(
    shouldFetchWorkdayJobDetail(
      { location: 'Santa Clara, CA' },
      'india|bengaluru|bangalore|pune|hyderabad',
    ),
    false,
  )

  assert.equal(
    shouldFetchWorkdayJobDetail(
      { location: 'Bangalore' },
      'india|bengaluru|bangalore|pune|hyderabad',
    ),
    true,
  )

  assert.equal(
    shouldFetchWorkdayJobDetail(
      { location: '2 Locations' },
      'india|bengaluru|bangalore|pune|hyderabad',
    ),
    true,
  )
})

test('shouldFetchWorkdayJobDetail skips clearly non-India summary locations even without a custom location pattern', () => {
  assert.equal(
    shouldFetchWorkdayJobDetail(
      { location: 'Remote, North Carolina, United States of America' },
    ),
    false,
  )

  assert.equal(
    shouldFetchWorkdayJobDetail(
      { location: 'Madrid, Spain' },
    ),
    false,
  )

  assert.equal(
    shouldFetchWorkdayJobDetail(
      { location: 'Bangalore Area' },
    ),
    true,
  )

  assert.equal(
    shouldFetchWorkdayJobDetail(
      { location: 'Ind – Blr Sez 1 (3Rd, 6Th & 7Th Floor)' },
    ),
    true,
  )
})

test('fetchWorkdayJobsApiPage retries transient network failures before succeeding', async () => {
  const originalFetch = global.fetch
  let attempts = 0

  global.fetch = async () => {
    attempts += 1
    if (attempts < 3) {
      throw new TypeError('fetch failed')
    }

    return {
      ok: true,
      json: async () => ({
        total: 1,
        jobPostings: [{ title: 'Recovered request' }],
      }),
    }
  }

  try {
    const payload = await fetchWorkdayJobsApiPage({
      jobsApiUrl: 'https://example.wd5.myworkdayjobs.com/wday/cxs/example/external/jobs',
      appliedFacets: { Location_Country: ['india-id'] },
      offset: 0,
      limit: 20,
      searchText: '',
    })

    assert.equal(attempts, 3)
    assert.equal(payload.total, 1)
    assert.equal(payload.jobPostings[0].title, 'Recovered request')
  } finally {
    global.fetch = originalFetch
  }
})

test('fetchWorkdayJobsApiPage can bootstrap a Workday session before posting to jobs endpoints that require cookies and csrf', async () => {
  const originalFetch = global.fetch
  const calls = []

  global.fetch = async (url, options = {}) => {
    calls.push({
      url,
      method: options.method || 'GET',
      headers: options.headers || {},
      body: options.body || null,
    })

    if (calls.length === 1) {
      assert.equal(options.method ?? 'GET', 'GET')
      assert.equal(
        url,
        'https://abb.wd3.myworkdayjobs.com/External_Career_Page?locationCountry=c4f78be1a8f14da0ab49ce1162348a5e',
      )

      return {
        ok: true,
        status: 200,
        url,
        headers: {
          getSetCookie: () => ([
            'PLAY_SESSION=session-cookie; Path=/; Secure; HttpOnly',
            'CALYPSO_CSRF_TOKEN=csrf-cookie-token; Path=/; Secure',
          ]),
          get: () => 'text/html; charset=UTF-8',
        },
        text: async () => '<html><body>Workday shell</body></html>',
      }
    }

    assert.equal(url, 'https://abb.wd3.myworkdayjobs.com/wday/cxs/abb/External_Career_Page/jobs')
    assert.equal(options.method, 'POST')
    assert.equal(options.headers.accept, 'application/json')
    assert.equal(options.headers['content-type'], 'application/json')
    assert.equal(options.headers['x-calypso-csrf-token'], 'csrf-cookie-token')
    assert.match(options.headers.cookie, /PLAY_SESSION=session-cookie/)
    assert.match(options.headers.cookie, /CALYPSO_CSRF_TOKEN=csrf-cookie-token/)
    assert.equal(
      options.headers.referer,
      'https://abb.wd3.myworkdayjobs.com/External_Career_Page?locationCountry=c4f78be1a8f14da0ab49ce1162348a5e',
    )
    assert.equal(options.headers.origin, 'https://abb.wd3.myworkdayjobs.com')

    return {
      ok: true,
      status: 200,
      url,
      headers: {
        get: () => 'application/json',
      },
      json: async () => ({
        total: 1,
        jobPostings: [{ title: 'Accounting and Reporting Analyst' }],
      }),
    }
  }

  try {
    const payload = await fetchWorkdayJobsApiPage({
      jobsApiUrl: 'https://abb.wd3.myworkdayjobs.com/wday/cxs/abb/External_Career_Page/jobs',
      bootstrapUrl: 'https://abb.wd3.myworkdayjobs.com/External_Career_Page?locationCountry=c4f78be1a8f14da0ab49ce1162348a5e',
      appliedFacets: { locationCountry: ['c4f78be1a8f14da0ab49ce1162348a5e'] },
      offset: 0,
      limit: 20,
      searchText: '',
      source: 'abb',
    })

    assert.equal(calls.length, 2)
    assert.equal(payload.total, 1)
    assert.equal(payload.jobPostings[0].title, 'Accounting and Reporting Analyst')
  } finally {
    global.fetch = originalFetch
  }
})

test('hasWorkdayOutageSignal detects Workday outage markers from titles, html, and redirect URLs', () => {
  assert.equal(
    hasWorkdayOutageSignal({
      title: 'Workday is currently unavailable.',
    }),
    true,
  )

  assert.equal(
    hasWorkdayOutageSignal({
      html: '<html><body><a href="https://community.workday.com/maintenance-page?d=5&s=1&e=1&o=">Maintenance</a></body></html>',
    }),
    true,
  )

  assert.equal(
    hasWorkdayOutageSignal({
      responseUrls: ['https://wd5.myworkday.com/wday/drs/outage?t=cloudera&s=External_Career'],
    }),
    true,
  )

  assert.equal(
    hasWorkdayOutageSignal({
      title: 'Careers | Example Corp',
      html: '<html><body><ul role="list"></ul></body></html>',
    }),
    false,
  )
})

test('hasWorkdayOutageSignal does not treat the normal Workday shell maintenancePageUrl config as an outage by itself', () => {
  assert.equal(
    hasWorkdayOutageSignal({
      html: `
        <script>
          window.__APP_CONFIG__ = {
            maintenancePageUrl: "https://wd3.myworkday.com/wday/drs/outage?t=abb&s=External_Career_Page",
            appName: "cxs"
          };
        </script>
      `,
    }),
    false,
  )
})

test('fetchWorkdayJobsApiPage throws a WorkdayUpstreamOutageError when Workday returns an outage html page', async () => {
  const originalFetch = global.fetch

  global.fetch = async () => ({
    ok: true,
    status: 200,
    url: 'https://example.wd5.myworkdayjobs.com/wday/cxs/example/external/jobs',
    headers: {
      get: (name) => (name.toLowerCase() === 'content-type' ? 'text/html; charset=UTF-8' : null),
    },
    text: async () => '<html><head><title>Workday is currently unavailable.</title></head><body>maintenance-page</body></html>',
  })

  try {
    await assert.rejects(
      fetchWorkdayJobsApiPage({
        jobsApiUrl: 'https://example.wd5.myworkdayjobs.com/wday/cxs/example/external/jobs',
        appliedFacets: { Location_Country: ['india-id'] },
        offset: 0,
        limit: 20,
        searchText: '',
        source: 'example',
      }),
      (error) => {
        assert.equal(error instanceof WorkdayUpstreamOutageError, true)
        assert.equal(error.softFailure, true)
        assert.match(error.message, /\[example\] Workday is currently unavailable upstream/i)
        return true
      },
    )
  } finally {
    global.fetch = originalFetch
  }
})

test('fetchWorkdayJobsApiPage treats Workday JSON API failures as soft upstream failures', async () => {
  const originalFetch = global.fetch

  global.fetch = async () => ({
    ok: false,
    status: 400,
    url: 'https://example.wd5.myworkdayjobs.com/wday/cxs/example/external/jobs',
    headers: {
      get: (name) => (name.toLowerCase() === 'content-type' ? 'application/json;charset=ISO-8859-1' : null),
    },
    text: async () => JSON.stringify({
      errorCode: 'HTTP_400',
      errorCaseId: 'E8ED33MRRIIQ0J',
      httpStatus: 400,
      locale: '*',
      message: '',
      messageParams: {},
    }),
  })

  try {
    await assert.rejects(
      fetchWorkdayJobsApiPage({
        jobsApiUrl: 'https://example.wd5.myworkdayjobs.com/wday/cxs/example/external/jobs',
        appliedFacets: { Location_Country: ['india-id'] },
        offset: 0,
        limit: 20,
        searchText: '',
        source: 'example',
      }),
      (error) => {
        assert.equal(error instanceof WorkdayUpstreamOutageError, true)
        assert.equal(error.softFailure, true)
        assert.match(error.message, /\[example\] Workday jobs API returned HTTP_400/i)
        return true
      },
    )
  } finally {
    global.fetch = originalFetch
  }
})
