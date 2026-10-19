import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

fs.mkdirSync('.museum-checks', { recursive: true });
const server = spawn(process.execPath, ['scripts/serve.mjs'], { env: { ...process.env, PORT: '4177' }, stdio: ['ignore', 'pipe', 'inherit'] });
await new Promise((resolve, reject) => { server.stdout.once('data', resolve); server.once('error', reject); });
let browser;
const report = { checks: [], status: 'running' };
try {
  let executablePath = process.env.MUSEUM_BROWSER;
  if (!executablePath && !fs.existsSync(chromium.executablePath()) && process.env.LOCALAPPDATA) {
    const cache = path.join(process.env.LOCALAPPDATA, 'ms-playwright');
    for (const folder of fs.readdirSync(cache).filter(name => /^chromium-/.test(name)).sort().reverse()) {
      const candidate = path.join(cache, folder, 'chrome-win64', 'chrome.exe');
      if (fs.existsSync(candidate)) { executablePath = candidate; break; }
    }
  }
  browser = await chromium.launch({ executablePath });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const base = 'http://127.0.0.1:4177';
  const waitClosed = () => page.waitForSelector('.media-viewer', { state: 'detached' });
  for (const [width, height] of [[320, 568], [375, 812], [390, 844], [430, 932], [1366, 768]]) {
    await page.setViewportSize({ width, height });
    await page.goto(`${base}/chapter.html?chapter=1`);
    const thumb = page.locator('[data-media-index="0"]');
    await thumb.scrollIntoViewIfNeeded();
    const scroll = await page.evaluate(() => scrollY);
    await thumb.click();
    await page.waitForSelector('.media-viewer[open]');
    assert.equal(await page.locator('.media-viewer__scene').evaluate(el => getComputedStyle(el).perspective), '1200px');
    assert.equal(await page.locator('.media-viewer__card').evaluate(el => getComputedStyle(el).transformStyle), 'preserve-3d');
    assert.equal(await page.locator('.media-viewer__back').getAttribute('aria-hidden'), 'true');
    assert.equal(await page.locator('.media-viewer__front').evaluate(el => getComputedStyle(el).backfaceVisibility), 'hidden');
    assert(!/TEAMCUT|ARMATURE|WhatsApp/i.test(await page.locator('.media-viewer').textContent()), 'viewer uses only Museum Kita identity');
    assert.equal(await page.locator('.media-viewer__counter').textContent(), '1 / 13 · Foto');
    assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden');
    assert(await page.locator('.media-viewer').evaluate(el => el.contains(document.activeElement)));
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    assert(await page.locator('.media-viewer').evaluate(el => el.contains(document.activeElement)), 'focus stays in dialog');
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('.media-viewer__counter').textContent(), '2 / 13 · Foto');
    await page.locator('.media-viewer__previous').click();
    assert.equal(await page.locator('.media-viewer__counter').textContent(), '1 / 13 · Foto');
    await page.waitForFunction(() => {
      const image = document.querySelector('.media-viewer img');
      const card = document.querySelector('.media-viewer__card');
      const frame = document.querySelector('.media-viewer__photo-frame');
      return image?.complete && image.naturalWidth > 0 && getComputedStyle(image).opacity === '1' && card.getAnimations().length === 0 && frame.getAnimations().length === 0;
    });
    assert.equal(await page.locator('.media-viewer img').evaluate(img => getComputedStyle(img).objectFit), 'contain');
    assert(await page.locator('.media-viewer__panel').evaluate(el => { const r = el.getBoundingClientRect(); return r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight; }));
    assert.equal(await page.locator('.media-viewer__card').evaluate(el => getComputedStyle(el).transform), 'none', 'flip clears its transform after settling');
    if (width === 390) {
      await page.locator('.media-viewer__spin').click();
      const turns = await page.locator('.media-viewer__card').evaluate(el => el.getAnimations()[0]?.effect.getKeyframes().map(frame => frame.transform) || []);
      assert(turns.some(transform => transform.includes('rotateY(360deg)')), 'replay performs a full rotation');
      assert(turns.some(transform => /rotateZ\((?!0deg)/.test(transform)), 'replay also rotates on Z');
      await page.waitForFunction(() => document.querySelector('.media-viewer__card').getAnimations().length === 0);
      assert.equal(await page.locator('.media-viewer__counter').textContent(), '1 / 13 · Foto', 'spin preserves selected media');
    }
    if (width === 1366) {
      const photo = await page.locator('.media-viewer__photo-frame').boundingBox();
      await page.mouse.move(photo.x + photo.width * .25, photo.y + photo.height * .25);
      await page.waitForFunction(() => document.querySelector('.media-viewer__interaction').style.transform.includes('rotateY('));
      assert(await page.locator('.media-viewer__interaction').evaluate(el => getComputedStyle(el).transform.startsWith('matrix3d')));
      const close = await page.locator('.media-viewer__close').boundingBox();
      await page.mouse.move(close.x + close.width / 2, close.y + close.height / 2);
      await page.waitForFunction(() => document.querySelector('.media-viewer__interaction').style.transform === '');
    }
    await page.screenshot({ path: `.museum-checks/modal-${width}.png` });
    await page.keyboard.press('Escape');
    await waitClosed();
    assert(await thumb.evaluate(el => document.activeElement === el), 'focus restored to clicked thumbnail');
    assert(Math.abs(await page.evaluate(() => scrollY) - scroll) < 2, 'gallery scroll position preserved');
    assert.equal(await page.evaluate(() => document.body.style.overflow), '');
    await thumb.click();
    await page.locator('.media-viewer').click({ position: { x: 2, y: 2 } });
    await waitClosed();
    await thumb.click();
    await page.locator('.media-viewer__previous').click();
    await page.waitForFunction(() => document.querySelector('.media-viewer video')?.currentTime > .2);
    assert.equal(await page.locator('.media-viewer__counter').textContent(), '13 / 13 · Video');
    const video = await page.locator('.media-viewer video').elementHandle();
    await page.locator('.media-viewer__close').click();
    await waitClosed();
    assert(await video.evaluate(el => el.paused && !el.getAttribute('src')), 'closing stops video and releases source');
    report.checks.push(`${width}×${height}: two-sided 3D card, photo, keyboard/buttons, focus, scroll, backdrop, video playback/cleanup`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/chapter.html?chapter=1`);
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.locator('[data-media-index="0"]').click();
    const transforms = await page.locator('.media-viewer__card').evaluate(el => el.getAnimations()[0]?.effect.getKeyframes().map(frame => frame.transform) || []);
    assert(transforms.some(transform => transform.includes('rotateY(540deg)')), 'opening performs a one-and-a-half-turn 3D entrance');
    await page.keyboard.press('Escape');
    await waitClosed();
    assert.equal(await page.evaluate(() => document.body.style.overflow), '');
  }
  report.checks.push('540-degree entrance, 360-degree replay, X/Y/Z rotation, cursor tilt/reset, interrupted opening/reopen without stale transforms');
  await page.goto(`${base}/chapter.html?chapter=2`);
  await page.locator('[data-media-index="0"]').click();
  await page.waitForFunction(() => document.querySelector('.media-viewer video')?.currentTime > .2);
  assert(await page.locator('.media-viewer__previous').isDisabled());
  assert(await page.locator('.media-viewer__next').isDisabled());
  await page.locator('.media-viewer__close').click();
  await waitClosed();
  await page.goto(`${base}/month.html?month=2026-07&memory=8`);
  await page.locator('[data-media-index="2"]').click();
  assert.equal(await page.locator('.media-viewer__counter').textContent(), '3 / 15 · Foto');
  await page.locator('.media-viewer__next').click();
  assert.equal(await page.locator('#stage-counter').textContent(), '4 / 15');
  await page.locator('.media-viewer__close').click();
  await waitClosed();
  report.checks.push('Single-video chapter; monthly gallery opens correct item and syncs selection');
  await page.route('**/*.webp', route => route.abort());
  await page.goto(`${base}/chapter.html?chapter=1`);
  await page.locator('[data-media-index="0"]').click();
  await page.waitForSelector('.media-viewer .media-fallback');
  await page.locator('.media-viewer__close').click();
  await waitClosed();
  await page.unroute('**/*.webp');
  await page.route('**/*-web.mp4', route => route.abort());
  await page.goto(`${base}/chapter.html?chapter=2`);
  await page.locator('[data-media-index="0"]').click();
  await page.waitForSelector('.media-viewer .video-error a');
  await page.locator('.media-viewer__close').click();
  await waitClosed();
  await page.unroute('**/*-web.mp4');
  const touchContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const touchPage = await touchContext.newPage();
  touchPage.on('pageerror', error => errors.push(error.message));
  await touchPage.goto(`${base}/chapter.html?chapter=1`);
  await touchPage.locator('[data-media-index="0"]').tap();
  await touchPage.waitForFunction(() => document.querySelector('.media-viewer__card').getAnimations().length === 0);
  const touchPhoto = await touchPage.locator('.media-viewer__photo-frame').boundingBox();
  const touchSession = await touchContext.newCDPSession(touchPage);
  const touchY = touchPhoto.y + touchPhoto.height * .5;
  const startX = touchPhoto.x + touchPhoto.width * .75;
  await touchSession.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: startX, y: touchY }] });
  await touchPage.waitForSelector('.media-viewer__photo-frame.is-dragging');
  await touchSession.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: startX - 100, y: touchY }] });
  await touchPage.waitForFunction(() => document.querySelector('.media-viewer__interaction').style.transform.includes('rotateY('));
  await touchSession.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await touchPage.waitForFunction(() => document.querySelector('.media-viewer__counter').textContent === '2 / 13 · Foto');
  await touchPage.waitForFunction(() => document.querySelector('.media-viewer__card').getAnimations().length === 0);
  await touchPage.locator('.media-viewer__stage').tap();
  assert(await touchPage.locator('.media-viewer__interaction').evaluate(el => el.getAnimations().length > 0), 'touch release has physical feedback');
  await touchPage.waitForFunction(() => document.querySelector('.media-viewer__interaction').getAnimations().length === 0);
  await touchPage.locator('.media-viewer__spin').tap();
  await touchPage.emulateMedia({ reducedMotion: 'reduce' });
  await touchPage.waitForFunction(() => document.querySelector('.media-viewer__spin').disabled);
  assert.equal(await touchPage.locator('.media-viewer__card').evaluate(el => el.getAnimations().length), 0, 'preference change cancels active spin');
  assert.equal(await touchPage.locator('.media-viewer__interaction').evaluate(el => el.style.transform), '');
  await touchPage.locator('.media-viewer__close').tap();
  await touchPage.waitForSelector('.media-viewer', { state: 'detached' });
  await touchContext.close();
  report.checks.push('Mobile touch: press feedback, drag tilt, swipe to next, release rebound, cancel spin when reduced motion changes');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${base}/chapter.html?chapter=1`);
  await page.locator('[data-media-index="0"]').click();
  assert.equal(await page.locator('.media-viewer__panel').evaluate(el => getComputedStyle(el).animationName), 'none');
  assert.equal(await page.locator('.media-viewer__card').evaluate(el => el.getAnimations().length), 0);
  assert(await page.locator('.media-viewer__spin').isDisabled());
  await page.keyboard.press('Escape');
  await waitClosed();
  assert.deepEqual(errors, []);
  report.checks.push('Image/video failure fallbacks; reduced motion; no JavaScript errors');
  report.status = 'passed';
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  report.status = 'failed';
  report.error = error.stack;
  console.error(error);
  process.exitCode = 1;
} finally {
  fs.writeFileSync('.museum-checks/modal-results.json', JSON.stringify(report, null, 2));
  await browser?.close();
  server.kill();
}
