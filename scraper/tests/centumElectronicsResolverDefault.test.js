import assert from 'node:assert/strict'
import test from 'node:test'

const loadCentumElectronicsModule = async () => {
  try {
    return await import('../centumelectronics/script.js')
  } catch {
    assert.fail('Expected Centum Electronics scraper module at ../centumelectronics/script.js')
  }
}

test('Centum Electronics default resolver dependency does not throw before the first fetch', async () => {
  const centum = await loadCentumElectronicsModule()

  await assert.rejects(
    centum.createCentumElectronicsScraper().run({
      fetchPage: async () => {
        throw new Error('fetch reached')
      },
    }),
    /fetch reached/,
  )
})

test('Centum Electronics only retries certificate failures for the verified first-party host', async () => {
  const centum = await loadCentumElectronicsModule()

  assert.equal(
    centum.isRecoverableCentumCertificateError(
      centum.BRAND_HOME_URL,
      { cause: { code: 'CERT_HAS_EXPIRED' } },
    ),
    true,
  )
  assert.equal(
    centum.isRecoverableCentumCertificateError(
      'https://example.com/',
      { cause: { code: 'CERT_HAS_EXPIRED' } },
    ),
    false,
  )
  assert.equal(
    centum.isRecoverableCentumCertificateError(
      centum.BRAND_HOME_URL,
      { cause: { code: 'ECONNRESET' } },
    ),
    false,
  )
})
