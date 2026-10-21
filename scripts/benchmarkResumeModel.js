import { prepareResumeRuntime, processResumeDocument } from '../outreach/resumePipeline.js';
import { RESUME_MODEL } from '../outreach/resumeRuntime.js';
import { verifyResumeCompiler, renderAndInspectPdf } from './verifyResumeCompiler.js';

// Synthetic public fixtures only. Never loads MongoDB or a candidate document.
const source = { text: `Asha Rao
asha@example.test | +91 90000 00000
EXPERIENCE
Example Financial Software Limited
Associate Application Developer | July 2024 - Present
Developed Java API automation using Karate and Gherkin. Built regression tests and investigated failures with SQL and Python. Reduced repeated manual checks by 20%.
PROJECTS
Built a React and Node.js application with MongoDB and automated API tests.
EDUCATION
Example University
BTech Computer Science | 2020 - 2024
SKILLS
Java, Python, SQL, Karate, Gherkin, React, Node.js, MongoDB, Git`, links: ['mailto:asha@example.test'] };
const scenarios = {
  algoshack: { company: 'AlgoShack', title: 'Software Test Engineer', description: 'Build API automation and regression testing. Java, Python, test design and SQL are useful.', requiredSkills: ['Java', 'API testing'] },
  visa: { company: 'Visa', title: 'SDET - GenAI testing', description: 'Develop software tests and validate AI based applications. Requires API testing, automation, Python and Java.', requiredSkills: ['Python', 'Java', 'AI testing'] },
  elsevier: { company: 'Elsevier', title: 'Senior Agentic AI Engineer', description: 'Design production agentic AI systems. Requires senior engineering experience, LangGraph and advanced LLM systems.', requiredSkills: ['LangGraph', 'LLM systems'] },
};
let runtime;
try {
  const scenario = process.env.RESUME_BENCHMARK_SCENARIO || 'algoshack';
  if (!scenarios[scenario]) throw new Error('Invalid synthetic benchmark scenario.');
  const start = Date.now(), deadline = start + 28 * 60000;
  runtime = await prepareResumeRuntime({ deadline });
  const compiler = await verifyResumeCompiler({ deadline, prepare: false });
  const baseStart = Date.now();
  const base = await processResumeDocument({ mode: 'base', source }, { deadline });
  await renderAndInspectPdf(base.pdf);
  const tailorStart = Date.now();
  const result = await processResumeDocument({ mode: 'tailored', source, facts: base.facts, baseLatex: base.latex, jobSnapshot: scenarios[scenario] }, { deadline });
  await renderAndInspectPdf(result.pdf);
  // Aggregate timing and validation evidence only; no document data or logs.
  console.log(JSON.stringify({ scenario, modelRevision: RESUME_MODEL.revision, ...compiler, baseSeconds: Math.round((tailorStart - baseStart) / 1000),
    tailoredSeconds: Math.round((Date.now() - tailorStart) / 1000), totalSeconds: Math.round((Date.now() - start) / 1000), basePages: base.pageCount, tailoredPages: result.pageCount, factualValidation: true }));
} catch {
  console.error('Resume rollout benchmark failed. Keep resume generation disabled until the benchmark passes.');
  process.exitCode = 1;
} finally { await runtime?.stop(); }
