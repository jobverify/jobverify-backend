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
import { readNativeDocument, activeIframeSources, activeScripts } from '../scraper-support/utils/activeNativeHtml.js'
export { identifyPublicAtsBoard }

const HTTP = value => {
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url : null } catch { return null }
}
const ATS_HOST = /(?:^|\.)(?:greenhouse\.io|ashbyhq\.com|lever\.co|myworkdayjobs\.com|myworkdaysite\.com|smartrecruiters\.com|successfactors\.com|oraclecloud\.com|darwinbox\.in|darwinbox\.com|keka\.com|workable\.com|recruitee\.com|breezy\.hr|jobvite\.com|icims\.com)$/i
const CAREERS = /careers?|jobs?|(?:open|view|available)[-_ /]?(?:roles?|positions?)|join[-_/ ]?(?:us|the[-_ ]?team)|vacanc|opportunit|work[-_ ]?with[-_ ]?us|we[-_ ]?are[-_ ]?hiring/i
const THIRD_PARTY_HOST = /(?:^|\.)(?:linkedin\.com|facebook\.com|instagram\.com|twitter\.com|x\.com|youtube\.com|glassdoor\.com|indeed\.com)$/i
const decode = text => String(text || '').replace(/\\u002[fF]/g, '/').replace(/\\\//g, '/').replace(/&amp;/gi, '&')

const defaultFetchPage = async url => {
  const response = await fetch(url, { signal: AbortSignal.timeout(10000), headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Jobverify careers inventory check)' } })
  if (Number(response.headers.get('content-length')) > 3000000) throw new Error('official_response_too_large')
  const html = await response.text()
  if (Buffer.byteLength(html, 'utf8') > 3000000) throw new Error('official_response_too_large')
  return { status: response.status, url: response.url, html }
}

const defaultFetchJson = async url => {
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) })
  if (!response.ok) throw new Error(`Public ATS HTTP ${response.status}`)
  return response.json()
}

export const discoverOfficialAtsBoards = async (provider, { fetchPage = defaultFetchPage } = {}) => {
  const suppliedRoots = [provider.companyCareerPage, provider.officialHomepageUrl, provider.officialCareersPageUrl,
    provider.companyDomain ? `https://${provider.companyDomain.replace(/^https?:\/\//, '').replace(/\/$/, '')}/` : null]
    .filter(value => { const url = HTTP(value); return url && !url.username && !url.password && !ATS_HOST.test(url.hostname) && !THIRD_PARTY_HOST.test(url.hostname) })
  const declaredDomain = provider.companyDomain && HTTP(/^https?:\/\//i.test(provider.companyDomain) ? provider.companyDomain : `https://${provider.companyDomain}`)
  const trustedBase = (declaredDomain && !ATS_HOST.test(declaredDomain.hostname) && !THIRD_PARTY_HOST.test(declaredDomain.hostname)
    ? declaredDomain.hostname : HTTP(suppliedRoots[0])?.hostname)?.replace(/^www\./i, '')
  const trusted = url => Boolean(url && !url.username && !url.password && trustedBase
    && (url.hostname === trustedBase || url.hostname.endsWith(`.${trustedBase}`)))
  const roots = suppliedRoots.filter(value => trusted(HTTP(value)))
  const queue = [...new Set(roots)]
  const seen = new Set()
  const boards = new Map()
  const candidateBoards = new Map()
  const checks = []
  const addBoard = (url, officialURL, evidenceURL, method, status, verified = true) => {
    const target = HTTP(url)
    if (!target || target.protocol !== 'https:' || target.username || target.password) return
    const board = identifyPublicAtsBoard(url)
    if (!board) return
    const key = `${board.atsPlatform}:${board.boardToken}`
    ;(verified ? boards : candidateBoards).set(key, { ...board, bindingEvidence: {
      verified, checkedAt: new Date().toISOString(), officialURL, evidenceURL,
      httpStatus: status, matchedLinks: [url], bindingMethod: method,
    } })
  }
  while (queue.length && seen.size < 4) {
    const requestedURL = queue.shift()
    if (seen.has(requestedURL)) continue
    seen.add(requestedURL)
    try {
      const response = await fetchPage(requestedURL)
      const finalURL = typeof response.url === 'string' ? response.url : null
      checks.push({ requestedURL, finalURL, httpStatus: response.status, checkedAt: new Date().toISOString() })
      const pageURL = HTTP(finalURL)
      if (!pageURL) continue
      // A successful redirect from the official company site binds the ATS.
      if (response.status >= 200 && response.status < 300 && identifyPublicAtsBoard(finalURL)) {
        addBoard(finalURL, requestedURL, finalURL, 'official-redirect', response.status)
        continue
      }
      if (response.status < 200 || response.status >= 300) continue
      if (!trusted(pageURL) || ATS_HOST.test(pageURL.hostname)) continue
      if (typeof response.html !== 'string' || Buffer.byteLength(response.html, 'utf8') > 3000000) continue
      const html = decode(response.html)
      const documentOptions = { excludeObjectFallback: true }
      const document = readNativeDocument(html, documentOptions)
      const careersPage = CAREERS.test(pageURL.pathname + ' ' + pageURL.hostname)
        || [provider.companyCareerPage, provider.officialCareersPageUrl].includes(requestedURL)
      const resolve = value => { try { return HTTP(new URL(value, pageURL).href) } catch { return null } }
      for (const anchor of document.nodes(node => node.tag === 'a' && node.attrs.href)) {
        const target = resolve(anchor.attrs.href)
        if (!target) continue
        const hiringLink = CAREERS.test(document.text(anchor) + ' ' + target.pathname)
        if (hiringLink) addBoard(target.href, finalURL, finalURL, 'official-careers-link', response.status)
        if (hiringLink && trusted(target) && !seen.has(target.href) && !queue.includes(target.href)) queue.push(target.href)
      }
      if (careersPage) {
        for (const value of activeIframeSources(html, documentOptions)) {
          const target = resolve(value)
          if (target) addBoard(target.href, finalURL, finalURL, 'official-careers-active-iframe', response.status)
        }
        const collectCandidates = (body, evidenceURL, status) => {
          for (const value of decode(body).match(/https?:\/\/[^\s<>"'\\`]+/g) || []) {
            addBoard(value, finalURL, evidenceURL, 'unverified-script-candidate', status, false)
          }
        }
        for (const body of activeScripts(html, documentOptions)) collectCandidates(body, finalURL, response.status)
        const scripts = document.nodes(node => node.tag === 'script' && node.attrs.src)
          .map(node => resolve(node.attrs.src))
          .filter(url => trusted(url) && !/analytics|tracking|pixel|gtag/i.test(url.pathname))
          .sort((a, b) => Number(/career|job|greenhouse|ashby|lever/i.test(b.pathname)) - Number(/career|job|greenhouse|ashby|lever/i.test(a.pathname)))
        // Bounded source inspection, never executing third-party page code.
        if (boards.size === 0) for (const url of scripts.slice(0, 2)) {
          try {
            const script = await fetchPage(url.href)
            checks.push({ requestedURL: url.href, finalURL: script.url || null, httpStatus: script.status, checkedAt: new Date().toISOString() })
            if (script.status !== 200 || !trusted(HTTP(script.url)) || typeof script.html !== 'string'
              || Buffer.byteLength(script.html, 'utf8') > 3000000) continue
            collectCandidates(script.html, script.url, script.status)
          } catch { /* Retain the page check without inventing a board. */ }
        }
      }
      if (boards.size) break
    } catch (error) {
      checks.push({ requestedURL, httpStatus: null, checkedAt: new Date().toISOString(), failureKind: error?.name === 'TimeoutError' ? 'timeout' : 'network_or_response_error' })
    }
  }
  return { boards: [...boards.values()], candidateBoards: [...candidateBoards].filter(([key]) => !boards.has(key)).map(([, board]) => board),
    checks, reason: boards.size ? null : roots.length ? 'no-verified-supported-ats-binding' : 'missing-official-company-surface' }
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
