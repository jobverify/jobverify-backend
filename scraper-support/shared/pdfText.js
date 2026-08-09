import { getDocument, VerbosityLevel } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { createCanvas } from '@napi-rs/canvas'
import { createWorker } from 'tesseract.js'

const normalizePdfWhitespace = (value) => String(value ?? '')
  .replace(/[ \t]+\n/g, '\n')
  .replace(/\n[ \t]+/g, '\n')
  .replace(/[ \t]{2,}/g, ' ')
  .replace(/\n{3,}/g, '\n\n')
  .trim()

const OCR_RENDER_SCALE = 2
const OCR_MAX_PAGES = 2
const OCR_WORKER_COUNT = 2

let ocrWorkerPoolPromise = null
let ocrWorkerCursor = 0

const toPdfUint8Array = (value) => {
  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value)
  }

  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
  }

  return new Uint8Array(value)
}

const getOcrWorkerPool = async () => {
  ocrWorkerPoolPromise ??= Promise.all(
    Array.from({ length: OCR_WORKER_COUNT }, () => createWorker('eng')),
  ).then((workers) => ({
    workers,
    queues: workers.map(() => Promise.resolve()),
  }))

  return ocrWorkerPoolPromise
}

const renderPdfPageToPng = async (page) => {
  const viewport = page.getViewport({ scale: OCR_RENDER_SCALE })
  const canvas = createCanvas(
    Math.max(1, Math.ceil(viewport.width)),
    Math.max(1, Math.ceil(viewport.height)),
  )
  const context = canvas.getContext('2d')
  await page.render({
    canvasContext: context,
    viewport,
  }).promise
  return canvas.toBuffer('image/png')
}

const extractTextFromPdfWithOcr = async (pdf) => {
  const pageCount = Math.min(pdf.numPages, OCR_MAX_PAGES)
  if (pageCount === 0) return ''

  const pool = await getOcrWorkerPool()
  const pages = []

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const imageBuffer = await renderPdfPageToPng(page)
    const workerIndex = ocrWorkerCursor % pool.workers.length
    ocrWorkerCursor += 1
    const resultPromise = pool.queues[workerIndex].then(
      () => pool.workers[workerIndex].recognize(imageBuffer),
      () => pool.workers[workerIndex].recognize(imageBuffer),
    )
    pool.queues[workerIndex] = resultPromise.catch(() => {})
    const result = await resultPromise
    const pageText = normalizePdfWhitespace(result?.data?.text)
    if (pageText) {
      pages.push(pageText)
    }
  }

  return pages.join('\n\n')
}

export const extractTextFromPdfBuffer = async (value) => {
  const pdfData = toPdfUint8Array(value)
  const loadingTask = getDocument({
    data: pdfData,
    useWorkerFetch: false,
    isEvalSupported: false,
    verbosity: VerbosityLevel.ERRORS,
  })

  try {
    const pdf = await loadingTask.promise
    const pages = []

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber)
      const textContent = await page.getTextContent()
      const fragments = []

      for (const item of textContent.items) {
        if (!item || typeof item.str !== 'string') continue

        const text = item.str.trim()
        if (!text) continue

        fragments.push(text)
        if (item.hasEOL) {
          fragments.push('\n')
        }
      }

      const pageText = normalizePdfWhitespace(fragments.join(' '))
      if (pageText) {
        pages.push(pageText)
      }
    }

    const directText = pages.join('\n\n')
    if (pages.length > 0) {
      return directText
    }

    const ocrText = await extractTextFromPdfWithOcr(pdf)
    return ocrText || directText
  } finally {
    await loadingTask.destroy()
  }
}
