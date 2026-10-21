import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { availableParallelism } from 'node:os';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { spawn } from 'node:child_process';

export const RESUME_MODEL = JSON.parse(await fs.readFile(new URL('./resume-model.json', import.meta.url), 'utf8'));
const root = fileURLToPath(new URL('../', import.meta.url));
const serverUrl = 'http://127.0.0.1:8770';
export function remainingBudget(deadline, maximum) {
  const remaining = deadline - Date.now();
  if (remaining <= 0) throw new Error('The resume processing time limit was reached. Please retry.');
  return Math.max(1, Math.floor(Math.min(remaining, maximum)));
}
async function hashFile(file) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}
async function immutableDownload(url, target, digest, deadline) {
  remainingBudget(deadline, 600000);
  try { if (await hashFile(target) === digest) return; } catch { /* no cached asset */ }
  await fs.mkdir(path.dirname(target), { recursive: true });
  const temporary = `${target}.${randomUUID()}.download`;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(remainingBudget(deadline, 600000)) });
    if (!response.ok || !response.body) throw new Error('Pinned resume model/runtime download failed.');
    await pipeline(Readable.fromWeb(response.body), createWriteStream(temporary, { flags: 'wx', mode: 0o600 }));
    if (await hashFile(temporary) !== digest) throw new Error('Pinned resume model/runtime checksum mismatch.');
    await fs.rename(temporary, target);
  } finally { await fs.rm(temporary, { force: true }).catch(() => {}); }
}
async function findBinary(directory) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isFile() && entry.name === 'llama-server') return target;
    if (entry.isDirectory()) { const found = await findBinary(target); if (found) return found; }
  }
}
export async function prepareResumeModel({ cacheRoot = root, deadline = Date.now() + 29 * 60000 } = {}) {
  if (process.platform !== 'linux' || process.arch !== 'x64') throw new Error('Resume inference requires the Linux x64 Actions runner.');
  const model = path.join(cacheRoot, '.cache/resume-models', RESUME_MODEL.file);
  await immutableDownload(`https://huggingface.co/${RESUME_MODEL.modelId}/resolve/${RESUME_MODEL.revision}/${RESUME_MODEL.file}`, model, RESUME_MODEL.sha256, deadline);
  const runtime = path.join(cacheRoot, '.cache/resume-runtime', RESUME_MODEL.runtimeTag);
  const archive = path.join(runtime, RESUME_MODEL.runtimeFile);
  await immutableDownload(`https://github.com/ggml-org/llama.cpp/releases/download/${RESUME_MODEL.runtimeTag}/${RESUME_MODEL.runtimeFile}`, archive, RESUME_MODEL.runtimeSha256, deadline);
  await new Promise((resolve, reject) => {
    const child = spawn('tar', ['-xzf', archive, '-C', runtime], { stdio: 'ignore', signal: AbortSignal.timeout(remainingBudget(deadline, 30000)) });
    child.once('error', reject); child.once('exit', code => code === 0 ? resolve() : reject(new Error('Pinned resume runtime could not be extracted.')));
  });
  const binary = await findBinary(runtime);
  if (!binary) throw new Error('Pinned resume runtime is missing llama-server.');
  // Do not pass database credentials or GitHub secrets into the model process.
  const server = spawn(binary, ['--model', model, '--host', '127.0.0.1', '--port', '8770', '--ctx-size', String(RESUME_MODEL.contextTokens),
    '--threads', String(Math.min(4, availableParallelism())), '--parallel', '1', '--jinja', '--log-disable'], {
    stdio: 'ignore', windowsHide: true, env: { PATH: process.env.PATH, LD_LIBRARY_PATH: path.dirname(binary), HOME: '/tmp' },
  });
  let startupError;
  server.once('error', error => { startupError = error; });
  try {
    const readyBy = Math.min(deadline, Date.now() + 120000);
    while (Date.now() < readyBy) {
      if (startupError || server.exitCode !== null) throw new Error('The resume model server could not start.');
      try { if ((await fetch(`${serverUrl}/health`, { signal: AbortSignal.timeout(remainingBudget(readyBy, 1000)) })).ok) return { stop: () => server.kill('SIGTERM') }; } catch { /* model loading */ }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    throw new Error('The resume model server did not become ready.');
  } catch (error) { server.kill('SIGTERM'); throw error; }
}
const comparisonSchema = { type: 'object', additionalProperties: false, required: ['supported', 'missingFacts', 'unsupportedClaims'], properties: {
  supported: { type: 'boolean' }, missingFacts: { type: 'array', items: { type: 'string' } }, unsupportedClaims: { type: 'array', items: { type: 'string' } },
} };
export async function generateResumeText(prompt, { fetchImpl = fetch, deadline = Date.now() + 480000, comparison = false } = {}) {
  const messages = [{ role: 'user', content: prompt }];
  const maxTokens = comparison ? RESUME_MODEL.comparisonOutputTokens : RESUME_MODEL.maxOutputTokens;
  const request = async (endpoint, body) => {
    const response = await fetchImpl(`${serverUrl}${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(remainingBudget(deadline, RESUME_MODEL.requestSeconds * 1000)), body: JSON.stringify(body) });
    if (!response.ok) throw new Error('The local resume model is unavailable. Please retry.');
    return response.json();
  };
  const rendered = await request('/apply-template', { messages });
  if (typeof rendered.prompt !== 'string') throw new Error('Resume model could not count the complete input.');
  const tokens = await request('/tokenize', { content: rendered.prompt, add_special: true, parse_special: true });
  if (!Array.isArray(tokens.tokens) || !tokens.tokens.every(Number.isInteger)) throw new Error('Resume model could not count the complete input.');
  if (tokens.tokens.length + maxTokens + 32 > RESUME_MODEL.contextTokens) throw Object.assign(new Error('The complete resume and job information exceed the model input limit. Use a shorter source document or job description and retry; no content was truncated.'), { statusCode: 422 });
  const payload = await request('/v1/chat/completions', { messages, temperature: comparison ? 0 : 0.1, max_tokens: maxTokens, stream: false,
    ...(comparison ? { response_format: { type: 'json_schema', json_schema: { name: 'resume_source_comparison', strict: true, schema: comparisonSchema } } } : {}),
  });
  const choice = payload.choices?.[0];
  if (choice?.finish_reason !== 'stop' || typeof choice.message?.content !== 'string') throw new Error('The resume model output was incomplete. Please retry.');
  return choice.message.content;
}
