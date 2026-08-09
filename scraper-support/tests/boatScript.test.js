import assert from 'node:assert/strict'
import test from 'node:test'

import { run } from '../../scraper/boat/script.js'

test('Boat provider fails closed when the public jobs surface is not enumerable', async () => {
  assert.deepEqual(await run(), [])
})
