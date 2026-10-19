import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { walkFiles } from './audit-assets.mjs';

const root = process.cwd();
const output = path.resolve(root, 'dist');
assert.equal(path.dirname(output), root);
const site = fs.readdirSync(root).filter(file => /\.(html|css|js)$/.test(file));
const assets = walkFiles('assets');
assert(!assets.some(file => /\.(jpe?g)$/i.test(file)), 'Original photographs must be backed up outside the web package first');
const files = [...site, ...assets];
const expected = new Set(files.map(file => path.resolve(output, file)));
fs.mkdirSync(output, { recursive: true });
for (const obsolete of walkFiles(output)) {
  const resolved = path.resolve(obsolete);
  assert(resolved.startsWith(output + path.sep));
  if (!expected.has(resolved)) fs.unlinkSync(resolved);
}
let bytes = 0;
for (const file of files) {
  const destination = path.resolve(output, file);
  assert(destination.startsWith(output + path.sep));
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(file, destination);
  bytes += fs.statSync(file).size;
}
console.log(`Prepared ${files.length} static files (${bytes} bytes) in dist/. No source backups, development tools, samples, or node_modules included.`);
