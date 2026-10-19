import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const output = '.museum-checks';
fs.mkdirSync(output, { recursive: true });
const data = { window: {} };
vm.runInNewContext(fs.readFileSync('data.js', 'utf8'), data);
vm.runInNewContext(fs.readFileSync('assets/media/manifest.js', 'utf8'), data);
const albums = data.window.gallery;
const manifest = data.window.museumMedia;
assert.equal(new Set(Object.values(manifest).map(item => item.large)).size, Object.keys(manifest).length, 'every source has its own derived image, even when photo/video basenames match');
for (const album of albums) {
  assert([...album.photos, ...album.videos].includes(album.cover), `cover belongs to chapter ${album.id}`);
  for (const src of [...album.photos, ...album.videos]) {
    assert(fs.existsSync(`.${src}`), `runtime media exists: ${src}`);
    assert(manifest[src], `manifest exists: ${src}`);
    for (const key of ['thumb', 'large', ...(album.videos.includes(src) ? ['playback'] : [])]) {
      assert(fs.existsSync(`.${manifest[src][key]}`), `${key} exists: ${src}`);
    }
  }
  assert.equal(album.chelseaNote, '', 'no invented Chelsea notes');
}
const report = { assets: Object.keys(manifest).length, viewports: [], pages: [], playback: [], failures: [], checks: [] };
const server = spawn(process.execPath, ['scripts/serve.mjs'], { env: { ...process.env, PORT: '4174' }, stdio: ['ignore', 'pipe', 'inherit'] });
await new Promise((resolve, reject) => { server.stdout.once('data', resolve); server.once('error', reject); });
let browser;
try {
  let executablePath = process.env.MUSEUM_BROWSER;
  if (!executablePath && !fs.existsSync(chromium.executablePath()) && process.env.LOCALAPPDATA) {
    const cache = path.join(process.env.LOCALAPPDATA, 'ms-playwright');
    for (const folder of fs.readdirSync(cache).filter(name => /^chromium-/.test(name)).sort().reverse()) {
      const candidate = path.join(cache, folder, 'chrome-win64', 'chrome.exe');
      if (fs.existsSync(candidate)) { executablePath = candidate; break; }
    }
  }
  browser = await chromium.launch({ executablePath, headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  const videoRequests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) report.failures.push(`${response.status()} ${response.url()}`); });
  page.on('request', request => { if (/\.(mp4|mov)(\?|$)/i.test(request.url())) videoRequests.push(request.url()); });
  const base = 'http://127.0.0.1:4174';
  const noOverflow = async () => assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `horizontal overflow: ${page.url()}`);
  const imagesLoaded = async () => {
    await page.locator('.media-image img').evaluateAll(images => images.forEach(img => img.loading = 'eager'));
    await page.waitForFunction(() => [...document.querySelectorAll('.media-image img')].every(img => img.complete && img.naturalWidth > 0 && getComputedStyle(img).opacity === '1' && !img.closest('.media-image').classList.contains('is-loading')));
  };
  for (const [width, height] of [[320, 568], [360, 640], [375, 667], [390, 844], [412, 915], [768, 1024], [1024, 768], [1280, 720], [1366, 768], [1440, 900], [844, 390], [667, 375]]) {
    await page.setViewportSize({ width, height });
    await page.goto(base);
    const box = await page.locator('.enter-button').boundingBox();
    assert(box.y >= 0 && box.y + box.height <= height, `Enter Museum below fold at ${width}×${height}: ${JSON.stringify(box)}`);
    assert(await page.locator('.enter-button').evaluate(button => { const b = button.getBoundingClientRect(); return button.contains(document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2)); }), 'CTA is not obscured');
    await noOverflow();
    report.viewports.push({ width, height, enterBottom: Math.round(box.y + box.height) });
    if ([320, 390, 1366].includes(width)) {
      await imagesLoaded();
      await page.screenshot({ path: `${output}/opening-${width}.png`, fullPage: true });
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base);
  await page.locator('.enter-button').click();
  await page.waitForURL('**/archive.html');
  await page.waitForFunction(() => document.querySelectorAll('.chapter-card').length === 8);
  assert.equal(await page.locator('.chapter-card').count(), 8);
  assert.equal(await page.locator('.chapter-card__play').count(), 2);
  for (const width of [390, 1366]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 768 });
    await imagesLoaded();
    await noOverflow();
    await page.screenshot({ path: `${output}/archive-${width}.png`, fullPage: true });
  }
  await page.locator('[data-view="list"]').click();
  assert(await page.locator('#chapter-grid').evaluate(el => el.classList.contains('is-list')));
  await page.setViewportSize({ width: 320, height: 568 });
  await noOverflow();
  await page.locator('[data-view="grid"]').click();
  await page.locator('#search-toggle').click();
  await page.locator('#search-input').fill('painting');
  assert.equal(await page.locator('.chapter-card').count(), 1);
  await page.locator('.chapter-card').click();
  await page.waitForURL('**/chapter.html?chapter=8');
  report.checks.push('Enter → archive; grid/list; search → chapter');

  assert.equal(videoRequests.length, 0, 'no video fetched before a media is opened');
  report.checks.push('No video requests before user opens a video');
  for (const album of albums) {
    for (const width of [390, 1366]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 768 });
      await page.goto(`${base}/chapter.html?chapter=${album.chapter}`);
      assert.equal(await page.locator('.media-thumb').count(), album.photos.length + album.videos.length);
      assert.equal(await page.locator('.chelsea-note').count(), 0);
      const ordered = await page.evaluate(() => MuseumMedia.items(our_museum.gallery.find(a => a.chapter === Number(new URLSearchParams(location.search).get('chapter')))).map(item => item.src));
      assert.deepEqual(ordered, [...album.photos, ...album.videos]);
      const coverImage = await page.locator('#chapter-stage .media-image img').getAttribute('src');
      assert.equal(coverImage, manifest[album.cover].large, 'curated cover is initial media');
      assert.equal(await page.locator('#chapter-stage .media-image').evaluate(el => getComputedStyle(el).objectFit), 'contain');
      await imagesLoaded();
      await noOverflow();
      for (const index of new Set([0, Math.floor(ordered.length / 2), ordered.length - 1])) {
        await page.locator(`[data-media-index="${index}"]`).click();
        assert.equal(await page.locator('#stage-counter').textContent(), `${index + 1} / ${ordered.length}`);
        await page.locator('.media-viewer__close').click();
        await page.waitForSelector('.media-viewer', { state: 'detached' });
      }
      if (ordered.length > 1) {
        await page.locator('#stage-next').click();
        assert.equal(await page.locator('#stage-counter').textContent(), `1 / ${ordered.length}`);
      }
      if ([2, 3, 8].includes(album.chapter)) {
        await page.goto(`${base}/chapter.html?chapter=${album.chapter}`);
        await imagesLoaded();
        await page.screenshot({ path: `${output}/chapter-${album.chapter}-${width}.png`, fullPage: true });
      }
    }
    report.pages.push(`chapter ${album.chapter}: mobile/desktop, media order, initial cover, gallery controls`);
  }
  await page.goto(`${base}/chapter.html?chapter=2`);
  await page.locator('.stage-play').click();
  await page.waitForFunction(() => document.querySelector('video')?.currentTime > 0.2, null, { timeout: 20000 });
  await page.locator('.pager-item--next').click();
  await page.waitForURL('**/chapter.html?chapter=3');
  await page.locator('.stage-play').click();
  await page.waitForFunction(() => document.querySelector('video')?.currentTime > 0.2, null, { timeout: 20000 });
  report.checks.push('Chapter 02 → next chapter 03 and both play buttons advance video');
  for (const album of albums) {
    for (const src of album.videos) {
      await page.evaluate(async src => MuseumMedia.play(document.querySelector('#chapter-stage'), src, MuseumMedia.entry(src).large), src);
      await page.waitForFunction(() => document.querySelector('video')?.currentTime > 0.2, null, { timeout: 20000 });
      report.playback.push({ source: src, ...await page.locator('video').evaluate(v => ({ duration: v.duration, width: v.videoWidth, height: v.videoHeight, readyState: v.readyState, time: v.currentTime })) });
    }
  }
  await page.goto(`${base}/chapter.html?chapter=unknown`);
  assert(await page.locator('#chapter-empty').isVisible());
  await page.locator('#chapter-empty a').click();
  await page.waitForURL('**/archive.html#chapters');
  await page.locator('.round-link').click();
  await page.waitForURL('**/story.html');
  for (const width of [390, 1366]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 768 });
    await imagesLoaded();
    await noOverflow();
    assert.equal(await page.locator('.story-moment').count(), 8);
    await page.screenshot({ path: `${output}/story-${width}.png`, fullPage: true });
  }
  await page.locator('.play-video').first().click();
  await page.waitForFunction(() => document.querySelector('video')?.currentTime > 0.2);
  await page.locator('.clip-button').first().click();
  await page.waitForFunction(() => [...document.querySelectorAll('video')].some(v => v.currentTime > 0.2 && !v.paused));
  report.checks.push('Invalid chapter fallback, archive back link, Our Story, inline playback');
  for (const album of albums) {
    await page.goto(`${base}/month.html?month=${album.sortDate.slice(0, 7)}&memory=${album.id}`);
    assert.equal(await page.locator('#memory-title').getAttribute('data-memory-id'), String(album.id));
    await imagesLoaded();
    await noOverflow();
  }
  report.checks.push('Monthly detail: all eight memories');
  // Test content is injected at runtime only; data.js stays empty.
  await page.route('**/data.js', async route => {
    const body = fs.readFileSync('data.js', 'utf8') + '\nwindow.our_museum.gallery[0].chelseaNote = "<b>Test note</b>\\nSecond line";';
    await route.fulfill({ contentType: 'text/javascript', body });
  });
  await page.goto(`${base}/chapter.html?chapter=1`);
  assert.equal(await page.locator('.chelsea-note p').last().textContent(), '<b>Test note</b>\nSecond line');
  assert.equal(await page.locator('.chelsea-note b').count(), 0);
  await page.goto(`${base}/story.html`);
  assert.equal(await page.locator('.chelsea-note').count(), 1);
  await page.goto(`${base}/month.html?month=2026-06&memory=1`);
  assert.equal(await page.locator('.chelsea-note').count(), 1);
  await page.unroute('**/data.js');
  report.checks.push('Chelsea note: empty hidden; populated shown as escaped plain text');
  // Delay media and verify that the stage reserves its geometry.
  let release;
  const held = new Promise(resolve => { release = resolve; });
  await page.route('**/assets/images/**/*.webp', async route => { await held; await route.continue(); });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/chapter.html?chapter=8`, { waitUntil: 'domcontentloaded' });
  assert(await page.locator('#chapter-stage .is-loading').count());
  const before = await page.locator('#chapter-stage').boundingBox();
  await page.screenshot({ path: `${output}/loading-390.png` });
  release();
  await page.waitForFunction(() => !document.querySelector('#chapter-stage .is-loading'));
  const after = await page.locator('#chapter-stage').boundingBox();
  assert.equal(before.height, after.height, 'stage height stable while loading');
  await page.unroute('**/assets/images/**/*.webp');
  await page.route('**/assets/images/**/*.webp', route => route.abort());
  await page.route('**/assets/thumbnails/**/*.webp', route => route.abort());
  await page.goto(`${base}/chapter.html?chapter=8`);
  await page.waitForSelector('#chapter-stage .media-fallback');
  await page.screenshot({ path: `${output}/failed-image-390.png` });
  await page.unroute('**/assets/images/**/*.webp');
  await page.unroute('**/assets/thumbnails/**/*.webp');
  await page.route('**/*-web.mp4', route => route.abort());
  await page.goto(`${base}/chapter.html?chapter=2`);
  await page.locator('.stage-play').click();
  await page.waitForSelector('.video-error a');
  assert.equal(await page.locator('.video-error a').getAttribute('href'), albums[1].cover);
  await page.unroute('**/*-web.mp4');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${base}/chapter.html?chapter=8`);
  await noOverflow();
  report.checks.push('Slow image preview, stable stage geometry, failed image/video fallback, reduced motion');
  assert.deepEqual(errors, [], 'browser JavaScript errors');
  assert.deepEqual(report.failures, [], 'HTTP failures');
  report.status = 'passed';
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  report.status = 'failed';
  report.error = error.stack;
  console.error(error);
  process.exitCode = 1;
} finally {
  fs.writeFileSync(`${output}/results.json`, JSON.stringify(report, null, 2));
  await browser?.close();
  server.kill();
}
