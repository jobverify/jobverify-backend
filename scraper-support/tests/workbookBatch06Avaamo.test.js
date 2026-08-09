import assert from 'node:assert/strict'
import test from 'node:test'

const loadModule = async () => {
  try {
    return await import('../../scraper/avaamo/script.js')
  } catch {
    assert.fail('Expected Avaamo scraper module at ../../scraper/avaamo/script.js')
  }
}

const cardHtml = ({ title, meta, url }) => `
  <div class="wpb_text_column wpb_content_element">
    <div class="wpb_wrapper">
      <h2>${title}</h2>
    </div>
    <div class="wpb_wrapper">
      <h6><span class="category-eyebrow__date">${meta}</span></h6>
    </div>
    <div class="vc_empty_space">
      <h6><a itemprop="url" href="${url}" target="_self" class="qbutton default">Learn more</a></h6>
    </div>
  </div>
`

const VERIFIED_CAREERS_HTML = `
<!doctype html>
<html lang="en-US">
  <head>
    <title>Careers at Avaamo</title>
  </head>
  <body>
    <main>
      <h1>WE DEVELOP FUNDAMENTAL AI TECHNOLOGY</h1>
      <h2>Work with us</h2>
      <section>
        <h3>Compensation</h3>
        <p>Competitive salary packages.</p>
        <h3>Generous PTO</h3>
        <p>We work hard and believe its essential for our employee's to take time off they need.</p>
      </section>
      <h2>Active Positions</h2>
      ${cardHtml({
        title: 'Senior Account Executive',
        meta: 'Sales | United States | Full-time',
        url: 'https://avaamo.ai/avaamo-senior-account-executive/',
      })}
      ${cardHtml({
        title: 'Business Development Representative',
        meta: 'Sales | United States | Full-time',
        url: 'https://avaamo.ai/avaamo-business-development-representative/',
      })}
      ${cardHtml({
        title: 'Forward Deployed Engineer (FDE)',
        meta: 'Location: Bengaluru-Koramangala (Frequent travel to customer sites in the US and Europe (upto 40 -50%',
        url: 'https://avaamo.ai/careers-full-stack-engineer-ror/',
      })}
      ${cardHtml({
        title: 'Applied AI Engineer',
        meta: 'Engineering | Bangalore | Full-time',
        url: 'https://avaamo.ai/applied-ai-engineer/',
      })}
      ${cardHtml({
        title: 'Senior Software Engineer – Full-Stack',
        meta: 'Engineering | Bangalore or Pune (remote working) | Full-time',
        url: 'https://avaamo.ai/careers-full-stack-engineer-ror/',
      })}
      ${cardHtml({
        title: 'Senior QA Engineer',
        meta: 'Bangalore | Full-time',
        url: 'https://avaamo.ai/careers-senior-qa-engineer/',
      })}
      ${cardHtml({
        title: 'Conversational AI Lead or Architect',
        meta: 'Bangalore | Full-time',
        url: 'https://avaamo.ai/careers-conversational-ai-lead-or-architect/',
      })}
      ${cardHtml({
        title: 'Conversation Designer',
        meta: 'Bangalore | Full-time',
        url: 'https://avaamo.ai/careers-conversation-designer/',
      })}
      ${cardHtml({
        title: 'Product Manager',
        meta: 'Bangalore | Full-time',
        url: 'https://avaamo.ai/careers-product-manager/',
      })}
      ${cardHtml({
        title: 'Solution Delivery Manager',
        meta: 'Bangalore or Mumbai | Full-time',
        url: 'https://avaamo.ai/careers-solution-delivery-manager/',
      })}
      ${cardHtml({
        title: 'Technical Program Manager',
        meta: 'United States | Full-time',
        url: 'https://avaamo.ai/careers-technical-program-manager/',
      })}
    </main>
  </body>
</html>
`

const buildDetailHtml = ({ title, description }) => `
<!doctype html>
<html>
  <head>
    <title>Careers at Avaamo</title>
  </head>
  <body>
    <main>
      <h2>Careers at Avaamo</h2>
      <p>Apply now</p>
      <h1>${title}</h1>
      <h2>Job description</h2>
      <p>${description}</p>
      <h2>About Avaamo</h2>
      <p>Avaamo is an advanced multimodal Agentic AI platform.</p>
    </main>
  </body>
</html>
`

const DETAIL_PAGES = {
  'https://avaamo.ai/applied-ai-engineer/': buildDetailHtml({
    title: 'Applied AI Engineer',
    description: 'Design, build, and optimize conversational AI systems for enterprise workflows.',
  }),
  'https://avaamo.ai/careers-full-stack-engineer-ror/': buildDetailHtml({
    title: 'Senior Software Engineer – Full-Stack',
    description: 'Build backend and full-stack product capabilities across Avaamo engineering.',
  }),
  'https://avaamo.ai/careers-senior-qa-engineer/': buildDetailHtml({
    title: 'Senior QA Engineer',
    description: 'Own end-to-end testing and automation quality across the conversational AI product.',
  }),
  'https://avaamo.ai/careers-conversational-ai-lead-or-architect/': buildDetailHtml({
    title: 'Conversational AI Lead or Architect',
    description: 'Design and implement Avaamo conversation AI solutions for enterprise customers.',
  }),
  'https://avaamo.ai/careers-conversation-designer/': buildDetailHtml({
    title: 'Conversation Designer',
    description: 'Define the user experience of voice and text-based conversational interfaces.',
  }),
  'https://avaamo.ai/careers-product-manager/': buildDetailHtml({
    title: 'Product Manager',
    description: 'Drive product strategy, roadmap definition, and customer-aligned requirements.',
  }),
  'https://avaamo.ai/careers-solution-delivery-manager/': buildDetailHtml({
    title: 'Solution Delivery Manager',
    description: 'Lead enterprise SaaS implementations and maintain strong customer outcomes.',
  }),
}

test('Avaamo validates the verified first-party careers shell and listing structure', async () => {
  const avaamo = await loadModule()
  const cards = avaamo.extractListingCards(VERIFIED_CAREERS_HTML)

  assert.equal(avaamo.SOURCE, 'avaamo')
  assert.equal(avaamo.COMPANY, 'Avaamo')
  assert.equal(avaamo.VERIFIED_ON, '2026-07-25')
  assert.equal(avaamo.CAREERS_URL, 'https://avaamo.ai/careers/')
  assert.equal(
    avaamo.DISPOSITION,
    'verified-first-party-careers-page-plus-public-same-origin-job-pages',
  )
  assert.match(avaamo.VERIFIED_SURFACE_SUMMARY, /Saturday, July 25, 2026/)
  assert.match(avaamo.VERIFIED_SURFACE_SUMMARY, /https:\/\/avaamo\.ai\/careers\//i)
  assert.match(avaamo.VERIFIED_SURFACE_SUMMARY, /Applied AI Engineer/i)
  assert.match(avaamo.VERIFIED_SURFACE_SUMMARY, /Forward Deployed Engineer \(FDE\)/i)
  assert.equal(avaamo.hasOfficialCareersPageSignal(VERIFIED_CAREERS_HTML), true)
  assert.equal(cards.length, 11)
  assert.deepEqual(cards[2], {
    title: 'Forward Deployed Engineer (FDE)',
    meta: 'Location: Bengaluru-Koramangala (Frequent travel to customer sites in the US and Europe (upto 40 -50%',
    detailUrl: 'https://avaamo.ai/careers-full-stack-engineer-ror/',
  })
})

test('Avaamo run returns only trustworthy India roles from the verified first-party listings and detail pages', async () => {
  const avaamo = await loadModule()
  const requestedUrls = []

  const jobs = await avaamo.createAvaamoScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === avaamo.CAREERS_URL) return VERIFIED_CAREERS_HTML
      if (DETAIL_PAGES[url]) return DETAIL_PAGES[url]

      throw new Error(`Unexpected URL: ${url}`)
    },
    now: () => '2026-07-25T00:00:00.000Z',
  })

  assert.deepEqual(requestedUrls, [
    avaamo.CAREERS_URL,
    'https://avaamo.ai/careers-full-stack-engineer-ror/',
    'https://avaamo.ai/applied-ai-engineer/',
    'https://avaamo.ai/careers-senior-qa-engineer/',
    'https://avaamo.ai/careers-conversational-ai-lead-or-architect/',
    'https://avaamo.ai/careers-conversation-designer/',
    'https://avaamo.ai/careers-product-manager/',
    'https://avaamo.ai/careers-solution-delivery-manager/',
  ])
  assert.equal(jobs.length, 7)
  assert.deepEqual(
    jobs.map((job) => job.title),
    [
      'Applied AI Engineer',
      'Senior Software Engineer - Full-Stack',
      'Senior QA Engineer',
      'Conversational AI Lead or Architect',
      'Conversation Designer',
      'Product Manager',
      'Solution Delivery Manager',
    ],
  )
  assert.equal(
    jobs.some((job) => job.title === 'Forward Deployed Engineer (FDE)'),
    false,
  )
  assert.deepEqual(jobs[0], {
    title: 'Applied AI Engineer',
    company: 'Avaamo',
    department: 'Engineering',
    location: 'Bangalore',
    city: 'Bangalore',
    country: 'India',
    jobId: 'applied-ai-engineer',
    requisitionId: 'applied-ai-engineer',
    sourceUrl: 'https://avaamo.ai/applied-ai-engineer/',
    applyUrl: 'https://avaamo.ai/applied-ai-engineer/',
    employmentType: 'Full-time',
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: 'Design, build, and optimize conversational AI systems for enterprise workflows.',
    remoteStatus: null,
    source: 'avaamo',
    link: 'https://avaamo.ai/applied-ai-engineer/',
    scrapedAt: '2026-07-25T00:00:00.000Z',
  })
  assert.equal(
    jobs.find((job) => job.title === 'Senior Software Engineer - Full-Stack')?.remoteStatus,
    'Remote',
  )
  assert.equal(
    jobs.find((job) => job.title === 'Solution Delivery Manager')?.location,
    'Bangalore or Mumbai',
  )
})

test('Avaamo fails closed when the verified careers shell changes materially', async () => {
  const avaamo = await loadModule()

  await assert.rejects(
    avaamo.run({
      fetchText: async () => `
        <html>
          <body>
            <main>
              <h1>Careers</h1>
              <p>Join our team.</p>
            </main>
          </body>
        </html>
      `,
    }),
    /verified official careers page/i,
  )
})

test('Avaamo skips a listing when the linked detail page no longer matches the listing title or detail shell', async () => {
  const avaamo = await loadModule()

  const jobs = await avaamo.createAvaamoScraper({ maxJobs: 2 }).run({
    fetchText: async (url) => {
      if (url === avaamo.CAREERS_URL) return VERIFIED_CAREERS_HTML
      if (url === 'https://avaamo.ai/careers-full-stack-engineer-ror/') {
        return buildDetailHtml({
          title: 'Senior Software Engineer – Full-Stack',
          description: 'Build backend and full-stack product capabilities across Avaamo engineering.',
        })
      }
      if (url === 'https://avaamo.ai/applied-ai-engineer/') {
        return `
          <html>
            <body>
              <h1>Applied AI Engineer</h1>
              <p>Broken page shell.</p>
            </body>
          </html>
        `
      }
      if (url === 'https://avaamo.ai/careers-senior-qa-engineer/') {
        return DETAIL_PAGES[url]
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
    now: () => '2026-07-25T00:00:00.000Z',
  })

  assert.deepEqual(
    jobs.map((job) => job.title),
    [
      'Senior Software Engineer - Full-Stack',
      'Senior QA Engineer',
    ],
  )
})
