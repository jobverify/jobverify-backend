import assert from 'node:assert/strict';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createCanvas } from '@napi-rs/canvas';
import { fileURLToPath } from 'node:url';
import { prepareResumeCompiler, compileResumeLatex } from '../outreach/latexCompiler.js';

export async function renderAndInspectPdf(pdf) {
  const task = getDocument({ data: new Uint8Array(pdf), isEvalSupported: false, useSystemFonts: false, verbosity: 0,
    standardFontDataUrl: fileURLToPath(new URL('../node_modules/pdfjs-dist/standard_fonts/', import.meta.url)).replaceAll('\\', '/') });
  const document = await task.promise;
  try {
    for (let number = 1; number <= document.numPages; number++) {
      const page = await document.getPage(number);
      const viewport = page.getViewport({ scale: 1.25 });
      const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
      const context = canvas.getContext('2d');
      await page.render({ canvasContext: context, viewport }).promise;
      const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
      let ink = 0, edgeInk = 0;
      for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
        const i = (y * canvas.width + x) * 4;
        if (data[i + 3] && Math.min(data[i], data[i + 1], data[i + 2]) < 210) {
          ink++;
          if (x < 5 || y < 5 || x >= canvas.width - 5 || y >= canvas.height - 5) edgeInk++;
        }
      }
      assert.ok(ink > 20, `Page ${number} must render visible text.`);
      assert.equal(edgeInk, 0, `Page ${number} has content clipped at its boundary.`);
      page.cleanup();
    }
    return document.numPages;
  } finally { await task.destroy(); }
}
export async function verifyResumeCompiler({ deadline = Date.now() + 12 * 60000, prepare = true } = {}) {
  if (prepare) await prepareResumeCompiler({ deadline });
  let pages = 0;
  const head = '\\documentclass[11pt,a4paper]{article}\n\\usepackage[margin=0.7in]{geometry}\n\\usepackage[T1]{fontenc}\n\\usepackage{lmodern,hyperref,enumitem,titlesec}\n\\pagestyle{empty}\n\\begin{document}\n';
  const cases = [
    `${head}\\section*{Short resume}Synthetic Candidate\\par Engineer at Example Corp, 2022 -- Present.\\par Education: Example University, BSc, 2018 -- 2022.\\end{document}`,
    `${head}\\section*{Special characters}Synthetic Candidate\\par C\\#, C++, R\\&D, 10\\%, \\_underscore, \\{braces\\}, caf\\'e.\\par \\href{mailto:synthetic@example.test}{synthetic@example.test}\\par \\href{https://example.test/profile?a=1\\&b=2}{Portfolio}\\end{document}`,
    `${head}\\section*{Long resume}\\begin{itemize}${Array.from({ length: 70 }, (_, i) => `\\item Synthetic project ${i + 1}: developed and tested a reliable Java service with documented operational procedures.`).join('\n')}\\end{itemize}\\section*{Final education section}Example University, BSc, 2018 -- 2022.\\end{document}`,
  ];
  for (const latex of cases) {
    const result = await compileResumeLatex(latex, { deadline });
    if (latex.includes('Final education section')) assert.ok(result.text.includes('Final education section'), 'The final section must be readable.');
    if (latex.includes('mailto:')) assert.ok(result.links.includes('mailto:synthetic@example.test'));
    pages += await renderAndInspectPdf(result.pdf);
  }
  return { compilerCases: cases.length, renderedPages: pages };
}
if (process.argv[1]?.endsWith('verifyResumeCompiler.js')) {
  try { console.log(JSON.stringify(await verifyResumeCompiler())); }
  catch { console.error('Isolated compiler acceptance failed. No candidate work was processed.'); process.exitCode = 1; }
}
