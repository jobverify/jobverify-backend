import assert from 'node:assert/strict'
import test from 'node:test'

const loadAarogyaAIModule = async () => {
  try {
    return await import('../aarogyaai/script.js')
  } catch {
    return null
  }
}

test('AarogyaAI validates the verified unreachable first-party surfaces for the current no-public-jobs state', async () => {
  const aarogyaAI = await loadAarogyaAIModule()
  assert.ok(aarogyaAI, 'Expected AarogyaAI scraper module at ../aarogyaai/script.js')

  assert.equal(aarogyaAI.isExpectedUnreachableSurface({ errorKind: 'timeout' }), true)
  assert.equal(aarogyaAI.isExpectedUnreachableSurface({ errorKind: 'dns' }), false)
  assert.equal(aarogyaAI.isUnexpectedReachableSurface({ status: 200, html: '<html><title>Careers</title></html>' }), true)
  assert.equal(aarogyaAI.isUnexpectedReachableSurface({ errorKind: 'timeout' }), false)
})

test('AarogyaAI run verifies the exact-name first-party roots and common careers routes before returning []', async () => {
  const aarogyaAI = await loadAarogyaAIModule()
  assert.ok(aarogyaAI, 'Expected AarogyaAI scraper module at ../aarogyaai/script.js')

  const requestedUrls = []

  const jobs = await aarogyaAI.createAarogyaAIScraper().run({
    probeUrl: async (url) => {
      requestedUrls.push(url)

      if (
        url === 'https://aarogyaai.com/'
        || url === 'https://aarogyaai.in/'
        || url === 'https://aarogyaai.com/careers'
        || url === 'https://aarogyaai.com/jobs'
        || url === 'https://aarogyaai.in/careers'
        || url === 'https://aarogyaai.in/jobs'
      ) {
        return {
          url,
          finalUrl: url,
          status: null,
          html: null,
          errorKind: 'timeout',
        }
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    'https://aarogyaai.com/',
    'https://aarogyaai.in/',
    'https://aarogyaai.com/careers',
    'https://aarogyaai.com/jobs',
    'https://aarogyaai.in/careers',
    'https://aarogyaai.in/jobs',
  ])
  assert.deepEqual(jobs, [])
})

test('AarogyaAI fails closed when a first-party root or common careers route becomes reachable', async () => {
  const aarogyaAI = await loadAarogyaAIModule()
  assert.ok(aarogyaAI, 'Expected AarogyaAI scraper module at ../aarogyaai/script.js')

  await assert.rejects(
    aarogyaAI.createAarogyaAIScraper().run({
      probeUrl: async (url) => {
        if (url === 'https://aarogyaai.com/') {
          return {
            url,
            finalUrl: url,
            status: 200,
            html: '<html><title>AarogyaAI</title><body>Homepage now responds.</body></html>',
            errorKind: null,
          }
        }

        return {
          url,
          finalUrl: url,
          status: null,
          html: null,
          errorKind: 'timeout',
        }
      },
    }),
    /official first-party root/i,
  )

  await assert.rejects(
    aarogyaAI.createAarogyaAIScraper().run({
      probeUrl: async (url) => {
        if (url === 'https://aarogyaai.in/jobs') {
          return {
            url,
            finalUrl: url,
            status: 200,
            html: '<html><title>Jobs</title><body><a href="/apply">Apply now</a></body></html>',
            errorKind: null,
          }
        }

        return {
          url,
          finalUrl: url,
          status: null,
          html: null,
          errorKind: 'timeout',
        }
      },
    }),
    /public jobs surface/i,
  )

  await assert.rejects(
    aarogyaAI.createAarogyaAIScraper().run({
      probeUrl: async (url) => ({
        url,
        finalUrl: url,
        status: null,
        html: null,
        errorKind: 'dns',
      }),
    }),
    /verified unreachable surface/i,
  )
})
