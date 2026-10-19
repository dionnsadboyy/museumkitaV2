import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { auditAssets, hashFile } from './audit-assets.mjs';

const root = process.cwd();
const configFile = 'scripts/media-sources.json';
const checkRoot = '.museum-checks/asset-optimization';
fs.mkdirSync(checkRoot, { recursive: true });
const inside = (file, directory) => {
  const relative = path.relative(path.resolve(directory), path.resolve(file));
  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
};
const sourcePath = (config, source) => {
  const backup = path.resolve(root, process.env.MUSEUM_ORIGINALS || config.originalsRoot);
  assert(!inside(backup, root), 'Photo originals must stay outside the deploy workspace');
  const file = path.resolve(backup, source.original);
  assert(inside(file, backup), 'Original path must stay inside external backup');
  return file;
};

async function initialize() {
  if (fs.existsSync(configFile)) return JSON.parse(fs.readFileSync(configFile, 'utf8'));
  const before = await auditAssets();
  const originalsRoot = '../MUSEUMKITA-V2-BACKUPS/photos-2026-10-19';
  const external = path.resolve(root, originalsRoot);
  assert(!inside(external, root));
  const previous = { window: {} };
  vm.runInNewContext(fs.readFileSync('assets/media/manifest.js', 'utf8'), previous);
  const oldManifest = previous.window.museumMedia;
  const photos = before.files.filter(file => file.kind === 'photoOriginals').map(file => {
    const base = file.path.replace(/(\.jpe?g)+$/i, '');
    return { original: file.path, large: `/${base}.webp`, thumb: `/${base.replace(/^assets\/images\//, 'assets/thumbnails/')}.webp`, sha256: file.sha256, bytes: file.bytes, orientation: file.orientation, quality: 82, legacy: oldManifest[`/${file.path}`] || null };
  });
  assert.equal(photos.length, 66, 'Audit all originals before migration');
  for (const photo of photos) {
    const target = sourcePath({ originalsRoot }, photo);
    const source = path.resolve(root, photo.original);
    assert(inside(source, path.join(root, 'assets/images')));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    if (!fs.existsSync(target)) fs.copyFileSync(source, target, fs.constants.COPYFILE_EXCL);
    assert.equal(hashFile(target), photo.sha256, `Backup hash: ${photo.original}`);
  }
  const videoPosters = Object.entries(oldManifest).filter(([, item]) => item.playback).map(([src, item]) => {
    const basename = src.replace(/^\/assets\/videos\//, '').replace(/\.[^.]+$/, '');
    return { src, large: `/assets/posters/${basename}.webp`, thumb: `/assets/thumbnails/posters/${basename}.webp`, playback: item.playback, posterTime: item.posterTime, legacy: item };
  });
  const config = { originalsRoot, largeMax: 1920, thumbnailMax: 800, quality: 82, photos, videoPosters };
  fs.writeFileSync(path.join(external, 'asset-audit-before.json'), JSON.stringify(before, null, 2));
  fs.copyFileSync('assets/media/manifest.js', path.join(external, 'previous-manifest.js'));
  for (const file of ['data.js', 'index.html', 'archive.html']) fs.copyFileSync(file, path.join(external, `previous-${file}`));
  fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
  console.log(`Verified SHA-256 backups of ${photos.length} photos at ${external}`);
  return config;
}

async function samples(config) {
  const cases = [
    { file: 'assets/images/painting-date/painting-date10.jpeg', label: 'wajah', focus: [.5, .36] },
    { file: 'assets/images/day-uno/uno10.jpeg', label: 'malam-wajah', focus: [.5, .5] },
    { file: 'assets/images/painting-date/painting-date2.jpeg', label: 'detail-piknik', focus: [.48, .82] },
    { file: 'assets/images/day-date/date1.jpeg', label: 'malam-exif-6', focus: [.48, .6] },
  ];
  const report = [];
  for (const sample of cases) {
    const photo = config.photos.find(photo => photo.original === sample.file);
    assert(photo, sample.file);
    const source = sourcePath(config, photo);
    const normalized = await sharp(source).autoOrient().toColourspace('srgb').resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true }).png().toBuffer();
    const output = `${checkRoot}/${sample.label}-q82.webp`;
    await sharp(normalized).webp({ quality: 82, effort: 6 }).toFile(output);
    const reference = `${checkRoot}/${sample.label}-reference.png`;
    fs.writeFileSync(reference, normalized);
    const metadata = await sharp(output).metadata();
    assert(!metadata.exif && !metadata.icc && !metadata.orientation, 'Metadata stripped after orientation');
    const rawOriginal = await sharp(normalized).removeAlpha().raw().toBuffer();
    const rawWebp = await sharp(output).removeAlpha().raw().toBuffer();
    assert.equal(rawOriginal.length, rawWebp.length);
    let squared = 0;
    for (let index = 0; index < rawOriginal.length; index++) squared += (rawOriginal[index] - rawWebp[index]) ** 2;
    const psnr = 10 * Math.log10(255 ** 2 / (squared / rawOriginal.length));
    const width = Math.min(440, metadata.width);
    const height = Math.min(380, metadata.height);
    const crop = { left: Math.max(0, Math.min(metadata.width - width, Math.round(metadata.width * sample.focus[0] - width / 2))), top: Math.max(0, Math.min(metadata.height - height, Math.round(metadata.height * sample.focus[1] - height / 2))), width, height };
    const tiles = [];
    for (const [column, input] of [normalized, output].entries()) {
      const left = column * 500;
      tiles.push({ input: await sharp(input).resize(480, 560, { fit: 'contain', background: '#f9f4f7' }).png().toBuffer(), top: 40, left: left + 10 });
      tiles.push({ input: await sharp(input).extract(crop).resize(440, 380, { fit: 'contain', background: '#f9f4f7' }).png().toBuffer(), top: 640, left: left + 30 });
      const title = column ? 'WebP Q82 / max 1920px' : 'Original / same size / EXIF applied';
      tiles.push({ input: Buffer.from(`<svg width="500" height="35"><text x="14" y="24" font-size="15">${sample.label}: ${title}</text></svg>`), top: 0, left });
      tiles.push({ input: Buffer.from('<svg width="500" height="30"><text x="14" y="22" font-size="14">Detail at 100% (no upscale)</text></svg>'), top: 605, left });
    }
    const comparison = `${checkRoot}/${sample.label}-comparison.png`;
    await sharp({ create: { width: 1000, height: 1030, channels: 3, background: '#f9f4f7' } }).composite(tiles).png().toFile(comparison);
    report.push({ source: sample.file, quality: 82, originalBytes: photo.bytes, optimizedBytes: fs.statSync(output).size, width: metadata.width, height: metadata.height, psnr: Number(psnr.toFixed(2)), orientationBefore: photo.orientation, orientationAfter: metadata.orientation || 1, comparison });
  }
  fs.writeFileSync(`${checkRoot}/samples.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

async function finalize(config) {
  const backupRoot = path.resolve(root, process.env.MUSEUM_ORIGINALS || config.originalsRoot);
  assert(!inside(backupRoot, root));
  const before = JSON.parse(fs.readFileSync(path.join(backupRoot, 'asset-audit-before.json'), 'utf8'));
  const oldFiles = new Map(before.files.map(file => [file.path, file]));
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync('assets/media/manifest.js', 'utf8'), context);
  const manifest = context.window.museumMedia;
  const used = new Set(Object.values(manifest).flatMap(item => [item.large, item.thumb, item.playback]).filter(Boolean));
  const candidates = new Set();
  for (const photo of config.photos) {
    const source = sourcePath(config, photo);
    assert.equal(hashFile(source), photo.sha256);
    const original = await sharp(source).metadata();
    const swap = original.orientation >= 5 && original.orientation <= 8;
    const orientedWidth = swap ? original.height : original.width;
    const orientedHeight = swap ? original.width : original.height;
    for (const [url, limit] of [[photo.large, 1920], [photo.thumb, 800]]) {
      const image = await sharp(`.${url}`).metadata();
      assert.equal(image.format, 'webp');
      assert(Math.max(image.width, image.height) <= limit);
      assert(image.width <= orientedWidth && image.height <= orientedHeight, `No upscale: ${url}`);
      assert(Math.abs(image.width / image.height - orientedWidth / orientedHeight) < .005, `Aspect ratio preserved: ${url}`);
      assert(!image.orientation && !image.exif && !image.icc && !image.xmp, `Metadata stripped: ${url}`);
    }
    candidates.add(`/${photo.original}`);
    if (photo.legacy) { candidates.add(photo.legacy.large); candidates.add(photo.legacy.thumb); }
  }
  for (const poster of config.videoPosters) { candidates.add(poster.legacy.large); candidates.add(poster.legacy.thumb); }
  const plan = [];
  for (const url of candidates) {
    assert(!used.has(url), `Cannot remove referenced asset: ${url}`);
    const source = path.resolve(root, `.${url}`);
    assert(inside(source, path.join(root, 'assets')) && /\.(webp|jpe?g)$/i.test(source));
    if (!fs.existsSync(source)) continue;
    const relative = path.relative(root, source).split(path.sep).join('/');
    const expected = oldFiles.get(relative);
    assert(expected, `Unrecognized pre-migration asset: ${relative}`);
    assert.equal(hashFile(source), expected.sha256, `Refuse to remove modified asset: ${relative}`);
    const target = expected.kind === 'photoOriginals' ? sourcePath(config, config.photos.find(photo => photo.original === relative)) : path.resolve(backupRoot, 'previous-web-derivatives', relative);
    assert(inside(target, backupRoot));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    if (!fs.existsSync(target)) fs.copyFileSync(source, target, fs.constants.COPYFILE_EXCL);
    assert.equal(hashFile(target), expected.sha256, `Backup verified before removal: ${relative}`);
    plan.push({ source, target, sha256: expected.sha256 });
  }
  // Only exact files with verified external copies are removed. No recursive deletion.
  for (const item of plan) {
    assert.equal(hashFile(item.target), item.sha256);
    assert.equal(hashFile(item.source), item.sha256);
    fs.unlinkSync(item.source);
  }
  const after = await auditAssets();
  for (const video of before.files.filter(file => file.kind.startsWith('video'))) {
    assert.equal(hashFile(video.path), video.sha256, `Video byte-identical: ${video.path}`);
  }
  assert.equal(after.totals.photoOriginals.count, 0, 'No original JPEGs in deploy assets');
  const imageBytes = totals => totals.photoOriginals.bytes + totals.photoWebp.bytes + totals.posters.bytes;
  const report = {
    backupRoot, backupPhotos: config.photos.length, removedBackedUpFiles: plan.length,
    before: before.totals, after: after.totals,
    imageBytesBefore: imageBytes(before.totals), imageBytesAfter: imageBytes(after.totals),
    imageSavingPercent: (1 - imageBytes(after.totals) / imageBytes(before.totals)) * 100,
    totalSavingPercent: (1 - after.totals.all.bytes / before.totals.all.bytes) * 100,
    videoFilesUnchanged: before.files.filter(file => file.kind.startsWith('video')).length,
    largestOriginalPhoto: before.largest.photos[0], largestVideo: before.largest.videos[0],
    largestOptimizedPhotos: after.files.filter(file => file.kind === 'photoWebp' && file.path.startsWith('assets/images/')).sort((a, b) => b.bytes - a.bytes).slice(0, 5),
  };
  fs.writeFileSync(`${checkRoot}/after.json`, JSON.stringify(after, null, 2));
  fs.writeFileSync(`${checkRoot}/report.json`, JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(backupRoot, 'migration-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

const config = await initialize();
if (process.argv.includes('--samples')) await samples(config);
else if (process.argv.includes('--finalize')) await finalize(config);
else console.log(`Source inventory ready: ${config.photos.length} photos and ${config.videoPosters.length} existing video posters.`);
