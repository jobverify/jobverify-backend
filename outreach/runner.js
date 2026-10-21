import { randomUUID, createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { spawn } from 'node:child_process';
import OutreachTask from '../src/models/OutreachTask.js';
import User from '../src/models/User.js';
import { buildDraftPrompt, validateGeneratedDraft, completeDraftTask } from '../src/services/outreachDrafting.js';

export const OUTREACH_MODEL = JSON.parse(await fs.readFile(new URL('./model.json', import.meta.url), 'utf8'));
const root = fileURLToPath(new URL('../', import.meta.url));
const startupBudget = (deadline, maximum) => {
  const remaining = Math.floor(deadline - Date.now());
  if (!(remaining > 0)) throw new Error('The outreach runtime startup budget expired.');
  return Math.min(maximum, remaining);
};
const hashFile = async (file, deadline = Infinity) => {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) { startupBudget(deadline, 120000); hash.update(chunk); }
  return hash.digest('hex');
};
async function download(url, target, sha256, { deadline = Infinity } = {}) {
  startupBudget(deadline, 120000);
  try { if (await hashFile(target, deadline) === sha256) return target; } catch { /* first run or expired budget; checked before download */ }
  await fs.mkdir(path.dirname(target), { recursive: true });
  const temporary = `${target}.${randomUUID()}.download`;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(startupBudget(deadline, 120000)) });
    if (!response.ok || !response.body) throw new Error('Immutable outreach model/runtime download failed.');
    await pipeline(Readable.fromWeb(response.body), createWriteStream(temporary, { flags: 'wx', mode: 0o600 }));
    if (await hashFile(temporary, deadline) !== sha256) throw new Error('Outreach model/runtime checksum mismatch.');
    await fs.rename(temporary, target);
    return target;
  } finally { await fs.rm(temporary, { force: true }).catch(() => {}); }
}
async function command(binary, args, options = {}) {
  const child = spawn(binary, args, { ...options, stdio: 'ignore', windowsHide: true });
  await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', code => code === 0 ? resolve() : reject(new Error('Outreach runtime extraction failed.'))); });
}
async function findBinary(directory) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isFile() && entry.name === 'llama-server') return target;
    if (entry.isDirectory()) { const match = await findBinary(target); if (match) return match; }
  }
  return null;
}
/** Only immutable model bytes enter the Actions cache; prompts and outputs stay in memory. */
export async function prepareOutreachRuntime({ cacheRoot = root, deadline = Infinity } = {}) {
  if (process.platform !== 'linux' || process.arch !== 'x64') throw new Error('The outreach Actions worker requires the standard Linux x64 runner.');
  const modelPath = path.join(cacheRoot, '.cache/outreach-models', OUTREACH_MODEL.file);
  await download(`https://huggingface.co/${OUTREACH_MODEL.modelId}/resolve/${OUTREACH_MODEL.revision}/${OUTREACH_MODEL.file}`, modelPath, OUTREACH_MODEL.sha256, { deadline });
  const runtimeDir = path.join(cacheRoot, '.cache/outreach-runtime', OUTREACH_MODEL.runtimeTag);
  const archive = path.join(runtimeDir, OUTREACH_MODEL.runtimeFile);
  await download(`https://github.com/ggml-org/llama.cpp/releases/download/${OUTREACH_MODEL.runtimeTag}/${OUTREACH_MODEL.runtimeFile}`, archive, OUTREACH_MODEL.runtimeSha256, { deadline });
  await command('tar', ['-xzf', archive, '-C', runtimeDir], { signal: AbortSignal.timeout(startupBudget(deadline, 30000)) });
  const binary = await findBinary(runtimeDir);
  if (!binary) throw new Error('The pinned outreach runtime did not contain llama-server.');
  startupBudget(deadline, 60000);
  const server = spawn(binary, ['--model', modelPath, '--host', '127.0.0.1', '--port', '8769', '--ctx-size', String(OUTREACH_MODEL.contextTokens), '--threads', String(OUTREACH_MODEL.cpuThreads), '--parallel', '1', '--jinja', '--log-disable'], { stdio: 'ignore', windowsHide: true, env: { ...process.env, LD_LIBRARY_PATH: [path.dirname(binary), process.env.LD_LIBRARY_PATH].filter(Boolean).join(':') } });
  let startupError;
  server.on('error', error => { startupError = error; });
  try {
    const readyBy = Math.min(deadline, Date.now() + 60000);
    while (Date.now() < readyBy) {
      if (startupError || server.exitCode !== null) throw new Error('The outreach model server could not start.');
      try { const response = await fetch('http://127.0.0.1:8769/health', { signal: AbortSignal.timeout(startupBudget(readyBy, 1000)) }); if (response.ok) return { stop: () => server.kill('SIGTERM') }; } catch { /* Loading model. */ }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    throw new Error('The outreach model server did not become ready.');
  } catch (error) { server.kill('SIGTERM'); throw error; }
}

export async function generateOutreachDraft(input, { fetchImpl = fetch, remainingMs = 110000 } = {}) {
  const response = await fetchImpl('http://127.0.0.1:8769/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(Math.max(1, Math.min(OUTREACH_MODEL.requestSeconds * 1000, remainingMs))), body: JSON.stringify({ messages: [{ role: 'user', content: buildDraftPrompt(input) }], temperature: 0.2, max_tokens: OUTREACH_MODEL.maxOutputTokens, stream: false, response_format: { type: 'json_schema', json_schema: { name: 'outreach_draft', strict: true, schema: { type: 'object', additionalProperties: false, required: ['linkedin', 'emailSubject', 'emailBody'], properties: { linkedin: { type: 'string' }, emailSubject: { type: 'string' }, emailBody: { type: 'string' } } } } } }) });
  if (!response.ok) throw new Error('Local outreach model returned an error.');
  const payload = await response.json();
  const choice = payload.choices?.[0];
  if (choice?.finish_reason !== 'stop') throw new Error('Local outreach generation was incomplete.');
  return validateGeneratedDraft(choice.message?.content);
}
export async function drainDraftTasks({ generate = generateOutreachDraft, maxTasks = 3, deadline = Date.now() + 360000, onProgress = () => {} } = {}) {
  const counts = { attempted: 0, completed: 0, failed: 0 };
  while (counts.attempted < Math.min(3, maxTasks) && deadline - Date.now() > 15000) {
    const now = new Date();
    const owner = randomUUID();
    const task = await OutreachTask.findOneAndUpdate({ kind: 'draft', ready: true, attempts: { $lt: 3 }, $or: [{ status: 'queued' }, { status: 'running', leaseUntil: { $lt: now } }] }, { $set: { status: 'running', leaseOwner: owner, leaseUntil: new Date(now.getTime() + 3 * 60000) }, $inc: { attempts: 1 } }, { new: true, sort: { createdAt: 1 } }).select('+input +leaseOwner').lean();
    if (!task) break;
    counts.attempted++;
    try {
      if (!await User.exists({ _id: task.user, deactivated: { $ne: true }, outreachDeletingAt: null })) { await OutreachTask.deleteOne({ _id: task._id }); continue; }
      const draft = await generate(task.input, { remainingMs: deadline - Date.now() });
      if (await completeDraftTask(task, draft)) counts.completed++; else counts.failed++;
    } catch {
      counts.failed++;
      await OutreachTask.updateOne({ _id: task._id, status: 'running', leaseOwner: owner }, { $set: { status: 'failed', error: 'AI drafting was interrupted or returned an invalid result. Your saved draft is unchanged; please retry.', completedAt: new Date() }, $unset: { activeKey: 1, leaseOwner: 1, leaseUntil: 1 } });
    }
    onProgress({ ...counts });
  }
  return counts;
}
