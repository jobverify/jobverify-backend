import assert from 'node:assert/strict'
import test from 'node:test'

const CAREERS_HTML = `
  <html>
    <body>
      <main>
        <h1>Give the World New Ways to Transact</h1>
        <a href="https://www.chippercash.com/career-current-openings">See Current Openings</a>
        <h2>Provide the most trusted and accessible financial services for people living in Africa and beyond.</h2>
        <h2>Unlock global opportunities to connect Africa.</h2>
        <p>See Current Openings</p>
        <h2>Find Your People</h2>
      </main>
    </body>
  </html>
`

const CURRENT_OPENINGS_HTML = `
  <html>
    <body>
      <main>
        <h1>Your Finest Hours Await</h1>
        <h2>Openings Available</h2>
        <p>All Location Ghana South Africa Zambia Zimbabwe Rwanda Nigeria UK</p>
        <p>All Department Business & Customer Operations Engineering Finance Legal, Risk and Compliance</p>
        <section>
          <h3>Business & Customer Operations</h3>
          <a href="https://www.chippercash.com/career/growth-analyst-nigeria">Growth Analyst, Nigeria</a>
        </section>
        <section>
          <h3>Engineering</h3>
          <a href="https://www.chippercash.com/career/software-engineer-i---risk-compliance">
            Software Engineer I - Risk & Compliance
          </a>
          <a href="https://www.chippercash.com/career/data-engineer--risk-intelligence">
            Data Engineer, Risk Intelligence
          </a>
          <a href="https://www.chippercash.com/career/software-engineer-i-risk-intelligence-automations">
            Software Engineer I - Risk Intelligence & Automations
          </a>
        </section>
        <section>
          <h3>Finance</h3>
          <p>No items found.</p>
        </section>
        <section>
          <h3>Legal, Risk and Compliance</h3>
          <a href="https://www.chippercash.com/career/risk-and-compliance-officer-associate-rwanda">
            RISK AND COMPLIANCE OFFICER/ASSOCIATE RWANDA
          </a>
        </section>
      </main>
    </body>
  </html>
`

const DETAIL_PAGES = {
  'https://www.chippercash.com/career/growth-analyst-nigeria': `
    <html>
      <body>
        <main>
          <a href="https://www.chippercash.com/careers">Careers</a>
          <h1>Growth Analyst, Nigeria</h1>
          <p>Who we are</p>
          <p>Identify Growth Opportunities and analyze customer behavior across cohorts.</p>
          <p>Location:</p>
          <p>This role is based in Nigeria and follows a hybrid work arrangement.</p>
          <p>Next Steps</p>
          <p>
            If you feel you are a fit, please send in your application to careers@chippercash.com by 17th November 2025.
          </p>
        </main>
      </body>
    </html>
  `,
  'https://www.chippercash.com/career/software-engineer-i---risk-compliance': `
    <html>
      <body>
        <main>
          <a href="https://www.chippercash.com/careers">Careers</a>
          <h1>Software Engineer I - Risk & Compliance</h1>
          <p>Who we are</p>
          <p>
            This is a 3-month provisional contract-based role, with a goal of conversion to a long-term position at the end of the provisional period.
          </p>
          <p>Location:</p>
          <p>This role is based in Nigeria and follows a hybrid work arrangement.</p>
          <p>Next Steps</p>
          <p>
            If you feel you are a fit, please send in your application to careers@chippercash.com by 7th November 2025.
          </p>
        </main>
      </body>
    </html>
  `,
  'https://www.chippercash.com/career/data-engineer--risk-intelligence': `
    <html>
      <body>
        <main>
          <a href="https://www.chippercash.com/careers">Careers</a>
          <h1>Data Engineer, Risk Intelligence</h1>
          <p>Who we are</p>
          <p>
            Build, evaluate, and deploy intelligent risk models that replace manual reviews and empower Risk & Compliance teams to make faster, smarter, and more consistent decisions.
          </p>
          <p>Location:</p>
          <p>This role is based in Nigeria and follows a hybrid work arrangement.</p>
          <p>Next Steps</p>
          <p>
            If you feel you are a fit, please send in your application to careers@chippercash.com by 7th November 2025.
          </p>
        </main>
      </body>
    </html>
  `,
  'https://www.chippercash.com/career/software-engineer-i-risk-intelligence-automations': `
    <html>
      <body>
        <main>
          <a href="https://www.chippercash.com/careers">Careers</a>
          <h1>Software Engineer I - Risk Intelligence & Automations</h1>
          <p>Who we are</p>
          <p>
            The Risk Intelligence & Automations team sits at the core of Chipper Cash's mission to build a trusted, compliant, and frictionless financial ecosystem across Africa and beyond.
          </p>
          <p>Location:</p>
          <p>This role is based in Nigeria and follows a hybrid work arrangement.</p>
          <p>Next Steps</p>
          <p>
            If you feel you are a fit, please send in your application to careers@chippercash.com by 7th November 2025.
          </p>
        </main>
      </body>
    </html>
  `,
  'https://www.chippercash.com/career/risk-and-compliance-officer-associate-rwanda': `
    <html>
      <body>
        <main>
          <a href="https://www.chippercash.com/careers">Careers</a>
          <h1>RISK AND COMPLIANCE OFFICER/ASSOCIATE RWANDA</h1>
          <p>Who we are</p>
          <p>
            The Risk & Compliance Officer / Associate will support AML/CFT/CPF execution and regulatory reporting in Rwanda.
          </p>
          <p>Location:</p>
          <p>This role is based in Rwanda and follows a hybrid work arrangement.</p>
          <p>Next Steps</p>
          <p>
            If you feel you are a fit, please send in your application to careers@chippercash.com by 24th February 2026.
          </p>
        </main>
      </body>
    </html>
  `,
}

const loadModule = async () => {
  try {
    return await import('../../scraper/chippercashindia/script.js')
  } catch {
    assert.fail(
      'Expected Chipper Cash India scraper module at ../../scraper/chippercashindia/script.js',
    )
  }
}

const createFetchText = () => {
  const responses = new Map([
    ['https://www.chippercash.com/careers', CAREERS_HTML],
    ['https://www.chippercash.com/career-current-openings', CURRENT_OPENINGS_HTML],
    ...Object.entries(DETAIL_PAGES),
  ])
  const requests = []

  return {
    requests,
    fetchText: async (url) => {
      requests.push(url)

      if (!responses.has(url)) {
        throw new Error(`Unexpected URL ${url}`)
      }

      return responses.get(url)
    },
  }
}

test('Chipper Cash India extracts the verified stale same-origin openings evidence and maps the linked non-India role pages to the shared shape', async () => {
  const chipper = await loadModule()
  const { fetchText, requests } = createFetchText()

  const jobs = await chipper.extractVerifiedPublicJobs({
    fetchText,
    now: () => '2026-07-25T12:00:00.000Z',
  })

  assert.deepEqual(requests, [
    chipper.CAREERS_URL,
    chipper.CURRENT_OPENINGS_URL,
    ...chipper.VERIFIED_PUBLIC_JOBS.map((job) => job.detailUrl),
  ])
  assert.equal(jobs.length, 5)
  assert.deepEqual(
    jobs.map((job) => [job.title, job.country, job.department]),
    [
      ['Growth Analyst, Nigeria', 'Nigeria', 'Business & Customer Operations'],
      ['Software Engineer I - Risk & Compliance', 'Nigeria', 'Engineering'],
      ['Data Engineer, Risk Intelligence', 'Nigeria', 'Engineering'],
      ['Software Engineer I - Risk Intelligence & Automations', 'Nigeria', 'Engineering'],
      ['RISK AND COMPLIANCE OFFICER/ASSOCIATE RWANDA', 'Rwanda', 'Legal, Risk and Compliance'],
    ],
  )
  assert.ok(jobs.every((job) => job.remoteStatus === 'Hybrid'))
  assert.ok(jobs.every((job) => job.source === 'chippercashindia'))
  assert.ok(jobs.every((job) => job.scrapedAt === '2026-07-25T12:00:00.000Z'))
  assert.ok(
    jobs.every((job) => job.closingDate && job.closingDate < '2026-07-25T00:00:00.000Z'),
  )
})

test('Chipper Cash India run stays fail-closed because the verified first-party openings inventory is stale and non-India', async () => {
  const chipper = await loadModule()
  const { fetchText } = createFetchText()

  const jobs = await chipper.run({
    fetchText,
    now: () => '2026-07-25T12:00:00.000Z',
  })

  assert.deepEqual(jobs, [])
  assert.equal(chipper.SOURCE, 'chippercashindia')
  assert.equal(chipper.COMPANY, 'Chipper Cash India')
  assert.equal(chipper.OFFICIAL_BRAND, 'Chipper Cash')
  assert.equal(chipper.CAREERS_URL, 'https://www.chippercash.com/careers')
  assert.equal(
    chipper.CURRENT_OPENINGS_URL,
    'https://www.chippercash.com/career-current-openings',
  )
  assert.equal(
    chipper.DISPOSITION,
    'verified-first-party-careers-pages-with-stale-same-origin-openings-fail-closed',
  )
  assert.match(
    chipper.VERIFIED_SURFACE_SUMMARY,
    /Verified on Saturday, July 25, 2026 that https:\/\/www\.chippercash\.com\/careers was the live first-party Chipper Cash careers surface/i,
  )
  assert.match(
    chipper.VERIFIED_SURFACE_SUMMARY,
    /https:\/\/www\.chippercash\.com\/career-current-openings still exposed same-origin opening links/i,
  )
  assert.match(
    chipper.VERIFIED_SURFACE_SUMMARY,
    /application deadlines that were already in the past on Saturday, July 25, 2026/i,
  )
  assert.match(
    chipper.VERIFIED_SURFACE_SUMMARY,
    /no trustworthy current public jobs contract was verified for Chipper Cash India/i,
  )
  assert.match(chipper.VERIFIED_SURFACE_SUMMARY, /returns no jobs until a stable current openings flow is verified/i)
})

test('Chipper Cash India rejects when the verified careers surface markers disappear', async () => {
  const chipper = await loadModule()
  const { fetchText } = createFetchText()

  await assert.rejects(
    chipper.run({
      fetchText: async (url) => {
        if (url === chipper.CAREERS_URL) {
          return `
            <html>
              <body>
                <main>
                  <h1>Careers</h1>
                  <p>Join our team.</p>
                </main>
              </body>
            </html>
          `
        }

        return fetchText(url)
      },
    }),
    /verified careers surface changed/i,
  )
})

test('Chipper Cash India rejects when the verified same-origin openings contract changes materially', async () => {
  const chipper = await loadModule()
  const { fetchText } = createFetchText()

  await assert.rejects(
    chipper.run({
      fetchText: async (url) => {
        if (url === chipper.CURRENT_OPENINGS_URL) {
          return `
            ${CURRENT_OPENINGS_HTML}
            <section>
              <h3>Engineering</h3>
              <a href="https://www.chippercash.com/career/founding-engineer-india">Founding Engineer, India</a>
            </section>
          `
        }

        return fetchText(url)
      },
    }),
    /listing contract changed materially/i,
  )
})

test('Chipper Cash India rejects when a verified same-origin detail page stops matching the stale past-deadline contract', async () => {
  const chipper = await loadModule()
  const { fetchText } = createFetchText()

  await assert.rejects(
    chipper.run({
      fetchText: async (url) => {
        if (url === 'https://www.chippercash.com/career/data-engineer--risk-intelligence') {
          return `
            <html>
              <body>
                <main>
                  <a href="https://www.chippercash.com/careers">Careers</a>
                  <h1>Data Engineer, Risk Intelligence</h1>
                  <p>Who we are</p>
                  <p>
                    Build, evaluate, and deploy intelligent risk models that replace manual reviews and empower Risk & Compliance teams to make faster, smarter, and more consistent decisions.
                  </p>
                  <p>Location:</p>
                  <p>This role is based in Nigeria and follows a hybrid work arrangement.</p>
                  <p>Next Steps</p>
                  <p>
                    If you feel you are a fit, please send in your application to careers@chippercash.com by 30th July 2026.
                  </p>
                </main>
              </body>
            </html>
          `
        }

        return fetchText(url)
      },
    }),
    /detail page changed materially|stale past-deadline contract|trustworthy current jobs flow/i,
  )
})
