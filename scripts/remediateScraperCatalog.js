import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { getScraperCatalog } from '../scraper-support/providers/index.js'
import { createPublishingGapAtsScraper } from '../scraper-support/utils/publishingGapAts.js'
import { analyzePublishableJobs } from '../scraper-support/utils/publishableJobMetrics.js'
import { readInventoryEvidence, isFreshCompleteInventoryEvidence } from '../scraper-support/utils/inventoryEvidence.js'
import { classifyProviderImplementation } from './reportScriptCatalogTopology.js'
import { classifyScraperError } from '../scraper-support/utils/failureClassification.js'
import { identifyPublicAtsBoard } from '../scraper-support/utils/publicAtsIdentity.js'
export { identifyPublicAtsBoard }

const HTTP = value => {
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url : null } catch { return null }
}
const ATS_HOST = /(?:^|\.)(?:greenhouse\.io|ashbyhq\.com|lever\.co|myworkdayjobs\.com|myworkdaysite\.com|smartrecruiters\.com|successfactors\.com|oraclecloud\.com|darwinbox\.in|darwinbox\.com|keka\.com|workable\.com|recruitee\.com|breezy\.hr|jobvite\.com|icims\.com)$/i
const CAREERS = /careers?|jobs?|join[-_/ ]?(?:us|the[-_ ]?team)|vacanc|opportunit|work[-_ ]?with[-_ ]?us|we[-_ ]?are[-_ ]?hiring/i
const decode = text => String(text || '').replace(/\\u002[fF]/g, '/').replace(/\\\//g, '/').replace(/&amp;/gi, '&')

const defaultFetchPage = async url => {
  const response = await fetch(url, { signal: AbortSignal.timeout(10000), headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Jobverify careers inventory check)' } })
  if (Number(response.headers.get('content-length')) > 3000000) throw new Error('official_response_too_large')
  return { status: response.status, url: response.url, html: (await response.text()).slice(0, 3000000) }
}

const defaultFetchJson = async url => {
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) })
  if (!response.ok) throw new Error(`Public ATS HTTP ${response.status}`)
  return response.json()
}

export const discoverOfficialAtsBoards = async (provider, { fetchPage = defaultFetchPage } = {}) => {
  const roots = [provider.companyCareerPage, provider.officialHomepageUrl, provider.officialCareersPageUrl,
    provider.companyDomain ? `https://${provider.companyDomain.replace(/^https?:\/\//, '').replace(/\/$/, '')}/` : null]
    .filter(value => { const url = HTTP(value); return url && !ATS_HOST.test(url.hostname) })
  const queue = [...new Set(roots)]
  const seen = new Set()
  const boards = new Map()
  const checks = []
  const addBoard = (url, officialURL, evidenceURL, method, status) => {
    const board = identifyPublicAtsBoard(url)
    if (!board) return
    boards.set(`${board.atsPlatform}:${board.boardToken}`, { ...board, bindingEvidence: {
      verified: true, checkedAt: new Date().toISOString(), officialURL, evidenceURL,
      httpStatus: status, matchedLinks: [url], bindingMethod: method,
    } })
  }
  while (queue.length && seen.size < 4) {
    const requestedURL = queue.shift()
    if (seen.has(requestedURL)) continue
    seen.add(requestedURL)
    try {
      const response = await fetchPage(requestedURL)
      const finalURL = response.url || requestedURL
      checks.push({ requestedURL, finalURL, httpStatus: response.status, checkedAt: new Date().toISOString() })
      // A successful redirect from the official company site binds the ATS.
      if (response.status >= 200 && response.status < 400 && identifyPublicAtsBoard(finalURL)) {
        addBoard(finalURL, requestedURL, finalURL, 'official-redirect', response.status)
        continue
      }
      if (response.status < 200 || response.status >= 300) continue
      const html = decode(response.html)
      const pageURL = HTTP(finalURL)
      if (!pageURL || ATS_HOST.test(pageURL.hostname)) continue
      const careersPage = CAREERS.test(pageURL.pathname + ' ' + pageURL.hostname)
      const anchors = [...html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
      for (const [, href, body] of anchors) {
        const target = HTTP(new URL(href, pageURL).href)
        if (!target) continue
        const hiringLink = CAREERS.test(body.replace(/<[^>]*>/g, ' ') + ' ' + target.pathname)
        if (careersPage || hiringLink) addBoard(target.href, finalURL, finalURL, 'official-careers-link', response.status)
        if (hiringLink && target.hostname === pageURL.hostname && !seen.has(target.href) && !queue.includes(target.href)) queue.push(target.href)
      }
      if (careersPage) {
        for (const value of html.match(/https?:\/\/[^\s<>"'\\`]+/g) || []) addBoard(value, finalURL, finalURL, 'official-careers-embedded-board', response.status)
        const scripts = [...html.matchAll(/<script\b[^>]*src\s*=\s*["']([^"']+)["']/gi)]
          .map(([, src]) => { try { return new URL(src, pageURL) } catch { return null } })
          .filter(url => url && url.hostname === pageURL.hostname && !/analytics|tracking|pixel|gtag/i.test(url.pathname))
          .sort((a, b) => Number(/career|job|greenhouse|ashby|lever/i.test(b.pathname)) - Number(/career|job|greenhouse|ashby|lever/i.test(a.pathname)))
        // Bounded source inspection, never executing third-party page code.
        if (boards.size === 0) for (const url of scripts.slice(0, 2)) {
          try {
            const script = await fetchPage(url.href)
            if (script.status !== 200) continue
            checks.push({ requestedURL: url.href, finalURL: script.url || url.href, httpStatus: script.status, checkedAt: new Date().toISOString() })
            for (const value of decode(script.html).match(/https?:\/\/[^\s<>"'\\`]+/g) || []) addBoard(value, finalURL, url.href, 'official-careers-linked-script', script.status)
          } catch { /* Retain the page check without inventing a board. */ }
        }
      }
      if (boards.size) break
    } catch (error) {
      checks.push({ requestedURL, httpStatus: null, checkedAt: new Date().toISOString(), failureKind: error?.name === 'TimeoutError' ? 'timeout' : 'network_or_response_error' })
    }
  }
  return { boards: [...boards.values()], checks, reason: boards.size ? null : roots.length ? 'no-verified-supported-ats-binding' : 'missing-official-company-surface' }
}

export const auditCatalogProvider = async (provider, options = {}) => {
  const attemptedAt = new Date().toISOString()
  const discovery = await discoverOfficialAtsBoards(provider, options)
  const base = { source: provider.source, companyName: provider.companyName || provider.source, attemptedAt,
    implementation: classifyProviderImplementation(provider), discovery,
    rawJobs: null, eligibleJobs: null, jobs: null, inventoryEvidence: null }
  if (discovery.boards.length !== 1) return { ...base, outcome: discovery.boards.length > 1 ? 'ambiguous-official-boards' : discovery.reason, completedAt: new Date().toISOString() }
  const binding = discovery.boards[0]
  const candidate = { ...provider, ...binding, adapter: 'publicAts', countryFilter: 'India',
    catalogOverride: true, zeroResultPolicy: 'evidence-required', backfillMode: 'live-parser',
    companyCareerPage: binding.bindingEvidence.officialURL,
    extractionStrategy: 'verified-official-binding+validated-public-ats-inventory+explicit-india-location+role-descriptions' }
  try {
    const jobs = options.scrape ? await options.scrape(candidate) : await createPublishingGapAtsScraper(candidate).run({
      fetchJson: options.fetchJson || defaultFetchJson,
    })
    const analysis = analyzePublishableJobs(jobs)
    const inventoryEvidence = readInventoryEvidence(jobs)
    if (!isFreshCompleteInventoryEvidence(inventoryEvidence)) throw new Error('incomplete-inventory-evidence')
    return { ...base, outcome: analysis.eligibleJobs.length ? 'ready-for-validation' : jobs.length ? 'jobs-rejected' : 'verified-zero-india',
      candidate, rawJobs: jobs.length, eligibleJobs: analysis.eligibleJobs.length, jobs, inventoryEvidence,
      filterCounts: analysis.filterCounts, completedAt: new Date().toISOString() }
  } catch (error) {
    return { ...base, outcome: 'extraction-failed', candidate,
      failureKind: error?.name === 'TimeoutError' ? 'network_or_timeout' : classifyScraperError(error).failureKind,
      completedAt: new Date().toISOString() }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2)
  const option = name => { const index = args.indexOf(name); return index < 0 ? null : args[index + 1] }
  const output = path.resolve(option('--output') || '../artifacts/catalog-remediation')
  const runtimePath = option('--runtime')
  const runtime = runtimePath ? JSON.parse(fs.readFileSync(path.resolve(runtimePath), 'utf8')) : null
  if (!runtime?.databaseAvailable || !Array.isArray(runtime.inventory)) throw new Error('A current runtime snapshot is required; unavailable inventory must not count as zero')
  const inventory = new Map(runtime.inventory.map(row => [row.source, row]))
  const sourceIds = option('--sources')?.split(',').filter(Boolean)
  const catalog = getScraperCatalog().filter(p => !sourceIds || sourceIds.includes(p.source))
    .sort((a, b) => Number(/greenhouse|ashby|lever/i.test(b.atsPlatform)) - Number(/greenhouse|ashby|lever/i.test(a.atsPlatform)) || a.source.localeCompare(b.source))
  const limit = option('--limit') ? Number(option('--limit')) : catalog.length
  const concurrency = Number(option('--concurrency') || 8)
  if (!Number.isInteger(limit) || limit < 1 || !Number.isInteger(concurrency) || concurrency < 1 || concurrency > 16) throw new Error('Positive limit and concurrency between 1 and 16 required')
  const selected = catalog.slice(0, limit)
  fs.mkdirSync(path.join(output, 'sources'), { recursive: true })
  const completed = new Map()
  for (const provider of selected) {
    const file = path.join(output, 'sources', `${provider.source}.json`)
    if (fs.existsSync(file) && !args.includes('--refresh')) {
      const row = JSON.parse(fs.readFileSync(file, 'utf8'))
      const age = Date.now() - new Date(row.completedAt).getTime()
      if (age >= 0 && age < 48 * 3600000 && !(args.includes('--include-published') && row.outcome === 'already-published-not-rechecked')) completed.set(provider.source, row)
    }
  }
  let index = 0
  const summary = () => {
    const counts = [...completed.values()].reduce((acc, row) => { acc[row.outcome] = (acc[row.outcome] || 0) + 1; return acc }, {})
    const value = { generatedAt: new Date().toISOString(), state: completed.size === selected.length ? 'review-required' : 'scanning',
      selectedSources: selected.length, completedSources: completed.size, remainingSources: selected.length - completed.size, outcomeCounts: counts,
      productionWrites: false, sourceChangesApplied: false }
    fs.writeFileSync(path.join(output, 'progress.json'), JSON.stringify(value, null, 2) + '\n')
    return value
  }
  summary()
  const timer = setInterval(() => console.log(JSON.stringify(summary())), 30000)
  try {
    await Promise.all(Array.from({ length: concurrency }, async () => {
      while (index < selected.length) {
        const provider = selected[index++]
        if (completed.has(provider.source)) continue
        const live = inventory.get(provider.source)
        const result = !args.includes('--include-published') && live?.visibleJobs > 0
          ? { source: provider.source, companyName: provider.companyName, outcome: 'already-published-not-rechecked',
            visibleJobs: live.visibleJobs, completedAt: new Date().toISOString() }
          : await auditCatalogProvider(provider)
        fs.writeFileSync(path.join(output, 'sources', `${provider.source}.json`), JSON.stringify(result, null, 2) + '\n')
        completed.set(provider.source, result)
      }
    }))
  } finally {
    clearInterval(timer)
    const rows = [...completed.values()].sort((a, b) => a.source.localeCompare(b.source))
    fs.writeFileSync(path.join(output, 'catalog-outcomes.json'), JSON.stringify(rows.map(({ jobs, ...row }) => row), null, 2) + '\n')
    fs.writeFileSync(path.join(output, 'candidate-providers.json'), JSON.stringify(rows.filter(row => row.outcome === 'ready-for-validation' || row.outcome === 'verified-zero-india').map(row => row.candidate), null, 2) + '\n')
    console.log(JSON.stringify(summary()))
  }
}
