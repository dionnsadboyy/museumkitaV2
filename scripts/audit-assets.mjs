import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

export const hashFile = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
export const walkFiles = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(item => {
  const file = path.join(directory, item.name);
  return item.isDirectory() ? walkFiles(file) : item.isFile() ? [file] : [];
});
export async function auditAssets() {
  const files = [];
  for (const file of walkFiles('assets')) {
    const relative = file.split(path.sep).join('/');
    const extension = path.extname(file).toLowerCase();
    let kind = 'other';
    if (/\.(jpe?g|png|heic|avif|webp)$/.test(extension)) {
      kind = /\/posters\/|-poster-/.test(relative) ? 'posters' : /\.jpe?g$/.test(extension) ? 'photoOriginals' : 'photoWebp';
    } else if (/\.(mov|mp4|webm|m4v)$/.test(extension)) kind = /-web\.mp4$/.test(file) ? 'videoPlayback' : 'videoOriginals';
    else if (/\.(mp3|wav|m4a|ogg)$/.test(extension)) kind = 'audio';
    const entry = { path: relative, bytes: fs.statSync(file).size, sha256: hashFile(file), kind };
    if (['photoOriginals', 'photoWebp', 'posters'].includes(kind)) {
      const metadata = await sharp(file).metadata();
      Object.assign(entry, { width: metadata.width, height: metadata.height, orientation: metadata.orientation || 1, format: metadata.format, colourspace: metadata.space, hasExif: Boolean(metadata.exif), hasIcc: Boolean(metadata.icc) });
    }
    files.push(entry);
  }
  const totals = { all: { count: files.length, bytes: files.reduce((sum, file) => sum + file.bytes, 0) } };
  for (const kind of ['photoOriginals', 'photoWebp', 'posters', 'videoOriginals', 'videoPlayback', 'audio', 'other']) {
    const group = files.filter(file => file.kind === kind);
    totals[kind] = { count: group.length, bytes: group.reduce((sum, file) => sum + file.bytes, 0) };
  }
  const largest = {
    photos: files.filter(file => file.kind === 'photoOriginals').sort((a, b) => b.bytes - a.bytes).slice(0, 6),
    videos: files.filter(file => file.kind.startsWith('video')).sort((a, b) => b.bytes - a.bytes).slice(0, 6),
  };
  return { totals, largest, files };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = await auditAssets();
  const output = process.argv[2] || '.museum-checks/assets-audit.json';
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ totals: report.totals, largest: report.largest, report: output }, null, 2));
}
