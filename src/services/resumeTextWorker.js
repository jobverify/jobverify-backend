import { parentPort, workerData } from 'node:worker_threads';
import { inspectResumeArchive } from './resumeText.js';

async function read() {
  const data = Buffer.from(workerData.data);
  if (workerData.extension === 'tex') {
    return new TextDecoder('utf-8', { fatal: true }).decode(data)
      .replace(/(?<!\\)%[^\n]*/g, '')
      .replace(/\\(?:documentclass|usepackage|input|include|includegraphics|write18|bibliography|label|ref)(?:\[[^\]]*\])?\s*\{[^}]*\}/g, '')
      .replace(/\\(?:begin|end)\{[^}]*\}/g, '\n')
      .replace(/\\(?:section|subsection|item)\*?/g, '\n')
      .replace(/\\(?:href|url)\{([^}]*)\}/g, '$1 ')
      .replace(/\\[a-zA-Z@]+(?:\[[^\]]*\])?/g, '')
      .replace(/\\[\\&%_$#]/g, match => match === '\\\\' ? '\n' : match.slice(1))
      .replace(/[{}]/g, '').replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n');
  }
  if (workerData.extension === 'pdf') {
    const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const task = getDocument({ data: new Uint8Array(data), isEvalSupported: false, useSystemFonts: false, disableFontFace: true, verbosity: 0, stopAtErrors: true });
    let document;
    try {
      document = await task.promise;
      if (document.numPages > 30) throw new Error('Too many pages');
      const pages = [];
      for (let index = 1; index <= document.numPages; index++) {
        const page = await document.getPage(index);
        const content = await page.getTextContent();
        pages.push(content.items.map(item => item.str || '').join(' '));
        if (pages.join('\n').length > 20000) break;
      }
      return pages.join('\n');
    } finally { await task.destroy(); }
  }
  if (workerData.extension === 'docx') {
    inspectResumeArchive(data);
    const { default: mammoth } = await import('mammoth');
    return (await mammoth.extractRawText({ buffer: data })).value;
  }
  const { default: WordExtractor } = await import('word-extractor');
  const document = await new WordExtractor().extract(data);
  return [document.getHeaders(), document.getBody(), document.getTextboxes(), document.getFooters()].filter(Boolean).join('\n');
}

read().then(text => parentPort.postMessage({ text }), () => parentPort.postMessage({ error: true }));
