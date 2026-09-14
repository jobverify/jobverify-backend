import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { loadConfig } from '../utils/loadConfig.js'

const testsDir = path.dirname(fileURLToPath(import.meta.url))
const companies = JSON.parse(readFileSync(path.join(testsDir, '../myworkday/companies.json'), 'utf8'))
const INDIA_ID = 'c4f78be1a8f14da0ab49ce1162348a5e'

const loadSourceConfig = source => loadConfig(path.join(testsDir, `../../scraper/${source}.workday`))
const companyUrl = source => new URL(companies.find(company => company.name === source).baseUrl)

test('country-capable Workday tenants use their declared India country facet instead of text search', () => {
  const expected = {
    philips: ['locationHierarchy1', '6e1b2a934716103c2adde1d57e7700ea'],
    dow: ['Location_Country', INDIA_ID],
    nxp: ['Location_Country', INDIA_ID],
    salesforce: ['CF_-_REC_-_LRV_-_Job_Posting_Anchor_-_Country_from_Job_Posting_Location_Extended', INDIA_ID],
    brenntagindia: ['Country', INDIA_ID],
    protiviti: ['Location_Country', INDIA_ID],
    guardian: ['hiringCompany', '4d442d4f5d091032118fe34e0ae8f401'],
  }

  for (const [source, [parameter, id]] of Object.entries(expected)) {
    const config = loadSourceConfig(source)
    assert.equal(config.countryFacetParameter, parameter, `${source} country facet parameter`)
    assert.equal(config.locationCountry, id, `${source} India facet id`)
    assert.equal(config.searchText, undefined, `${source} must not use India text search`)
  }
})

test('location-only Workday tenants declare all verified India location leaves', () => {
  const expected = {
    o9solutions: ['f1067acbdfdc1001082fa42e89560000'],
    fractal: [
      '4fedd31659ec01018833637cbf900000',
      '7edfb62955d310014b634f88574d0000',
      'ce4e62e669131000e2dc7e2e78a50000',
      '4fedd31659ec010188335e09918c0000',
      '3b3fb1d62c071000e2a0f48656560000',
      '4fedd31659ec01018833886e5c060000',
      '7babd3b910a21000e841d1c78e770000',
      '7edfb62955d310014b6351f083a60000',
    ],
    kaleris: [
      '39a74440c4f910011fdea2ce8da20000',
      '39a74440c4f910011fdea6685c650000',
    ],
    mastercard: [
      '8eab563831bf10acb97b7fba5feff76e',
      '8eab563831bf10acbb7b5bf86d570af1',
      '28905a74db1b10019f5bb16c36030000',
      '8eab563831bf10acbc722e4859721571',
      '8ffae25149e210718ae5b2e1cb1993bb',
      '85a5bdf4e1831035984400a2fb698c94',
    ],
    trellix: [
      '17473f74f1d501886cf7ba67a101abdd',
      '17473f74f1d501f1ff3fb267a101a6dd',
    ],
    paloalto: [
      '4c6868193c0310016a33a54db4b20000',
      '4c6868193c0310016a33b01abd8b0000',
      'e62cc4173be310016a98201022730000',
      'e62cc4173be310016a988b977ccd0000',
      '0925b66a7d40107de95dc57546152c93',
      'a4e5dc5cfe170161250a9bd1b000e413',
      'bafc965434591001f048843674030000',
      '45eb6188f3f71001f085c28ca35a0000',
      '9b10db154fdd105cf240db7bb48decbe',
      '9b10db154fdd105cf1ec795200e5ec5f',
      '2e473c9ce0941001603bdcd7043c0000',
    ],
    roche: [
      '763fba0474e70100f99cc4b76b650000',
      '54c59631019f01c1589e94d7e67743a3',
      'e2c616a13c590100f97934cb30d60000',
      '4ae5b8b977ee0100f9037784a2ce0000',
      '54c59631019f01c479dfb787a377c235',
      '8c10cf5604420100f9b96ead92af0000',
      '9d46ecfbea920100f9a45074c42e0000',
      '54c59631019f011278ea85d7e67739a3',
      '54c59631019f01ba6efd80d7e67734a3',
      '54c59631019f017ed6337bd7e6772fa3',
    ],
  }

  for (const [source, ids] of Object.entries(expected)) {
    const config = loadSourceConfig(source)
    assert.equal(config.locationCountry, null, `${source} must omit the unsupported generic country facet`)
    assert.equal(config.searchText, undefined, `${source} must not use India text search`)
    assert.deepEqual(companyUrl(source).searchParams.getAll('locations'), ids, `${source} India location ids`)
  }
})
