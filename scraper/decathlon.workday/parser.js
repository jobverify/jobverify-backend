import { document, norm } from '../../scraper-support/shared/rmkNativePairHtml.js'
import { requireNative, nativeCountryName, nativeDate, plainNativeHTML } from '../../scraper-support/shared/nativeJobPosting.js'

export const SOURCE = 'decathlon', COMPANY = 'Decathlon'
export const CORPORATE = 'https://www.decathlon.in/', HOME = 'https://joinus.decathlon.in/en'
export const API = 'https://api.digitalrecruiters.com/public/v1/careers-site/job-ads'
export const BOARD = API + '?domainName=joinus.decathlon.in&limit=100&page=1&locale=en_GB'
const ensure = (value, message) => requireNative(value, 'Decathlon: ' + message)
const object = value => value && typeof value === 'object' && !Array.isArray(value)
const positiveID = value => Number.isSafeInteger(value) && value > 0 && value <= 999999999999
const roleURL = slug => 'https://joinus.decathlon.in/en/annonce/' + slug
const listingURL = page => API + '?domainName=joinus.decathlon.in&limit=100&page=' + page + '&locale=en_GB'
const detailURL = row => API + '/' + row.job_ad_id + '?domainName=joinus.decathlon.in&locale=en_GB&addressId=' + row.id.split('-')[1] + '&external=0&withJsonld=1&preview=0'

export function createSourceConfig({ now = () => new Date().toISOString() } = {}) {
  const current = Date.parse(now())
  ensure(Number.isFinite(current), 'Invalid observation clock')
  const allowedDetails = new Set()
  function validateRow(row) {
    ensure(object(row) && positiveID(row.job_ad_id) && typeof row.id === 'string'
      && new RegExp('^' + row.job_ad_id + '-[1-9]\\d{0,11}$').test(row.id), 'Invalid composite listing identity')
    ensure(typeof row.title === 'string' && norm(row.title) && typeof row.location === 'string' && norm(row.location), 'Missing native listing title/location')
    ensure(row.career_domain === 'joinus.decathlon.in' && row.is_external === false && row.is_aggregated === false,
      'Unqualified employer domain or external/aggregated listing')
    ensure(positiveID(row.brand_id) && typeof row.url === 'string'
      && new RegExp('^' + row.job_ad_id + '-[a-z0-9][a-z0-9-]*$').test(row.url), 'Unqualified native public role path')
    return row
  }
  const config = {
    source: SOURCE, companyName: COMPANY, boardURL: BOARD,
    sameReadIdentity: (from, to) => from === to,
    expectedContentType: url => url === HOME || url === CORPORATE ? 'text/html' : 'application/json',
    validateURL(value) {
      if (value === HOME || value === CORPORATE || allowedDetails.has(value)) return
      const url = new URL(value)
      ensure(!url.username && !url.password && !url.hash && url.origin === 'https://api.digitalrecruiters.com'
        && url.pathname === '/public/v1/careers-site/job-ads'
        && url.searchParams.size === 4 && url.searchParams.get('domainName') === 'joinus.decathlon.in'
        && url.searchParams.get('limit') === '100' && url.searchParams.get('locale') === 'en_GB'
        && /^[1-9]\d{0,2}$/.test(url.searchParams.get('page') || '')
        && value === listingURL(Number(url.searchParams.get('page'))), 'Unqualified public read URL')
    },
    readRequest(url) {
      config.validateURL(url)
      const listing = new URL(url).pathname === '/public/v1/careers-site/job-ads'
      return listing ? { method: 'POST', body: '{"filters":{}}',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' } }
        : { method: 'GET', headers: { Accept: config.expectedContentType(url) } }
    },
    handoffs: [
      { url: CORPORATE, verify(html) {
        const dom = document(html)
        ensure(dom.nodes(node => node.tag === 'a' && node.attrs.href === HOME).length > 0,
          'Official company website no longer links to this careers portal')
      } },
      { url: HOME, verify(html) {
        const dom = document(html), scripts = dom.nodes(node => node.tag === 'script' && !node.attrs.src)
        ensure(dom.nodes(node => node.tag === 'a' && node.attrs.href === CORPORATE).length > 0
          && dom.nodes(node => node.tag === 'a' && node.attrs.href === '/en/annonces').length > 0,
        'Public careers/search/corporate binding missing')
        const native = scripts.filter(node => node.raw.includes('window.__NUXT__='))
        ensure(native.length === 1 && /domain_name:"joinus\.decathlon\.in",internal_id:"DN9vX1RE"/.test(native[0].raw),
          'Official native tenant changed')
        const base = /commonApiBaseUrl:("(?:[^"\\]|\\.)*")/.exec(native[0].raw)
        ensure(base && JSON.parse(base[1]) === 'https://api.digitalrecruiters.com/public/v1', 'Public vacancy API binding changed')
      } },
    ],
    parseListing(raw, url) {
      const payload = JSON.parse(raw), page = Number(new URL(url).searchParams.get('page'))
      ensure(object(payload) && Number.isSafeInteger(payload.count) && payload.count >= 0 && payload.count <= 10000
        && Array.isArray(payload.items), 'Missing native search envelope/count')
      ensure(payload.items.length === Math.min(100, Math.max(0, payload.count - (page - 1) * 100)),
        'Native pagination ended before reported total')
      const records = [], errors = []
      for (const item of payload.items) {
        try {
          const row = validateRow(item), url = detailURL(row)
          allowedDetails.add(url)
          records.push({ id: row.id, title: norm(row.title), url, locations: [row.location], countries: [], nativeAPIListing: row })
        } catch (error) { errors.push({ message: error.message, rawCandidate: item }) }
      }
      return { pageNumber: page, lastPage: Math.max(1, Math.ceil(payload.count / 100)),
        reportedTotal: payload.count, observedRows: payload.items.length, records, errors,
        nextURL: page * 100 < payload.count ? listingURL(page + 1) : null, terminationKnown: true }
    },
    pageFingerprint: page => JSON.stringify([page.pageNumber, page.lastPage, page.reportedTotal, page.observedRows,
      page.records.map(row => row.nativeAPIListing), page.errors]),
    candidateForIndia: () => true, // The typed country is checked on every detail, never inferred from the tenant.
    parseDetail(raw, row) {
      const payload = JSON.parse(raw), listing = row.nativeAPIListing, schema = payload.jsonld
      ensure(object(payload) && object(schema) && schema['@type'] === 'JobPosting', 'Missing native role/JobPosting')
      ensure(payload.id === row.id && payload.job_ad_id === listing.job_ad_id && payload.company_id === 75
        && payload.brand_id === listing.brand_id && payload.locale === 'en_GB' && payload.career_domain === 'joinus.decathlon.in'
        && payload.url === listing.url && norm(payload.title) === row.title && norm(schema.title) === row.title,
      'Listing/detail/company/brand/URL identity conflict')
      ensure(payload.is_external === false && payload.is_aggregated === false && payload.job_ad_status === 1
        && [1, 3].includes(payload.publish_type), 'Native role is not a verified public active listing variant')
      ensure(schema.identifier?.value === row.id && schema.identifier.name === 'Decathlon United'
        && schema.hiringOrganization?.name === 'Decathlon Sports India Pvt Ltd', 'Native role identifier/employer conflict')
      ensure(typeof payload.description === 'string' && typeof payload.profile === 'string'
        && schema.description === payload.description, 'Missing or conflicting native description/profile')
      const content = payload.description + '\n' + payload.profile
      // Either native field can be explicitly empty or a short introduction.
      // Keep both complete fields and evaluate their combined employer content.
      // The public employer text can be short. Its complete native fields and
      // matching JobPosting establish provenance; no arbitrary length floor.
      ensure(plainNativeHTML(content).length > 0, 'Missing native role description')
      ensure(!/\b(?:this (?:job|position) is no longer available|position has been filled)\b/i.test(plainNativeHTML(content)),
        'Native role explicitly closed')
      const address = payload.address, typed = schema.jobLocation?.address
      ensure(object(address) && object(typed) && String(address.id) === row.id.split('-')[1], 'Native address identity conflict')
      ensure(nativeCountryName(address.country) === 'India' && nativeCountryName(typed.addressCountry) === 'India'
        && typeof address.city === 'string' && typed.addressLocality === address.city
        && typed.addressRegion === address.state && typed.postalCode === address.zip && typed.streetAddress === address.street,
      'Missing or conflicting typed India address')
      const posted = nativeDate(schema.datePosted, { required: true }), closing = nativeDate(schema.validThrough)
      ensure(Date.parse(posted.iso) <= current && (!closing.iso || closing.iso >= posted.iso), 'Future publication or invalid closing date')
      ensure(typeof payload.republished_at === 'string'
        && /^\d{4}-\d{2}-\d{2} (?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(payload.republished_at), 'Invalid native republication timestamp')
      const republished = nativeDate(payload.republished_at.slice(0, 10), { required: true })
      ensure(republished.iso >= posted.iso && republished.iso.slice(0, 10) <= new Date(current).toISOString().slice(0, 10),
        'Native republication precedes posting or is in the future')
      return { id: row.id, title: row.title, sourceURL: roleURL(payload.url), nativeListingRecord: listing,
        nativeAPIRecord: payload, nativeJobPosting: schema, nativeJobPostingIdentifier: schema.identifier,
        nativeHiringOrganization: schema.hiringOrganization,
        nativeCountryAddresses: [{ raw: typed, country: 'India', nativeCountryRaw: typed.addressCountry }],
        nativeVisibleLocationTexts: [], nativeSchemaDescription: schema.description, nativeVisibleDescriptionHTML: null,
        nativeDescriptionHTML: content, nativeDescriptionOrigin: 'official public vacancy API: description and profile; rendered HTML not asserted',
        nativePostedDate: posted, nativeValidThrough: closing, nativeRepublishedAt: payload.republished_at,
        nativeRepublishedTimezone: null, nativeRepublishedUsedAsPostingDate: false,
        nativeApplicationURL: null, applicationsVisited: false, firstEverPublication: null, legalEmployer: null,
        nativeJobAdID: String(payload.job_ad_id), nativeAddressID: String(address.id), sourceScopeComplete: false }
    },
  }
  return config
}
