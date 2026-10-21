import test from 'node:test';
import assert from 'node:assert/strict';
import { processResumeDocument } from '../outreach/resumePipeline.js';

const source = { text: 'Alex Example\nalex@example.com\nEXPERIENCE\nExample Corp\nSoftware Engineer | Jan 2022 - Present\nDeveloped Java services and automated tests.\nEDUCATION\nExample University\nBSc Computer Science | 2018 - 2022', links: ['mailto:alex@example.com'] };
const latex = '\\documentclass[11pt]{article}\n\\begin{document}\nAlex Example\\end{document}';
const compiled = { pdf: Buffer.from('%PDF-test'), text: source.text, links: source.links, pageCount: 2 };
const supported = JSON.stringify({ supported: true, missingFacts: [], unsupportedClaims: [] });

test('pipeline separately compares source claims and returns only validated documents', async () => {
  const calls = [];
  const result = await processResumeDocument({ mode: 'base', source }, {
    generate: async (prompt, options) => { calls.push(options.comparison); return options.comparison ? supported : latex; },
    compile: async () => compiled,
  });
  assert.deepEqual(calls, [undefined, true]);
  assert.equal(result.pageCount, 2);
  assert.equal(result.latex, latex);
  assert.ok(result.facts);
});

test('one repair can fix pagination, with no unbounded model loop', async () => {
  let generations = 0, compilations = 0;
  const result = await processResumeDocument({ mode: 'tailored', source, baseLatex: latex, jobSnapshot: { title: 'Engineer' } }, {
    generate: async (_prompt, options) => options.comparison ? supported : (generations++, latex),
    compile: async () => ({ ...compiled, pageCount: ++compilations === 1 ? 3 : 2 }),
  });
  assert.equal(generations, 2);
  assert.equal(result.pageCount, 2);
});

test('a failed comparison never publishes a document and permits only one repair', async () => {
  let generations = 0;
  await assert.rejects(processResumeDocument({ mode: 'base', source }, {
    generate: async (_prompt, options) => options.comparison
      ? JSON.stringify({ supported: false, missingFacts: ['employment dates'], unsupportedClaims: [] }) : (generations++, latex),
    compile: async () => compiled,
  }), /validation.*retry/i);
  assert.equal(generations, 2);
});

test('base preserves long resumes while tailoring enforces two pages', async () => {
  const result = await processResumeDocument({ mode: 'base', source }, {
    generate: async (_prompt, options) => options.comparison ? supported : latex,
    compile: async () => ({ ...compiled, pageCount: 4 }),
  });
  assert.equal(result.pageCount, 4);
});
