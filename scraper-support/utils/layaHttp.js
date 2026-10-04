import { request } from 'node:http';

// Native HTTP avoids fetch's five-minute header deadline during synchronous CPU inference.
// The caller validates localhost and supplies its own cancellation/request deadline.
export const fetchLayaLocal = (url, { method = 'GET', headers, body, signal } = {}) => new Promise((resolve, reject) => {
  const req = request(url, { method, headers, signal, agent: false }, response => {
    const chunks = [];
    let bytes = 0;
    response.on('data', chunk => {
      bytes += chunk.length;
      if (bytes > 1048576) { response.destroy(new Error('Laya response exceeds 1 MB')); return; }
      chunks.push(chunk);
    });
    response.once('error', error => reject(signal?.aborted ? signal.reason : error));
    response.once('end', () => resolve({ ok: response.statusCode >= 200 && response.statusCode < 300,
      status: response.statusCode, json: async () => JSON.parse(Buffer.concat(chunks).toString('utf8')) }));
  });
  req.once('error', error => reject(signal?.aborted ? signal.reason : error));
  req.end(body);
});
