import { prepareOutreachRuntime, generateOutreachDraft } from './runner.js';
import { validateGeneratedDraft } from '../src/services/outreachDrafting.js';

/** Exercise real inference without connecting to MongoDB or using account data. */
export async function runModelSmokeTest({ deadline = Date.now() + 7 * 60000,
  prepareRuntime = prepareOutreachRuntime, generate = generateOutreachDraft,
} = {}) {
  if (deadline - Date.now() <= 15000) throw new Error('The model smoke test exceeded its budget.');
  let runtime;
  try {
    runtime = await prepareRuntime();
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 15000) throw new Error('The model smoke test exceeded its budget.');
    const result = await generate({
      profile: { name: 'Test Candidate', aboutYou: 'Frontend developer', experienceProjects: 'Built an accessible React project.', portfolioUrl: '' },
      jobSnapshot: { title: 'Frontend Engineer', company: 'Example Company', location: 'Remote' },
      jobDescription: 'Build accessible web applications using React.',
      contact: { name: 'Alex Example', title: 'Frontend Engineer', kind: 'likely_contact', evidence: 'Alex is a Frontend Engineer at Example Company.' },
    }, { remainingMs });
    validateGeneratedDraft(result);
    return { attempted: 1, completed: 1, failed: 0 };
  } finally { await runtime?.stop(); }
}
