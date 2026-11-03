import { createHash } from 'node:crypto'
import { readNativeDocument, activeIframeSources, extractActiveDescription, decodeNativeEntities } from './activeNativeHtml.js'
import { normalizeNativeAttributeBoundaries } from './nativeHtmlAttributes.js'
import { identifyPublicAtsBoard } from './publicAtsIdentity.js'
import { createPublishingGapAtsScraper } from './publishingGapAts.js'
import { attachInventoryEvidence, readInventoryEvidence } from './inventoryEvidence.js'
import { nativeCountryName } from '../shared/nativeJobPosting.js'
import { getValidIndiaCityForJob } from '../../src/utils/publicJobLocationScope.js'
import { readOracleRecruitment } from './recruitmentOracle.js'
import { recruitmentMicrodataPostings } from './recruitmentMicrodata.js'
import { readKekaRecruitment, readDeclaredKekaWebflowFeed } from './recruitmentKeka.js'

export const RECRUITMENT_OBSERVATIONS = Symbol.for('jobverify.verified-recruitment-observations')
const sha = value => createHash('sha256').update(value).digest('hex')
const text = value => typeof value === 'string' ? value.trim() : ''
const companyKey = value => text(value).normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
const career = /careers?|jobs?|vacanc|openings?|open[-_ /]?(?:roles?|positions?)|join[-_ /]?(?:us|the[-_ ]?team)|opportunit/i
const recruitmentNavigation = /recruit|recrut|karrier|stellen|carri[eè]r|empleo|trabaj|trabalh|lavora|採用|求人|채용|招聘|招募|職位|加入我们/i
const asset = /\.(?:avif|webp|png|jpe?g|gif|svg|ico|css|m?js|woff2?|ttf|otf|mp[34]|webm|pdf|zip)$/i
const vendor = /(?:^|\.)(?:myworkdayjobs\.com|myworkdaysite\.com|greenhouse\.io|ashbyhq\.com|lever\.co|smartrecruiters\.com|workable\.com|breezy\.hr|recruitee\.com|teamtailor\.com|bamboohr\.com|applytojob\.com|jobvite\.com|icims\.com|successfactors\.com|successfactors\.eu|jobs2web\.com|oraclecloud\.com|comeet\.com|keka\.com|darwinbox\.in)$/i
const fail = message => { throw new Error(message) }
const requireValue = (value, message) => { if (!value) fail(message) }
const https = value => {
  let url
  try { url = new URL(value) } catch { return null }
  return url.protocol === 'https:' && !url.username && !url.password && !url.port
    && !/^localhost$|\.localhost$|\.local$|^\[|^\d+(?:\.\d+){3}$/i.test(url.hostname) ? url : null
}
const pathKey = url => url.pathname.replace(/\/+$/, '') || '/'
const samePage = (a, b) => a.origin === b.origin && pathKey(a) === pathKey(b) && a.search === b.search
const country = value => {
  if (Array.isArray(value)) return value.length === 1 ? country(value[0]) : null
  const labels = typeof value === 'object' ? [value?.name, value?.descriptor, value?.alpha2Code] : [value]
  const countries = [...new Set(labels.map(label => nativeCountryName(label)
    || (typeof label === 'string' && /^(?:United States of America|USA)$/i.test(label.trim()) ? 'United States' : null)
    || (typeof label === 'string' && /^IND$/i.test(label.trim()) ? 'India' : null)).filter(Boolean))]
  requireValue(countries.length <= 1, 'Contradictory native country labels')
  return countries[0] || null
}
const asArray = value => value == null ? [] : Array.isArray(value) ? value : [value]
const legalName = value => text(value).replace(/^\d{1,8}\s+/, '').replace(/^the\s+/i, '')
  .replace(/(?:[\s,.]+(?:private\s+limited|pvt\.?\s+ltd\.?|p\.?\s?ltd\.?|incorporated|corporation|limited|company|ltd\.?|inc\.?|corp\.?|llc|llp|plc|gmbh|s\.?a\.?s\.?|s\.?a\.?|a\.?g\.?|s\.?e\.?))+\s*$/i, '').trim()

export function recruitmentEmployerMatches(config, value) {
  if (typeof value !== 'string' || !value.trim()) return false
  const expected = [config.companyName, ...(config.nativeEmployerNames || [])].filter(Boolean)
  if (expected.some(name => companyKey(name) === companyKey(value))) return true
  if (config.requireNativeEmployerName) return false
  const native = companyKey(legalName(value).replace(/\s+India$/i, ''))
  if (native.length < 3) return false
  if (expected.some(name => companyKey(legalName(name).replace(/\s+India$/i, '')) === native)) return true
  const domain = text(config.companyDomain).replace(/^www\./, '').toLowerCase()
  return Boolean(domain && value.trim().toLowerCase() === domain)
}

export function recruitmentJobPostings(document) {
  const postings = []
  const visit = (item, depth = 0) => {
    if (!item || depth > 12) return
    if (Array.isArray(item)) { for (const row of item.slice(0, 2000)) visit(row, depth + 1); return }
    if (typeof item !== 'object') return
    if (asArray(item['@type']).some(type => type === 'JobPosting' || type === 'https://schema.org/JobPosting')) postings.push(item)
    for (const field of ['@graph', 'itemListElement', 'item', 'mainEntity']) visit(item[field], depth + 1)
  }
  for (const node of document.nodes(node => node.tag === 'script' && !node.attrs.src && node.attrs.type === 'application/ld+json')) {
    try { visit(JSON.parse(node.raw || '')) } catch { /* Invalid schema is not evidence of an empty inventory. */ }
  }
  return postings
}

export function recruitmentBoard(value) {
  const url = https(value)
  if (!url) return null
  const publicBoard = identifyPublicAtsBoard(url.href)
  if (publicBoard) return { kind: publicBoard.atsPlatform, token: publicBoard.boardToken,
    region: publicBoard.region || 'global', url: url.href }
  const parts = url.pathname.split('/').filter(Boolean)
  const workday = url.hostname.match(/^([a-z\d-]+)\.wd\d+\.myworkdayjobs\.com$/i)
  if (workday) {
    if (/^[a-z]{2}-[a-z]{2}$/i.test(parts[0] || '')) parts.shift()
    if (parts[0] && /^[a-z\d_-]{1,120}$/i.test(parts[0])) return {
      kind: 'workday', tenant: workday[1], site: parts[0], origin: url.origin,
      url: `${url.origin}/${encodeURIComponent(parts[0])}`,
    }
  }
  if (/^wd\d+\.myworkdaysite\.com$/i.test(url.hostname)) {
    if (/^[a-z]{2}-[a-z]{2}$/i.test(parts[0] || '')) parts.shift()
    if (parts[0]?.toLowerCase() === 'recruiting' && /^[a-z\d_-]{1,120}$/i.test(parts[1] || '')
      && /^[a-z\d_-]{1,120}$/i.test(parts[2] || '')) {
      return { kind: 'workday', tenant: parts[1], site: parts[2], origin: url.origin,
        url: `${url.origin}/recruiting/${parts[1]}/${parts[2]}` }
    }
  }
  if (['careers.smartrecruiters.com', 'jobs.smartrecruiters.com'].includes(url.hostname)
    && /^[a-z\d_.-]{1,120}$/i.test(parts[0] || '')) return { kind: 'smartrecruiters', token: parts[0], url: url.href }
  if (url.hostname === 'apply.workable.com' && /^[a-z\d_-]{1,120}$/i.test(parts[0] || '')
    && !['api', 'j'].includes(parts[0].toLowerCase())) {
    return { kind: 'workable', token: parts[0], url: `${url.origin}/${parts[0]}/` }
  }
  if (/^[a-z\d-]+\.fa\.[a-z\d-]+\.oraclecloud\.com$/i.test(url.hostname)) {
    const match = url.pathname.match(/^\/hcmUI\/CandidateExperience\/([a-z-]{2,12})\/sites\/([a-z\d_-]{1,120})(?:\/|$)/i)
    if (match) return { kind: 'oracle', siteAlias: match[2], url: `${url.origin}/hcmUI/CandidateExperience/${match[1]}/sites/${match[2]}` }
  }
  if (/^[a-z\d-]+\.keka\.com$/i.test(url.hostname)) {
    const embedded = url.pathname.match(/^\/careers\/api\/embedjobs\/(js\/)?([a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12})\/?$/i)
    if (embedded && !url.search) return { kind: 'keka', url: url.href, identifier: embedded[2], mode: embedded[1] ? 'script' : 'iframe' }
    if (/^\/careers\/?$/.test(url.pathname) && !url.search) return { kind: 'keka', url: url.href, mode: 'portal' }
  }
  return null
}

export function recruitmentIndiaFacet(payload, { allowPublishedCountryFacets = false } = {}) {
  const matches = new Map()
  const visit = (node, depth = 0) => {
    if (!node || depth > 8 || typeof node !== 'object') return
    const parameter = text(node.facetParameter)
    const isCountryFacet = parameter === 'locationCountry' || allowPublishedCountryFacets
      && (/^(?:country|country_and_jurisdiction)$/i.test(parameter)
        || /^(?:location country|country|country and jurisdiction)$/i.test(text(node.descriptor)))
    if (isCountryFacet && /^[a-z\d_-]{1,128}$/i.test(parameter) && Array.isArray(node.values)) {
      for (const value of node.values) if (value?.descriptor === 'India') {
        requireValue(typeof value.id === 'string' && /^[a-z\d_-]{1,128}$/i.test(value.id)
          && Number.isSafeInteger(value.count) && value.count >= 0, 'Invalid native India country facet')
        const key = parameter + ':' + value.id
        if (matches.has(key)) requireValue(matches.get(key).count === value.count, 'Contradictory native India country facet')
        matches.set(key, { id: value.id, descriptor: value.descriptor, count: value.count, facetParameter: parameter })
      }
    }
    for (const child of asArray(node.values).slice(0, 2000)) if (child?.facetParameter) visit(child, depth + 1)
  }
  for (const facet of asArray(payload?.facets).slice(0, 100)) visit(facet)
  requireValue(matches.size <= 1, 'Ambiguous native India country facet')
  return [...matches.values()][0] || null
}

const closed = (value, now) => {
  if (!text(value)) return false
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value < now.slice(0, 10)
  const time = Date.parse(value)
  return Number.isFinite(time) && time < Date.parse(now)
}
const sourceDescription = value => {
  const description = extractActiveDescription(value)
  return description && description.length >= 100 ? value : null
}

function project(config, native, observedAt) {
  const location = native.location || 'India'
  const city = getValidIndiaCityForJob({ country: 'India', location, city: native.city || null })
  return {
    source: config.source, company: config.companyName, jobId: String(native.id), title: native.title,
    location, country: 'India', city, applyUrl: native.url, sourceUrl: native.url, link: native.url,
    sourceDescription: native.description, jobDescription: native.description,
    postingDate: native.posted || null, postedAt: native.posted || null,
    closingDate: native.closing || null, employmentType: native.employmentType || null,
    nativeHiringOrganization: native.employer || null, nativeSourceRecord: native.record,
    ...(native.employerBinding ? { nativeEmployerBinding: native.employerBinding } : {}),
    nativePostingDate: native.posted || null, scrapedAt: observedAt,
    sourceDetailComplete: true, sourceScopeComplete: false, sourceListingComplete: false,
    lifecycleCleanupAllowed: false, applicationVisited: false,
  }
}

export function createVerifiedRecruitmentScraper(config) {
  return { async run(options = {}) {
    const root = https(config.companyCareerPage)
    const homepage = https(config.officialHomepageUrl || (config.companyDomain ? `https://${config.companyDomain}/` : ''))
    requireValue(text(config.source) && text(config.companyName) && (root || homepage), 'A registered source and official HTTPS surface are required')
    const maxRequests = options.maxRequests ?? 48, maxPages = options.maxPages ?? 8, maxDetails = options.maxDetails ?? 20
    const sourceTimeoutMs = options.sourceTimeoutMs ?? 90000
    for (const [name, value, maximum] of [['maxRequests', maxRequests, 128], ['maxPages', maxPages, 24], ['maxDetails', maxDetails, 80], ['sourceTimeoutMs', sourceTimeoutMs, 180000]]) {
      requireValue(Number.isSafeInteger(value) && value > 0 && value <= maximum, 'Invalid recruitment limit: ' + name)
    }
    options.signal?.throwIfAborted()
    const signal = AbortSignal.any([...(options.signal ? [options.signal] : []), AbortSignal.timeout(sourceTimeoutMs)])
    const now = options.now ? options.now() : new Date().toISOString()
    requireValue(Number.isFinite(Date.parse(now)), 'Invalid observation time')
    const hosts = [...new Set([root, homepage].filter(url => url && !vendor.test(url.hostname)).map(url => url.hostname.replace(/^www\./, '')))]
    const official = url => hosts.some(host => url.hostname === host || url.hostname.endsWith('.' + host))
    const grants = [], receipts = [], failures = [], jobs = [], seenJobs = new Set(), boards = new Map(), queue = []
    const identifiedCompanyHosts = new Set()
    const declaredCompanyRolePages = new Set()
    const observed = { source: config.source, observedAt: now, requestCount: 0, nativeRecords: 0, returnedIndiaJobs: 0,
      unresolved: [], exclusions: [], nativeInventoryReads: [], sourceScopeComplete: false, lifecycleCleanupAllowed: false, receipts, failures }
    const matchingEmployer = name => recruitmentEmployerMatches(config, name)
    const matchingPublisher = name => [config.companyName, ...(config.publisherNames || [])].some(value => {
      const key = companyKey(legalName(value))
      return key.length >= 3 && companyKey(name).includes(key)
    })
    const matchingRedirectPublisher = name => {
      const expected = [config.companyName, ...(config.publisherNames || [])].map(value => companyKey(legalName(value))).filter(value => value.length >= 3)
      return text(name).split(/\s*\|\s*|\s+[-–—]\s+/).some(part => {
        const key = companyKey(legalName(part.replace(/^(?:home|careers? at|jobs? at|welcome to)\s*:?\s+/i, '').replace(/\s+(?:careers?|jobs?)$/i, '')))
        return expected.includes(key)
      })
    }
    let aggregateBytes = 0
    const cache = new Map()
    const permit = (value, methods = ['GET']) => {
      const url = https(value); requireValue(url, 'Invalid delegated recruitment URL')
      const prefix = pathKey(url)
      grants.push({ origin: url.origin, prefix, methods })
      return url
    }
    const allowed = (url, method = 'GET') => official(url) && method === 'GET'
      || grants.some(grant => url.origin === grant.origin && (grant.prefix === '/' && (config.prioritizeRecruitmentSearch || vendor.test(url.hostname))
        || pathKey(url) === grant.prefix || url.pathname.startsWith(grant.prefix + '/')) && grant.methods.includes(method))
    const read = async (value, init = {}, format = 'page') => {
      signal.throwIfAborted()
      const url = https(value), method = init.method || 'GET'
      requireValue(url && allowed(url, method), 'Unbound recruitment request refused')
      const key = method + ':' + url.href + ':' + (init.body || '')
      if (method === 'GET' && cache.has(key)) return cache.get(key)
      const task = (async () => {
        requireValue(++observed.requestCount <= maxRequests, 'Recruitment request budget reached')
        let response
        if (format !== 'json' && options.fetchPage) {
          const page = await options.fetchPage(url.href, { signal })
          response = { ...page, contentType: page.contentType || 'text/html', body: page.html }
        } else if (format === 'json' && options.fetchJson) {
          const payload = await options.fetchJson(url.href, { ...init, signal })
          response = { status: 200, url: url.href, contentType: 'application/json', body: JSON.stringify(payload) }
        } else {
          const timeout = AbortSignal.any([signal, AbortSignal.timeout(15000)])
          const raw = await (options.fetchImpl || globalThis.fetch)(url.href, { ...init, method,
            redirect: format === 'json' ? 'error' : 'follow', credentials: 'omit', signal: timeout,
            headers: { Accept: format === 'json' ? 'application/json' : 'text/html', 'User-Agent': 'Mozilla/5.0 (compatible; Jobverify careers inventory check)', ...init.headers } })
          requireValue(Number(raw.headers.get('content-length')) <= 4e6, 'Recruitment response body exceeds its limit')
          const reader = raw.body?.getReader(), chunks = []; let bytes = 0
          requireValue(reader, 'Missing recruitment response body')
          try {
            for (;;) { const item = await reader.read(); signal.throwIfAborted(); if (item.done) break
              bytes += item.value.byteLength; requireValue(bytes <= 4e6, 'Recruitment response body exceeds its limit'); chunks.push(Buffer.from(item.value)) }
          } finally { await reader.cancel().catch(() => {}); reader.releaseLock() }
          response = { status: raw.status, url: raw.url, contentType: raw.headers.get('content-type') || '', body: Buffer.concat(chunks).toString('utf8') }
        }
        signal.throwIfAborted()
        const final = https(response.url)
        const body = response.body
        requireValue(typeof body === 'string' && Buffer.byteLength(body) <= 4e6, 'Missing or oversized recruitment body')
        if (final && !allowed(final, method) && config.allowVerifiedCorporateRedirects && format === 'page' && method === 'GET'
          && official(url) && ([root, homepage].some(entry => entry && samePage(entry, url))
            || declaredCompanyRolePages.has(url.href) && career.test(url.pathname))
          && response.status === 200 && /(?:text\/html|application\/xhtml\+xml)/i.test(response.contentType)) {
          const board = recruitmentBoard(final.href)
          let publisher
          if (!board) {
            const document = readNativeDocument(normalizeNativeAttributeBoundaries(body))
            publisher = document.nodes(node => ['title', 'h1'].includes(node.tag)).map(node => node.tag === 'title'
              ? decodeNativeEntities(node.raw || '') : document.text(node)).find(matchingRedirectPublisher)
          }
          if (board || publisher) {
            permit(final.href)
            if (board) bind(final.href, url.href, true)
            else hosts.push(final.hostname.replace(/^www\./, ''))
            observed.verifiedCorporateRedirects ||= []
            observed.verifiedCorporateRedirects.push({ requestedURL: url.href, finalURL: final.href,
              method: board ? 'registered-corporate-surface-native-account-redirect' : 'current-same-publisher-corporate-redirect',
              ...(publisher ? { publisher } : {}) })
          }
        }
        requireValue(final && allowed(final, method), 'Recruitment redirect changed authority')
        requireValue(format !== 'json' || final.href === url.href, 'Native API changed response identity')
        aggregateBytes += Buffer.byteLength(body); requireValue(aggregateBytes <= 24e6, 'Recruitment aggregate byte budget reached')
        receipts.push({ requestedURL: url.href, finalURL: final.href, status: response.status, format,
          bodyBytes: Buffer.byteLength(body), bodySHA256: sha(body) })
        requireValue(response.status === 200, 'Recruitment HTTP ' + response.status)
        requireValue(format === 'json' ? /(?:application|text)\/(?:[a-z.+-]*\+)?json\b/i.test(response.contentType)
          : format === 'renderer' ? /(?:text\/(?:html|js)\b|application\/xhtml\+xml|(?:application|text)\/(?:java|ecma)script)/i.test(response.contentType)
            : /(?:text\/html|application\/xhtml\+xml)/i.test(response.contentType), 'Unexpected recruitment response type')
        return format === 'json' ? JSON.parse(body) : { url: final.href, status: 200, html: body }
      })()
      if (method === 'GET') cache.set(key, task)
      return task
    }
    const readJson = (url, init) => read(url, init, 'json')
    const problem = (stage, error) => { signal.throwIfAborted(); failures.push({ stage, message: String(error.message || error).slice(0, 400) }) }
    const addJob = native => {
      if (!matchingEmployer(native.employer?.name) && !(native.employerBinding && !config.requireNativeEmployerName)) { observed.unresolved.push('native-employer-mismatch'); return }
      if (!sourceDescription(native.description)) { observed.unresolved.push('native-full-description-unavailable'); return }
      if (closed(native.closing, now)) return
      const url = https(native.url)
      if (!url || !allowed(url)) { observed.unresolved.push('native-role-url-unbound'); return }
      const identity = String(native.id) + ':' + url.href
      if (seenJobs.has(identity)) return
      seenJobs.add(identity); jobs.push(project(config, native, now))
    }
    const bind = (value, officialURL, declaredExternal = false) => {
      const url = https(value); if (!url) return
      const board = recruitmentBoard(url.href)
      const key = board ? board.kind + ':' + (board.token || board.url) : url.origin + ':' + pathKey(url)
      if (board && !boards.has(key)) boards.set(key, { ...board, bindingEvidence: {
        verified: true, checkedAt: now, officialURL, matchedLinks: [url.href], bindingMethod: 'runtime-current-careers-link',
      } })
      if (board?.kind === 'oracle' && /\/sites\/[^/]+\/jobs?\/[^/]+/i.test(url.pathname)) { permit(url); queue.push(url.href) }
      if (!board && (vendor.test(url.hostname) || config.allowDeclaredExternalCareersPages && declaredExternal)) { permit(url); queue.push(url.href) }
    }
    if (config.requireCorporateIdentityMatch && homepage && !vendor.test(homepage.hostname)) queue.push(homepage.href)
    if (root && !vendor.test(root.hostname)) queue.push(root.href)
    if (homepage && homepage.href !== root?.href && !vendor.test(homepage.hostname)) queue.push(homepage.href)
    const seenPages = new Set(), schemaSeen = new Set()
    while (queue.length && seenPages.size < maxPages && observed.requestCount < maxRequests) {
      const value = queue.shift(); if (seenPages.has(value)) continue; seenPages.add(value)
      let page, doc
      try { page = await read(value); doc = readNativeDocument(normalizeNativeAttributeBoundaries(page.html)) }
      catch (error) { problem('official-page', error); continue }
      const pageURL = new URL(page.url)
      const corporatePage = official(pageURL)
      const delegatedPublisherPage = !corporatePage && config.prioritizeRecruitmentSearch && config.allowDeclaredExternalCareersPages && allowed(pageURL)
      let companyIdentified = !config.requireCorporateIdentityMatch || identifiedCompanyHosts.has(pageURL.hostname.replace(/^www\./, ''))
      if ((corporatePage || delegatedPublisherPage) && !companyIdentified) {
        const publisherNames = doc.nodes(node => ['title', 'h1'].includes(node.tag)).map(node => node.tag === 'title'
          ? decodeNativeEntities(node.raw || '') : doc.text(node))
        publisherNames.push(...doc.nodes(node => node.tag === 'meta' && node.attrs.property === 'og:site_name').map(node => node.attrs.content || ''))
        const expected = [config.companyName, ...(config.publisherNames || [])].map(companyKey).filter(value => value.length >= 2)
        companyIdentified = publisherNames.some(name => expected.some(value => companyKey(name).includes(value)) || matchingPublisher(name))
        if (companyIdentified) {
          identifiedCompanyHosts.add(pageURL.hostname.replace(/^www\./, ''))
          observed.corporateIdentityEvidence ||= []
          observed.corporateIdentityEvidence.push({ url: page.url, publisherNames })
        }
      }
      const canDelegate = companyIdentified && (corporatePage || delegatedPublisherPage)
      if (corporatePage && !companyIdentified) observed.unresolved.push('current-corporate-publisher-identity-unqualified')
      if (canDelegate && config.nativeJsonFeed && career.test(pageURL.pathname)) {
        try { await readDeclaredKekaWebflowFeed(config, doc, page, { permit, readJson, matchingEmployer, addJob,
          inventoryRead: value => observed.nativeInventoryReads.push(value), recordRead: () => observed.nativeRecords++,
          unresolved: value => observed.unresolved.push(value) }) }
        catch (error) { problem('native-first-party-json-feed', error) }
      }
      const microdata = new Set(recruitmentMicrodataPostings(doc, page.url))
      const schemas = [...recruitmentJobPostings(doc), ...microdata]
      for (const posting of schemas) {
        if (corporatePage && !companyIdentified && !declaredCompanyRolePages.has(value) && !declaredCompanyRolePages.has(page.url)) continue
        const nativeURL = https(posting.url || posting['@id'] || page.url)
        if (!nativeURL || !allowed(nativeURL)) continue
        if (!samePage(nativeURL, pageURL)) {
          if (companyIdentified || !corporatePage) {
            if (corporatePage && official(nativeURL)) declaredCompanyRolePages.add(nativeURL.href)
            queue.unshift(nativeURL.href)
          }
          continue
        }
        const identity = nativeURL.href + ':' + (posting.identifier?.value || posting.title)
        if (schemaSeen.has(identity)) continue; schemaSeen.add(identity); observed.nativeRecords++
        if (microdata.has(posting) && posting.nativeMicrodataIssues.length) {
          observed.unresolved.push(...posting.nativeMicrodataIssues); continue
        }
        const title = text(posting.title), primaryHeadings = doc.nodes(node => node.tag === 'h1')
        const headings = (primaryHeadings.length ? primaryHeadings : schemas.length === 1
          ? doc.nodes(node => ['h2', 'h3'].includes(node.tag) || node.attrs.role === 'heading'
            || node.attrs.itemprop === 'title' || /(?:^|\s)(?:job[-_]?title|position[-_]?title)(?:\s|$)/i.test(node.attrs.class || '')) : []).map(node => doc.text(node))
        const description = sourceDescription(posting.description)
        const visibleText = doc.nodes(node => node.tag === 'root').map(node => doc.text(node)).join(' ')
        const visibleTitle = headings.some(value => companyKey(value) === companyKey(title))
          || microdata.has(posting) && posting.nativeVisibleTitleConfirmed
        if (!title || !visibleTitle || !description
          || !companyKey(visibleText).includes(companyKey(extractActiveDescription(description).slice(0, 160)))) {
          observed.unresolved.push('native-visible-role-content-mismatch'); continue
        }
        if (/\b(?:this (?:job|position|requisition) is no longer (?:available|active)|(?:this )?position (?:has been|is) filled)\b/i.test(visibleText)) continue
        const locations = asArray(posting.jobLocation).map(location => location?.address).filter(Boolean)
        const remote = posting.jobLocationType === 'TELECOMMUTE' ? asArray(posting.applicantLocationRequirements).map(item => ({ addressCountry: item.name })) : []
        const india = [...locations, ...remote].filter(address => country(address.addressCountry) === 'India')
        if (!india.length) { if (![...locations, ...remote].length || ![...locations, ...remote].every(address => country(address.addressCountry))) observed.unresolved.push('native-location-scope-unresolved'); continue }
        const address = india[0]
        addJob({ id: posting.identifier?.value || posting['@id'] || nativeURL.href, title, url: nativeURL.href,
          description, employer: posting.hiringOrganization, location: [address.addressLocality, address.addressRegion, 'India'].filter(Boolean).join(', '),
          posted: posting.datePosted, closing: posting.validThrough, employmentType: posting.employmentType, record: posting })
      }
      const next = []
      const links = doc.nodes(node => node.tag === 'a' && node.attrs.href).map(node => ({ href: node.attrs.href, label: doc.text(node) }))
      links.push(...activeIframeSources(page.html).map(href => ({ href, label: 'careers embedded board' })))
      links.push(...doc.nodes(node => node.tag === 'script' && node.attrs.src && !Object.hasOwn(node.attrs, 'nomodule')
        && /^(?:|module|(?:text|application)\/javascript)$/i.test(node.attrs.type || '')).map(node => ({ href: node.attrs.src, label: /\/embed/.test(node.attrs.src) ? 'careers embed' : '' })))
      for (const link of links) {
        let target; try { target = https(new URL(link.href, pageURL).href) } catch { continue }
        if (!target) continue
        const context = link.label + ' ' + target.pathname + (config.allowDeclaredExternalCareersPages ? ' ' + target.hostname : '')
        const languageView = config.discoverRecruitmentLinks && corporatePage && !companyIdentified && official(target) && /^(?:English|EN(?:-[A-Z]{2})?)$/i.test(link.label.trim())
        const nativeRole = !corporatePage && allowed(target) && /^\/(?:p\/[^/]+|jobs\/\d+|job\/[^/]+)/i.test(target.pathname)
        if (!career.test(context) && !(config.discoverRecruitmentLinks && recruitmentNavigation.test(context)) && !languageView && !vendor.test(target.hostname) && !nativeRole) continue
        if (/\/(?:login|sign-in|signin|cookie-policy|privacy-policy|my-profile)(?:\/|$)/i.test(target.pathname)
          && !/\/(?:jobs?|requisitions?)\/[^/]+/i.test(target.pathname) && !recruitmentBoard(target.href)) continue
        target.hash = ''
        if (allowed(target) && !asset.test(target.pathname) && !seenPages.has(target.href)) {
          if (corporatePage && companyIdentified && official(target)) declaredCompanyRolePages.add(target.href)
          next.push(target.href)
        }
        else if (canDelegate && (vendor.test(target.hostname)
          || config.allowDeclaredExternalCareersPages && !asset.test(target.pathname))) bind(target.href, page.url, true)
      }
      for (const form of config.prioritizeRecruitmentSearch ? doc.nodes(node => node.tag === 'form' && (!node.attrs.method || /^get$/i.test(node.attrs.method))) : []) {
        let action; try { action = https(new URL(form.attrs.action || pageURL.href, pageURL).href) } catch { continue }
        if (!action || !allowed(action) || !career.test(pageURL.pathname + ' ' + (form.attrs.id || '') + ' ' + (form.attrs.class || ''))) continue
        const descendants = node => [node, ...node.children.filter(child => typeof child !== 'string').flatMap(descendants)]
        const inputs = descendants(form).filter(node => node.tag === 'input' && node.attrs.name)
        const fields = inputs.filter(node => /^(?:q|keyword|keywords|searchText|locationsearch)$/i.test(node.attrs.name))
        if (!fields.length) continue
        if (!fields.some(node => /^locationsearch$/i.test(node.attrs.name)) && !/job|career|vacanc/i.test(action.pathname + ' ' + (form.attrs.id || '') + ' ' + (form.attrs.class || ''))) continue
        for (const input of inputs.filter(node => node.attrs.type === 'hidden' && !/token|auth|csrf|session/i.test(node.attrs.name))) {
          action.searchParams.set(input.attrs.name, input.attrs.value || '')
        }
        const field = fields.find(node => /^locationsearch$/i.test(node.attrs.name)) || fields[0]
        action.searchParams.set(field.attrs.name, 'India'); next.unshift(action.href)
      }
      const priority = value => {
        const url = new URL(value)
        return (/\bindia\b/i.test(url.pathname + url.search) ? -200 : 0)
          + (/\/(?:search|jobs|requisitions)(?:\/|$)/i.test(url.pathname) ? -80 : 0)
          + (/\/job\/[^/]+/i.test(url.pathname) ? -120 : 0)
          + (value === root?.href ? -50 : 0)
          + (/culture|benefits|life-at|faq|privacy|\/images?\//i.test(value) ? 100 : 0)
          + url.pathname.split('/').filter(Boolean).length
      }
      if (config.prioritizeRecruitmentSearch) next.sort((a, b) => priority(a) - priority(b))
      else next.sort((a, b) => Number(/culture|benefits|life-at|\/images?\//i.test(a)) - Number(/culture|benefits|life-at|\/images?\//i.test(b))
        || Number(Boolean(new URL(a).search)) - Number(Boolean(new URL(b).search)))
      queue.unshift(...[...new Set(next)])
      if (boards.size && seenPages.size >= 2) break
    }

    for (const board of boards.values()) {
      signal.throwIfAborted()
      if (observed.requestCount >= maxRequests) break
      try {
        if (['ashby', 'greenhouse', 'lever'].includes(board.kind)) {
          if (board.kind === 'greenhouse' && new URL(board.url).hostname.includes('.eu.')) throw Error('European Greenhouse requires its regional extractor')
          const token = encodeURIComponent(board.token)
          const api = board.kind === 'ashby' ? `https://api.ashbyhq.com/posting-api/job-board/${token}`
            : board.kind === 'greenhouse' ? `https://boards-api.greenhouse.io/v1/boards/${token}`
              : `https://api.${board.region === 'eu' ? 'eu.' : ''}lever.co/v0/postings/${token}`
          permit(api); permit(board.url)
          const native = await createPublishingGapAtsScraper({ source: config.source, companyName: config.companyName,
            companyCareerPage: root?.href || homepage.href, atsPlatform: board.kind, boardToken: board.token,
            leverRegion: board.region, sourceScopeComplete: false }).run({ signal, fetchJson: async (url, init) => {
            const payload = await readJson(url, init)
            if (board.kind === 'greenhouse') requireValue(payload?.jobs?.every(row => matchingEmployer(row.company_name)), 'Native employer does not match the configured source')
            if (config.requireNativeEmployerName && board.kind !== 'greenhouse') {
              const records = Array.isArray(payload) ? payload : payload.jobs
              requireValue(Array.isArray(records) && records.every(row => matchingEmployer(row.hiringOrganization?.name)), 'Native exact employer scope remains unqualified for this brand')
            }
            observed.nativeRecords += (Array.isArray(payload) ? payload : payload.jobs || []).length
            return payload
          } })
          const nativeEvidence = readInventoryEvidence(native)
          observed.nativeInventoryReads.push({ kind: board.kind, surface: board.url, reportedTotal: nativeEvidence?.reportedTotal ?? null })
          if (/native-location|inner-source-listing|selected-role-description/.test(nativeEvidence?.reason || '')) {
            observed.unresolved.push(nativeEvidence.reason)
          }
          for (const job of native) {
            if (!sourceDescription(job.sourceDescription || job.jobDescription)) {
              observed.unresolved.push('native-full-description-unavailable'); continue
            }
            const key = String(job.jobId || job.id || job.applyUrl) + ':' + job.applyUrl
            if (!seenJobs.has(key)) { seenJobs.add(key); jobs.push({ ...job, officialAtsBinding: board.bindingEvidence,
              sourceScopeComplete: false, sourceListingComplete: false, lifecycleCleanupAllowed: false }) }
          }
        } else if (board.kind === 'smartrecruiters') {
          const prefix = `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(board.token)}/postings`
          permit(prefix); permit(`https://jobs.smartrecruiters.com/${encodeURIComponent(board.token)}`)
          let offset = 0, total = null; const ids = new Set()
          for (let index = 0; index < maxPages && observed.requestCount < maxRequests; index++) {
            const payload = await readJson(prefix + `?offset=${offset}&limit=100`)
            requireValue(Array.isArray(payload.content) && Number.isSafeInteger(payload.totalFound) && payload.totalFound >= 0, 'Invalid SmartRecruiters inventory')
            if (total === null) total = payload.totalFound
            requireValue(total === payload.totalFound, 'SmartRecruiters inventory changed during pagination')
            observed.nativeInventoryReads.push({ kind: board.kind, surface: board.url, reportedTotal: total })
            for (const row of payload.content) {
              requireValue(text(row.id) && !ids.has(row.id), 'Invalid or duplicate SmartRecruiters identity'); ids.add(row.id); observed.nativeRecords++
              if (country(row.location?.country) !== 'India' || observed.requestCount >= maxRequests) continue
              const detail = await readJson(prefix + '/' + encodeURIComponent(row.id))
              requireValue(detail.id === row.id && detail.name === row.name, 'SmartRecruiters listing/detail identity changed')
              if (country(detail.location?.country) !== 'India') { observed.unresolved.push('native-location-conflict'); continue }
              const description = Object.values(detail.jobAd?.sections || {}).map(section => section?.text).filter(value => typeof value === 'string').join('\n')
              const roleURL = detail.applyUrl || detail.postingUrl
              const role = https(roleURL)
              if (!role || !['jobs.smartrecruiters.com', 'careers.smartrecruiters.com'].includes(role.hostname)) {
                observed.unresolved.push('native-public-role-url-unavailable'); continue
              }
              permit(roleURL)
              addJob({ id: detail.id, title: detail.name, url: roleURL, employer: detail.company,
                description, location: [detail.location?.city, detail.location?.region, 'India'].filter(Boolean).join(', '),
                posted: detail.releasedDate, employmentType: detail.typeOfEmployment?.label, record: detail })
            }
            offset += payload.content.length
            if (offset === total) break
            requireValue(payload.content.length > 0 && offset < total, 'SmartRecruiters pagination is incomplete or inconsistent')
          }
        } else if (board.kind === 'workable') {
          const token = encodeURIComponent(board.token)
          const accountURL = `https://apply.workable.com/api/v1/accounts/${token}`
          const collectionURL = `https://apply.workable.com/api/v1/widget/accounts/${token}`
          const detailsURL = `https://apply.workable.com/api/v2/accounts/${token}/jobs`
          permit(accountURL); permit(collectionURL); permit(detailsURL)
          const account = await readJson(accountURL)
          let owner
          try { owner = new URL(account.url) } catch { /* Missing reciprocal publisher identity. */ }
          requireValue(account && matchingEmployer(account.name) && text(account.uid)
            && Number.isSafeInteger(account.id) && account.id > 0
            && text(account.subdomain).toLowerCase() === board.token.toLowerCase()
            && !account.error && account.success !== false && account.ok !== false
            && owner && ['http:', 'https:'].includes(owner.protocol) && !owner.username && !owner.password && !owner.port
            && official(owner), 'Workable reciprocal account/employer identity changed')
          const collection = await readJson(collectionURL)
          requireValue(collection?.name === account.name && Array.isArray(collection.jobs)
            && !collection.error && collection.success !== false && collection.ok !== false, 'Invalid Workable public collection')
          observed.nativeInventoryReads.push({ kind: board.kind, surface: board.url, reportedTotal: collection.jobs.length })
          const ids = new Map(); let inspected = 0
          for (const row of collection.jobs) {
            requireValue(row && /^[A-Z0-9]{6,32}$/.test(row.shortcode || '') && text(row.title), 'Invalid Workable posting identity')
            if (ids.has(row.shortcode)) {
              requireValue(ids.get(row.shortcode) === row.title, 'Contradictory Workable posting identity'); continue
            }
            ids.set(row.shortcode, row.title); observed.nativeRecords++
            const declaredCountries = asArray(row.locations).map(location => country(location?.countryCode || location?.country)).filter(Boolean)
            if (!declaredCountries.length && country(row.country)) declaredCountries.push(country(row.country))
            if (declaredCountries.length && !declaredCountries.includes('India')) continue
            if (inspected >= maxDetails || observed.requestCount >= maxRequests) { observed.unresolved.push('native-detail-budget-reached'); continue }
            inspected++
            const detail = await readJson(detailsURL + '/' + row.shortcode)
            requireValue(detail && detail.accountUid === account.uid && detail.shortcode === row.shortcode
              && detail.title === row.title && Number.isSafeInteger(detail.id) && detail.id > 0
              && !detail.error && detail.ok !== false && detail.success !== false, 'Workable listing/detail identity changed')
            if (typeof detail.state !== 'string' || typeof detail.isInternal !== 'boolean' || typeof detail.approvalStatus !== 'string') {
              observed.unresolved.push('native-publication-scope-unresolved'); continue
            }
            if (detail.state !== 'published' || detail.isInternal !== false || detail.approvalStatus !== 'approved') continue
            const locations = asArray(detail.locations)
            const india = locations.filter(location => location?.hidden === false
              && country(location.countryCode) === 'India'
              && (!text(location.country) || country(location.country) === 'India'))
            if (!india.length) { if (!locations.length || locations.some(location => location?.hidden !== false || !country(location?.countryCode))) observed.unresolved.push('native-location-scope-unresolved'); continue }
            const role = https(row.url)
            requireValue(role && role.hostname === 'apply.workable.com'
              && [new RegExp('^/j/' + row.shortcode + '/?$'), new RegExp('^/' + board.token + '/j/' + row.shortcode + '/?$')].some(pattern => pattern.test(role.pathname)),
            'Workable public role identity changed')
            permit(role.href)
            const description = [detail.description, detail.requirements, detail.benefits].filter(value => typeof value === 'string' && value.trim()).join('\n')
            addJob({ id: String(detail.id), title: detail.title, url: role.href, description,
              employer: { name: account.name, url: account.url },
              location: [india[0].city, india[0].region, 'India'].filter(Boolean).join(', '),
              posted: text(detail.published) || null, employmentType: detail.type || null,
              record: { ...detail, nativeAccount: { id: account.id, uid: account.uid, name: account.name, url: account.url } } })
          }
        } else if (board.kind === 'workday') {
          const prefix = `${board.origin}/wday/cxs/${encodeURIComponent(board.tenant)}/${encodeURIComponent(board.site)}`
          permit(prefix); permit(prefix + '/jobs', ['POST']); permit(board.url)
          let offset = 0, total = null, inspected = 0; const paths = new Map()
          let appliedFacets = {}, searchText = ''
          const inventory = () => readJson(prefix + '/jobs', { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ appliedFacets, limit: 20, offset, searchText }) })
          let firstPage = await inventory()
          requireValue(Array.isArray(firstPage.jobPostings) && Number.isSafeInteger(firstPage.total) && firstPage.total >= 0, 'Invalid Workday inventory')
          observed.nativeInventoryReads.push({ kind: board.kind, surface: board.url, reportedTotal: firstPage.total })
          if ((options.preferIndiaInventory ?? config.preferIndiaInventory) === true) {
            const indiaFacet = recruitmentIndiaFacet(firstPage, { allowPublishedCountryFacets: config.prioritizeRecruitmentSearch === true })
            if (indiaFacet) {
              observed.nativeCountryFacet = indiaFacet
              appliedFacets = { [indiaFacet.facetParameter]: [indiaFacet.id] }
              firstPage = await inventory()
            } else if (config.searchIndiaWithoutFacet === true) {
              // A search is only a bounded candidate selector. Every returned
              // detail still needs its own explicit native India country.
              searchText = 'India'
              observed.nativeSearch = { searchText, countryProof: false }
              firstPage = await inventory()
            }
          }
          for (let index = 0; index < maxPages && observed.requestCount < maxRequests; index++) {
            const payload = index === 0 ? firstPage : await inventory()
            requireValue(Array.isArray(payload.jobPostings) && Number.isSafeInteger(payload.total) && payload.total >= 0, 'Invalid Workday inventory')
            if (total === null) total = payload.total
            // Native CXS suppresses the total on subsequent pages. Retain the
            // first-page count; a different positive total remains a change.
            requireValue(total === payload.total || offset > 0 && payload.total === 0, 'Workday inventory changed during pagination')
            let newPaths = 0
            for (const row of payload.jobPostings) {
              if (!row || typeof row.externalPath !== 'string' || !/^\/job\/[^?#]+$/.test(row.externalPath)) {
                observed.unresolved.push('native-role-identity-unavailable')
                observed.unqualifiedNativeRows = (observed.unqualifiedNativeRows || 0) + 1
                continue
              }
              const identity = JSON.stringify({ title: row.title, locationsText: row.locationsText, bulletFields: row.bulletFields })
              if (paths.has(row.externalPath)) {
                requireValue(paths.get(row.externalPath) === identity, 'Conflicting duplicate Workday role identity')
                observed.unresolved.push('native-pagination-repeated-role')
                continue
              }
              paths.set(row.externalPath, identity); newPaths++; observed.nativeRecords++
              if (!(Object.keys(appliedFacets).length || searchText
                || /\bindia\b|\bbengaluru\b|\bbangalore\b|\bhyderabad\b|\bpune\b|\bmumbai\b|\bchennai\b|\bgurugram\b|\bgurgaon\b|\bnoida\b|\bdelhi\b|\b\d+\s+locations\b/i.test(row.locationsText || ''))) continue
              if (inspected >= maxDetails || observed.requestCount >= maxRequests) { observed.unresolved.push('native-detail-budget-reached'); continue }
              inspected++
              const detail = await readJson(prefix + row.externalPath), info = detail.jobPostingInfo
              const expected = new URL(board.url + row.externalPath), actual = https(info?.externalUrl)
              const declaredSite = text(info?.jobPostingSiteId)
              const canonicalExpected = new URL(expected)
              if (declaredSite && declaredSite.toLowerCase() === board.site.toLowerCase()) {
                const publicRoot = new URL(board.url)
                canonicalExpected.pathname = publicRoot.pathname.slice(0, -board.site.length) + declaredSite + row.externalPath
              }
              requireValue(info && actual && actual.origin === expected.origin
                && [expected.pathname, canonicalExpected.pathname].includes(actual.pathname.replace(/^\/[a-z]{2}-[a-z]{2}\//i, '/'))
                && (!declaredSite || declaredSite.toLowerCase() === board.site.toLowerCase())
                && info.title === row.title && text(info.jobReqId), 'Workday listing/detail identity changed')
              permit(actual.href)
              if (info.posted === false || info.canApply === false) {
                observed.exclusions.push({ reason: 'native-role-unavailable', url: actual.href }); continue
              }
              const primaryCountry = country(info.country), requisitionCountry = country(info.jobRequisitionLocation?.country)
              requireValue(!primaryCountry || !requisitionCountry || primaryCountry === requisitionCountry, 'Contradictory Workday native countries')
              const nativeCountry = primaryCountry || requisitionCountry
              if (nativeCountry !== 'India') {
                if (!nativeCountry) observed.unresolved.push('native-location-scope-unresolved')
                else {
                  observed.exclusions.push({ reason: 'native-explicit-non-India-primary-country', url: actual.href, country: nativeCountry })
                  // The primary country's scope cannot be extended to the
                  // additional location strings, which contain no countries.
                  if (asArray(info.additionalLocations).length) observed.unresolved.push('native-additional-location-scope-unresolved')
                }
                continue
              }
              addJob({ id: info.jobReqId, title: info.title, url: actual.href, description: info.jobDescription,
                employer: detail.hiringOrganization, location: [info.location, 'India'].filter(Boolean).join(', '),
                posted: info.startDate, closing: info.endDate, record: detail })
            }
            if (payload.jobPostings.length && !newPaths) { observed.unresolved.push('native-pagination-no-progress'); break }
            offset += payload.jobPostings.length
            if (offset === total) break
            requireValue(payload.jobPostings.length > 0 && offset < total, 'Workday pagination is incomplete or inconsistent')
          }
        } else if (board.kind === 'keka') {
          await readKekaRecruitment(board, { readPage: read, readRenderer: value => read(value, {}, 'renderer'), readJson, permit,
            matchingEmployer, official, addJob, inventoryRead: value => observed.nativeInventoryReads.push(value),
            recordRead: () => observed.nativeRecords++, unresolved: value => observed.unresolved.push(value) })
        } else if (board.kind === 'oracle') {
          await readOracleRecruitment(board, { readPage: read, readJson, permit, matchingEmployer, matchingPublisher,
            requireNativeEmployerName: config.requireNativeEmployerName === true, maxPages, maxDetails,
            canRead: () => observed.requestCount < maxRequests,
            inventoryRead: value => { if (!observed.nativeInventoryReads.some(row => row.surface === value.surface)) observed.nativeInventoryReads.push(value) },
            recordRead: () => observed.nativeRecords++, unresolved: value => observed.unresolved.push(value), addJob })
        }
      } catch (error) { problem('native-' + board.kind, error) }
    }
    signal.throwIfAborted()
    observed.returnedIndiaJobs = jobs.length
    observed.unresolved = [...new Set(observed.unresolved)]
    observed.boards = [...boards.values()]
    if (!jobs.length && observed.nativeRecords === 0 && !observed.nativeInventoryReads.length) {
      if (!boards.size && receipts.some(row => row.status === 200 && row.format === 'page')) observed.unresolved.push('current-native-recruitment-contract-not-discovered')
      const error = Object.assign(new Error(`[${config.source}] Current verified recruitment inventory is unavailable`),
        { softFailure: true, upstreamOutage: false, abortRetries: true, failureKind: 'coverage_gap', recruitmentObservations: observed })
      throw error
    }
    attachInventoryEvidence(jobs, { status: 'coverage-gap', surface: root?.href || homepage.href, firstParty: receipts.some(row => row.status === 200),
      listingComplete: false, pagesFetched: receipts.length, reportedTotal: null, indiaFacetCount: null,
      verifiedAt: now, reason: 'runtime-first-party-recruitment;source-scope-unverified;cleanup-forbidden;failures=' + failures.length })
    Object.defineProperty(jobs, RECRUITMENT_OBSERVATIONS, { value: observed })
    return jobs
  } }
}
