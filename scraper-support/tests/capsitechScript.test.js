import assert from 'node:assert/strict'
import test from 'node:test'

const loadCapsitechModule = async () => {
  try {
    return await import('../../scraper/capsitech/script.js')
  } catch {
    assert.fail('Expected Capsitech scraper module at ../../scraper/scraper/capsitech/script.js')
  }
}

const careerPageHtml = `
  <html>
    <head>
      <title>CA | ACCA | Developer and IT Jobs in Jodhpur | Capsitech</title>
      <script>
        window.RESUME_KEY = 'resume/key=';
      </script>
    </head>
    <body>
      <section id="career_page">
        <form id="Carrer_Form">
          <select id="Job_Position" name="domain"></select>
        </form>
      </section>
    </body>
  </html>
`

const careerOptionsPayload = {
  status: true,
  result: {
    domainsList: [
      {
        label: 'IT',
        domains: [{ id: 'technical-development', name: 'Technical Development' }],
      },
    ],
  },
}

test('run returns no jobs when Capsitech exposes application categories without public opening details', async () => {
  const capsitech = await loadCapsitechModule()
  const requestedUrls = []

  assert.equal(capsitech.hasCareerPageSignal(careerPageHtml), true)
  assert.equal(capsitech.hasPublicPositionOptions(careerOptionsPayload), true)

  const jobs = await capsitech.createCapsitechScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      assert.equal(url, capsitech.CAREER_PAGE_URL)
      return careerPageHtml
    },
    fetchJson: async (url) => {
      requestedUrls.push(url)
      assert.equal(url, capsitech.buildCareerOptionsUrl('resume/key='))
      return careerOptionsPayload
    },
  })

  assert.deepEqual(requestedUrls, [
    capsitech.CAREER_PAGE_URL,
    capsitech.buildCareerOptionsUrl('resume/key='),
  ])
  assert.deepEqual(jobs, [])
})
