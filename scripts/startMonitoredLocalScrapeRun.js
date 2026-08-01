import fs from 'node:fs'
import { once } from 'node:events'
import path from 'node:path'
import process from 'node:process'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { buildLocalScrapeRunEnv } from './localScrapeRunEnv.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(currentDir, '..', '..')
const backendDir = path.resolve(currentDir, '..')
const runLogsRoot = path.join(repoRoot, 'artifacts', 'run-logs')

const formatTimestamp = (value = new Date()) => {
  const pad = (segment) => String(segment).padStart(2, '0')

  return [
    value.getFullYear(),
    pad(value.getMonth() + 1),
    pad(value.getDate()),
    'T',
    pad(value.getHours()),
    pad(value.getMinutes()),
    pad(value.getSeconds()),
  ].join('')
}

const parseArgs = (argv) => {
  const options = {
    runDir: null,
    parallel: true,
    dryRun: true,
    runnerArgs: [],
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === '--run-dir') {
      options.runDir = argv[index + 1] || null
      index += 1
      continue
    }

    if (arg === '--sequential') {
      options.parallel = false
      continue
    }

    if (arg === '--parallel') {
      options.parallel = true
      continue
    }

    if (arg === '--live') {
      options.dryRun = false
      continue
    }

    if (arg === '--dry-run') {
      options.dryRun = true
      continue
    }

    if (arg === '--') {
      options.runnerArgs.push(...argv.slice(index + 1))
      break
    }
  }

  return options
}

const resolveRunDir = (requestedRunDir) => {
  if (!requestedRunDir) {
    return path.join(runLogsRoot, `local-scrape-${formatTimestamp()}`)
  }

  return path.isAbsolute(requestedRunDir)
    ? requestedRunDir
    : path.resolve(repoRoot, requestedRunDir)
}

const buildRunnerArgs = (options) => {
  const args = ['scraper/runner.js']

  if (options.parallel) args.push('--parallel')
  if (options.dryRun) args.push('--dry-run')
  args.push(...options.runnerArgs)

  return args
}

const writeJsonFile = (filePath, value) => {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2))
}

const ensureDirectory = (directoryPath) => {
  fs.mkdirSync(directoryPath, { recursive: true })
}

const main = () => {
  const options = parseArgs(process.argv.slice(2))
  const runDir = resolveRunDir(options.runDir)
  const stdoutPath = path.join(runDir, 'stdout.log')
  const stderrPath = path.join(runDir, 'stderr.log')
  const metadataPath = path.join(runDir, 'run-metadata.json')
  const runnerArgs = buildRunnerArgs(options)

  ensureDirectory(runDir)

  const env = buildLocalScrapeRunEnv(process.env)

  const stdoutStream = fs.createWriteStream(stdoutPath, { flags: 'a' })
  const stderrStream = fs.createWriteStream(stderrPath, { flags: 'a' })
  const child = spawn(process.execPath, runnerArgs, {
    cwd: backendDir,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  })

  child.stdout.pipe(stdoutStream)
  child.stderr.pipe(stderrStream)

  fs.writeFileSync(path.join(runDir, 'runner.pid'), String(child.pid))
  fs.writeFileSync(path.join(runDir, 'launcher.pid'), String(process.pid))
  writeJsonFile(metadataPath, {
    runDir,
    startedAt: new Date().toISOString(),
    workingDirectory: backendDir,
    nodeExecutable: process.execPath,
    runnerArgs,
    environment: {
      SCRAPER_CONCURRENCY: env.SCRAPER_CONCURRENCY,
      SCRAPER_FAILURE_ABORT_THRESHOLD: env.SCRAPER_FAILURE_ABORT_THRESHOLD,
      WORKDAY_SCRAPER_TIMEOUT_MS: env.WORKDAY_SCRAPER_TIMEOUT_MS,
      WORKDAY_REQUEST_TIMEOUT_MS: env.WORKDAY_REQUEST_TIMEOUT_MS,
      WORKDAY_DETAIL_FETCH_CONCURRENCY: env.WORKDAY_DETAIL_FETCH_CONCURRENCY,
      NODE_OPTIONS: env.NODE_OPTIONS,
      SCRAPER_ONLY: env.SCRAPER_ONLY || null,
      SCRAPER_START_AT: env.SCRAPER_START_AT || null,
      SCRAPER_START_AFTER: env.SCRAPER_START_AFTER || null,
    },
  })

  const stopChild = () => {
    if (child.exitCode !== null) return
    child.kill(process.platform === 'win32' ? undefined : 'SIGTERM')
  }

  process.on('SIGINT', stopChild)
  process.on('SIGTERM', stopChild)

  child.on('exit', async (code, signal) => {
    writeJsonFile(path.join(runDir, 'run-exit.json'), {
      exitedAt: new Date().toISOString(),
      code,
      signal,
    })
    child.stdout.unpipe(stdoutStream)
    child.stderr.unpipe(stderrStream)
    stdoutStream.end()
    stderrStream.end()
    await Promise.all([
      once(stdoutStream, 'finish'),
      once(stderrStream, 'finish'),
    ])
    process.exit(code ?? (signal ? 1 : 0))
  })
}

main()
