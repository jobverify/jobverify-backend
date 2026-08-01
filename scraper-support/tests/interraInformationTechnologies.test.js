import assert from 'node:assert/strict'
import test from 'node:test'

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers at Ferfier Technologies | Shape the Future with Innovation</title>
  </head>
  <body>
    <main>
      <h1>Join Our Team and Shape the Future</h1>
      <p>Explore Open Positions</p>
      <a href="/jobs/sr-sharepoint-developer/">Apply Now</a>
      <a href="/jobs/software-engineer-l5-java-developer/">Apply Now</a>
    </main>
  </body>
</html>
`

const jobsPayload = [
  {
    id: 9217,
    date: '2025-11-12T13:29:23',
    modified: '2025-11-12T13:45:48',
    slug: 'sr-sharepoint-developer',
    link: 'https://interrait.com/jobs/sr-sharepoint-developer/',
    title: { rendered: 'Sr. SharePoint Developer' },
    content: {
      rendered: `
        <h2>Sr. SharePoint Developer</h2>
        <p><strong>Location</strong>: Hyderabad, Telangana, India</p>
        <h3>Responsibilities</h3>
        <ul><li>Lead enterprise SharePoint delivery.</li></ul>
        <a href="javascript:void(0)">Apply Now</a>
      `,
    },
  },
  {
    id: 9300,
    date: '2025-12-01T10:00:00',
    modified: '2025-12-01T10:05:00',
    slug: 'us-sharepoint-architect',
    link: 'https://interrait.com/jobs/us-sharepoint-architect/',
    title: { rendered: 'US SharePoint Architect' },
    content: {
      rendered: `
        <h2>US SharePoint Architect</h2>
        <p><strong>Location</strong>: Dallas, Texas, United States</p>
        <h3>Responsibilities</h3>
        <ul><li>US-only role.</li></ul>
      `,
    },
  },
]

const loadModule = async () => {
  try {
    return await import('../../scraper/interrainformationtechnologies/script.js')
  } catch {
    assert.fail('Expected Interra Information Technologies scraper module at ../../scraper/interrainformationtechnologies/script.js')
  }
}

test('Interra Information Technologies helpers stay pinned to the verified first-party careers shell and jobs API', async () => {
  const interra = await loadModule()

  assert.equal(interra.CAREERS_URL, 'https://interrait.com/career/')
  assert.equal(
    interra.JOBS_API_URL,
    'https://interrait.com/wp-json/wp/v2/jobs?per_page=100&_fields=id,slug,link,title,date,modified,content',
  )
  assert.equal(interra.hasOfficialCareersSignal(careersHtml), true)
  assert.deepEqual(
    interra.extractJobsFromApi(jobsPayload).map((job) => ({
      title: job.title,
      location: job.location,
      country: job.country,
      sourceUrl: job.sourceUrl,
    })),
    [
      {
        title: 'Sr. SharePoint Developer',
        location: 'Hyderabad, Telangana, India',
        country: 'India',
        sourceUrl: 'https://interrait.com/jobs/sr-sharepoint-developer/',
      },
    ],
  )
})

test('Interra Information Technologies run validates the careers shell and filters the first-party jobs API to India roles', async () => {
  const interra = await loadModule()

  const jobs = await interra.createInterraInformationTechnologiesScraper({
    now: () => '2026-07-18T00:00:00.000Z',
  }).run({
    fetchText: async () => careersHtml,
    fetchJson: async () => jobsPayload,
  })

  assert.deepEqual(jobs, [
    {
      title: 'Sr. SharePoint Developer',
      company: 'Interra Information Technologies',
      location: 'Hyderabad, Telangana, India',
      city: 'Hyderabad',
      state: 'Telangana',
      country: 'India',
      jobId: '9217',
      requisitionId: '9217',
      sourceUrl: 'https://interrait.com/jobs/sr-sharepoint-developer/',
      applyUrl: 'https://interrait.com/jobs/sr-sharepoint-developer/',
      postingDate: '2025-11-12',
      jobDescription: 'Lead enterprise SharePoint delivery.',
      requiredSkills: [],
      link: 'https://interrait.com/jobs/sr-sharepoint-developer/',
      source: 'interrainformationtechnologies',
      scrapedAt: '2026-07-18T00:00:00.000Z',
    },
  ])
})
