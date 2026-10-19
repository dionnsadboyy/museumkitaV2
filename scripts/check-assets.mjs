import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { hashFile, walkFiles } from './audit-assets.mjs';

const root = process.cwd();
const config = JSON.parse(fs.readFileSync('scripts/media-sources.json', 'utf8'));
const backup = path.resolve(process.env.MUSEUM_ORIGINALS || config.originalsRoot);
assert(path.relative(root, backup).startsWith(`..${path.sep}`) || path.isAbsolute(path.relative(root, backup)), 'Backup stays outside deploy');
const context = { window: {} };
vm.runInNewContext(fs.readFileSync('data.js', 'utf8'), context);
vm.runInNewContext(fs.readFileSync('assets/media/manifest.js', 'utf8'), context);
const manifest = context.window.museumMedia;
const before = JSON.parse(fs.readFileSync(path.join(backup, 'asset-audit-before.json'), 'utf8'));
const old = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(backup, 'previous-data.js'), 'utf8'), old);
const rename = new Map(config.photos.map(photo => [`/${photo.original}`, photo.large]));
for (const photo of config.photos) rename.set(path.posix.basename(photo.original), path.posix.basename(photo.large));
const transformed = JSON.parse(JSON.stringify(old.window.gallery), (_, value) => typeof value === 'string' ? rename.get(value) || value : value);
assert.deepEqual(JSON.parse(JSON.stringify(context.window.gallery)), transformed, 'Chapter stories, metadata, cover choices and gallery order unchanged');
assert.equal(Object.keys(manifest).length, config.photos.length + config.videoPosters.length);

const checked = new Set();
function checkPath(url, directory = root) {
  if (/^(data:|https?:|mailto:|tel:|#)/i.test(url)) return;
  const relative = path.posix.normalize(decodeURIComponent(url.split(/[?#]/)[0]).replace(/^\//, ''));
  if (!relative) return;
  const file = path.resolve(directory, relative);
  assert(file.startsWith(directory + path.sep), `Path stays in web root: ${url}`);
  assert(fs.existsSync(file) && fs.statSync(file).isFile(), `Local asset exists: ${url}`);
  // Case matters on the production host, even when Windows accepts a different case.
  let cursor = directory;
  for (const segment of relative.split('/')) {
    assert(fs.readdirSync(cursor).includes(segment), `Exact filename case: ${url}`);
    cursor = path.join(cursor, segment);
  }
  checked.add(url);
}

for (const photo of config.photos) {
  const original = path.resolve(backup, photo.original);
  assert(original.startsWith(backup + path.sep));
  assert.equal(hashFile(original), photo.sha256, `Original backup SHA-256: ${photo.original}`);
  const source = await sharp(original).metadata();
  const rotated = source.orientation >= 5 && source.orientation <= 8;
  const width = rotated ? source.height : source.width;
  const height = rotated ? source.width : source.height;
  for (const [url, limit] of [[photo.large, 1920], [photo.thumb, 800]]) {
    checkPath(url);
    const meta = await sharp(`.${url}`).metadata();
    assert.equal(meta.format, 'webp');
    assert(Math.max(meta.width, meta.height) <= limit, `Maximum size: ${url}`);
    assert(meta.width <= width && meta.height <= height, `No upscale: ${url}`);
    assert(Math.abs(meta.width / meta.height - width / height) < .005, `EXIF-correct aspect ratio: ${url}`);
    assert(!meta.orientation && !meta.exif && !meta.icc && !meta.xmp, `Metadata removed: ${url}`);
    const item = manifest[photo.large];
    assert.equal(meta.width, url === photo.large ? item.width : item.thumbWidth);
    assert.equal(meta.height, url === photo.large ? item.height : item.thumbHeight);
  }
}
for (const poster of config.videoPosters) {
  const item = manifest[poster.src];
  assert.equal(item.playback, poster.playback);
  for (const [url, limit] of [[poster.large, 1920], [poster.thumb, 800]]) {
    checkPath(url);
    const meta = await sharp(`.${url}`).metadata();
    assert.equal(meta.format, 'webp');
    assert(Math.max(meta.width, meta.height) <= limit);
    assert(!meta.orientation && !meta.exif && !meta.icc && !meta.xmp);
    assert.equal(meta.width, url === poster.large ? item.width : item.thumbWidth);
    assert.equal(meta.height, url === poster.large ? item.height : item.thumbHeight);
  }
}
for (const item of Object.values(manifest)) {
  for (const key of ['large', 'thumb', 'playback']) if (item[key]) checkPath(item[key]);
  assert(item.preview.startsWith('data:image/webp;base64,'));
}
const videos = before.files.filter(file => file.kind.startsWith('video'));
for (const file of videos) assert.equal(hashFile(file.path), file.sha256, `Video byte-identical: ${file.path}`);
for (const album of context.window.gallery) {
  assert([...album.photos, ...album.videos].includes(album.cover));
  for (const src of [...album.photos, ...album.videos]) { checkPath(src); assert(manifest[src]); }
}

const site = fs.readdirSync(root).filter(file => /\.(html|css|js)$/.test(file));
for (const file of site) {
  const content = fs.readFileSync(file, 'utf8');
  assert(!/\/assets\/[^\s'"<>]*\.jpe?g\b/i.test(content), `No original JPEG runtime references: ${file}`);
  assert(!/\/assets\/[^\s'"<>]*-(1200|400)\.webp\b/.test(content), `No old derivative paths: ${file}`);
  if (file.endsWith('.html')) {
    for (const match of content.matchAll(/\b(?:src|href|poster)="([^"]+)"/g)) checkPath(match[1]);
    for (const match of content.matchAll(/<img\b[^>]*>/g)) {
      const src = match[0].match(/\bsrc="([^"]+)"/)?.[1];
      if (src?.startsWith('/assets/')) {
        const meta = await sharp(`.${src}`).metadata();
        assert.equal(Number(match[0].match(/\bwidth="(\d+)"/)?.[1]), meta.width, `Intrinsic width: ${file}`);
        assert.equal(Number(match[0].match(/\bheight="(\d+)"/)?.[1]), meta.height, `Intrinsic height: ${file}`);
      }
    }
    for (const match of content.matchAll(/\bsrcset="([^"]+)"/g)) {
      for (const entry of match[1].split(',')) {
        const [url, descriptor] = entry.trim().split(/\s+/);
        checkPath(url);
        if (/^\d+w$/.test(descriptor)) assert.equal((await sharp(`.${url}`).metadata()).width, Number(descriptor.slice(0, -1)), `Accurate srcset width: ${file}`);
      }
    }
  }
  for (const match of content.matchAll(/url\(\s*['"]?([^'"\s)]+)['"]?\s*\)/g)) {
    if (!match[1].includes('${') && !match[1].includes('var(')) checkPath(match[1]);
  }
}
assert(!walkFiles('assets').some(file => /\.jpe?g$/i.test(file)), 'No original JPEGs in web assets');
if (process.argv.includes('--deploy')) {
  const deploy = path.join(root, 'dist');
  const expected = [...site, ...walkFiles('assets')];
  const files = walkFiles(deploy);
  assert.equal(files.length, expected.length);
  for (const file of expected) assert.equal(hashFile(path.join(deploy, file)), hashFile(file), `Deployment copy: ${file}`);
  for (const url of [...checked]) checkPath(url, deploy);
  assert(!files.some(file => /(?:backup|node_modules|\.museum-checks|scripts)[/\\]|\.jpe?g$/i.test(file)), 'No backup originals or tooling in package');
}
console.log(`Asset checks passed: ${config.photos.length} SHA-256 original backups; 132 photo variants; 26 posters; ${videos.length} unchanged videos; ${checked.size} local paths with exact case; chapter content/order unchanged.${process.argv.includes('--deploy') ? ' Deployment package verified.' : ''}`);
