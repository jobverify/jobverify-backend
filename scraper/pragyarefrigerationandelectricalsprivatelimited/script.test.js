import assert from 'node:assert/strict'
import test from 'node:test'

const loadModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    assert.fail('Expected Pragya Refrigeration and Electricals Private Limited scraper module at ./script.js')
  }
}

const careersPagePayload = [
  {
    id: 5056,
    slug: 'careers',
    modified: '2026-06-12T12:11:43',
    link: 'https://pragyarefrigeration.in/careers/',
    title: {
      rendered: 'Career',
    },
    content: {
      rendered: `
        <section>
          <h1>Career Opportunities</h1>
          <p>Join a team of great experts in the Air conditioning, HVAC and Refrigeration industry</p>
          <h2>Open positions</h2>
          <div>
            <h3>Product Engineer : -</h3>
            <p>Qualification: B. Sc. from an accredited university</p>
            <p>Experience: A minimum of three years of work experience in the refrigeration and cooling industries.</p>
            <p>Roll: A person should have an understanding of product features, product science, and quality control. He should be able to make innovative suggestions to enhance the product standard.</p>
          </div>
          <div>
            <h3>Purchase Executive :-</h3>
            <p>Qualification: B. Com. from an accredited university</p>
            <p>Experience: A minimum of three years of experience in the refrigeration and cooling industries in purchase section with raw material knowledge.</p>
            <p>Roll: A person should have an understanding of product features, product science, and quality control. He should be able to make innovative suggestions to enhance the product standard.</p>
          </div>
          <a href="#apply-now">Apply now</a>
        </section>
      `,
    },
  },
]

test('extractJobs maps Pragya Refrigeration first-party careers content into job records', async () => {
  const pragya = await loadModule()

  assert.equal(pragya.SOURCE, 'pragyarefrigerationandelectricalsprivatelimited')
  assert.equal(pragya.COMPANY, 'Pragya Refrigeration and Electricals Private Limited')
  assert.equal(pragya.CAREERS_URL, 'https://pragyarefrigeration.in/careers/')
  assert.equal(
    pragya.CAREERS_API_URL,
    'https://pragyarefrigeration.in/wp-json/wp/v2/pages?slug=careers',
  )

  const jobs = pragya.extractJobs(careersPagePayload)

  assert.equal(jobs.length, 2)
  assert.deepEqual(jobs.map((job) => ({
    title: job.title,
    minimumQualification: job.minimumQualification,
    experienceRequired: job.experienceRequired,
    sourceUrl: job.sourceUrl,
    applyUrl: job.applyUrl,
    jobId: job.jobId,
    requisitionId: job.requisitionId,
    postingDate: job.postingDate,
  })), [
    {
      title: 'Product Engineer',
      minimumQualification: 'B. Sc. from an accredited university',
      experienceRequired: 'A minimum of three years of work experience in the refrigeration and cooling industries.',
      sourceUrl: 'https://pragyarefrigeration.in/careers/',
      applyUrl: 'https://pragyarefrigeration.in/careers/',
      jobId: 'careers-5056-product-engineer',
      requisitionId: 'careers-5056-product-engineer',
      postingDate: '2026-06-12',
    },
    {
      title: 'Purchase Executive',
      minimumQualification: 'B. Com. from an accredited university',
      experienceRequired: 'A minimum of three years of experience in the refrigeration and cooling industries in purchase section with raw material knowledge.',
      sourceUrl: 'https://pragyarefrigeration.in/careers/',
      applyUrl: 'https://pragyarefrigeration.in/careers/',
      jobId: 'careers-5056-purchase-executive',
      requisitionId: 'careers-5056-purchase-executive',
      postingDate: '2026-06-12',
    },
  ])

  assert.match(jobs[0].jobDescription, /product features, product science, and quality control/i)
  assert.match(jobs[1].jobDescription, /make innovative suggestions to enhance the product standard/i)
})

test('run fetches the first-party careers API and returns normalized jobs', async () => {
  const pragya = await loadModule()
  const requestedUrls = []

  const jobs = await pragya.createPragyaRefrigerationAndElectricalsPrivateLimitedScraper().run({
    fetchJson: async (url) => {
      requestedUrls.push(url)
      return careersPagePayload
    },
  })

  assert.deepEqual(requestedUrls, [pragya.CAREERS_API_URL])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].company, 'Pragya Refrigeration and Electricals Private Limited')
  assert.equal(jobs[0].source, 'pragyarefrigerationandelectricalsprivatelimited')
  assert.equal(jobs[0].link, 'https://pragyarefrigeration.in/careers/')
  assert.ok(jobs[0].scrapedAt)
})

test('run fails closed when the first-party careers page no longer exposes verified open positions', async () => {
  const pragya = await loadModule()

  await assert.rejects(
    pragya.createPragyaRefrigerationAndElectricalsPrivateLimitedScraper().run({
      fetchJson: async () => [],
    }),
    /verified first-party careers page/i,
  )

  await assert.rejects(
    pragya.createPragyaRefrigerationAndElectricalsPrivateLimitedScraper().run({
      fetchJson: async () => [{
        ...careersPagePayload[0],
        content: {
          rendered: '<section><h1>Career Opportunities</h1><p>No openings right now.</p></section>',
        },
      }],
    }),
    /verified first-party careers page/i,
  )
})
