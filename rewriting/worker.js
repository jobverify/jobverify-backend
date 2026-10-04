import fs from 'node:fs/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { pipeline } from 'node:stream/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { REWRITE_MODEL } from '../src/services/jobDescriptionPolicy.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const exec = promisify(execFile);
export const sha256File = async file => {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
};
export const ensureArtifact = async ({ file, url, sha256, signal }) => {
  try { if (await sha256File(file) === sha256) return file; } catch (error) { if (error.code !== 'ENOENT') throw error; }
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = file + '.' + randomUUID() + '.part';
  try {
    const response = await fetch(url, { signal });
    if (!response.ok || !response.body) throw new Error('Artifact download HTTP ' + response.status);
    await pipeline(response.body, createWriteStream(temporary, { flags: 'wx' }), { signal });
    if (await sha256File(temporary) !== sha256) throw new Error('Artifact checksum mismatch');
    await fs.rename(temporary, file);
    return file;
  } finally { await fs.rm(temporary, { force: true }); }
};
const findServer = async (directory, platform, depth = 0) => {
  if (depth > 3) return null;
  const executable = platform === 'win32' ? 'llama-server.exe' : 'llama-server';
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    if (entry.name === executable && entry.isFile()) return path.join(directory, entry.name);
    if (entry.isDirectory()) { const found = await findServer(path.join(directory, entry.name), platform, depth + 1); if (found) return found; }
  }
  return null;
};
export const prepareRewriteRuntime = async ({ directory = path.join(root, '.cache/description-rewriter'), signal, platform = process.platform } = {}) => {
  const asset = REWRITE_MODEL.runtimeAssets[platform];
  if (!asset || process.arch !== 'x64') throw new Error('Pinned rewriting runtime supports Linux/Windows x64');
  await fs.mkdir(directory, { recursive: true });
  const modelFile = await ensureArtifact({ file: path.join(directory, REWRITE_MODEL.file),
    url: 'https://huggingface.co/' + REWRITE_MODEL.modelId + '/resolve/' + REWRITE_MODEL.revision + '/' + REWRITE_MODEL.file,
    sha256: REWRITE_MODEL.sha256, signal });
  const archive = await ensureArtifact({ file: path.join(directory, asset.file),
    url: 'https://github.com/ggml-org/llama.cpp/releases/download/' + REWRITE_MODEL.runtimeTag + '/' + asset.file,
    sha256: asset.sha256, signal });
  const runtime = path.join(directory, 'runtime'), marker = path.join(directory, 'runtime-identity.json');
  const identity = JSON.stringify({ tag: REWRITE_MODEL.runtimeTag, sha256: asset.sha256, platform });
  let installed = false;
  try { installed = await fs.readFile(marker, 'utf8') === identity && !!await findServer(runtime, platform); } catch { /* cache miss */ }
  if (!installed) {
    await fs.mkdir(runtime, { recursive: true });
    if (platform === 'win32') await exec('powershell.exe', ['-NoProfile', '-Command',
      "Expand-Archive -LiteralPath '" + archive.replaceAll("'", "''") + "' -DestinationPath '" + runtime.replaceAll("'", "''") + "' -Force"], { windowsHide: true, signal });
    else await exec('tar', ['-xzf', archive, '-C', runtime], { signal });
    await fs.writeFile(marker, identity);
  }
  const binary = await findServer(runtime, platform);
  if (!binary) throw new Error('Pinned CPU server executable missing');
  return { modelFile, binary };
};

export const startRewriteWorker = async ({ modelFile, binary, port = 8766, threads = 2, deadline = Date.now() + 120000, signal, logFile = path.join(root, '.cache/scraper-actions/description-worker.log') }) => {
  const model = 'job-description-' + randomUUID();
  await fs.mkdir(path.dirname(logFile), { recursive: true });
  const log = await fs.open(logFile, 'w');
  const child = spawn(binary, ['-m', modelFile, '--host', '127.0.0.1', '--port', String(port),
    '--alias', model, '-c', String(REWRITE_MODEL.contextTokens), '-np', '1', '-t', String(Math.max(1, Math.min(4, Number(threads) || 2))),
    '-ngl', '0', '--no-context-shift', '--no-webui', '--log-disable'], { cwd: path.dirname(binary), windowsHide: true,
    env: { ...process.env, LD_LIBRARY_PATH: path.dirname(binary) + path.delimiter + (process.env.LD_LIBRARY_PATH || '') },
    stdio: ['ignore', log.fd, log.fd] });
  await log.close();
  let error, exited = false;
  child.on('error', value => { error = value; });
  const exit = new Promise(resolve => child.once('exit', () => { exited = true; resolve(); }));
  const stop = async () => {
    if (!exited && child.pid) { child.kill(); await Promise.race([exit, delay(5000)]); if (!exited) child.kill('SIGKILL'); }
  };
  const endpoint = 'http://127.0.0.1:' + port;
  try {
    const startupDeadline = Math.min(deadline, Date.now() + 120000);
    while (Date.now() < startupDeadline) {
      signal?.throwIfAborted();
      if (error) throw error;
      if (exited) throw new Error('CPU generator exited during startup');
      try {
        const response = await fetch(endpoint + '/v1/models', { signal: AbortSignal.timeout(1000) });
        const health = response.ok ? await response.json() : null;
        if (health?.data?.some(row => row.id === model)) return { endpoint, model, pid: child.pid, stop };
      } catch { /* bounded readiness poll */ }
      await delay(200, undefined, { signal });
    }
    throw new Error('CPU generator startup deadline exceeded');
  } catch (failure) { await stop(); throw failure; }
};

export const workerMemoryBytes = async pid => {
  if (process.platform === 'linux') {
    const status = await fs.readFile('/proc/' + pid + '/status', 'utf8');
    return Number(status.match(/^VmHWM:\s+(\d+)/m)?.[1] || 0) * 1024;
  }
  if (process.platform === 'win32') {
    const { stdout } = await exec('powershell.exe', ['-NoProfile', '-Command',
      'Get-Process -Id ' + Number(pid) + ' -ErrorAction Stop | Select-Object -ExpandProperty PeakWorkingSet64'], { windowsHide: true });
    return Number(stdout.trim()) || null;
  }
  return null;
};
