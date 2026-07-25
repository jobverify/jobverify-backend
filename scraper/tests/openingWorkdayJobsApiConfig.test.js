import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { loadConfig } from '../utils/loadConfig.js'

const testsDir = path.dirname(fileURLToPath(import.meta.url))

test('ABB and Airbus use the verified lowercase locationCountry facet while Allstate switches to jobs-api via India search text without the unsupported facet', () => {
  const abbConfig = loadConfig(path.join(testsDir, '../myworkday/abb'))
  const airbusConfig = loadConfig(path.join(testsDir, '../myworkday/airbus'))
  const allstateConfig = loadConfig(path.join(testsDir, '../myworkday/allstate'))

  assert.equal(abbConfig.listingStrategy, 'jobs-api')
  assert.equal(
    abbConfig.jobsApiUrl,
    'https://abb.wd3.myworkdayjobs.com/wday/cxs/abb/External_Career_Page/jobs',
  )
  assert.equal(abbConfig.detailUrlBase, 'https://abb.wd3.myworkdayjobs.com/External_Career_Page')
  assert.equal(abbConfig.countryFacetParameter, 'locationCountry')
  assert.match(abbConfig.locationPattern, /india|bangalore|bengaluru|hyderabad|pune|mumbai|vadodara|chennai|gurgaon|gurugram/i)

  assert.equal(airbusConfig.listingStrategy, 'jobs-api')
  assert.equal(
    airbusConfig.jobsApiUrl,
    'https://ag.wd3.myworkdayjobs.com/wday/cxs/ag/Airbus/jobs',
  )
  assert.equal(airbusConfig.detailUrlBase, 'https://ag.wd3.myworkdayjobs.com/en-US/Airbus')
  assert.equal(airbusConfig.countryFacetParameter, 'locationCountry')

  assert.equal(allstateConfig.listingStrategy, 'jobs-api')
  assert.equal(
    allstateConfig.jobsApiUrl,
    'https://allstate.wd5.myworkdayjobs.com/wday/cxs/allstate/allstate_careers/jobs',
  )
  assert.equal(allstateConfig.detailUrlBase, 'https://allstate.wd5.myworkdayjobs.com/allstate_careers')
  assert.equal(allstateConfig.locationCountry, null)
  assert.equal(allstateConfig.searchText, 'India')
  assert.match(allstateConfig.locationPattern, /india|pune|bangalore|bengaluru|gurgaon|gurugram|hyderabad/i)
})
