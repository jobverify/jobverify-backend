import assert from 'node:assert/strict'
import test from 'node:test'

const CAREERS_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <meta property="og:title" content="Careers - PostHog" />
    <meta
      name="description"
      content="We're working to increase the number of successful products in the world. Adventurers needed."
    />
  </head>
  <body>
    <main>
      <h1>Current open roles</h1>
      <div>Location</div>
      <div>Remote (Hybrid UK)</div>
      <div>Timezone(s)</div>
      <div>GMT 0</div>
      <select aria-label="Open roles">
        <option value="Technical Customer Success Manager - Americas">
          Technical Customer Success Manager - Americas
        </option>
        <option value="Technical Account Manager - EMEA">
          Technical Account Manager - EMEA
        </option>
      </select>
      <a href="/careers/ai-research-engineer">Read more</a>
    </main>
  </body>
</html>
`

const PAGE_DATA_PAYLOAD = {
  result: {
    data: {
      ashbyJobPosting: {
        fields: {
          title: 'AI Research Engineer',
          slug: '/careers/ai-research-engineer',
        },
      },
      allJobPostings: {
        nodes: [
          {
            departmentName: 'Engineering',
            fields: {
              title: 'AI Research Engineer',
              slug: '/careers/ai-research-engineer',
            },
            parent: {
              customFields: [
                { title: 'Timezone', value: '["UK (GMT 0)"]' },
                { title: 'Timezone(s)', value: 'GMT 0 ' },
              ],
            },
          },
          {
            departmentName: 'Sales & Customer Success',
            fields: {
              title: 'Technical Account Manager - EMEA',
              slug: '/careers/technical-account-manager-emea',
            },
            parent: {
              customFields: [
                {
                  title: 'Timezone',
                  value: '["Europe/Africa (GMT +2 to GMT 0)","UK (GMT 0)"]',
                },
                { title: 'Timezone(s)', value: 'GMT +2 to GMT ' },
              ],
            },
          },
          {
            departmentName: 'Sales & Customer Success',
            fields: {
              title: 'Technical Customer Success Manager - Americas',
              slug: '/careers/technical-customer-success-manager-americas',
            },
            parent: {
              customFields: [
                {
                  title: 'Timezone',
                  value: '["Americas (GMT -3 to GMT -8)"]',
                },
                { title: 'Timezone(s)', value: 'GMT -5 to GMT -8' },
              ],
            },
          },
        ],
      },
    },
  },
}

const PAGE_DATA_PAYLOAD_WITH_INDIA_ROLE = {
  result: {
    data: {
      ...PAGE_DATA_PAYLOAD.result.data,
      allJobPostings: {
        nodes: [
          ...PAGE_DATA_PAYLOAD.result.data.allJobPostings.nodes,
          {
            departmentName: 'Engineering',
            fields: {
              title: 'Fullstack Engineer',
              slug: '/careers/fullstack-engineer-india',
            },
            parent: {
              customFields: [
                { title: 'Timezone', value: '["India (GMT +5:30)"]' },
                { title: 'Timezone(s)', value: 'GMT +5:30' },
              ],
            },
          },
        ],
      },
    },
  },
}

const loadModule = async () => {
  try {
    return await import('../posthog/script.js')
  } catch {
    assert.fail('Expected PostHog scraper module at ../posthog/script.js')
  }
}

test('PostHog pins the verified first-party careers page and Gatsby page-data contract', async () => {
  const posthog = await loadModule()

  assert.equal(posthog.SOURCE, 'posthog')
  assert.equal(posthog.COMPANY, 'PostHog')
  assert.equal(posthog.OFFICIAL_BRAND_NAME, 'PostHog')
  assert.equal(posthog.VERIFIED_ON, '2026-07-25')
  assert.equal(posthog.CAREERS_PAGE_URL, 'https://posthog.com/careers')
  assert.equal(
    posthog.DISCOVERY_PAGE_DATA_URL,
    'https://posthog.com/page-data/careers/ai-research-engineer/page-data.json',
  )
  assert.equal(posthog.hasVerifiedCareersPageSignal(CAREERS_HTML), true)
  assert.equal(posthog.extractVerifiedRoleSlug(CAREERS_HTML), '/careers/ai-research-engineer')
  assert.equal(
    posthog.buildPageDataUrl('/careers/ai-research-engineer'),
    'https://posthog.com/page-data/careers/ai-research-engineer/page-data.json',
  )
  assert.deepEqual(posthog.extractAllJobPostings(PAGE_DATA_PAYLOAD), [
    {
      title: 'AI Research Engineer',
      slug: '/careers/ai-research-engineer',
      sourceUrl: 'https://posthog.com/careers/ai-research-engineer',
      department: 'Engineering',
      timezones: ['UK (GMT 0)', 'GMT 0'],
    },
    {
      title: 'Technical Account Manager - EMEA',
      slug: '/careers/technical-account-manager-emea',
      sourceUrl: 'https://posthog.com/careers/technical-account-manager-emea',
      department: 'Sales & Customer Success',
      timezones: ['Europe/Africa (GMT +2 to GMT 0)', 'UK (GMT 0)', 'GMT +2 to GMT'],
    },
    {
      title: 'Technical Customer Success Manager - Americas',
      slug: '/careers/technical-customer-success-manager-americas',
      sourceUrl: 'https://posthog.com/careers/technical-customer-success-manager-americas',
      department: 'Sales & Customer Success',
      timezones: ['Americas (GMT -3 to GMT -8)', 'GMT -5 to GMT -8'],
    },
  ])
})

test('PostHog run returns an honest empty array while the verified first-party roles stay outside India', async () => {
  const posthog = await loadModule()
  const requestedTexts = []
  const requestedJson = []

  const jobs = await posthog.createPostHogScraper().run({
    fetchText: async (url) => {
      requestedTexts.push(url)
      return CAREERS_HTML
    },
    fetchJson: async (url) => {
      requestedJson.push(url)
      return PAGE_DATA_PAYLOAD
    },
  })

  assert.deepEqual(requestedTexts, [posthog.CAREERS_PAGE_URL])
  assert.deepEqual(requestedJson, [posthog.DISCOVERY_PAGE_DATA_URL])
  assert.deepEqual(jobs, [])
})

test('PostHog fails closed when the verified careers surface, page-data contract, or India slice drifts', async () => {
  const posthog = await loadModule()

  await assert.rejects(
    posthog.createPostHogScraper().run({
      fetchText: async () => '<html><body><h1>Unexpected</h1></body></html>',
      fetchJson: async () => PAGE_DATA_PAYLOAD,
    }),
    /verified posthog careers page/i,
  )

  await assert.rejects(
    posthog.createPostHogScraper().run({
      fetchText: async () => CAREERS_HTML,
      fetchJson: async () => ({ result: { data: { allJobPostings: { nodes: [] } } } }),
    }),
    /verified posthog page-data contract/i,
  )

  await assert.rejects(
    posthog.createPostHogScraper().run({
      fetchText: async () => CAREERS_HTML,
      fetchJson: async () => PAGE_DATA_PAYLOAD_WITH_INDIA_ROLE,
    }),
    /verified posthog india slice changed materially/i,
  )
})
