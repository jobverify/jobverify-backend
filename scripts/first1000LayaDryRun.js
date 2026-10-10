import fs from 'node:fs/promises'
import { createWriteStream } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash, randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'
import { setTimeout as delay } from 'node:timers/promises'
import { getScraperCatalog } from '../scraper-support/providers/index.js'
import { buildClassificationInput, resolveClassification } from '../src/services/jobClassificationPolicy.js'
import { LocalJobFifo, LABELS } from './localJobFifo.js'
import { generateReport } from './reportFirst1000Laya.js'
import { atomicJson } from './localAtomicJson.js'
import { buildLocalScrapeRunEnv } from './localScrapeRunEnv.js'
import { resolveConfiguredParallelScraperConcurrency } from '../scraper-support/utils/parallelConcurrency.js'

const backend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const workspace = path.dirname(backend)
const workerDirectory = path.join(workspace, 'artifacts/laya-first1000-2026-10-05')
const digest = value => createHash('sha256').update(value).digest('hex')
const now = () => new Date().toISOString()

export const jobIdentity = (source, job) => {
  const sourceId = job.sourceJobId || job.jobId || job.requisitionId || job.id
  if (sourceId) return digest(JSON.stringify([source, 'source_id', String(sourceId)]))
  const link = job.applyUrl || job.link || job.sourceUrl
  if (link) {
    let canonical = String(link)
    let sharedLink = false
    try {
      const url = new URL(canonical)
      // ref/source query fields and SPA fragments can identify the actual vacancy.
      for (const key of [...url.searchParams.keys()]) if (/^utm_/i.test(key)) url.searchParams.delete(key)
      canonical = url.href
      sharedLink = url.protocol === 'mailto:' || (!url.search && !url.hash && /^\/(?:careers|jobs)?\/?$/i.test(url.pathname))
    } catch {}
    if (sharedLink) return digest(JSON.stringify([source, 'source_url', canonical, job.originalTitle || job.title || null]))
    return digest(JSON.stringify([source, 'source_url', canonical]))
  }
  return digest(JSON.stringify([source, 'title_location', job.originalTitle || job.title || null, job.location || job.city || null]))
}

export { atomicJson } from './localAtomicJson.js'

const readJson = async file => {
  try { return JSON.parse(await fs.readFile(file, 'utf8')) } catch (error) { if (error.code === 'ENOENT') return null; throw error }
}

export class SerialModelProcess {
  constructor(child, logFile) {
    this.child = child
    this.outstanding = null
    this.readySeen = false
    this.stopped = false
    this.ready = new Promise((resolve, reject) => { this.readyResolve = resolve; this.readyReject = reject })
    this.ready.catch(() => {})
    const protocolLog = createWriteStream(logFile, { flags: 'a' })
    const lines = createInterface({ input: child.stdout, crlfDelay: Infinity })
    lines.on('line', line => {
      protocolLog.write(`${line}\n`)
      try {
        const message = JSON.parse(line)
        if (message.type === 'ready' && !this.readySeen) {
          this.readySeen = true; this.readyResolve(message)
        } else if (message.type === 'result' && this.outstanding) {
          const pending = this.outstanding; this.outstanding = null
          clearTimeout(pending.timer); pending.resolve(message)
        } else throw new Error('Unsolicited model protocol message')
      } catch (error) { this.fail(error) }
    })
    this.exited = new Promise(resolve => {
      child.once('error', error => { this.fail(error); resolve({ code: 1, error: error.message }) })
      child.once('exit', (code, signal) => {
        if (!this.stopped || this.outstanding) this.fail(new Error(`Model exited: ${code}/${signal}`))
        resolve({ code, signal }); protocolLog.end(); lines.close()
      })
    })
  }

  fail(error) {
    this.failure = error
    this.readyReject(error)
    if (this.outstanding) { clearTimeout(this.outstanding.timer); this.outstanding.reject(error); this.outstanding = null }
  }

  async request(request) {
    await this.ready
    if (this.failure) throw this.failure
    if (this.outstanding) throw new Error('Only one model request may be in flight')
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => this.fail(new Error('Single job exceeded one-hour inference timeout')), 3_600_000)
      this.outstanding = { resolve, reject, timer }
      this.child.stdin.write(`${JSON.stringify(request)}\n`, error => { if (error) this.fail(error) })
    })
  }

  async stop() {
    this.stopped = true
    this.child.stdin.end()
    const exited = await Promise.race([this.exited, delay(30_000, null, { ref: false })])
    if (!exited) { this.child.kill(); await this.exited }
  }
}

export const parseOptions = (argv, env = buildLocalScrapeRunEnv()) => {
  const options = { runDir: path.join(workerDirectory, 'run'), count: 1000, captureOnly: false, classifyOnly: false,
    scraperConcurrency: resolveConfiguredParallelScraperConcurrency(env.SCRAPER_CONCURRENCY ?? '') }
  for (let index = 0; index < argv.length; index++) {
    if (argv[index] === '--run-dir') options.runDir = path.resolve(argv[++index])
    else if (argv[index] === '--count') options.count = Number(argv[++index])
    else if (argv[index] === '--capture-only') options.captureOnly = true
    else if (argv[index] === '--classify-only') options.classifyOnly = true
    else throw new Error(`Unknown option ${argv[index]}`)
  }
  if (!Number.isInteger(options.count) || options.count < 1 || options.count > 1000) throw new Error('Count must be between 1 and 1000')
  if (options.captureOnly && options.classifyOnly) throw new Error('Choose only one phase override')
  return options
}

export const scopeIsComplete = (checkpoint, sources) => checkpoint?.status === 'complete'
  && checkpoint.completedCount === sources.length && checkpoint.totalSources === sources.length
  && JSON.stringify(checkpoint.catalogSources) === JSON.stringify(sources)

export async function publishFinalAnalysis(directory, { runComplete, log = console.error } = {}) {
  try { return await generateReport(directory) }
  catch (error) {
    try { await atomicJson(path.join(directory, 'analysis-error.json'), { error: error.message, at: now(), runComplete }) }
    catch (diagnosticError) { log(`Cannot save analysis diagnostic: ${diagnosticError.message}`) }
    log(`Local analysis failed: ${error.message}`)
    return null
  }
}

export async function runFirst1000(options) {
  const directory = options.runDir
  await fs.mkdir(directory, { recursive: true })
  const lockPath = path.join(directory, 'run.lock')
  const token = randomUUID()
  try { await fs.writeFile(lockPath, JSON.stringify({ pid: process.pid, startedAt: now(), token }), { flag: 'wx' }) }
  catch (error) {
    if (error.code !== 'EEXIST') throw error
    const old = await readJson(lockPath)
    let active = true
    try { process.kill(old.pid, 0) } catch (probe) { if (probe.code === 'ESRCH') active = false; else throw probe }
    if (active) throw new Error(`Run directory is already owned by process ${old.pid}`)
    await fs.unlink(lockPath)
    await fs.writeFile(lockPath, JSON.stringify({ pid: process.pid, startedAt: now(), token }), { flag: 'wx' })
  }

  try {
  let model, scrapeChild, producerError, stopRequested = false
  const taskController = new AbortController()
  let producerClosed = false, scrapeSettled = false
  const began = Date.now()
  const selected = getScraperCatalog().slice(0, options.count)
  if (selected.length !== options.count) throw new Error('Catalog contains fewer companies than requested')
  const sources = selected.map(provider => provider.source)
  const sourceSet = new Set(sources)
  const manifest = { version: 1, count: options.count, sources, orderedSourcesHash: digest(JSON.stringify(sources)),
    catalogOrder: 'getScraperCatalog()', scrapingConcurrency: options.scraperConcurrency, modelProcesses: 1, modelIntraThreads: 1,
    modelInterThreads: 1, modelBatchSize: 1, maxConcurrentJobs: 1, localOnly: true, paidInference: false,
    pretrainedOnly: true, inputView: 'full employer source with overlapping token windows', categories: LABELS }
  const existingManifest = await readJson(path.join(directory, 'manifest.json'))
  if (existingManifest && JSON.stringify(existingManifest) !== JSON.stringify(manifest)) throw new Error('Run manifest differs; choose a new run directory')
  await atomicJson(path.join(directory, 'manifest.json'), manifest)
  const outbox = path.join(directory, 'outbox')
  await fs.mkdir(outbox, { recursive: true })
  const scrapeDir = path.join(directory, 'scrape')
  await fs.mkdir(scrapeDir, { recursive: true })
  const counts = { classified: 0, unusable_input: 0, native_error: 0, rulesAgreement: 0, rulesCompared: 0 }
  const distribution = Object.fromEntries(LABELS.map(label => [label, 0]))
  const inferenceSeconds = [], waits = []
  let peakModelResidentBytes = 0, readyMessage
  const collect = result => {
    counts[result.status]++
    if (result.status === 'classified') {
      distribution[result.jobType]++
      if (typeof result.rulesComparison?.agreement === 'boolean') { counts.rulesCompared++; counts.rulesAgreement += Number(result.rulesComparison.agreement) }
      if (Number.isFinite(result.inferenceSeconds)) inferenceSeconds.push(result.inferenceSeconds)
    }
    if (Number.isFinite(result.queueWaitSeconds)) waits.push(result.queueWaitSeconds)
    const memory = result.memory || result.inferenceProcessMemory || {}
    peakModelResidentBytes = Math.max(peakModelResidentBytes, memory.peakResidentBytes || memory.peakWorkingSetBytes || memory.residentBytes || 0)
  }
  const queue = await LocalJobFifo.open(directory, { onHistoricalResult: collect })
  const discovered = new Set()
  const ingest = async () => {
    const names = (await fs.readdir(outbox)).filter(name => name.endsWith('.jobs.json')).sort()
    for (const name of names) {
      if (discovered.has(name)) continue
      const file = path.join(outbox, name)
      const bytes = await fs.readFile(file)
      const payload = JSON.parse(bytes.toString('utf8'))
      if (!sourceSet.has(payload.source) || !Array.isArray(payload.jobs)) throw new Error('Outbox contains jobs outside the frozen catalog scope')
      const outboxHash = digest(bytes)
      const additions = []
      for (let jobIndex = 0; jobIndex < payload.jobs.length; jobIndex++) {
        const job = payload.jobs[jobIndex]
        const input = buildClassificationInput(job)
        // An early raw record waits for enrichment when it cannot supply a usable description.
        if ((payload.phase === 'raw_provider_description' || payload.phase === 'raw') && (!input.body || input.incomplete || Buffer.byteLength(input.body) > 262144)) continue
        const id = jobIdentity(payload.source, job)
        if (queue.identities.has(id)) continue
        additions.push({ id, source: payload.source, outboxFile: file, outboxHash, jobIndex,
          availableAt: payload.availableAt || payload.capturedAt, phase: payload.phase || 'enriched_description' })
      }
      await queue.enqueue(additions)
      discovered.add(name)
    }
  }
  let statusChain = Promise.resolve()
  const status = (phase, extra = {}) => {
    const operation = statusChain.catch(() => {}).then(async () => {
    const checkpoint = await readJson(path.join(scrapeDir, 'run-state.json'))
    const sorted = [...inferenceSeconds].sort((a, b) => a - b)
    const mean = inferenceSeconds.length ? inferenceSeconds.reduce((a, b) => a + b, 0) / inferenceSeconds.length : null
    const data = { phase, updatedAt: now(), coordinatorPid: process.pid, modelPid: model?.child.pid || null,
      elapsedSecondsThisProcess: (Date.now() - began) / 1000, catalogCompanies: options.count,
      companiesAttempted: checkpoint?.completedCount || 0, scrapeStatus: checkpoint?.status || 'not_started',
      queuedJobs: queue.references.length, completedJobs: queue.completed.size, pendingJobs: queue.pendingCount,
      counts, categoryCounts: distribution, rulesAgreementPercent: counts.rulesCompared ? 100 * counts.rulesAgreement / counts.rulesCompared : null,
      rulesAgreementIsAccuracy: false, independentlyReviewedAccuracyPercent: null,
      meanInferenceSeconds: mean, medianInferenceSeconds: sorted.length ? sorted[Math.floor(sorted.length / 2)] : null,
      remainingInferenceSecondsEstimate: mean === null ? null : mean * queue.pendingCount,
      peakModelResidentBytes, modelConfiguration: readyMessage || null, producerClosed, stopRequested, ...extra }
    await atomicJson(path.join(directory, 'status.json'), data)
    return data
    })
    statusChain = operation
    return operation
  }
  const stop = () => {
    stopRequested = true
    fs.writeFile(path.join(scrapeDir, 'stop-request.json'), JSON.stringify({ signal: 'SIGTERM', reason: 'coordinator stop' })).catch(() => {})
  }
  process.on('SIGINT', stop); process.on('SIGTERM', stop)
  let scrapePromise
  try {
    if (!options.captureOnly) {
      const priorSpawn = await readJson(path.join(directory, 'model-spawn.json'))
      const priorReady = await readJson(path.join(directory, 'model-ready.json'))
      const priorPid = priorSpawn?.pid || priorReady?.pid
      if (Number.isInteger(priorPid)) {
        for (let attempt = 0; attempt < 90; attempt++) {
          let running = true
          try { process.kill(priorPid, 0) } catch (error) { if (error.code === 'ESRCH') running = false; else throw error }
          if (!running) break
          if (attempt === 89) throw new Error(`Previous model process ${priorPid} is still present; refusing a second model`)
          await delay(1000)
        }
      }
      const python = path.join(backend, '.cache/laya-python/package/tools/python.exe')
      const child = spawn(python, ['-u', path.join(workerDirectory, 'single_job_worker.py'),
        '--output-dir', path.join(directory, 'worker')], { cwd: backend, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, HF_HOME: path.join(backend, '.cache/laya-model'), HF_HUB_OFFLINE: '1', TRANSFORMERS_OFFLINE: '1',
          OMP_NUM_THREADS: '1', MKL_NUM_THREADS: '1', TOKENIZERS_PARALLELISM: 'false', USE_TF: '0', PYTHONUNBUFFERED: '1' } })
      child.stderr.pipe(createWriteStream(path.join(directory, 'model.stderr.log'), { flags: 'a' }))
      model = new SerialModelProcess(child, path.join(directory, 'model.protocol.jsonl'))
      await atomicJson(path.join(directory, 'model-spawn.json'), { pid: child.pid, coordinatorPid: process.pid, spawnedAt: now(), workerFile: path.join(workerDirectory, 'single_job_worker.py') })
      readyMessage = await Promise.race([model.ready, delay(180_000, null, { ref: false }).then(() => { throw new Error('Model readiness timeout') })])
      if (readyMessage.pid !== child.pid || readyMessage.config?.modelInstances !== 1 || readyMessage.config?.intraThreads !== 1 || readyMessage.config?.interThreads !== 1
        || readyMessage.config?.batchSize !== 1 || readyMessage.config?.jobsInFlight !== 1 || readyMessage.config?.device !== 'cpu') throw new Error('Worker configuration violates the single-job CPU limits')
      await atomicJson(path.join(directory, 'model-ready.json'), readyMessage)
    }
    if (!options.classifyOnly) {
      scrapeChild = spawn(process.execPath, ['--use-system-ca', 'scripts/resilientLocalScrape.js', '--run-dir', scrapeDir,
        '--dry-run', '--parallel', '--max-restarts', '3', '--restart-delay-seconds', '10', '--shutdown-grace-seconds', '90'], {
        cwd: backend, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env,
          SCRAPER_FIRST_N: String(options.count), SCRAPER_ONLY: ' ', SCRAPER_START_AT: ' ', SCRAPER_START_AFTER: ' ',
          SCRAPER_CONCURRENCY: String(options.scraperConcurrency), SCRAPER_FAILURE_ABORT_THRESHOLD: '0', JOB_CLASSIFICATION_MODE: 'off',
          MONGO_URI: 'disabled-for-local-dry-run', MONGODB_URI: 'disabled-for-local-dry-run', TELEGRAM_ENABLED: 'false',
          SCRAPER_DISABLE_DRY_RUN_PUBLIC_EXPERIENCE: '0', SCRAPER_DRY_RUN_MAX_JOBS_TO_ENRICH: 'all',
          WORKDAY_DETAIL_FETCH_CONCURRENCY: '1', WORKDAY_SCRAPER_TIMEOUT_MS: '210000', WORKDAY_REQUEST_TIMEOUT_MS: '20000',
          SCRAPER_RUN_LEASE: '0', NODE_OPTIONS: '--use-system-ca', NODE_USE_SYSTEM_CA: '1',
          SCRAPER_RAW_CAPTURE_DIRECTORY: path.join(directory, 'raw'), SCRAPER_LOCAL_JOB_OUTBOX_DIRECTORY: outbox } })
      scrapeChild.stdout.pipe(createWriteStream(path.join(directory, 'scrape.stdout.log'), { flags: 'a' }))
      scrapeChild.stderr.pipe(createWriteStream(path.join(directory, 'scrape.stderr.log'), { flags: 'a' }))
      scrapePromise = new Promise(resolve => {
        scrapeChild.once('error', error => { producerError = error; scrapeSettled = true; resolve() })
        scrapeChild.once('exit', (code, signal) => { if (code !== 0) producerError = new Error(`Scrape supervisor exited ${code}/${signal}`); scrapeSettled = true; resolve() })
      })
    } else { scrapeSettled = true; scrapePromise = Promise.resolve() }
    const producing = (async () => {
      try {
      do { taskController.signal.throwIfAborted(); await ingest(); await status('running'); if (!scrapeSettled) await delay(250) } while (!scrapeSettled)
      await scrapePromise; await ingest(); await queue.appendChain
      // A partial scrape must not define the broad accuracy sample.
      const reviewCheckpoint = await readJson(path.join(scrapeDir, 'run-state.json'))
      if (!scopeIsComplete(reviewCheckpoint, sources)) return
      const candidates = []
      let eligibleReviewJobs = 0, currentFile, currentPayload
      for (const ref of queue.references) {
        taskController.signal.throwIfAborted()
        if (currentFile !== ref.outboxFile) {
          const bytes = await fs.readFile(ref.outboxFile)
          if (digest(bytes) !== ref.outboxHash) throw new Error('Review source archive changed')
          currentPayload = JSON.parse(bytes.toString('utf8')); currentFile = ref.outboxFile
        }
        const input = buildClassificationInput(currentPayload.jobs[ref.jobIndex], { now: new Date(ref.enqueuedAt) })
        if (!input.body || input.incomplete || Buffer.byteLength(input.body) > 262144) continue
        eligibleReviewJobs++
        candidates.push({ key: digest(`first1000-independent-source-review-v1:${ref.id}`), id: ref.id, source: ref.source,
          input: { title: input.title, body: input.body, sourceEmploymentType: input.sourceEmploymentType,
            sourceExperienceRequired: input.sourceExperienceRequired, sourceFields: input.sourceFields },
          sourceArchive: { file: ref.outboxFile, hash: ref.outboxHash, jobIndex: ref.jobIndex } })
        if (candidates.length > 100) { candidates.sort((a, b) => a.key.localeCompare(b.key)); candidates.pop() }
      }
      const sample = candidates.sort((a, b) => a.key.localeCompare(b.key))
      await atomicJson(path.join(directory, 'independent-review-packet.json'), { sampling: '100 smallest SHA256 keys over first usable source job identities', seed: 'first1000-independent-source-review-v1',
        samplingScopeComplete: true, catalogCompanies: options.count, orderedSourcesHash: manifest.orderedSourcesHash,
        predictionsHidden: true, countsTowardTraining: false, eligibleReviewJobs, jobs: sample })
      } finally { producerClosed = true }
    })()
    producing.catch(() => {})
    let cachedFile, cachedHash, cachedPayload
    const consuming = options.captureOnly ? Promise.resolve() : queue.consume(async ref => {
      if (stopRequested) throw new Error('Stopped with durable queue preserved')
      taskController.signal.throwIfAborted()
      if (cachedFile !== ref.outboxFile) {
        const bytes = await fs.readFile(ref.outboxFile)
        cachedHash = digest(bytes)
        cachedPayload = JSON.parse(bytes.toString('utf8')); cachedFile = ref.outboxFile
      }
      if (cachedHash !== ref.outboxHash) throw new Error('Immutable outbox changed after enqueue')
      const job = cachedPayload.jobs[ref.jobIndex]
      const input = buildClassificationInput(job, { now: new Date(ref.enqueuedAt) })
      const requestedAt = now()
      const result = await model.request({ sequence: ref.sequence, id: ref.id, source: ref.source, input, enqueuedAt: ref.enqueuedAt })
      const logic = resolveClassification(job, null, { now: new Date(ref.enqueuedAt) })
      return { ...result, requestedAt, availableAt: ref.availableAt, enqueuedAt: ref.enqueuedAt,
        queueWaitSeconds: Math.max(0, (new Date(requestedAt) - new Date(ref.enqueuedAt)) / 1000),
        sourceInputHash: input.inputHash, sourceArchive: { file: ref.outboxFile, hash: ref.outboxHash, jobIndex: ref.jobIndex },
        rulesComparison: { logicJobType: logic.resolved.jobType, modelJobType: result.jobType || null,
          agreement: result.status === 'classified' ? result.jobType === logic.resolved.jobType : null, logicResolved: logic.resolved },
        job: { ...job, jobType: result.status === 'classified' ? result.jobType : null,
          classification: { localTrial: true, modelVersion: readyMessage?.identity || null, probabilities: result.probabilities || null, status: result.status } } }
    }, { producerClosed: () => producerClosed, onResult: async result => { collect(result); if (queue.completed.size % 25 === 0) await status('running') } })
    try { await Promise.all([producing, consuming]) }
    catch (error) {
      taskController.abort(error); producerClosed = true; stop(); model?.fail(error)
      await Promise.allSettled([producing, consuming])
      throw error
    }
    const checkpoint = await readJson(path.join(scrapeDir, 'run-state.json'))
    if (stopRequested || !scopeIsComplete(checkpoint, sources)) producerError ||= new Error('Scrape checkpoint does not prove the complete frozen company scope')
    const final = await status(options.captureOnly ? 'capture_complete' : producerError ? 'classification_complete_scrape_failed' : 'complete', { producerError: producerError?.message || null })
    await atomicJson(path.join(directory, 'run-exit.json'), { ...final, completedAt: now(), complete: !options.captureOnly && !producerError && queue.pendingCount === 0 })
    // Reporting failures must not rewrite evidence that scraping and inference completed.
    await publishFinalAnalysis(directory, { runComplete: !options.captureOnly && !producerError && queue.pendingCount === 0 })
    console.log(JSON.stringify({ phase: final.phase, companiesAttempted: final.companiesAttempted, completedJobs: final.completedJobs, counts: final.counts }))
    return final
  } catch (error) {
    stop()
    await status('interrupted', { error: error.message })
    await atomicJson(path.join(directory, 'run-exit.json'), { complete: false, exitedAt: now(), error: error.message })
    throw error
  } finally {
    if (scrapeChild && !scrapeSettled) {
      stop(); await Promise.race([scrapePromise, delay(95_000, null, { ref: false })])
      if (!scrapeSettled) { scrapeChild.kill(); await scrapePromise }
    }
    await model?.stop()
    process.off('SIGINT', stop); process.off('SIGTERM', stop)
  }
  } finally {
    const currentLock = await readJson(lockPath)
    if (currentLock?.token === token) await fs.unlink(lockPath)
  }
}

if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  runFirst1000(parseOptions(process.argv.slice(2))).catch(error => { console.error(error.stack); process.exitCode = 1 })
}
