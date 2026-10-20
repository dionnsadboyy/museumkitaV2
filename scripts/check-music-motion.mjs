import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { useSingleTrackFixture } from './music-test-fixture.mjs';

const out = '.museum-checks/music-motion';
fs.mkdirSync(out, { recursive: true });
const server = spawn(process.execPath, ['scripts/serve.mjs'], { env: { ...process.env, PORT: '4184' }, stdio: ['ignore', 'pipe', 'inherit'] });
await new Promise((resolve, reject) => { server.stdout.once('data', resolve); server.once('error', reject); });
const cache = path.join(process.env.LOCALAPPDATA, 'ms-playwright');
const executablePath = fs.readdirSync(cache).filter(name => /^chromium-/.test(name)).sort().reverse().map(name => path.join(cache, name, 'chrome-win64', 'chrome.exe')).find(file => fs.existsSync(file));
const browser = await chromium.launch({ executablePath });
const report = { checks: [], errors: [], motion: [], limitations: ['Chromium touch emulation; Safari/iPhone hardware unavailable.'] };
const check = name => { report.checks.push(name); console.log('PASS', name); };
const settle = page => page.waitForTimeout(480);
const playing = page => page.waitForFunction(() => !MuseumMusic.audio.paused && MuseumMusic.audio.currentTime > .1 && document.querySelector('.music-player').classList.contains('is-playing'));
const swipe = async (page, dx, dy) => {
  const r = await page.locator('.music-player').boundingBox();
  const x = r.x + r.width / 2, y = r.y + 16;
  await page.mouse.move(x, y); await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 8 }); await page.mouse.up();
  await settle(page);
};
let page;
try {
  for (const width of [320, 390, 430, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: width === 1440 ? 900 : 844 }, ...(width === 390 ? { recordVideo: { dir: `${out}/recordings`, size: { width: 390, height: 844 } } } : {}) });
    await useSingleTrackFixture(context);
    page = await context.newPage();
    page.on('pageerror', error => report.errors.push(error.message));
    await page.goto('http://127.0.0.1:4184/archive.html#chapters');
    await settle(page);
    await page.evaluate(() => { window.coverIdentity = document.querySelector('.music-cover img'); window.audioIdentity = MuseumMusic.audio; });
    const assertState = async mode => {
      assert.equal(await page.locator('.music-player').getAttribute('data-mode'), mode);
      const size = await page.evaluate(() => {
        const root = document.querySelector('.music-player').getBoundingClientRect();
        const dock = document.querySelector('.bottom-dock').getBoundingClientRect();
        const cover = document.querySelector('.music-cover img');
        return { width: root.width, height: root.height, x: root.x, right: root.right, gap: dock.top - root.bottom, overflow: document.documentElement.scrollWidth > innerWidth, sameCover: cover === coverIdentity, loaded: cover.complete && cover.naturalWidth > 0, singleAudio: document.querySelectorAll('audio').length === 1 && audioIdentity === MuseumMusic.audio };
      });
      assert(size.sameCover && size.loaded && size.singleAudio && !size.overflow);
      assert(size.x >= 16 && size.right <= width - 16 && size.gap >= 10 && size.gap <= 12);
      if (mode === 'pill') { assert(size.height >= 56 && size.height <= 60); assert(size.width <= 320); }
      if (mode === 'expanded') { assert(size.width <= 360 && size.height >= 260 && size.height <= 316); }
      if (mode === 'mini') assert(size.width >= 90 && size.width <= 110);
    };
    await assertState('pill');
    assert(await page.evaluate(() => MuseumMusic.audio.paused && !MuseumMusic.audio.getAttribute('src')));
    await page.locator('.music-pill .music-toggle').click();
    await playing(page); await settle(page);
    assert.equal(await page.locator('.music-player').getAttribute('data-mode'), 'pill');
    await page.evaluate(() => { MuseumMusic.audio.currentTime = 84; });
    await playing(page); await settle(page);
    if (width === 390) await page.screenshot({ path: `${out}/pill.png` });
    const frames = await page.evaluate(async () => {
      const root = document.querySelector('.music-player');
      document.querySelector('.music-open').click();
      const start = performance.now(), samples = [];
      await new Promise(resolve => {
        const sample = () => {
          const r = root.getBoundingClientRect(), c = document.querySelector('.music-cover').getBoundingClientRect();
          samples.push({ ms: performance.now() - start, width: r.width, height: r.height, center: r.x + r.width / 2, bottom: r.bottom, coverTop: c.top, coverWidth: c.width, controlsOpacity: Number(getComputedStyle(document.querySelector('.music-panel')).opacity) });
          if (performance.now() - start < 470) requestAnimationFrame(sample); else resolve();
        }; requestAnimationFrame(sample);
      });
      return samples;
    });
    report.motion.push({ width, frames });
    assert(new Set(frames.map(frame => Math.round(frame.height))).size > 5, 'panel morphs through intermediate sizes');
    assert(frames.every(frame => Math.abs(frame.center - width / 2) < .6), 'morph stays centered');
    assert(Math.max(...frames.map(f => f.bottom)) - Math.min(...frames.map(f => f.bottom)) < 1, 'bottom anchor remains fixed');
    assert(frames.some(f => f.ms < 95 && f.controlsOpacity < .05) && frames.at(-1).controlsOpacity > .99, 'controls enter after shape begins');
    await assertState('expanded');
    assert.equal(await page.locator('.music-previous:visible, .music-next:visible').count(), 0);
    if (width === 390) await page.screenshot({ path: `${out}/expanded.png` });
    await page.locator('.music-seek').fill('100');
    assert(await page.evaluate(() => MuseumMusic.audio.currentTime >= 100));
    assert.equal(await page.locator('.music-player').getAttribute('data-mode'), 'expanded');
    // Pointer seek on the actual custom range must not collapse or switch the track.
    const bar = await page.locator('.music-seek').boundingBox();
    await page.mouse.click(bar.x + bar.width * .6, bar.y + bar.height / 2);
    assert(await page.evaluate(() => MuseumMusic.audio.currentTime > 140 && MuseumMusic.index === 0));
    await swipe(page, 2, 55); await assertState('pill');
    await swipe(page, 1, 55); await assertState('mini');
    if (width === 390) await page.screenshot({ path: `${out}/mini.png` });
    await page.locator('.music-mini').click(); await settle(page); await assertState('pill');
    const interruptions = await page.evaluate(async () => {
      const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
      const root = document.querySelector('.music-player');
      const samples = [];
      for (let i = 0; i < 3; i++) {
        document.querySelector('.music-open').click(); await delay(125);
        const before = root.getBoundingClientRect().height;
        document.querySelector('.music-handle').click();
        const after = root.getBoundingClientRect().height;
        samples.push({ before, after }); await delay(130);
      }
      document.querySelector('.music-open').click(); await delay(460);
      return samples;
    });
    assert(interruptions.every(item => Math.abs(item.before - item.after) < 1), 'reversing a morph does not snap');
    await assertState('expanded');
    // Temporary metadata only: preserve the production playlist and actual song.
    await page.evaluate(() => { MuseumMusic.playlist.push({ ...MuseumMusic.playlist[0], title: 'Panasea — judul lagu yang sangat panjang untuk memeriksa batas layar kecil', artist: 'rumahsakit dengan nama artis panjang' }); });
    await swipe(page, -65, 2);
    assert.equal(await page.evaluate(() => MuseumMusic.index), 1);
    assert(await page.locator('.music-title').evaluate(el => el.scrollWidth > el.clientWidth && getComputedStyle(el).textOverflow === 'ellipsis'));
    assert(await page.locator('.music-controls').evaluate(el => { const r=el.getBoundingClientRect();return r.left >= 0 && r.right <= innerWidth; }));
    await page.locator('.music-next').click(); await settle(page);
    assert.equal(await page.evaluate(() => MuseumMusic.index), 0);
    await page.locator('.music-previous').click(); await settle(page);
    assert.equal(await page.evaluate(() => MuseumMusic.index), 1);
    await swipe(page, 65, 2); assert.equal(await page.evaluate(() => MuseumMusic.index), 0);
    await page.locator('.music-handle').click(); await settle(page);
    await page.locator('.music-pill .music-toggle').click();
    assert(await page.evaluate(() => MuseumMusic.audio.paused));
    assert(await page.locator('.music-bars i').evaluateAll(elements => elements.every(el => getComputedStyle(el).animationPlayState === 'paused')));
    await page.locator('.music-pill .music-toggle').click(); await playing(page);
    await page.evaluate(() => MuseumMusic.audio.dispatchEvent(new Event('waiting')));
    assert(await page.locator('.music-bars i').evaluateAll(elements => elements.every(el => getComputedStyle(el).animationPlayState === 'paused')));
    await page.evaluate(() => MuseumMusic.audio.dispatchEvent(new Event('playing')));
    await settle(page);
    await page.locator('.music-open').click(); await settle(page);
    await page.locator('.music-seek').focus(); await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(() => MuseumMusic.index), 0);
    await page.keyboard.press('Escape'); await settle(page); await assertState('pill');
    await page.keyboard.press('Escape'); await settle(page); await assertState('mini');
    await page.keyboard.press('Enter'); await settle(page); await assertState('pill');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.locator('.music-open').click();
    assert.equal(await page.locator('.music-player').evaluate(el => getComputedStyle(el).transitionDuration), '0s');
    assert.equal(await page.locator('.music-bars i').first().evaluate(el => getComputedStyle(el).animationName), 'none');
    check(`${width}px: three states, live frame samples, interrupted morphs, long title, seek, swipe, keyboard, playback, buffering, reduced motion`);
    const video = width === 390 ? page.video() : null;
    await context.close();
    if (video) await video.saveAs(`${out}/motion-preview.webm`);
  }
  assert.deepEqual(report.errors, []);
  report.status = 'passed';
} catch (error) {
  report.status = 'failed'; report.failure = error.stack;
  if (page && !page.isClosed()) await page.screenshot({ path: `${out}/failure.png` });
  throw error;
} finally {
  fs.writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2));
  await browser.close(); server.kill();
}
