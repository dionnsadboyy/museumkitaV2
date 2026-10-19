import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { spawn, spawnSync } from 'node:child_process';
import ffmpeg from 'ffmpeg-static';
import { chromium } from 'playwright';

const config = { window: {} };
vm.runInNewContext(fs.readFileSync('music-playlist.js', 'utf8'), config);
const tracks = JSON.parse(JSON.stringify(config.window.MuseumPlaylist));
const inventory = JSON.parse(fs.readFileSync('scripts/music-sources.json', 'utf8')).tracks;
assert.equal(tracks.length, 7);
assert.equal(new Set(tracks.map(track => track.src)).size, 7);
assert.equal(inventory.length, 6);
for (const track of tracks) {
  assert(fs.existsSync(track.src) && fs.existsSync(track.cover));
  assert(track.title && track.artist);
  const result = spawnSync(ffmpeg, ['-hide_banner', '-nostdin', '-v', 'error', '-xerror', '-i', track.src, '-map', '0:a:0', '-f', 'null', '-'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
}
for (let i = 0; i < inventory.length; i++) {
  const source = inventory[i];
  assert.equal(source.src, tracks[i + 1].src);
  assert.equal(source.title, tracks[i + 1].title);
  assert.equal(source.artist, tracks[i + 1].artist);
  const result = spawnSync(ffmpeg, ['-v', 'error', '-i', source.src, '-map', '0:a:0', '-c:a', 'copy', '-f', 'streamhash', '-hash', 'sha256', '-'], { encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.equal(result.stdout.trim().split('=').at(-1), source.streamSha256);
}
const out = '.museum-checks/playlist';
fs.mkdirSync(out, { recursive: true });
const report = { checks: ['All seven files decode fully; six imported AAC stream hashes match their downloads'], browsers: [], errors: [] };
const server = spawn(process.execPath, ['scripts/serve.mjs'], { env: { ...process.env, PORT: '4185' }, stdio: ['ignore', 'pipe', 'inherit'] });
await new Promise((resolve, reject) => { server.stdout.once('data', resolve); server.once('error', reject); });
const base = 'http://127.0.0.1:4185';
try {
  for (const channel of ['chrome', 'msedge']) {
    const browser = await chromium.launch({ channel });
    try {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await context.newPage();
      page.on('pageerror', error => report.errors.push(error.message));
      const requests = [];
      page.on('request', request => { if (request.url().includes('/assets/music/')) requests.push(request.url()); });
      const playing = () => page.waitForFunction(() => !MuseumMusic.audio.paused && !MuseumMusic.audio.error && MuseumMusic.audio.currentTime > .1 && document.querySelector('.music-player').classList.contains('is-playing'));
      const waitTrack = index => page.waitForFunction(({ index, title }) => MuseumMusic.index === index && document.querySelector('.music-title').textContent === title, { index, title: tracks[index].title });
      await page.goto(`${base}/archive.html#chapters`);
      await page.waitForTimeout(450);
      assert.equal(await page.evaluate(() => MuseumMusic.playlist.length), 7);
      assert.equal(requests.length, 0, 'no song is preloaded');
      await page.evaluate(() => { window.audioIdentity = MuseumMusic.audio; window.coverIdentity = document.querySelector('.music-cover img'); });
      await page.locator('.music-open').click();
      assert.equal(await page.locator('.music-previous:visible, .music-next:visible').count(), 2);
      await page.locator('.music-panel .music-toggle').click();
      const played = [];
      for (let i = 0; i < tracks.length; i++) {
        await waitTrack(i); await playing();
        const actual = await page.evaluate(() => ({ src: MuseumMusic.audio.currentSrc, duration: MuseumMusic.audio.duration, count: document.querySelectorAll('audio').length, same: audioIdentity === MuseumMusic.audio && coverIdentity === document.querySelector('.music-cover img') }));
        assert.equal(new URL(actual.src).pathname, new URL(tracks[i].src, base + '/').pathname);
        assert.equal(actual.count, 1); assert(actual.same);
        const duration = i ? inventory[i - 1].sourceDurationSeconds : 271.3;
        assert(Math.abs(actual.duration - duration) < 2);
        await page.locator('.music-seek').fill('20');
        await page.waitForFunction(() => MuseumMusic.audio.currentTime > 20.1 && !MuseumMusic.audio.paused);
        played.push({ title: tracks[i].title, artist: tracks[i].artist, duration: actual.duration });
        if (i < tracks.length - 1) await page.locator('.music-next').click();
      }
      assert(await page.locator('.music-title').evaluate(el => el.scrollWidth > el.clientWidth), 'real long title uses ellipsis on mobile');
      if (channel === 'chrome') await page.screenshot({ path: `${out}/seven-track-player.png` });
      await page.locator('.music-panel .music-toggle').click();
      const before = requests.length;
      await page.locator('.music-next').click(); await waitTrack(0);
      assert(await page.evaluate(() => MuseumMusic.audio.paused && !MuseumMusic.audio.getAttribute('src')));
      assert.equal(requests.length, before, 'paused next does not fetch a song');
      await page.locator('.music-previous').click(); await waitTrack(6);
      await page.locator('.music-panel .music-toggle').click(); await playing();
      await page.evaluate(() => { MuseumMusic.audio.currentTime = MuseumMusic.audio.duration - .25; });
      await waitTrack(0); await playing();
      await page.locator('.music-previous').click(); await waitTrack(6); await playing();
      await page.locator('.music-handle').click();
      await page.locator('.chapter-card').nth(1).click();
      await page.waitForFunction(() => !!document.querySelector('#media-grid button'));
      assert(await page.evaluate(() => audioIdentity === MuseumMusic.audio && MuseumMusic.index === 6 && !MuseumMusic.audio.paused));
      await page.locator('.media-thumb').click();
      await page.waitForFunction(() => { const video = document.querySelector('dialog video'); return video && !video.paused && video.currentTime > .1; });
      assert(await page.evaluate(() => MuseumMusic.audio.paused));
      await page.locator('.media-viewer__close').click();
      await page.waitForFunction(() => !document.querySelector('dialog.media-viewer'));
      await playing();
      assert.equal(await page.evaluate(() => MuseumMusic.index), 6);
      await page.goBack(); await page.waitForFunction(() => !!document.querySelector('.chapter-card'));
      await page.goForward(); await page.waitForFunction(() => !!document.querySelector('#media-grid button'));
      assert(await page.evaluate(() => audioIdentity === MuseumMusic.audio && MuseumMusic.index === 6));
      report.browsers.push({ channel, played, checks: ['All seven tracks play and seek', 'Previous/next and wraparound', 'Automatic advance after ended', 'No autoplay or unnecessary preload', 'One persistent audio/cover', 'Navigation/back-forward keep selected track', 'Video pauses music; close resumes same track'] });
      console.log(`PASS ${channel}: seven actual tracks, seek, previous/next, ended, navigation, video conflict`);
      await context.close();
    } finally { await browser.close(); }
  }
  assert.deepEqual(report.errors, []);
  report.status = 'passed';
} catch (error) { report.status = 'failed'; report.failure = error.stack; throw error; }
finally { server.kill(); fs.writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2)); }
