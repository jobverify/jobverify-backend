import assert from 'node:assert/strict'
import test from 'node:test'

const loadModule = async () => {
  try {
    return await import('../../scraper/outlinesystems/script.js')
  } catch {
    assert.fail('Expected Outline Systems scraper module at ../../scraper/outlinesystems/script.js')
  }
}

test('Outline Systems sentinel remains an empty fail-closed provider', async () => {
  const outline = await loadModule()

  assert.equal(outline.SOURCE, 'outlinesystems')
  assert.equal(outline.COMPANY, 'Outline Systems')
  assert.equal(outline.CAREERS_URL, 'https://www.outlinesys.com/careers')
  assert.deepEqual(await outline.run(), [])
})
