import { runModelSmokeTest } from '../outreach/modelSmoke.js';

try {
  const started = Date.parse(process.env.OUTREACH_WORKFLOW_STARTED_AT || '');
  const deadline = Number.isFinite(started) ? started + 9 * 60000 : Date.now() + 7 * 60000;
  const counts = await runModelSmokeTest({ deadline });
  console.log(JSON.stringify({ mode: 'smoke-test', ...counts }));
} catch {
  console.error('The model smoke test failed during startup or generation. No account data was used.');
  process.exitCode = 1;
}
