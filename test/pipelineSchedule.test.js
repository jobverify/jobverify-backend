import test from 'node:test';
import assert from 'node:assert/strict';
import { githubRequest } from '../src/pipeline/github.js';
import { dailyCron, parseSchedule, getScraperSchedule, updateScraperSchedule, intervalSettings, intervalSlot, nextIntervalRun } from '../src/pipeline/schedule.js';

const source = "name: Scraper\non:\n  schedule:\n    - cron: '0 17 * * *' # Daily\n  workflow_dispatch:\n    inputs:\n      pipeline_id:\n        type: string\njobs:\n  scrape:\n    runs-on: ubuntu-latest\n";
const sha = 'a'.repeat(40);
function remote(text = source) {
  const calls = [];
  const request = async (repo, endpoint, options) => {
    calls.push({ repo, endpoint, options });
    if (!endpoint) return { default_branch: 'release/current' };
    if (options?.method === 'PUT') return { content: { sha: 'b'.repeat(40) } };
    return { sha, encoding: 'base64', content: Buffer.from(text).toString('base64') };
  };
  return { calls, request };
}

test('IST daily times round trip including the UTC day boundary', () => {
  for (const [time, cron] of [['22:30', '0 17 * * *'], ['02:08', '38 20 * * *'], ['00:00', '30 18 * * *'], ['05:30', '0 0 * * *'], ['23:59', '29 18 * * *']]) {
    assert.equal(dailyCron(time), cron);
    assert.equal(parseSchedule(source.replace('0 17 * * *', cron)).time, time);
  }
  for (const value of ['24:00', '12:60', '1:30', '', null, 930]) assert.throws(() => dailyCron(value), { status: 400 });
});

test('unfamiliar schedules cannot be silently overwritten', () => {
  for (const text of [source.replace('0 17 * * *', '*/5 * * * *'), source.replace('0 17', '60 17'), source.replace('0 17', '0 24'), source.replace('  workflow_dispatch:', "    - cron: '0 8 * * *'\n  workflow_dispatch:"), source.replace('  workflow_dispatch:', '      timezone: Asia/Kolkata\n  workflow_dispatch:')]) {
    assert.throws(() => parseSchedule(text), { status: 409 });
  }
});

test('read uses default branch and save preserves all other workflow bytes and CRLF', async () => {
  for (const text of [source, source.replaceAll('\n', '\r\n')]) {
    const { request, calls } = remote(text);
    assert.deepEqual(await getScraperSchedule({ request }), { mode: 'daily', time: '22:30', cron: '0 17 * * *', timezone: 'Asia/Kolkata', sha, branch: 'release/current' });
    assert.match(calls[1].endpoint, /ref=release%2Fcurrent/);
    const result = await updateScraperSchedule({ time: '02:08', sha }, { request });
    const put = calls.find(call => call.options?.method === 'PUT').options.body;
    assert.equal(put.branch, 'release/current'); assert.equal(put.sha, sha);
    assert.equal(Buffer.from(put.content, 'base64').toString(), text.replace("'0 17 * * *' # Daily", "'38 20 * * *' # Every day at 02:08 IST"));
    assert.equal(result.time, '02:08'); assert.equal(result.sha, 'b'.repeat(40));
  }
});

test('11-hour intervals keep their anchor across midnight, months and delayed ticks', () => {
  const schedule = intervalSettings(11, '2026-10-31T17:00:00Z');
  assert.equal(schedule.cron, '0 * * * *');
  assert.equal(intervalSlot(schedule, Date.parse('2026-10-31T16:59:00Z')), null);
  assert.equal(intervalSlot(schedule, Date.parse('2026-10-31T17:00:00Z')), 0);
  assert.equal(intervalSlot(schedule, Date.parse('2026-11-01T03:59:00Z')), 0);
  assert.equal(intervalSlot(schedule, Date.parse('2026-11-01T04:00:00Z')), 1);
  assert.equal(intervalSlot(schedule, Date.parse('2026-11-01T04:47:00Z')), 1);
  assert.equal(nextIntervalRun(schedule, Date.parse('2026-11-01T04:47:00Z')), '2026-11-01T15:00:00.000Z');
  assert.equal(nextIntervalRun(schedule, Date.parse('2026-10-31T16:00:00Z')), schedule.startAt);
  assert.equal(intervalSlot(schedule, Date.parse(schedule.startAt) + 11 * 3600000 * 1000), 1000);
  assert.equal(intervalSettings(11, '2026-10-31T16:38:00Z').cron, '38 * * * *');
  for (const hours of [0, -1, 1.5, 169, '11', null]) assert.throws(() => intervalSettings(hours, schedule.startAt), { status: 400 });
  for (const startAt of ['', '2026-10-31', '2026-02-30T00:00:00Z', '2026-10-31T17:00:01Z', 'invalid', null]) assert.throws(() => intervalSettings(11, startAt), { status: 400 });
});

test('interval save round trips and switching back to daily removes the interval marker', async () => {
  const deployed = source + "# steps.register.outputs.should_run == 'true'\n";
  const first = remote(deployed);
  const settings = { mode: 'interval', hours: 11, startAt: '2026-10-31T17:08:00.000Z', sha };
  const saved = await updateScraperSchedule(settings, first);
  assert.equal(saved.mode, 'interval'); assert.equal(saved.hours, 11); assert.equal(saved.cron, '8 * * * *');
  const updated = Buffer.from(first.calls.find(call => call.options?.method === 'PUT').options.body.content, 'base64').toString();
  assert.equal(parseSchedule(updated).startAt, settings.startAt);
  assert.equal(updated.replace(parseSchedule(updated).block, parseSchedule(deployed).block), deployed);
  const second = remote(updated);
  await updateScraperSchedule({ time: '22:30', sha }, second);
  const daily = Buffer.from(second.calls.find(call => call.options?.method === 'PUT').options.body.content, 'base64').toString();
  assert.equal(parseSchedule(daily).mode, 'daily'); assert.doesNotMatch(daily, /jobverify-interval/);
  await assert.rejects(updateScraperSchedule(settings, remote()), error => error.status === 409 && /Deploy/.test(error.message));
  await assert.rejects(updateScraperSchedule({ mode: 'weekly', sha }, remote()), { status: 400 });
  assert.throws(() => parseSchedule(updated.replace("'8 * * * *'", "'9 * * * *'")), { status: 409 });
});

test('stale edits, invalid input, and unchanged times never write', async () => {
  const { request, calls } = remote();
  await assert.rejects(updateScraperSchedule({ time: '02:08', sha: 'c'.repeat(40) }, { request }), { status: 409 });
  await assert.rejects(updateScraperSchedule({ time: '99:00', sha }, { request }), { status: 400 });
  await assert.rejects(updateScraperSchedule({ time: '02:08' }, { request }), { status: 400 });
  await updateScraperSchedule({ time: '22:30', sha }, { request });
  assert.equal(calls.filter(call => call.options?.method === 'PUT').length, 0);
});

test('permission errors and concurrent GitHub writes report an unconfirmed save', async () => {
  const original = remote();
  const request = (repo, endpoint, options) => {
    if (options?.method === 'PUT') throw new Error('GitHub 403 or 409');
    return original.request(repo, endpoint, options);
  };
  await assert.rejects(updateScraperSchedule({ time: '02:08', sha }, { request }), error => error.status === 502 && /not confirmed saved/.test(error.message));
});

test('GitHub rejection retains its status and workflow permission guidance', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ message: 'Resource not accessible by personal access token' }, { status: 403 }));
  await assert.rejects(githubRequest('owner/repo', '/contents/.github/workflows/scraper.yml', { token: 'test', method: 'PUT', body: {} }), error =>
    error.githubStatus === 403 && error.githubMessage === 'Resource not accessible by personal access token');
});

test('schedule save distinguishes permission denial, conflicts and invalid workflow updates', async () => {
  for (const [githubStatus, expectedStatus, message] of [
    [401, 502, /GITHUB_PAT.*expired|expired.*GITHUB_PAT/],
    [403, 502, /Contents.*Workflows.*write/],
    [404, 502, /repository.*access/],
    [409, 409, /changed.*Reload/],
    [422, 502, /rejected.*workflow/i],
  ]) {
    const original = remote();
    const request = (repo, endpoint, options) => {
      if (options?.method === 'PUT') throw Object.assign(new Error('GitHub rejection'), { githubStatus });
      return original.request(repo, endpoint, options);
    };
    await assert.rejects(updateScraperSchedule({ time: '23:59', sha }, { request }), error => error.status === expectedStatus && message.test(error.message));
  }
});

test('a lost write response is reconciled without writing the schedule twice', async () => {
  let text = source, writes = 0;
  const request = async (repo, endpoint, options) => {
    if (!endpoint) return { default_branch: 'main' };
    if (options?.method === 'PUT') {
      writes++;
      text = Buffer.from(options.body.content, 'base64').toString();
      throw new Error('Response timed out after GitHub committed');
    }
    return { sha: text === source ? sha : 'b'.repeat(40), encoding: 'base64', content: Buffer.from(text).toString('base64') };
  };
  const result = await updateScraperSchedule({ time: '23:59', sha }, { request });
  assert.equal(result.time, '23:59');
  assert.equal(result.sha, 'b'.repeat(40));
  assert.equal(writes, 1);
});
