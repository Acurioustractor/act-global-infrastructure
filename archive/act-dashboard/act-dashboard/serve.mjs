#!/usr/bin/env node
/**
 * ACT Command Center - Development Server
 *
 * Usage:
 *   node packages/act-dashboard/serve.mjs
 *   open http://localhost:3333
 */

import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3333;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

const server = createServer(async (req, res) => {
  try {
    let filePath = req.url === '/' ? '/index.html' : req.url;
    const fullPath = join(__dirname, filePath);
    const ext = filePath.substring(filePath.lastIndexOf('.'));

    const content = await readFile(fullPath);
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'text/plain',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(content);
  } catch (err) {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`
┌─────────────────────────────────────────────────┐
│                                                 │
│   ACT Command Center                            │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━            │
│                                                 │
│   Server running at:                            │
│   http://localhost:${PORT}                          │
│                                                 │
│   Press Ctrl+C to stop                          │
│                                                 │
└─────────────────────────────────────────────────┘
  `);
});
