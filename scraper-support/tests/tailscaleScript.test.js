import assert from 'node:assert/strict'
import test from 'node:test'

const loadTailscaleModule = async () => import('../../scraper/tailscale/script.js')

test('Tailscale keeps only India roles from the verified Greenhouse feed', async () => {
  const tailscale = await loadTailscaleModule()
  const requests = []

  const jobs = await tailscale.createTailscaleScraper({
    now: () => '2026-07-25T00:00:00.000Z',
  }).run({
    fetchText: async (url) => {
      requests.push(url)

      return `
        <html>
          <body>
            <h1>Careers at Tailscale</h1>
            <a href="https://job-boards.greenhouse.io/tailscale">See open positions</a>
            <section>Open positions</section>
          </body>
        </html>
      `
    },
    fetchJson: async (url) => {
      requests.push(url)

      return {
        jobs: [
          {
            id: 4719999005,
            title: 'Software Engineer, AI Enablement',
            absolute_url: 'https://job-boards.greenhouse.io/tailscale/jobs/4719999005',
            location: { name: 'Remote (India)' },
            departments: [{ name: 'Engineering' }],
            updated_at: '2026-07-25T00:00:00Z',
            content: '<p>Build internal AI tooling for Tailscale engineers.</p>',
            offices: [{ location: 'Remote (India)' }],
          },
          {
            id: 4710000005,
            title: 'Backend Engineer, Identity',
            absolute_url: 'https://job-boards.greenhouse.io/tailscale/jobs/4710000005',
            location: { name: 'Remote (United States)' },
            departments: [{ name: 'Engineering' }],
            updated_at: '2026-07-25T00:00:00Z',
            content: '<p>Identity systems.</p>',
            offices: [{ location: 'Remote (United States)' }],
          },
        ],
      }
    },
  })

  assert.equal(tailscale.SOURCE, 'tailscale')
  assert.equal(tailscale.COMPANY, 'Tailscale')
  assert.equal(tailscale.OFFICIAL_BRAND_NAME, 'Tailscale')
  assert.equal(tailscale.VERIFIED_ON, '2026-07-25')
  assert.deepEqual(requests, [
    'https://tailscale.com/careers',
    'https://boards-api.greenhouse.io/v1/boards/tailscale/jobs?content=true',
  ])
  assert.deepEqual(jobs, [
    {
      title: 'Software Engineer, AI Enablement',
      company: 'Tailscale',
      location: 'Remote (India)',
      city: 'Remote',
      country: 'India',
      link: 'https://job-boards.greenhouse.io/tailscale/jobs/4719999005',
      applyUrl: 'https://job-boards.greenhouse.io/tailscale/jobs/4719999005#application',
      sourceUrl: 'https://job-boards.greenhouse.io/tailscale/jobs/4719999005',
      source: 'tailscale',
      jobId: 4719999005,
      requisitionId: null,
      department: 'Engineering',
      employmentType: null,
      experienceRequired: null,
      jobDescription: '<p>Build internal AI tooling for Tailscale engineers.</p>',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2026-07-25T00:00:00Z',
      remoteStatus: 'Remote',
      scrapedAt: '2026-07-25T00:00:00.000Z',
    },
  ])
})

test('Tailscale fails closed when the first-party careers handoff or Greenhouse payload drifts', async () => {
  const tailscale = await loadTailscaleModule()

  await assert.rejects(
    tailscale.createTailscaleScraper().run({
      fetchText: async () => '<html><body><h1>Careers</h1></body></html>',
      fetchJson: async () => ({ jobs: [] }),
    }),
    /first-party careers page|official surface/i,
  )

  await assert.rejects(
    tailscale.createTailscaleScraper().run({
      fetchText: async () => `
        <html>
          <body>
            <h1>Careers at Tailscale</h1>
            <a href="https://job-boards.greenhouse.io/tailscale">See open positions</a>
            <section>Open positions</section>
          </body>
        </html>
      `,
      fetchJson: async () => ({ data: [] }),
    }),
    /greenhouse jobs api response|payload/i,
  )
})
