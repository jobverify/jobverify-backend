import assert from 'node:assert/strict'
import test from 'node:test'

const loadNasAcademyModule = async () => {
  try {
    return await import('../nasacademy/script.js')
  } catch {
    assert.fail('Expected Nas Academy scraper module at ../nasacademy/script.js')
  }
}

const officialCareersHtml = `
<html>
  <body>
    <h3>Come and do your best work here</h3>
    <p>It's not a walk in the park</p>
    <a href="https://linktr.ee/nascompany">Explore Our Job Openings</a>
    <h1>Products</h1>
    <div>Nas Daily Nas.com Nas Summit Nas House Nas Academy</div>
  </body>
</html>
`

const linktreeHtml = `
<html>
  <body>
    <h1>@nascompany</h1>
    <a href="https://www.linkedin.com/company/nasdaily/jobs/">Nas Daily Jobs</a>
    <a href="https://www.linkedin.com/company/nascompany/jobs/">Nas.com Jobs</a>
    <a href="https://www.linkedin.com/company/nassummit/jobs/">Nas Summit Jobs</a>
  </body>
</html>
`

const linktreeWithExactNasAcademyJobsHtml = `
<html>
  <body>
    <h1>@nascompany</h1>
    <a href="https://www.linkedin.com/company/nascompany/jobs/">Nas.com Jobs</a>
    <a href="https://www.linkedin.com/company/nasacademy/jobs/">Nas Academy Jobs</a>
  </body>
</html>
`

const driftedOfficialPageHtml = `
<html>
  <body>
    <h1>Work with us</h1>
    <a href="/apply">Apply</a>
  </body>
</html>
`

test('Nas Academy sentinel helpers stay pinned to the verified official page and company-level linktree handoff', async () => {
  const nasAcademy = await loadNasAcademyModule()

  assert.equal(nasAcademy.SOURCE, 'nasacademy')
  assert.equal(nasAcademy.COMPANY, 'Nas Academy')
  assert.equal(nasAcademy.VERIFIED_ON, '2026-07-16')
  assert.equal(nasAcademy.OFFICIAL_CAREERS_URL, 'https://www.nas.co/work-with-us')
  assert.equal(nasAcademy.LINKTREE_URL, 'https://linktr.ee/nascompany')
  assert.equal(
    nasAcademy.extractOfficialLinktreeUrl(officialCareersHtml),
    'https://linktr.ee/nascompany',
  )
  assert.equal(nasAcademy.hasVerifiedNasCareersSignal(officialCareersHtml), true)
  assert.equal(nasAcademy.hasVerifiedLinktreeSignal(linktreeHtml), true)
  assert.equal(nasAcademy.hasExactNasAcademyJobsLink(linktreeHtml), false)
  assert.equal(nasAcademy.hasExactNasAcademyJobsLink(linktreeWithExactNasAcademyJobsHtml), true)
  assert.deepEqual(nasAcademy.extractLinktreeJobLinks(linktreeHtml), [
    {
      label: 'Nas Daily Jobs',
      url: 'https://www.linkedin.com/company/nasdaily/jobs/',
    },
    {
      label: 'Nas.com Jobs',
      url: 'https://www.linkedin.com/company/nascompany/jobs/',
    },
    {
      label: 'Nas Summit Jobs',
      url: 'https://www.linkedin.com/company/nassummit/jobs/',
    },
  ])
})

test('Nas Academy sentinel returns [] only while the official surface still lacks an exact Nas Academy jobs board', async () => {
  const nasAcademy = await loadNasAcademyModule()
  const requestedUrls = []

  const jobs = await nasAcademy.createNasAcademyScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === nasAcademy.OFFICIAL_CAREERS_URL) return officialCareersHtml
      if (url === nasAcademy.LINKTREE_URL) return linktreeHtml

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    'https://www.nas.co/work-with-us',
    'https://linktr.ee/nascompany',
  ])
  assert.deepEqual(jobs, [])
})

test('Nas Academy sentinel fails closed when the official page drifts or a dedicated exact-name jobs link appears', async () => {
  const nasAcademy = await loadNasAcademyModule()

  await assert.rejects(
    nasAcademy.createNasAcademyScraper().run({
      fetchText: async (url) => {
        if (url === nasAcademy.OFFICIAL_CAREERS_URL) return driftedOfficialPageHtml
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /official careers page no longer matches/i,
  )

  await assert.rejects(
    nasAcademy.createNasAcademyScraper().run({
      fetchText: async (url) => {
        if (url === nasAcademy.OFFICIAL_CAREERS_URL) return officialCareersHtml
        if (url === nasAcademy.LINKTREE_URL) return linktreeWithExactNasAcademyJobsHtml
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /exact nas academy jobs surface/i,
  )
})
