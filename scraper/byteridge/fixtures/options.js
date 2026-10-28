import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'

export const nativeFixture = () => JSON.parse(gunzipSync(readFileSync(new URL('./native-20261026.json.gz', import.meta.url))))
export const nativeOptions = (mutate = () => {}, fixture = nativeFixture()) => {
  const calls = [], counts = new Map()
  return {
    calls, now: () => fixture.runAt, requestIntervalMs: 0,
    fetchText: async url => fixture.responses[url]?.body || '',
    fetchImpl: async (url, init = {}) => {
      init.signal?.throwIfAborted()
      const packet = structuredClone(fixture.responses[url])
      if (!packet) throw Error('Unexpected Byteridge public fixture URL: ' + url)
      const index = counts.get(url) || 0
      counts.set(url, index + 1)
      calls.push({ url, method: init.method || 'GET', body: init.body, signal: init.signal })
      mutate(packet, url, index, init)
      return { status: packet.status, url, headers: new Headers({ 'Content-Type': packet.contentType }), text: async () => packet.body }
    },
  }
}
