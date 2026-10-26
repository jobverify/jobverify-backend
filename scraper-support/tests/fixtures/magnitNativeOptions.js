import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
export const magnitCapture = () => JSON.parse(gunzipSync(readFileSync(new URL('../../../scraper/magnitglobal/fixtures/native-20261026.json.gz', import.meta.url))))
const requestKey = (url, method, body) => {
  const normalize = value => value && typeof value === 'object' && !Array.isArray(value)
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, normalize(value[key])])) : value
  return [url, method || 'GET', body ? JSON.stringify(normalize(JSON.parse(body))) : ''].join('|')
}
export const magnitNativeOptions = (mutate = () => {}, fixture = magnitCapture()) => {
  const calls = [], counts = new Map()
  const fetchPage = async (url, init = {}) => {
    init.signal?.throwIfAborted()
    const key = requestKey(url, init.method, init.body), index = counts.get(key) || 0
    counts.set(key, index + 1); calls.push({ url, method: init.method || 'GET', body: init.body || null })
    const packet = structuredClone(fixture.packets.filter(packet => requestKey(packet.url, packet.method, packet.requestBody) === key)[index])
    if (!packet) throw Error('Unexpected Magnit fixture request: ' + key)
    mutate(packet, index)
    return { ...packet, url: packet.finalUrl, setCookies: (packet.setCookieNames || []).map(name => name + '=public-fixture-cookie') }
  }
  return { calls, now: () => fixture.runAt, fetchPage,
    fetchText: async (url, init) => (await fetchPage(url, init)).body,
    fetchJson: async (url, init) => JSON.parse((await fetchPage(url, init)).body) }
}
const nativeIndiaLocation = location => ({ ...location, isoCountryCode: 'IN', cityName: 'Bengaluru', stateCode: 'KA',
  formattedAddress: 'Bengaluru, Karnataka, India', coordinates: typeof location.coordinates === 'string' ? 'lat:12.9716;lng:77.5946' : { lat: 12.9716, lng: 77.5946 } })
export const magnitDayforceIndiaRole = packet => {
  const alter = value => {
    if (value?.jobPostingId === 7493) value.postingLocations = value.postingLocations.map(nativeIndiaLocation)
    return value
  }
  if (packet.url.includes('/jobposting/search')) {
    const data = JSON.parse(packet.body); data.jobPostings.forEach(alter); packet.body = JSON.stringify(data)
  }
  if (packet.name === 'dayforce-detail-7493') packet.body = JSON.stringify(alter(JSON.parse(packet.body)))
  if (packet.name === 'dayforce-page-7493') packet.body = packet.body.replace(/(<script\b[^>]*id="__NEXT_DATA__"[^>]*>)([\s\S]*?)(<\/script>)/,
    (all, start, raw, end) => { const next = JSON.parse(raw); next.props.pageProps.dehydratedState.queries.forEach(query => alter(query.state.data)); return start + JSON.stringify(next) + end })
}
