import assert from 'node:assert/strict'
import test from 'node:test'

import { readInventoryEvidence } from '../utils/inventoryEvidence.js'

const VERIFIED_CAREERS_HTML = `
  <html>
    <body>
      <main>
        <h1>Foray Into The</h1>
        <h1>Future.</h1>
        <h2>Join ForaySoft.</h2>
        <p>Become a contributing member of a team of highly skilled professionals, create an impact on the future.</p>
        <h2>Do What</h2>
        <h2>you love.</h2>
        <p>We are looking for passionate individuals who are driven and have a growth mindset.</p>
        <h2>Top Jobs</h2>
        <a href="https://www.foraysoft.com/jobs/c-java-with-fullstack">Java With fullstack View Jobs</a>
        <a href="https://www.foraysoft.com/jobs/c-data-and-analytics-big-data">Data And Analytics (Big Data) View Jobs</a>
        <a href="https://www.foraysoft.com/jobs/c-salesforce">Salesforce View Jobs</a>
        <h3>Hiring talent instead?</h3>
      </main>
    </body>
  </html>
`

const VERIFIED_JOBS_HTML = `
  <html>
    <body>
      <main>
        <h1>Jobs</h1>
        <section>
          <h3><a href="https://www.foraysoft.com/jobs/salesforce-support-engineer-bezons">Salesforce Support Engineer - Bezons</a></h3>
          <p>Apply</p>
          <h3><a href="https://www.foraysoft.com/jobs/tech-java-bezons">Tech Java - Bezons</a></h3>
          <p>Apply</p>
          <h3><a href="https://www.foraysoft.com/jobs/tech-java-developer-atos">Tech Java Developer - Atos</a></h3>
          <p>Apply</p>
          <h3><a href="https://www.foraysoft.com/jobs/senior-qa-automation-tester-atos-syntel">Senior QA Automation Tester - Atos|Syntel</a></h3>
        </section>
        <section>
          <h2><a href="https://www.foraysoft.com/jobs/salesforce-support-engineer-bezons">Salesforce Support Engineer - Bezons</a></h2>
          <p>Posted on 18th Oct 2021 11:26:55 in <a href="https://www.foraysoft.com/jobs/c-salesforce">Salesforce</a></p>
          <p>Read More</p>
          <h2><a href="https://www.foraysoft.com/jobs/tech-java-bezons">Tech Java - Bezons</a></h2>
          <p>Posted on 18th Oct 2021 11:16:09 in <a href="https://www.foraysoft.com/jobs/c-java-with-fullstack">Java With fullstack</a></p>
          <p>Read More</p>
          <h2><a href="https://www.foraysoft.com/jobs/tech-java-developer-atos">Tech Java Developer - Atos</a></h2>
          <p>Posted on 27th Sep 2021 16:37:52 in <a href="https://www.foraysoft.com/jobs/c-java-with-fullstack">Java With fullstack</a></p>
          <p>Read More</p>
        </section>
      </main>
    </body>
  </html>
`

const VERIFIED_JOBS_PAGE_TWO_HTML = `
  <html>
    <body>
      <main>
        <h1>Jobs</h1>
        <section>
          <h3><a href="https://www.foraysoft.com/jobs/java-full-stack-developer-xebia">Java Full Stack Developer - Xebia</a></h3>
          <h3><a href="https://www.foraysoft.com/jobs/big-data-engineer-xebia">Big Data Engineer - Xebia</a></h3>
          <h3><a href="https://www.foraysoft.com/jobs/senior-developer-xebia">Senior Developer - Xebia</a></h3>
          <h3><a href="https://www.foraysoft.com/jobs/java-microservices-backend-developer-xebia">Java + Microservices Backend Developer- Xebia</a></h3>
          <h3><a href="https://www.foraysoft.com/jobs/sap-consultant-kpmg">SAP Consultant- KPMG</a></h3>
          <h3><a href="https://www.foraysoft.com/jobs/d365-f-and-o-technical-robert-bosch">D365, F&amp;O Technical - Robert Bosch</a></h3>
        </section>
        <section>
          <h2><a href="https://www.foraysoft.com/jobs/java-full-stack-developer-xebia">Java Full Stack Developer - Xebia</a></h2>
          <p>Posted on 21st Sep 2021 17:36:12 in <a href="https://www.foraysoft.com/jobs/c-java-with-fullstack">Java With fullstack</a></p>
          <p>Read More</p>
          <h2><a href="https://www.foraysoft.com/jobs/big-data-engineer-xebia">Big Data Engineer - Xebia</a></h2>
          <p>Posted on 21st Sep 2021 14:56:26 in <a href="https://www.foraysoft.com/jobs/c-data-and-analytics-big-data">Data And Analytics (Big Data)</a></p>
          <p>Read More</p>
          <h2><a href="https://www.foraysoft.com/jobs/senior-developer-xebia">Senior Developer - Xebia</a></h2>
          <p>Posted on 16th Sep 2021 10:41:44 in <a href="https://www.foraysoft.com/jobs/c-cloud">Cloud, Python</a></p>
          <p>Read More</p>
        </section>
      </main>
    </body>
  </html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/foraysoft/script.js')
  } catch {
    assert.fail('Expected ForaySoft scraper module at ../../scraper/foraysoft/script.js')
  }
}

const createFetchText = () => {
  const responses = new Map([
    ['https://www.foraysoft.com/careers.html', VERIFIED_CAREERS_HTML],
    ['https://www.foraysoft.com/jobs/', VERIFIED_JOBS_HTML],
    ['https://www.foraysoft.com/jobs/?p=2', VERIFIED_JOBS_PAGE_TWO_HTML],
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

test('ForaySoft validates the verified first-party careers shell and stale third-party jobs archive evidence', async () => {
  const foraysoft = await loadModule()

  assert.equal(foraysoft.SOURCE, 'foraysoft')
  assert.equal(foraysoft.COMPANY, 'ForaySoft')
  assert.equal(foraysoft.OFFICIAL_BRAND, 'ForaySoft')
  assert.equal(foraysoft.VERIFIED_ON, '2026-07-25')
  assert.equal(foraysoft.CAREERS_URL, 'https://www.foraysoft.com/careers.html')
  assert.equal(foraysoft.JOBS_URL, 'https://www.foraysoft.com/jobs/')
  assert.equal(foraysoft.JOBS_PAGE_TWO_URL, 'https://www.foraysoft.com/jobs/?p=2')
  assert.equal(
    foraysoft.DISPOSITION,
    'verified-first-party-careers-page-plus-stale-third-party-jobs-archive-fail-closed',
  )
  assert.match(foraysoft.VERIFIED_SURFACE_SUMMARY, /Saturday, July 25, 2026/)
  assert.match(foraysoft.VERIFIED_SURFACE_SUMMARY, /https:\/\/www\.foraysoft\.com\/careers\.html/i)
  assert.match(foraysoft.VERIFIED_SURFACE_SUMMARY, /https:\/\/www\.foraysoft\.com\/jobs\//i)
  assert.match(foraysoft.VERIFIED_SURFACE_SUMMARY, /Tech Java Developer - Atos/i)
  assert.match(foraysoft.VERIFIED_SURFACE_SUMMARY, /Java Full Stack Developer - Xebia/i)
  assert.match(foraysoft.VERIFIED_SURFACE_SUMMARY, /no trustworthy current exact-company public jobs contract was verified/i)

  foraysoft.assertVerifiedCareersSurface(VERIFIED_CAREERS_HTML)
  foraysoft.assertVerifiedJobsArchiveSurface(VERIFIED_JOBS_HTML, foraysoft.JOBS_URL)
  foraysoft.assertVerifiedJobsArchiveSurface(
    VERIFIED_JOBS_PAGE_TWO_HTML,
    foraysoft.JOBS_PAGE_TWO_URL,
  )
  foraysoft.assertVerifiedThirdPartyPlacementArchive(VERIFIED_JOBS_HTML, foraysoft.JOBS_URL)
  foraysoft.assertVerifiedStaleArchiveDates(VERIFIED_JOBS_HTML, VERIFIED_JOBS_PAGE_TWO_HTML)

  assert.deepEqual(foraysoft.extractArchivePostingDates(VERIFIED_JOBS_HTML), [
    '18th Oct 2021 11:26:55',
    '18th Oct 2021 11:16:09',
    '27th Sep 2021 16:37:52',
  ])
  assert.deepEqual(foraysoft.extractArchivePostingDates(VERIFIED_JOBS_PAGE_TWO_HTML), [
    '21st Sep 2021 17:36:12',
    '21st Sep 2021 14:56:26',
    '16th Sep 2021 10:41:44',
  ])
  assert.equal(foraysoft.pageShowsThirdPartyPlacementArchive(VERIFIED_JOBS_HTML), true)
  assert.equal(foraysoft.pageShowsThirdPartyPlacementArchive(VERIFIED_JOBS_PAGE_TWO_HTML), true)
})

test('ForaySoft run stays fail-closed because the verified jobs archive is stale and third-party rather than exact-company', async () => {
  const foraysoft = await loadModule()
  const { fetchText, requests } = createFetchText()

  const jobs = await foraysoft.run({
    fetchText,
  })

  assert.deepEqual(requests, [
    foraysoft.CAREERS_URL,
    foraysoft.JOBS_URL,
    foraysoft.JOBS_PAGE_TWO_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('ForaySoft returns discovery-only evidence when its official hostname cannot be resolved', async () => {
  const foraysoft = await loadModule()
  const dnsError = Object.assign(new Error('fetch failed'), {
    cause: { code: 'ENOTFOUND', message: 'getaddrinfo ENOTFOUND www.foraysoft.com' },
  })

  const jobs = await foraysoft.run({
    fetchText: async () => { throw dnsError },
    now: () => '2026-09-14T00:00:00.000Z',
  })

  assert.deepEqual(jobs, [])
  const evidence = readInventoryEvidence(jobs)
  assert.equal(evidence?.status, 'discovery-only')
  assert.equal(evidence?.surface, foraysoft.CAREERS_URL)
  assert.equal(evidence?.listingComplete, false)
})

test('ForaySoft rejects when the verified careers surface markers disappear', async () => {
  const foraysoft = await loadModule()
  const { fetchText } = createFetchText()

  await assert.rejects(
    foraysoft.run({
      fetchText: async (url) => {
        if (url === foraysoft.CAREERS_URL) {
          return `
            <html>
              <body>
                <main>
                  <h1>Careers</h1>
                  <p>Join us.</p>
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

test('ForaySoft rejects when the reviewed jobs archive no longer matches the stale pre-July-25-2026 contract', async () => {
  const foraysoft = await loadModule()
  const { fetchText } = createFetchText()

  await assert.rejects(
    foraysoft.run({
      fetchText: async (url) => {
        if (url === foraysoft.JOBS_URL) {
          return `
            ${VERIFIED_JOBS_HTML}
            <section>
              <h2><a href="https://www.foraysoft.com/jobs/software-engineer-foraysoft">Software Engineer - ForaySoft</a></h2>
              <p>Posted on 30th Jul 2026 09:00:00 in <a href="https://www.foraysoft.com/jobs/c-java-with-fullstack">Java With fullstack</a></p>
            </section>
          `
        }

        return fetchText(url)
      },
    }),
    /stale pre-Saturday-July-25-2026 contract|trustworthy current exact-company jobs/i,
  )
})

test('ForaySoft rejects when the public surface starts handing off to a trusted external jobs host', async () => {
  const foraysoft = await loadModule()
  const { fetchText } = createFetchText()

  await assert.rejects(
    foraysoft.run({
      fetchText: async (url) => {
        if (url === foraysoft.CAREERS_URL) {
          return `${VERIFIED_CAREERS_HTML}<a href="https://jobs.lever.co/foraysoft">Open roles</a>`
        }

        return fetchText(url)
      },
    }),
    /public surface changed materially/i,
  )
})
