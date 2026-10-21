import { randomBytes, randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const config = JSON.parse(await fs.readFile(new URL('./search.json', import.meta.url), 'utf8'));
export const SEARCH_IMAGE = config.image;

async function execute(binary, args, { timeout = 90000 } = {}) {
  const child = spawn(binary, args, { stdio: 'ignore', windowsHide: true, signal: AbortSignal.timeout(Math.max(1, timeout)) });
  await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve() : reject(new Error('The referral search runtime command failed.')));
  });
}

export async function prepareReferralSearchRuntime({ execute: run = execute, fetchImpl = fetch, deadline = Date.now() + 150000 } = {}) {
  if (!/^ghcr\.io\/searxng\/searxng@sha256:[a-f0-9]{64}$/.test(SEARCH_IMAGE)) throw new Error('The referral search image must be immutable.');
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'jobverify-referral-search-'));
  const container = `jobverify-referral-search-${randomUUID()}`;
  let stopped = false;
  const stop = async () => {
    if (stopped) return;
    stopped = true;
    try { await run('docker', ['rm', '--force', container], { timeout: 10000 }); } catch { /* It may not have started. */ }
    const resolved = path.resolve(directory);
    if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith('jobverify-referral-search-')) throw new Error('Refusing to clean an unowned search directory.');
    await fs.rm(resolved, { recursive: true, force: true });
  };
  const timeout = maximum => {
    const remaining = Math.floor(deadline - Date.now());
    if (remaining <= 0) throw new Error('The referral search startup budget expired.');
    return Math.min(maximum, remaining);
  };
  try {
    const settings = [
      'use_default_settings:', '  engines:', '    keep_only:', ...config.engines.map(engine => `      - ${engine}`),
      'general:', '  debug: false', 'server:', `  secret_key: ${randomBytes(32).toString('hex')}`, '  limiter: false', '  image_proxy: false',
      'search:', '  formats: [json]', '  safe_search: 1', 'outgoing:', '  request_timeout: 8.0', '  max_request_timeout: 12.0',
      'engines:', ...config.engines.flatMap(engine => [`  - name: ${engine}`, '    disabled: false']), '',
    ].join('\n');
    const settingsPath = path.join(directory, 'settings.yml');
    // The host directory is private; the single read-only mounted file must be
    // readable by the container's unprivileged application user.
    await fs.writeFile(settingsPath, settings, { mode: 0o644 });
    await run('docker', ['pull', SEARCH_IMAGE], { timeout: timeout(90000) });
    await run('docker', ['run', '--detach', '--rm', '--pull', 'never', '--log-driver', 'none', '--name', container,
      '--publish', '127.0.0.1:8780:8080', '--env', 'FORCE_OWNERSHIP=false',
      '--mount', `type=bind,source=${settingsPath},target=/etc/searxng/settings.yml,readonly`, SEARCH_IMAGE], { timeout: timeout(30000) });
    const readyBy = Math.min(deadline, Date.now() + 30000);
    while (Date.now() < readyBy) {
      try { if ((await fetchImpl('http://127.0.0.1:8780/', { redirect: 'error', signal: AbortSignal.timeout(timeout(1000)) })).ok) return { stop }; } catch { /* Still starting. */ }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    throw new Error('The referral search service did not become ready.');
  } catch (error) { await stop(); throw error; }
}
