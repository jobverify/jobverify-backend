import assert from 'node:assert/strict'
import test from 'node:test'

const embeddedJobs = [
  {
    id: 'GGXGGZINPPOS0204147ENIN',
    title: 'Research Scientist HI',
    company: 'GODREJ CONSUMER PRODUCTS LIMITED',
    cardfunction: 'Others',
    cardlocation: 'Mumbai',
    experience: '10-12 years',
    postedOn: '08/19/2024',
    endDate: null,
    jobType: 'Full Time',
    applyLink: 'https://careers.godrejindustries.com/in/en/job/GGXGGZINPPOS0204147ENIN/Research-Scientist-HI?utm_source=linkedin&utm_medium=phenom-feeds',
  },
  {
    id: 'GGXGGZINPPOS0211532ENIN',
    title: 'Manager - Analytics',
    company: 'GODREJ CONSUMER PRODUCTS LIMITED',
    cardfunction: 'Information Technology',
    cardlocation: 'Mumbai',
    experience: '4-6 years',
    postedOn: '02/10/2026',
    endDate: null,
    jobType: 'Full Time',
    applyLink: 'https://careers.godrejindustries.com/in/en/job/GGXGGZINPPOS0211532ENIN/Manager-Analytics?utm_source=linkedin&utm_medium=phenom-feeds',
  },
  {
    id: 'GGXGGZINPPOS0214246ENIN',
    title: 'Manager - Channel Partner Lead',
    company: 'MAHALUNGE TOWNSHIP DEVELOPERS LLP',
    cardfunction: 'Sales & Marketing',
    cardlocation: 'Pune',
    experience: '10-12 years',
    postedOn: '01/21/2026',
    endDate: null,
    jobType: 'Full Time',
    applyLink: 'https://careers.godrejindustries.com/in/en/job/GGXGGZINPPOS0214246ENIN/Manager-Channel-Partner-Lead?utm_source=linkedin&utm_medium=phenom-feeds',
  },
]

const embeddedJobsPayload = JSON.stringify(embeddedJobs).replace(/"/g, '\\"')

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Godrej Consumer Products | Careers</title>
  </head>
  <body>
    <main>
      <h1>Craft your tomorrow</h1>
      <a href="https://careers.godrejindustries.com/in/en/godrej-consumer-products-limited-gcpl-">Join us</a>
      <script>
        self.__next_f.push([1,"[\\"$\\",\\"$L24\\",null,{\\"jobs\\":${embeddedJobsPayload}}]"]);
      </script>
    </main>
  </body>
</html>
`

const skeletalCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Godrej Consumer Products | Careers</title>
  </head>
  <body>
    <main>
      <h1>Craft your tomorrow</h1>
      <a href="https://careers.godrejindustries.com/in/en/godrej-consumer-products-limited-gcpl-">Join us</a>
    </main>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/godrejconsumerproducts/script.js')
  } catch {
    assert.fail('Expected Godrej Consumer Products scraper module at ../../scraper/godrejconsumerproducts/script.js')
  }
}

test('Godrej Consumer Products accepts the embedded careers state and keeps only GCPL roles', async () => {
  const godrejConsumerProducts = await loadModule()

  assert.equal(godrejConsumerProducts.hasOfficialCareersSignal(careersHtml), true)
  assert.deepEqual(
    godrejConsumerProducts.extractJobCards(careersHtml).map((job) => ({
      title: job.title,
      requisitionId: job.requisitionId,
      location: job.location,
      company: job.company,
    })),
    [
      {
        title: 'Research Scientist HI',
        requisitionId: 'GGXGGZINPPOS0204147ENIN',
        location: 'Mumbai, India',
        company: 'Godrej Consumer Products Limited',
      },
      {
        title: 'Manager - Analytics',
        requisitionId: 'GGXGGZINPPOS0211532ENIN',
        location: 'Mumbai, India',
        company: 'Godrej Consumer Products Limited',
      },
    ],
  )
})

test('Godrej Consumer Products run decorates extracted embedded GCPL jobs for persistence', async () => {
  const godrejConsumerProducts = await loadModule()

  const jobs = await godrejConsumerProducts.createGodrejConsumerProductsScraper().run({
    fetchText: async (url) => {
      if (url === godrejConsumerProducts.CAREERS_URL) return careersHtml
      throw new Error(`Unexpected Godrej Consumer Products fixture URL: ${url}`)
    },
    fetchBrowserText: async () => {
      throw new Error('Browser fallback should not be used in this fixture')
    },
    now: () => '2026-08-02T00:00:00.000Z',
  })

  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'godrejconsumerproducts')
  assert.equal(jobs[0].companyCareerPage, 'https://www.godrejcp.com/careers')
  assert.equal(jobs[0].atsPlatform, 'first-party-careers-page+phenom-apply-links')
  assert.equal(jobs[0].scrapedAt, '2026-08-02T00:00:00.000Z')
})

test('Godrej Consumer Products falls back to browser-rendered careers HTML when the direct response lacks parseable job data', async () => {
  const godrejConsumerProducts = await loadModule()
  const attempts = []

  const jobs = await godrejConsumerProducts.createGodrejConsumerProductsScraper().run({
    fetchText: async (url) => {
      attempts.push(`http:${url}`)
      if (url === godrejConsumerProducts.CAREERS_URL) return skeletalCareersHtml
      throw new Error(`Unexpected Godrej Consumer Products fixture URL: ${url}`)
    },
    fetchBrowserText: async (url) => {
      attempts.push(`browser:${url}`)
      if (url === godrejConsumerProducts.CAREERS_URL) return careersHtml
      throw new Error(`Unexpected browser fallback URL: ${url}`)
    },
    now: () => '2026-08-02T00:00:00.000Z',
  })

  assert.deepEqual(attempts, [
    `http:${godrejConsumerProducts.CAREERS_URL}`,
    `browser:${godrejConsumerProducts.CAREERS_URL}`,
  ])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].title, 'Research Scientist HI')
})
