import assert from 'node:assert/strict'
import test from 'node:test'

const loadKeyenceModule = async () => {
  try {
    return await import('../../scraper/keyence/script.js')
  } catch {
    assert.fail('Expected Keyence scraper module at ../../scraper/keyence/script.js')
  }
}

const officialCareersHtml = `
<!doctype html>
<html lang="en">
  <body>
    <title>KEYENCE India – Careers</title>
    <main>
      <h1>KEYENCE India – Careers</h1>
      <p>At KEYENCE, we believe that proactive actions and a customer-centric mindset are the keys to achieving the greatest added-value for our customers.</p>
      <a href="https://forms.office.com/r/NvMRr292Pt" target="_blank">Apply</a>
      <footer>
        <a href="/ss/career/job.jsp">Recruitment</a>
      </footer>
    </main>
  </body>
</html>
`

const currentOfficialCareersHtml = `
<!doctype html>
<html lang="en">
  <body>
    <title>KEYENCE India – Careers</title>
    <main>
      <h1>KEYENCE India – Careers</h1>
      <p>At KEYENCE, we believe that proactive actions and a customer-centric mindset are the keys to achieving the greatest added-value for our customers.</p>
      <footer>
        <a href="/ss/career/job.jsp">Recruitment</a>
      </footer>
    </main>
  </body>
</html>
`

const recruitmentHtml = `
<!doctype html>
<html lang="en">
  <body>
    <main>
      <h1>RECRUITMENT</h1>
      <p>At KEYENCE, we are committed to adding value to your career.</p>
      <p>Hiring Process</p>
      <p>Registration / Aptitude Test / Pre-recorded Video Interview / Live interview 1 / Live interview 2 / Offer</p>
      <p>FAQ about our recruitment</p>
      <p>We have 5 offices in India: Chennai, Bangalore, Pune, Gurgaon, Ahmedabad.</p>
    </main>
  </body>
</html>
`

const publicJobsHtml = `
<!doctype html>
<html lang="en">
  <body>
    <main>
      <h1>RECRUITMENT</h1>
      <article>
        <h2>Sales Engineer</h2>
        <a href="/ss/career/jobs/sales-engineer">Apply now</a>
      </article>
    </main>
  </body>
</html>
`

test('Keyence scraper validates the verified official careers and apply-only recruitment surfaces', async () => {
  const keyence = await loadKeyenceModule()

  assert.equal(keyence.CAREERS_URL, 'https://www.keyence.co.in/ss/career/')
  assert.equal(keyence.RECRUITMENT_URL, 'https://www.keyence.co.in/ss/career/job.jsp')
  assert.equal(keyence.APPLY_URL, 'https://forms.office.com/r/NvMRr292Pt')
  assert.equal(keyence.hasOfficialCareersSignal(officialCareersHtml), true)
  assert.equal(keyence.extractRecruitmentUrl(officialCareersHtml), 'https://www.keyence.co.in/ss/career/job.jsp')
  assert.equal(keyence.hasApplyOnlyZeroJobsSignal(recruitmentHtml), true)
})

test('Keyence scraper accepts the current careers landing handoff on Friday, August 7, 2026', async () => {
  const keyence = await loadKeyenceModule()

  assert.equal(keyence.hasOfficialCareersSignal(currentOfficialCareersHtml), true)
  assert.equal(keyence.extractRecruitmentUrl(currentOfficialCareersHtml), 'https://www.keyence.co.in/ss/career/job.jsp')
})

test('Keyence scraper returns no jobs while the official public surface remains apply-only', async () => {
  const keyence = await loadKeyenceModule()
  const requestedUrls = []

  const jobs = await keyence.createKeyenceScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === keyence.CAREERS_URL) return officialCareersHtml
      if (url === keyence.RECRUITMENT_URL) return recruitmentHtml
      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    keyence.CAREERS_URL,
    keyence.RECRUITMENT_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('Keyence scraper fails closed when the verified careers handoff changes or public jobs appear', async () => {
  const keyence = await loadKeyenceModule()

  await assert.rejects(
    keyence.createKeyenceScraper().run({
      fetchText: async (url) => {
        if (url === keyence.CAREERS_URL) {
          return officialCareersHtml.replace(
            '<a href="/ss/career/job.jsp">Recruitment</a>',
            '<a href="/ss/career/openings.jsp">Recruitment</a>',
          )
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified official recruitment surface/i,
  )

  await assert.rejects(
    keyence.createKeyenceScraper().run({
      fetchText: async (url) => {
        if (url === keyence.CAREERS_URL) return officialCareersHtml
        if (url === keyence.RECRUITMENT_URL) return publicJobsHtml
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /public recruitment surface now appears to expose jobs/i,
  )
})
