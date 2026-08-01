import assert from 'node:assert/strict'
import test from 'node:test'

const loadScriptModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    assert.fail('Expected Snyk scraper module at ./script.js')
  }
}

const careersHtml = `
  <!doctype html>
  <html lang="en-US">
    <head>
      <title>Careers | Snyk</title>
      <link rel="canonical" href="https://snyk.io/careers/" />
      <meta name="description" content="Secure your future with Snyk." />
    </head>
    <body>
      <h1>Join us on our mission to help organizations build securely</h1>
      <a href="/careers/all-jobs/">See open jobs</a>
    </body>
  </html>
`

const jobsPageHtml = `
  <!doctype html>
  <html lang="en-US">
    <head>
      <title>Open jobs | Snyk</title>
      <link rel="canonical" href="https://snyk.io/careers/all-jobs/" />
    </head>
    <body>
      <div id="all-jobs"></div>
      <script>
        fetch("/api/next/jobs")
      </script>
      <p>Find your next role @Snyk</p>
    </body>
  </html>
`

const jobsPayload = {
  success: true,
  data: [
    {
      url: 'https://snyk.wd103.myworkdayjobs.com/External/job/United-States---Boston-Office/Analytics-Engineer_JR100631',
      title: 'Analytics Engineer',
      jobRequisitionId: 'JR100631',
      jobPostingID: 'JOB_POSTING-3-1270',
      locations: {
        '@_Descriptor': 'United States - Boston Office',
      },
      Job_Requisition_group: {
        department: {
          '@_Descriptor': 'Corp Info Systems',
        },
        departmentID: 'DPT_CorpInfoSystems',
      },
    },
    {
      url: 'https://snyk.wd103.myworkdayjobs.com/External/job/United-States---TX-Remote/Staff-Technical-Success-Manager--Central-_JR100657',
      title: 'Staff Technical Success Manager (Central)',
      jobRequisitionId: 'JR100657',
      jobPostingID: 'JOB_POSTING-3-1287',
      locations: [
        {
          '@_Descriptor': 'United States - TX Remote',
        },
      ],
      Job_Requisition_group: {
        department: {
          '@_Descriptor': 'Customer Solutions',
        },
        departmentID: 'DPT_Customer_Success',
      },
    },
  ],
}

test('Snyk scraper returns an empty India slice when the verified first-party jobs API exposes no India roles', async () => {
  const snyk = await loadScriptModule()
  const requested = []
  const scraper = snyk.createSnykScraper()

  const jobs = await scraper.run({
    fetchText: async (url) => {
      requested.push(url)
      if (url === 'https://snyk.io/careers/') return careersHtml
      if (url === 'https://snyk.io/careers/all-jobs/') return jobsPageHtml
      throw new Error(`Unexpected HTML fetch: ${url}`)
    },
    fetchJson: async (url) => {
      requested.push(url)
      assert.equal(url, 'https://snyk.io/api/next/jobs')
      return jobsPayload
    },
  })

  assert.deepEqual(requested, [
    'https://snyk.io/careers/',
    'https://snyk.io/careers/all-jobs/',
    'https://snyk.io/api/next/jobs',
  ])
  assert.deepEqual(jobs, [])
})

test('Snyk scraper rejects payloads that no longer match the verified first-party jobs API contract', async () => {
  const snyk = await loadScriptModule()
  const scraper = snyk.createSnykScraper()

  await assert.rejects(
    () => scraper.run({
      fetchText: async (url) => {
        if (url === 'https://snyk.io/careers/') return careersHtml
        if (url === 'https://snyk.io/careers/all-jobs/') return jobsPageHtml
        throw new Error(`Unexpected HTML fetch: ${url}`)
      },
      fetchJson: async () => ({ success: true, data: null }),
    }),
    /Snyk jobs API response no longer matches the expected payload/i,
  )
})
