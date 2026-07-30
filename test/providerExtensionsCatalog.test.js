import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {
  getScraperCatalog,
  loadProviderExtensions,
} from '../scraper/providers/index.js'

test('loadProviderExtensions merges sorted JSON files into a single provider list', () => {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'jobify-provider-extensions-'))

  try {
    writeFileSync(
      path.join(tempDir, 'b-second.json'),
      `${JSON.stringify([
        {
          source: 'testscriptbeta',
          companyName: 'Test Script Beta',
          adapter: 'script',
          modulePath: '../testscriptbeta/script.js',
          companyCareerPage: 'https://beta.example/careers',
          verifiedOn: '2026-07-25',
        },
      ], null, 2)}\n`,
      'utf8',
    )
    writeFileSync(
      path.join(tempDir, 'a-first.json'),
      `${JSON.stringify([
        {
          source: 'testworkdayalpha',
          companyName: 'Test Workday Alpha',
          adapter: 'workday',
          baseUrl: 'https://alpha.wd1.myworkdayjobs.com/Alpha',
          companyCareerPage: 'https://alpha.example/careers',
        },
      ], null, 2)}\n`,
      'utf8',
    )

    const providers = loadProviderExtensions(tempDir)

    assert.deepEqual(
      providers.map((provider) => provider.source),
      ['testworkdayalpha', 'testscriptbeta'],
    )
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
})

test('getScraperCatalog includes providers loaded from extension files', () => {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'jobify-provider-catalog-'))

  try {
    writeFileSync(
      path.join(tempDir, 'a-first.json'),
      `${JSON.stringify([
        {
          source: 'testworkdayalpha',
          companyName: 'Test Workday Alpha',
          adapter: 'workday',
          baseUrl: 'https://alpha.wd1.myworkdayjobs.com/Alpha',
          companyCareerPage: 'https://alpha.example/careers',
        },
        {
          source: 'testscriptbeta',
          companyName: 'Test Script Beta',
          adapter: 'script',
          modulePath: '../testscriptbeta/script.js',
          companyCareerPage: 'https://beta.example/careers',
          verifiedOn: '2026-07-25',
          verifiedSurfaceSummary: 'Verified on Saturday, July 25, 2026 that Beta uses a script provider.',
        },
      ], null, 2)}\n`,
      'utf8',
    )

    const catalog = getScraperCatalog({ providerExtensionDir: tempDir })
    const workdayProvider = catalog.find((provider) => provider.source === 'testworkdayalpha')
    const scriptProvider = catalog.find((provider) => provider.source === 'testscriptbeta')

    assert.ok(workdayProvider)
    assert.equal(workdayProvider.adapter, 'workday')
    assert.equal(workdayProvider.baseUrl, 'https://alpha.wd1.myworkdayjobs.com/Alpha')
    assert.equal(workdayProvider.companyDomain, 'alpha.example')

    assert.ok(scriptProvider)
    assert.equal(scriptProvider.adapter, 'script')
    assert.equal(scriptProvider.modulePath, '../testscriptbeta/script.js')
    assert.equal(scriptProvider.companyDomain, 'beta.example')
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
})
