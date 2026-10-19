// Exercise the runtime on an ordinary static host, without serve.mjs MIME sniffing.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const root = process.cwd();
const reports = [];
const types = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.webp': 'image/webp', '.m4a': 'audio/mp4' };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404).end(); return; }
  const size = fs.statSync(file).size;
  const range = req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
  const start = range ? Number(range[1]) : 0;
  const end = range?.[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
  if (start > end || start >= size) { res.writeHead(416, { 'Content-Range': `bytes */${size}` }).end(); return; }
  const headers = { 'Content-Type': url.searchParams.has('generic') ? 'application/octet-stream' : types[path.extname(file)] || 'application/octet-stream', 'Content-Length': end - start + 1, 'Accept-Ranges': 'bytes' };
  if (range) headers['Content-Range'] = `bytes ${start}-${end}/${size}`;
  res.writeHead(range ? 206 : 200, headers);
  fs.createReadStream(file, { start, end }).pipe(res);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
try {
  for (const channel of ['chrome', 'msedge']) {
    const browser = await chromium.launch({ channel });
    try {
      for (const hosting of ['standard-static', 'generic-mime', 'file']) {
        const page = await browser.newPage();
        const responses = [];
        page.on('response', response => {
          if (response.url().includes('/music/')) responses.push({ status: response.status(), mime: response.headers()['content-type'] });
        });
        await page.goto(hosting === 'file' ? pathToFileURL(path.join(root, 'archive.html')).href : `${base}/archive.html`);
        if (hosting === 'generic-mime') await page.evaluate(() => { MuseumMusic.playlist[0].src += '?generic'; });
        assert(await page.evaluate(() => MuseumMusic.audio.paused && !MuseumMusic.audio.getAttribute('src')));
        await page.locator('.music-pill .music-toggle').click();
        await page.waitForFunction(() => !MuseumMusic.audio.paused && MuseumMusic.audio.currentTime > .2 && !MuseumMusic.audio.error);
        await page.locator('.music-open').click();
        await page.locator('.music-seek').fill('60');
        await page.waitForFunction(() => MuseumMusic.audio.currentTime > 60.2 && !MuseumMusic.audio.paused).catch(async error => {
          console.error(channel, hosting, await page.evaluate(() => ({ time: MuseumMusic.audio.currentTime, duration: MuseumMusic.audio.duration, paused: MuseumMusic.audio.paused, error: MuseumMusic.audio.error?.message, state: MuseumMusic.audio.readyState, seekable: Array.from({length: MuseumMusic.audio.seekable.length}, (_,i) => [MuseumMusic.audio.seekable.start(i),MuseumMusic.audio.seekable.end(i)]) })));
          throw error;
        });
        const result = await page.evaluate(() => ({ url: MuseumMusic.audio.currentSrc, duration: MuseumMusic.audio.duration, time: MuseumMusic.audio.currentTime, error: MuseumMusic.audio.error?.code || 0 }));
        assert(result.duration > 270 && result.duration < 272);
        assert.equal(result.error, 0);
        if (hosting === 'standard-static') { assert([200, 206].includes(responses[0].status)); assert.equal(responses[0].mime, 'audio/mp4'); }
        await page.locator('.music-panel .music-toggle').click();
        assert(await page.evaluate(() => MuseumMusic.audio.paused));
        reports.push({ channel, hosting, ...result, status: 'passed' });
        console.log(`PASS ${channel}: ${hosting}, play/seek/pause, ${result.duration.toFixed(2)}s`);
        await page.close();
      }
    } finally { await browser.close(); }
  }
} finally {
  server.close();
  fs.mkdirSync('.museum-checks/audio-hosting', { recursive: true });
  fs.writeFileSync('.museum-checks/audio-hosting/results.json', JSON.stringify(reports, null, 2));
}
