import assert from 'node:assert/strict'
import test from 'node:test'

const loadTaroPumpsModule = async () => {
  try {
    return await import('../../scraper/taropumps/script.js')
  } catch {
    assert.fail('Expected Taro Pumps scraper module at ../../scraper/taropumps/script.js')
  }
}

const officialCareersHtml = `
<!doctype html>
<html lang="en">
  <body>
    <main>
      <h1>Careers at Taro Pumps</h1>
      <p>Apply here or email us at jobs@texmo.com</p>
      <section>
        <h2>Latest careers</h2>
        <article>
          <span>NEW</span>
          <a href="https://www.texmo.com/career-details?id=541133&title=+Assistant++Engineer+-++Design+%28Electrical%29">
            <h3>ASSISTANT ENGINEER - DESIGN (ELECTRICAL)</h3>
            <p>COIMBATORE</p>
            <p>INDIA</p>
            <p>PRODUCT ENGINEERING</p>
          </a>
        </article>
        <article>
          <a href="https://www.texmo.com/career-details?id=542917&title=+Engineer+-+Product">
            <h3>ENGINEER - PRODUCT</h3>
            <p>COIMBATORE</p>
            <p>INDIA</p>
            <p>PRODUCT ENGINEERING</p>
          </a>
        </article>
        <a href="https://www.texmo.com/careers/">View all jobs</a>
      </section>
    </main>
  </body>
</html>
`

test('Taro Pumps scraper validates the verified official careers page and extracts first-party Texmo detail cards', async () => {
  const taroPumps = await loadTaroPumpsModule()

  assert.equal(taroPumps.SOURCE, 'taropumps')
  assert.equal(taroPumps.COMPANY, 'Taro Pumps')
  assert.equal(taroPumps.CAREERS_URL, 'https://www.taropumps.com/careers')
  assert.equal(taroPumps.VIEW_ALL_JOBS_URL, 'https://www.texmo.com/careers/')
  assert.equal(taroPumps.hasOfficialCareersSignal(officialCareersHtml), true)
  assert.equal(
    taroPumps.extractViewAllJobsUrl(officialCareersHtml),
    'https://www.texmo.com/careers/',
  )
  assert.deepEqual(taroPumps.extractJobCards(officialCareersHtml), [
    {
      title: 'ASSISTANT ENGINEER - DESIGN (ELECTRICAL)',
      location: 'COIMBATORE, INDIA',
      city: 'COIMBATORE',
      country: 'India',
      department: 'PRODUCT ENGINEERING',
      jobId: '541133',
      requisitionId: '541133',
      sourceUrl: 'https://www.texmo.com/career-details?id=541133&title=+Assistant++Engineer+-++Design+%28Electrical%29',
      applyUrl: 'https://www.texmo.com/career-details?id=541133&title=+Assistant++Engineer+-++Design+%28Electrical%29',
      employmentType: null,
      experienceRequired: null,
      postingDate: null,
      closingDate: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      jobDescription: null,
      remoteStatus: 'On-site',
    },
    {
      title: 'ENGINEER - PRODUCT',
      location: 'COIMBATORE, INDIA',
      city: 'COIMBATORE',
      country: 'India',
      department: 'PRODUCT ENGINEERING',
      jobId: '542917',
      requisitionId: '542917',
      sourceUrl: 'https://www.texmo.com/career-details?id=542917&title=+Engineer+-+Product',
      applyUrl: 'https://www.texmo.com/career-details?id=542917&title=+Engineer+-+Product',
      employmentType: null,
      experienceRequired: null,
      postingDate: null,
      closingDate: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      jobDescription: null,
      remoteStatus: 'On-site',
    },
  ])
})

test('run fetches the official Taro Pumps careers page and decorates shared runner fields', async () => {
  const taroPumps = await loadTaroPumpsModule()
  const requestedUrls = []

  const jobs = await taroPumps.createTaroPumpsScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === taroPumps.CAREERS_URL) return officialCareersHtml
      throw new Error(`Unexpected Taro Pumps fixture URL: ${url}`)
    },
    now: () => '2026-07-10T10:00:00.000Z',
  })

  assert.deepEqual(requestedUrls, [taroPumps.CAREERS_URL])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].company, 'Taro Pumps')
  assert.equal(jobs[0].source, 'taropumps')
  assert.equal(
    jobs[0].link,
    'https://www.texmo.com/career-details?id=541133&title=+Assistant++Engineer+-++Design+%28Electrical%29',
  )
  assert.equal(jobs[0].scrapedAt, '2026-07-10T10:00:00.000Z')
})

test('Taro Pumps scraper fails closed when the verified Texmo handoff changes or job cards disappear', async () => {
  const taroPumps = await loadTaroPumpsModule()

  await assert.rejects(
    taroPumps.createTaroPumpsScraper().run({
      fetchText: async () => officialCareersHtml.replace(
        'https://www.texmo.com/careers/',
        'https://www.texmo.com/jobs/',
      ),
    }),
    /verified official texmo careers handoff/i,
  )

  await assert.rejects(
    taroPumps.createTaroPumpsScraper().run({
      fetchText: async () => `
        <html>
          <body>
            <main>
              <h1>Careers at Taro Pumps</h1>
              <p>Apply here or email us at jobs@texmo.com</p>
              <h2>Latest careers</h2>
              <a href="https://www.texmo.com/careers/">View all jobs</a>
            </main>
          </body>
        </html>
      `,
    }),
    /verified first-party job cards/i,
  )
})
