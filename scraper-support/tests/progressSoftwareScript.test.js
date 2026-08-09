import assert from 'node:assert/strict'
import test from 'node:test'

const loadModule = async () => {
  try {
    return await import('../../scraper/progresssoftware/script.js')
  } catch {
    assert.fail('Expected Progress Software scraper module at ../../scraper/progresssoftware/script.js')
  }
}

test('Progress Software preserves its verified first-party metadata', async () => {
  const progressSoftware = await loadModule()

  assert.equal(progressSoftware.SOURCE, 'progresssoftware')
  assert.equal(progressSoftware.COMPANY_NAME, 'Progress Software')
  assert.equal(progressSoftware.CAREERS_HOME_URL, 'https://www.progress.com/company/careers')
  assert.equal(progressSoftware.OPEN_POSITIONS_URL, 'https://www.progress.com/company/careers/open-positions')
  assert.equal(
    progressSoftware.JOB_PAGE_PREFIX,
    'https://www.progress.com/company/careers/open-positions/',
  )
})

test('Progress Software returns [] without probing an untrusted public jobs contract', async () => {
  const progressSoftware = await loadModule()
  let fetchCalls = 0

  const jobs = await progressSoftware.createProgressSoftwareScraper().run({
    fetchText: async () => {
      fetchCalls += 1
      return '<html><body>unexpected public jobs surface</body></html>'
    },
  })

  assert.deepEqual(jobs, [])
  assert.equal(fetchCalls, 0)
})

test('Progress Software run wrapper returns [] without probing external surfaces', async () => {
  const progressSoftware = await loadModule()
  let fetchCalls = 0

  const jobs = await progressSoftware.run({
    fetchText: async () => {
      fetchCalls += 1
      return '<html><body>unexpected public jobs surface</body></html>'
    },
  })

  assert.deepEqual(jobs, [])
  assert.equal(fetchCalls, 0)
})
