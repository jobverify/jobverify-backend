import { document, norm } from '../../scraper-support/shared/rmkNativePairHtml.js'
import { requireNative, nativeDate } from '../../scraper-support/shared/nativeJobPosting.js'
import { fetchSmartRecruitersDetail } from '../../scraper-support/apiPortal/smartRecruitersDetail.js'
export const SOURCE = 'accor', COMPANY = 'Accor', ORIGIN = 'https://careers.accor.com'
export const CORPORATE = 'https://group.accor.com/en', HOME = ORIGIN + '/global/en/'
export const INDIA = ORIGIN + '/global/en/jobs?options=502&page=1'
export const API = 'https://api.smartrecruiters.com/v1/companies/AccorHotel/postings'
export const BOARD = API + '?country=in&limit=100&offset=0'
const ensure = (value, message) => requireNative(value, 'Accor: ' + message)
const object = value => value && typeof value === 'object' && !Array.isArray(value)
const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value)
const listingURL = offset => API + '?country=in&limit=100&offset=' + offset
export function createSourceConfig({ now = () => new Date().toISOString() } = {}) {
  const current = Date.parse(now()), allowedDetails = new Set()
  ensure(Number.isFinite(current), 'Invalid observation clock')
  let firstPortalRole = null, binding = null, nativePortalIndiaCount = null
  function postingReference(value) {
    const url = new URL(value), match = /^\/AccorHotel\/([1-9]\d{7,19})(?:-[a-z0-9-]+)?$/.exec(url.pathname)
    ensure(url.origin === 'https://jobs.smartrecruiters.com' && !url.username && !url.password && !url.hash
      && (!url.search || url.search === '?oga=true') && match, 'Unqualified native public posting URL')
    return { id: match[1], url }
  }
  function validateRow(row) {
    ensure(object(row) && typeof row.id === 'string' && /^[1-9]\d{7,19}$/.test(row.id)
      && row.ref === API + '/' + row.id && uuid(row.uuid) && uuid(row.jobAdId)
      && row.company?.identifier === 'AccorHotel', 'Native listing company/ID/reference conflict')
    ensure(typeof row.name === 'string' && norm(row.name) && typeof row.refNumber === 'string' && norm(row.refNumber)
      && row.visibility === 'PUBLIC', 'Missing public native title/requisition/status')
    const location = row.location
    ensure(object(location) && location.country === 'in' && typeof location.city === 'string' && norm(location.city)
      && typeof location.fullLocation === 'string' && location.fullLocation.endsWith(', India'),
    'Missing or conflicting explicit India listing location')
    const posted = nativeDate(row.releasedDate, { required: true })
    ensure(Date.parse(posted.iso) <= current, 'Future native listing publication')
    return row
  }
  const config = {
    source: SOURCE, companyName: COMPANY, boardURL: BOARD, maxRequests: 2048, detailConcurrency: 4, compactResponseReferences: true,
    sameReadIdentity: (from, to) => from === to,
    expectedContentType: url => url.startsWith(API) ? 'application/json' : 'text/html',
    validateURL(value) {
      if ([CORPORATE, HOME, INDIA].includes(value) || value === firstPortalRole?.url || allowedDetails.has(value)) return
      const url = new URL(value), offset = url.searchParams.get('offset')
      ensure(url.origin === 'https://api.smartrecruiters.com' && !url.username && !url.password && !url.hash
        && url.pathname === '/v1/companies/AccorHotel/postings' && url.searchParams.size === 3
        && url.searchParams.get('country') === 'in' && url.searchParams.get('limit') === '100'
        && /^(?:0|[1-9]\d{0,3})$/.test(offset || '') && Number(offset) % 100 === 0
        && value === listingURL(Number(offset)), 'Unqualified public read URL')
    },
    handoffs: [
      { url: CORPORATE, verify(html) {
        ensure(document(html).nodes(n => n.tag === 'a' && n.attrs.href === HOME).length > 0,
          'Official corporate page no longer links the careers portal')
      } },
      { url: HOME, verify(html) {
        const d = document(html)
        ensure(d.nodes(n => n.tag === 'a' && n.attrs.href === CORPORATE).length > 0
          && d.nodes(n => n.attrs['data-option-id'] === '502' && d.text(n).includes('India')).length > 0,
        'Careers corporate/country binding missing')
      } },
      { url: INDIA, verify(html) {
        const d = document(html), selected = d.nodes(n => n.tag === 'span' && n.attrs['aria-label'] === 'India'
          && n.attrs['aria-checked'] === 'true')
        ensure(selected.length > 0, 'Native India country option not selected')
        const match = /^India\s*\((\d+)\)$/.exec(d.text(selected[0]))
        nativePortalIndiaCount = match ? Number(match[1]) : null
        const links = d.nodes(n => n.tag === 'a' && (n.attrs.class || '').split(' ').includes('attrax-vacancy-tile__title'))
        ensure(links.length > 0, 'No public role available to verify the native tenant')
        const url = new URL(links[0].attrs.href, ORIGIN)
        ensure(url.origin === ORIGIN && !url.search && !url.hash && !url.username && !url.password
          && /^\/global\/en\/job\/[a-z0-9-]+-jid-[1-9]\d*$/.test(url.pathname), 'Unqualified official public role path')
        firstPortalRole = { title: d.text(links[0]), url: url.href }
      } },
      { get url() { ensure(firstPortalRole, 'Public role binding missing'); return firstPortalRole.url }, verify(html) {
        const d = document(html), postings = d.nodes(n => n.tag === 'script' && n.attrs.type === 'application/ld+json')
          .map(n => JSON.parse(n.raw)).filter(p => p['@type'] === 'JobPosting')
        ensure(postings.length === 1, 'Missing unique portal JobPosting')
        const schema = postings[0]
        ensure(norm(schema.title) === norm(firstPortalRole.title) && schema.url === firstPortalRole.url
          && schema.identifier?.name === COMPANY && uuid(schema.identifier.value)
          && schema.hiringOrganization?.name === COMPANY, 'Official portal role/employer identity conflict')
        const refs = d.nodes(n => n.tag === 'a' && typeof n.attrs.href === 'string'
          && n.attrs.href.startsWith('https://jobs.smartrecruiters.com/')).map(n => postingReference(n.attrs.href))
        ensure(refs.length > 0 && new Set(refs.map(r => r.id)).size === 1, 'Native tenant/public posting binding missing or conflicting')
        binding = { portalRole: firstPortalRole, nativePostingID: refs[0].id,
          nativePublicPostingLink: refs[0].url.href, nativeJobAdID: schema.identifier.value,
          nativePortalJobPosting: schema, nativePortalIndiaCount, nativeAPIRoleCrossChecked: false }
      } },
    ],
    parseListing(raw, url) {
      const data = JSON.parse(raw), offset = Number(new URL(url).searchParams.get('offset'))
      ensure(object(data) && data.offset === offset && data.limit === 100 && Number.isSafeInteger(data.totalFound)
        && data.totalFound >= 0 && data.totalFound <= 2000 && Array.isArray(data.content)
        && data.content.length === Math.min(100, Math.max(0, data.totalFound - offset)), 'Truncated or invalid native pagination envelope')
      const records = [], errors = []
      for (const candidate of data.content) try {
        const row = validateRow(candidate); allowedDetails.add(row.ref)
        records.push({ id: row.id, title: norm(row.name), url: row.ref, locations: [row.location.fullLocation],
          countries: ['India'], nativeAPIListing: row })
      } catch (error) { errors.push({ message: error.message, rawCandidate: candidate }) }
      return { pageNumber: offset / 100 + 1, lastPage: Math.max(1, Math.ceil(data.totalFound / 100)),
        reportedTotal: data.totalFound, observedRows: data.content.length, records, errors,
        nextURL: offset + 100 < data.totalFound ? listingURL(offset + 100) : null, terminationKnown: true }
    },
    pageFingerprint: page => JSON.stringify([page.pageNumber, page.lastPage, page.reportedTotal, page.observedRows,
      page.records.map(r => r.nativeAPIListing), page.errors]),
    candidateForIndia: () => true,
    async parseDetail(raw, row) {
      const job = JSON.parse(raw), listing = row.nativeAPIListing
      ensure(object(job) && job.id === row.id && job.uuid === listing.uuid && job.jobAdId === listing.jobAdId
        && uuid(job.jobId) && job.refNumber === listing.refNumber && norm(job.name) === row.title
        && job.company?.identifier === 'AccorHotel', 'Native API role/company/listing identity conflict')
      ensure(job.location?.country === 'in' && job.location.city === listing.location.city
        && job.location.fullLocation === listing.location.fullLocation && job.location.region === listing.location.region,
      'Missing or conflicting native India detail location')
      ensure(job.releasedDate === listing.releasedDate, 'Listing/detail native posting date conflict')
      const posted = nativeDate(job.releasedDate, { required: true })
      ensure(Date.parse(posted.iso) <= current, 'Future native role publication')
      ensure(typeof job.active === 'boolean', 'Unknown native publication status')
      const posting = postingReference(job.postingUrl), apply = postingReference(job.applyUrl)
      ensure(posting.id === row.id && apply.id === row.id && posting.url.pathname === apply.url.pathname,
        'Native posting/application identity conflict')
      const fact = { id: row.id, title: row.title, sourceURL: posting.url.href, nativeListingRecord: listing,
        nativeAPIRecord: job, nativeJobPosting: null, nativeJobPostingIdentifier: null,
        nativeHiringOrganization: job.company,
        nativeCountryAddresses: [{ raw: job.location, country: 'India', nativeCountryRaw: job.location.country,
          nativeAddressFormat: 'SmartRecruiters typed location object;not JSON-LD' }],
        nativeVisibleLocationTexts: [], nativeSchemaDescription: null, nativeVisibleDescriptionHTML: null,
        nativePostedDate: posted, nativeValidThrough: nativeDate(null), nativeApplicationURL: job.applyUrl,
        sourceRequisitionID: job.refNumber, nativeJobAdID: job.jobAdId, nativeRequisitionUUID: job.jobId,
        nativePostingUUID: job.uuid, nativeDescriptionHTML: null, nativeDescriptionOrigin: 'official SmartRecruiters jobAd.sections;rendered HTML not asserted',
        nativePortalBinding: binding, applicationsVisited: false, firstEverPublication: null, legalEmployer: null, sourceScopeComplete: false }
      if (!job.active) return { ...fact, excluded: true, exclusionReason: 'native-posting-inactive' }
      ensure(job.visibility === 'PUBLIC', 'Native role is not public')
      // Reuse the shared strict country/identity validator and full-section
      // normalization in memory after the one physical native role read.
      const normalized = await fetchSmartRecruitersDetail({ publicUrl: job.postingUrl, expectedCompany: 'AccorHotel',
        expectedCountry: listing.location.country, expectedLocation: listing.location.city,
        fetchJson: async target => { ensure(target === row.url, 'Unexpected normalization resource'); return job } })
      if (binding?.nativePostingID === row.id) {
        ensure(binding.nativeJobAdID === job.jobAdId && norm(binding.portalRole.title) === row.title
          && new Date(binding.nativePortalJobPosting.datePosted).toISOString().slice(0, 19) === posted.iso.slice(0, 19),
        'Portal/API job-ad or publication identity conflict')
        binding.nativeAPIRoleCrossChecked = true
      }
      return { ...fact, nativeDescriptionHTML: normalized.jobDescription,
        minimumQualification: normalized.minimumQualification,
        preferredQualification: job.jobAd?.sections?.additionalInformation?.text ?? null }
    },
  }
  return config
}
