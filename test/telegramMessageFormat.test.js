import assert from 'node:assert/strict';
import test from 'node:test';
import { buildTelegramMessageBody } from '../src/services/jobAlertService.js';

test('Telegram uses the requested hiring announcement format for one job only', () => {
  const job = { company: 'LSEG', title: 'Associate Software Engineer', eligibleBatches: [2026],
    jobType: 'Full-time Fresher', city: 'Bangalore', experienceYears: [0],
    sourceUrl: 'https://lseg.wd3.myworkdayjobs.com/Careers/job/IND-BLR-Divyasree-Technopolis/Associate-Software-Engineer_R0124079' };
  assert.equal(buildTelegramMessageBody([job, { title: 'Second job', company: 'Other' }]), [
    '📌 LSEG is hiring Associate Software Engineer', '', '🎓 Batch :- 2026',
    '⚙️ Type :- Full time', '📍 Location :- Bangalore', '', '👔 Job link', job.sourceUrl,
  ].join('\n'));
});

test('Telegram does not invent batch or location details for missing fields', () => {
  const body = buildTelegramMessageBody([{ company: 'Example', title: 'Intern', jobType: 'Internship',
    eligibleBatches: [2027, 2026, 2026, null, 0], location: 'Pune', sourceUrl: 'https://example.com/job' }]);
  assert.ok(body.includes('🎓 Batch :- 2026, 2027'));
  assert.ok(body.includes('📍 Location :- Pune'));
  assert.ok(buildTelegramMessageBody([{}]).includes('🎓 Batch :- Not specified'));
  assert.ok(buildTelegramMessageBody([{}]).includes('📍 Location :- Not specified'));
  assert.equal(buildTelegramMessageBody([]), '');
});
