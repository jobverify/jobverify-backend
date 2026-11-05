import { types } from 'node:util'

const maxBytes = 16 * 1024 * 1024, requestMs = 15000
const typedArray = Object.getPrototypeOf(Uint8Array.prototype)
const intrinsic = name => Object.getOwnPropertyDescriptor(typedArray, name).get
const byteLength = intrinsic('byteLength'), byteOffset = intrinsic('byteOffset'), arrayBuffer = intrinsic('buffer')
const ignoreCleanupFailure = operation => {
  try { Promise.resolve(operation()).catch(() => {}) } catch {}
}

// This helper owns only one declared original GET. URL admission and host
// scheduling stay with the collectors; their caller/request signal is retained.
export const boundedDeclaredPublicGet = async (url, { fetchImpl, signal, overflowError }) => {
  const started = performance.now(), canceled = new WeakSet(), released = new WeakSet()
  let response, reader, timeoutReason
  const check = () => {
    signal?.throwIfAborted()
    if (performance.now() - started >= requestMs)
      throw timeoutReason ||= new DOMException('The operation was aborted due to timeout', 'TimeoutError')
  }
  const release = value => {
    if (!value || released.has(value)) return
    released.add(value); ignoreCleanupFailure(() => value.releaseLock())
  }
  const cancelReader = (value, reason) => {
    if (!value || canceled.has(value)) return
    canceled.add(value)
    ignoreCleanupFailure(() => value.cancel(reason)); release(value)
  }
  const cancelResponse = (value, reason) => {
    ignoreCleanupFailure(() => {
      const body = value?.body
      if (!body || canceled.has(body)) return
      canceled.add(body); return body.cancel(reason)
    })
  }
  const wait = (operation, disposeLate) => new Promise((resolve, reject) => {
    let settled = false, failure
    const detach = () => signal?.removeEventListener('abort', aborted)
    const fail = reason => { if (!settled) { settled = true; failure = reason; detach(); reject(reason) } }
    const aborted = () => fail(signal.reason)
    signal?.addEventListener('abort', aborted, { once: true })
    try { check() } catch (error) { fail(error); return }
    Promise.resolve().then(() => { check(); return operation() }).then(value => {
      if (settled) { if (disposeLate) ignoreCleanupFailure(() => disposeLate(value, failure)); return }
      try { check() } catch (error) {
        fail(error); if (disposeLate) ignoreCleanupFailure(() => disposeLate(value, error)); return
      }
      settled = true; detach(); resolve(value)
    }, error => {
      if (settled) return
      try { check() } catch (expired) { error = expired }
      fail(error)
    })
  })
  try {
    response = await wait(() => fetchImpl(url, { method: 'GET', redirect: 'manual', signal,
      headers: { Accept: 'text/html,application/json,*/*;q=0.5', 'User-Agent': 'Mozilla/5.0 (compatible; Jobverify scraper)' } }), cancelResponse)
    check()
    const chunks = []
    let size = 0
    if (response.body !== null) {
      reader = await wait(() => response.body.getReader(), cancelReader)
      for (;;) {
        const { done, value } = await wait(() => reader.read())
        if (done) break
        if (!types.isUint8Array(value)) throw new TypeError('Native response chunk must be a Uint8Array')
        const length = byteLength.call(value)
        if (length > maxBytes - size) throw overflowError
        check()
        // Inspect intrinsic bounds before copying; own length/buffer properties
        // must not disguise the bytes or make Buffer.from allocate extra data.
        chunks.push(Buffer.from(new Uint8Array(arrayBuffer.call(value), byteOffset.call(value), length)))
        size += length; check()
      }
    }
    check()
    const bytes = Buffer.concat(chunks, size)
    const page = { status: response.status, url: response.url, headers: Object.fromEntries(response.headers), bodyBase64: bytes.toString('base64') }
    check(); return page
  } catch (error) {
    if (reader) cancelReader(reader, error); else cancelResponse(response, error)
    throw error
  } finally { release(reader) }
}
