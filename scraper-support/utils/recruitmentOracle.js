import { readNativeDocument, decodeNativeEntities } from './activeNativeHtml.js'
import { nativeCountryName } from '../shared/nativeJobPosting.js'

const need = (value, message) => { if (!value) throw Error('Oracle recruitment: ' + message) }
const country = value => nativeCountryName(value)
const text = value => typeof value === 'string' && value.trim() ? value.trim() : null
const list = value => Array.isArray(value) ? value : []

// This reader only receives a board advertised by the current company page.
// The native <base> supplies the real site number, including named UI aliases;
// no tenant, site number, country ID or employer name is guessed.
export async function readOracleRecruitment(board, io) {
  io.permit(board.url)
  const page = await io.readPage(board.url)
  const doc = readNativeDocument(page.html)
  const bases = doc.nodes(node => node.tag === 'base' && node.attrs['data-sitenumber'] && node.attrs['data-apibaseurl'])
  need(bases.length === 1, 'missing or ambiguous public candidate-site contract')
  const base = bases[0], site = base.attrs['data-sitenumber']
  need(/^[a-z\d_-]{1,120}$/i.test(site), 'invalid native site number')
  const publicBase = new URL(base.attrs.href, page.url), apiOrigin = new URL(base.attrs['data-apibaseurl'])
  const declared = new URL(board.url)
  need(publicBase.origin === declared.origin && publicBase.pathname.replace(/\/$/, '') === declared.pathname.replace(/\/$/, '')
    && !publicBase.search && !publicBase.hash
    && apiOrigin.protocol === 'https:' && !apiOrigin.username && !apiOrigin.password && !apiOrigin.port, 'native API or candidate site changed authority')
  const publishers = doc.nodes(node => node.tag === 'title').map(node => decodeNativeEntities(node.raw || ''))
  publishers.push(...doc.nodes(node => node.tag === 'meta' && node.attrs.property === 'og:site_name').map(node => node.attrs.content || ''))
  const publisher = publishers.find(io.matchingPublisher) || null
  const generic = publishers.length > 0 && publishers.every(value => /^\s*Candidate Experience site\s*$/i.test(value))
    && board.bindingEvidence?.verified === true && board.bindingEvidence?.bindingMethod === 'runtime-current-careers-link'
  need(publisher || generic, 'native candidate-site publisher does not match the source')
  const oracleHost = /^[a-z\d-]+\.fa\.[a-z\d-]+\.oraclecloud\.com$/i
  const declaredOracleAPI = !oracleHost.test(declared.hostname) && oracleHost.test(apiOrigin.hostname)
    && apiOrigin.pathname === '/' && !apiOrigin.search && !apiOrigin.hash && publisher
    && board.bindingEvidence?.verified === true
    && ['runtime-current-careers-link','runtime-current-native-candidate-site'].includes(board.bindingEvidence.bindingMethod)
  need(apiOrigin.origin === declared.origin || declaredOracleAPI, 'native API or candidate site changed authority')
  const prefix = apiOrigin.origin + '/hcmRestApi/resources/latest/'
  io.permit(prefix)
  io.permit(publicBase.href)
  let total = null, offset = 0, inspected = 0
  const seen = new Set()
  for (let pageNumber = 0; pageNumber < io.maxPages && io.canRead(); pageNumber++) {
    const requestURL = prefix + 'recruitingCEJobRequisitions?onlyData=true&expand=requisitionList.secondaryLocations&finder=findReqs;siteNumber='
      + encodeURIComponent(site) + ',limit=20,offset=' + offset + ',keyword=India'
    const payload = await io.readJson(requestURL)
    need(payload && payload.count === 1 && payload.hasMore === false && Array.isArray(payload.items) && payload.items.length === 1,
      'invalid public inventory envelope')
    const collection = payload.items[0]
    need(collection.SiteNumber === site && collection.Offset === offset && collection.Limit === 20
      && Number.isSafeInteger(collection.TotalJobsCount) && collection.TotalJobsCount >= 0 && Array.isArray(collection.requisitionList),
    'native site, page or total identity changed')
    if (total === null) total = collection.TotalJobsCount
    need(total === collection.TotalJobsCount, 'inventory changed during pagination')
    io.inventoryRead({ kind: 'oracle', surface: publicBase.href, site, publisher, candidateSearch: 'India', reportedTotal: total })
    for (const row of collection.requisitionList) {
      need(row && /^\d{1,32}$/.test(row.Id || '') && text(row.Title) && !seen.has(row.Id), 'invalid or duplicate native role identity')
      seen.add(row.Id); io.recordRead()
      const countries = [country(row.PrimaryLocationCountry), ...list(row.secondaryLocations).map(location => country(location.CountryCode))].filter(Boolean)
      if (!countries.length) io.unresolved('native-location-scope-unresolved')
      if (!countries.includes('India')) continue
      if (inspected >= io.maxDetails || !io.canRead()) { io.unresolved('native-detail-budget-reached'); continue }
      inspected++
      const detailURL = prefix + 'recruitingCEJobRequisitionDetails?expand=all&onlyData=true&finder=ById;Id=%22'
        + encodeURIComponent(row.Id) + '%22,siteNumber=' + encodeURIComponent(site)
      const response = await io.readJson(detailURL)
      need(response && response.count === 1 && response.hasMore === false && Array.isArray(response.items) && response.items.length === 1,
        'public listing role is absent or changed in detail')
      const detail = response.items[0]
      need(detail.Id === row.Id && detail.Title === row.Title, 'listing/detail role identity changed')
      const primary = country(detail.PrimaryLocationCountry), rowPrimary = country(row.PrimaryLocationCountry)
      need(!primary || !rowPrimary || primary === rowPrimary, 'listing/detail countries conflict')
      const locations = [{ label: detail.PrimaryLocation, country: primary },
        ...list(detail.secondaryLocations).map(location => ({ label: location.LocationName, country: country(location.CountryCode) })),
        ...list(detail.workLocation).map(location => ({ label: [location.TownOrCity, location.Region2].filter(Boolean).join(', '), country: country(location.Country) }))]
      const india = locations.filter(location => location.country === 'India')
      if (!india.length) { io.unresolved('native-location-scope-unresolved'); continue }
      const employer = text(detail.LegalEmployer) ? { name: detail.LegalEmployer } : null
      if (employer && !io.matchingEmployer(employer.name) || !employer && (io.requireNativeEmployerName || !publisher)) {
        io.unresolved('native-employer-mismatch'); continue
      }
      const url = publicBase.href.replace(/\/$/, '') + '/job/' + row.Id
      io.permit(url)
      io.addJob({ id: row.Id, title: detail.Title, url, employer,
        employerBinding: employer ? null : { method: 'current-corporate-delegation-and-native-site-publisher', publisher,
          siteNumber: site, publicSiteURL: publicBase.href, corporateBinding: board.bindingEvidence, legalEmployer: null },
        description: [detail.ExternalDescriptionStr, detail.ExternalResponsibilitiesStr, detail.ExternalQualificationsStr].filter(text).join('\n'),
        location: india[0].label || 'India', posted: detail.ExternalPostedStartDate, closing: detail.ExternalPostedEndDate,
        employmentType: detail.JobSchedule || null, record: { detail, listing: row, nativeSiteNumber: site, publicRoleRoute: publicBase.href } })
    }
    offset += collection.requisitionList.length
    if (offset === total) return
    need(collection.requisitionList.length > 0 && offset < total, 'incomplete or inconsistent native pagination')
  }
  if (offset < total) io.unresolved('native-listing-budget-reached')
}
