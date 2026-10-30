import { githubRequest } from './github.js';
import { pipelineError } from './execution.js';

const path = '/contents/.github/workflows/scraper.yml';
const clock = minutes => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

export function intervalSettings(hours, startAt) {
  if (!Number.isInteger(hours) || hours < 1 || hours > 168) throw pipelineError('Choose a whole interval from 1 to 168 hours.', 400);
  if (typeof startAt !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:00(?:\.000)?Z$/.test(startAt) || !Number.isFinite(Date.parse(startAt))) throw pipelineError('Choose a valid first run date and time.', 400);
  const normalized = new Date(startAt).toISOString();
  if (normalized.replace('.000Z', 'Z') !== startAt.replace('.000Z', 'Z')) throw pipelineError('Choose a valid first run date and time.', 400);
  return { mode: 'interval', hours, startAt: normalized, cron: `${new Date(startAt).getUTCMinutes()} * * * *` };
}

export function intervalSlot(schedule, now = Date.now()) {
  const anchor = Date.parse(schedule.startAt), period = schedule.hours * 3600000;
  if (now < anchor) return null;
  return Math.floor((now - anchor) / period);
}

export function nextIntervalRun(schedule, now = Date.now()) {
  const anchor = Date.parse(schedule.startAt), period = schedule.hours * 3600000;
  return new Date(anchor + Math.max(0, Math.ceil((now - anchor) / period)) * period).toISOString();
}

export function dailyCron(time) {
  if (typeof time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw pipelineError('Choose a valid daily time in IST (HH:MM).', 400);
  const [hour, minute] = time.split(':').map(Number);
  const utc = (hour * 60 + minute - 330 + 1440) % 1440;
  return `${utc % 60} ${Math.floor(utc / 60)} * * *`;
}

// Only edit one daily schedule or our anchored interval; refuse unfamiliar YAML.
export function parseSchedule(source) {
  const block = source.match(/^  schedule:\r?\n((?:[ \t]{4,}[^\r\n]*\r?\n)+)/m);
  const interval = block?.[1].match(/^    - cron: '([^']+)' # jobverify-interval (\{[^\r\n]+\})\r?\n$/);
  if (interval) {
    try {
      const { hours, startAt } = JSON.parse(interval[2]);
      const settings = intervalSettings(hours, startAt);
      if (settings.cron !== interval[1]) throw new Error('Interval cron mismatch');
      return { block: block[0], ...settings };
    } catch { throw pipelineError('The saved interval schedule is invalid. Fix the workflow before editing.', 409); }
  }
  const entry = block?.[1].match(/^    - cron: (['"])(\d{1,2}) (\d{1,2}) \* \* \*\1(?:[ \t]*#[^\r\n]*)?\r?\n$/);
  if (!entry || Number(entry[2]) > 59 || Number(entry[3]) > 23) throw pipelineError('The workflow must have one daily UTC schedule or a supported interval to edit it here.', 409);
  return { block: block[0], mode: 'daily', cron: `${Number(entry[2])} ${Number(entry[3])} * * *`, time: clock((Number(entry[3]) * 60 + Number(entry[2]) + 330) % 1440) };
}

async function load(request) {
  const repo = process.env.GITHUB_REPO;
  const repository = await request(repo, '');
  const branch = repository.default_branch;
  const file = await request(repo, `${path}?ref=${encodeURIComponent(branch)}`);
  if (file.encoding !== 'base64' || !file.content || !file.sha) throw pipelineError('GitHub did not return the scraper workflow file.', 502);
  const source = Buffer.from(file.content, 'base64').toString('utf8');
  return { repo, branch, file, source, parsed: parseSchedule(source) };
}

const view = ({ branch, file, parsed: { block: _block, ...settings } }) => ({ ...settings, ...(settings.mode === 'interval' ? { nextRunAt: nextIntervalRun(settings) } : {}), timezone: 'Asia/Kolkata', sha: file.sha, branch });
export async function getScraperSchedule({ request = githubRequest } = {}) {
  return view(await load(request));
}

export async function updateScraperSchedule({ mode = 'daily', time, hours, startAt, sha } = {}, { request = githubRequest } = {}) {
  if (!['daily', 'interval'].includes(mode)) throw pipelineError('Choose daily or interval scheduling.', 400);
  const settings = mode === 'daily' ? { mode, time, cron: dailyCron(time) } : intervalSettings(hours, startAt);
  if (typeof sha !== 'string' || !/^[a-f0-9]{40,64}$/.test(sha)) throw pipelineError('Reload the schedule before saving.', 400);
  const current = await load(request);
  if (sha !== current.file.sha) throw pipelineError('The workflow changed. Reload the schedule and try again.', 409);
  if (settings.cron === current.parsed.cron && settings.mode === current.parsed.mode && settings.hours === current.parsed.hours && settings.startAt === current.parsed.startAt) return view(current);
  if (mode === 'interval' && !current.source.includes('steps.register.outputs.should_run')) throw pipelineError('Deploy the interval-capable scraper workflow on the default branch before enabling interval scheduling.', 409);
  const newline = current.parsed.block.endsWith('\r\n') ? '\r\n' : '\n';
  const description = mode === 'daily' ? `Every day at ${time} IST` : `jobverify-interval ${JSON.stringify({ hours: settings.hours, startAt: settings.startAt })}`;
  const content = current.source.replace(current.parsed.block, `  schedule:${newline}    - cron: '${settings.cron}' # ${description}${newline}`);
  let result;
  try {
    result = await request(current.repo, path, { method: 'PUT', body: {
      message: mode === 'daily' ? `Set daily scraper schedule to ${time} IST` : `Set scraper interval to every ${hours} hours`, branch: current.branch,
      sha, content: Buffer.from(content).toString('base64'),
    } });
  } catch (error) {
    // A lost response can follow a successful commit. Read back before reporting
    // an uncertain save; never retry the write with the old SHA.
    if (!error.githubStatus || error.githubStatus >= 500) {
      try {
        const confirmed = await load(request);
        if (confirmed.branch === current.branch && confirmed.source === content) return view(confirmed);
      } catch { /* Keep the original save failure if confirmation also fails. */ }
    }
    if (error.githubStatus === 401) throw pipelineError('GitHub rejected GITHUB_PAT: it may be expired or revoked. Update the backend token before saving again.', 502);
    if (error.githubStatus === 403 || /without.*workflow.*scope/i.test(error.githubMessage || '')) throw pipelineError('GitHub denied the schedule update. The backend GITHUB_PAT needs Contents and Workflows write permissions for this repository (classic tokens need repo and workflow scopes). Also check branch rules and token approval.', 502);
    if (error.githubStatus === 404) throw pipelineError('GitHub could not access the workflow for writing. Check the backend GITHUB_REPO and GITHUB_PAT repository selection and write access.', 502);
    if (error.githubStatus === 409) throw pipelineError('The workflow changed or the branch rejected the update. Reload the schedule before retrying and check branch rules.', 409);
    if (error.githubStatus === 422) throw pipelineError('GitHub rejected the workflow update. Check workflow validation and branch rules before retrying.', 502);
    throw pipelineError('Schedule was not confirmed saved. Reload before retrying. Check GitHub Contents and Workflows write permissions and branch protection.', 502);
  }
  return view({ ...current, file: { sha: result.content.sha }, parsed: settings });
}
