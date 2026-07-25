import assert from 'node:assert/strict'
import test from 'node:test'

const loadAlkemModule = async () => {
  try {
    return await import('../alkemlaboratories/script.js')
  } catch {
    assert.fail('Expected Alkem Laboratories scraper module at ../alkemlaboratories/script.js')
  }
}

const careersPageHtml = `
  <html>
    <head><title>Career | Alkem Laboratories</title></head>
    <body>
      <h1>Career</h1>
      <p>Build your career with Alkem Laboratories.</p>
      <a href="https://careers.alkemlabs.com/">Search Jobs</a>
    </body>
  </html>
`

test('Alkem Laboratories scraper pins the verified official careers page and broken careers host handoff', async () => {
  const alkem = await loadAlkemModule()

  assert.equal(alkem.CAREERS_PAGE_URL, 'https://www.alkemlabs.com/career')
  assert.equal(alkem.CAREERS_HANDOFF_URL, 'https://careers.alkemlabs.com/')
  assert.equal(alkem.hasOfficialCareersSignal(careersPageHtml), true)
  assert.equal(alkem.hasOfficialHandoffSignal(careersPageHtml), true)
})

test('Alkem Laboratories run returns no jobs when the verified first-party careers host remains unreachable', async () => {
  const alkem = await loadAlkemModule()
  const requestedUrls = []

  const jobs = await alkem.createAlkemLaboratoriesScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === alkem.CAREERS_PAGE_URL) {
        return { status: 200, url, html: careersPageHtml }
      }

      if (url === alkem.CAREERS_HANDOFF_URL) {
        throw new Error('getaddrinfo ENOTFOUND careers.alkemlabs.com')
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    alkem.CAREERS_PAGE_URL,
    alkem.CAREERS_HANDOFF_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('Alkem Laboratories run fails closed when the official careers page or handoff changes', async () => {
  const alkem = await loadAlkemModule()

  await assert.rejects(
    alkem.createAlkemLaboratoriesScraper().run({
      fetchPage: async (url) => {
        if (url === alkem.CAREERS_PAGE_URL) {
          return { status: 200, url, html: '<html><body><h1>Careers</h1></body></html>' }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified careers handoff/i,
  )

  await assert.rejects(
    alkem.createAlkemLaboratoriesScraper().run({
      fetchPage: async (url) => {
        if (url === alkem.CAREERS_PAGE_URL) {
          return { status: 200, url, html: careersPageHtml }
        }

        if (url === alkem.CAREERS_HANDOFF_URL) {
          return {
            status: 200,
            url,
            html: '<html><body><h1>Alkem Careers</h1><a href="/jobs">Jobs</a></body></html>',
          }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /no longer matches the verified unreachable state/i,
  )
})
