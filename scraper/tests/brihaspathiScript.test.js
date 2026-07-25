import assert from 'node:assert/strict'
import test from 'node:test'

const loadBrihaspathiModule = async () => {
  try {
    return await import('../brihaspathi/script.js')
  } catch {
    assert.fail('Expected Brihaspathi scraper module at ../brihaspathi/script.js')
  }
}

const officialCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Brihaspathi Careers</title>
  </head>
  <body>
    <main>
      <p>Careers</p>
      <h1>Open Vacancies</h1>
      <p>Browse active HR job postings.</p>
      <p>Vacancies</p>
      <p>0</p>
    </main>
  </body>
</html>
`

const emptyPayload = {
  data: [],
  meta: {
    pagination: {
      page: 1,
      pageSize: 100,
      pageCount: 0,
      total: 0,
    },
  },
}

const activeCareersHtml = officialCareersHtml.replace('<p>0</p>', '<p>1</p>')

test('Brihaspathi constants stay pinned to the verified first-party careers page and public Strapi job-openings API', async () => {
  const brihaspathi = await loadBrihaspathiModule()

  assert.equal(brihaspathi.SOURCE, 'brihaspathi')
  assert.equal(brihaspathi.COMPANY, 'Brihaspathi Technologies Limited')
  assert.equal(brihaspathi.CAREERS_URL, 'https://www.brihaspathi.com/careers')
  assert.equal(
    brihaspathi.JOBS_API_URL,
    'https://www.brihaspathi.com/strapi/api/job-openings?sort=createdAt:desc&pagination[pageSize]=100&filters[isActive][$eq]=true',
  )
  assert.equal(brihaspathi.hasOfficialCareersSignal(officialCareersHtml), true)
})

test('Brihaspathi run returns an honest zero-job result only while the verified official careers page and public API remain empty', async () => {
  const brihaspathi = await loadBrihaspathiModule()
  const requested = []

  const jobs = await brihaspathi.createBrihaspathiScraper().run({
    fetchText: async (url) => {
      requested.push({ type: 'text', url })
      return officialCareersHtml
    },
    fetchJson: async (url, options = {}) => {
      requested.push({ type: 'json', url, options })
      return emptyPayload
    },
  })

  assert.deepEqual(requested, [
    {
      type: 'text',
      url: 'https://www.brihaspathi.com/careers',
    },
  ])
  assert.deepEqual(jobs, [])
})

test('Brihaspathi fails closed when the verified careers page shell or public Strapi payload changes materially', async () => {
  const brihaspathi = await loadBrihaspathiModule()

  await assert.rejects(
    brihaspathi.createBrihaspathiScraper().run({
      fetchText: async () => '<html><body><h1>Jobs</h1></body></html>',
      fetchJson: async () => emptyPayload,
    }),
    /verified official brihaspathi careers surface/i,
  )

  await assert.rejects(
    brihaspathi.createBrihaspathiScraper().run({
      fetchText: async () => activeCareersHtml,
      fetchJson: async () => ({ data: null }),
    }),
    /verified brihaspathi public job-openings api/i,
  )
})
