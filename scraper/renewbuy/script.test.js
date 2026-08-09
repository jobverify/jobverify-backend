import assert from 'node:assert/strict'
import test from 'node:test'

import { COMPANY_NAME, HOMEPAGE_URL, run } from './script.js'

test('RenewBuy provider preserves the exact company identity and official homepage', () => {
  assert.equal(COMPANY_NAME, 'RenewBuy')
  assert.equal(HOMEPAGE_URL, 'https://www.renewbuy.com/')
})

test('RenewBuy fails closed without a verified first-party India jobs feed', async () => {
  assert.deepEqual(await run(), [])
})
