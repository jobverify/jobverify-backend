import assert from 'node:assert/strict'
import test from 'node:test'

const loadModule = async () => {
  try {
    return await import('../qlik/script.js')
  } catch {
    assert.fail('Expected Qlik scraper module at ../qlik/script.js')
  }
}

test('Qlik falls back to a browser-backed loader when Node fetch times out', async () => {
  const qlik = await loadModule()

  assert.equal(typeof qlik.loadWithBrowserFallback, 'function')

  const result = await qlik.loadWithBrowserFallback({
    primaryLoad: async () => {
      throw new TypeError('fetch failed | Connect Timeout Error')
    },
    fallbackLoad: async (error) => ({
      data: { positions: [], count: 0 },
      recoveredFrom: String(error),
    }),
  })

  assert.deepEqual(result, {
    data: { positions: [], count: 0 },
    recoveredFrom: 'TypeError: fetch failed | Connect Timeout Error',
  })
})
