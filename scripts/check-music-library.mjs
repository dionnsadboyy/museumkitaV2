import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const out = '.museum-checks/music-library';
fs.mkdirSync(out, { recursive: true });
const server = spawn(process.execPath, ['scripts/serve.mjs'], { env: { ...process.env, PORT: '4186' }, stdio: ['ignore', 'pipe', 'inherit'] });
await new Promise((resolve, reject) => { server.stdout.once('data', resolve); server.once('error', reject); });
const browser = await chromium.launch({ channel: 'chrome' });
const report = { checks: [], errors: [], limitations: ['Mobile touch emulated in Chrome; Safari/iPhone not tested.'] };
const settle = page => page.waitForTimeout(470);
const playing = page => page.waitForFunction(() => !MuseumMusic.audio.paused && MuseumMusic.audio.currentTime > .1 && document.querySelector('.music-player').classList.contains('is-playing'));
const waitTrack = (page, index) => page.waitForFunction(index => MuseumMusic.index === index && document.querySelector('.music-title').textContent === MuseumMusic.playlist[index].title, index);
let page;
try {
  for (const [width, height] of [[320, 844], [390, 844], [430, 844], [1440, 900], [844, 390]]) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: true, isMobile: width < 500 });
    page = await context.newPage();
    page.on('pageerror', error => report.errors.push(error.message));
    await page.goto('http://127.0.0.1:4186/archive.html#chapters');
    await page.evaluate(() => { window.audioIdentity = MuseumMusic.audio; window.coverIdentity = document.querySelector('.music-cover img'); });
    await page.locator('.music-open').click(); await settle(page);
    await page.locator('.music-library-toggle').click(); await settle(page);
    assert.deepEqual(await page.locator('.music-song').evaluateAll(elements => elements.map(el => Number(el.dataset.trackIndex))), [0,1,2,3,4,5,6]);
    assert.equal(await page.locator('.music-song[aria-current="true"]').getAttribute('data-track-index'), '0');
    const bounds = await page.evaluate(() => {
      const r=document.querySelector('.music-player').getBoundingClientRect();
      const dock=document.querySelector('.bottom-dock').getBoundingClientRect();
      const list=document.querySelector('.music-song-list');
      return { top:r.top, left:r.left, right:r.right, height:r.height, gap:dock.top-r.bottom, overflow:document.documentElement.scrollWidth>innerWidth, scrollable:list.scrollHeight>list.clientHeight };
    });
    assert(!bounds.overflow && bounds.left>=16 && bounds.right<=width-16 && bounds.top>=23 && bounds.gap>=10 && bounds.gap<=12 && bounds.scrollable);
    assert(await page.evaluate(() => MuseumMusic.audio.paused && !MuseumMusic.audio.getAttribute('src')));
    await page.locator('.music-sort').selectOption('title');
    assert.deepEqual(await page.locator('.music-song').evaluateAll(elements=>elements.map(el=>Number(el.dataset.trackIndex))), [2,4,5,6,0,3,1]);
    await page.locator('.music-sort').focus(); await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(()=>MuseumMusic.index),0);
    await page.locator('.music-sort').selectOption('title');
    await page.locator('.music-song[data-track-index="5"]').click(); await waitTrack(page,5); await settle(page);
    assert.equal(await page.locator('.music-library-toggle').getAttribute('aria-expanded'),'false');
    assert(await page.evaluate(()=>MuseumMusic.audio.paused && !MuseumMusic.audio.getAttribute('src')));
    await page.locator('.music-panel .music-toggle').click(); await playing(page);
    await page.evaluate(()=>MuseumMusic.audio.currentTime=37); await playing(page);
    await page.locator('.music-library-toggle').click(); await page.locator('.music-sort').selectOption('album');
    assert.deepEqual(await page.locator('.music-album-heading').allTextContents(), ['Kembali · Glenn Fredly','Manusia · TULUS','MARKERS & SUCH · Sal Priadi','Panasea - Single · rumahsakit','Teh Hijau - Single · TULUS','Tanpa album']);
    assert.deepEqual(await page.locator('.music-song').evaluateAll(elements=>elements.map(el=>Number(el.dataset.trackIndex))), [4,2,5,6,0,3,1]);
    assert(await page.evaluate(()=>!MuseumMusic.audio.paused && MuseumMusic.audio.currentTime>=37 && MuseumMusic.index===5));
    await page.locator('.music-library-close').click(); await settle(page);
    await page.locator('.music-next').click(); await waitTrack(page,6); await playing(page);
    await page.locator('.music-previous').click(); await waitTrack(page,5); await playing(page);
    await page.evaluate(()=>MuseumMusic.audio.currentTime=41);
    await page.locator('.music-library-toggle').click();
    await page.locator('.music-song[data-track-index="5"]').click(); await settle(page);
    assert(await page.evaluate(()=>MuseumMusic.audio.currentTime>=41 && audioIdentity===MuseumMusic.audio && coverIdentity===document.querySelector('.music-cover img') && document.querySelectorAll('audio').length===1));
    await page.locator('.music-library-toggle').click(); await page.keyboard.press('Escape');
    assert.equal(await page.locator('.music-player').getAttribute('data-mode'),'expanded');
    assert.equal(await page.locator('.music-library-toggle').getAttribute('aria-expanded'),'false');
    await page.locator('.music-library-toggle').click(); await settle(page);
    if (width===390) {
      await page.screenshot({path:`${out}/album-picker-mobile.png`});
      const list=await page.locator('.music-song-list').boundingBox();
      const before=await page.evaluate(()=>({list:document.querySelector('.music-song-list').scrollTop,page:scrollY,index:MuseumMusic.index}));
      const cdp=await context.newCDPSession(page);
      const x=list.x+list.width/2,y=list.y+list.height-20;
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
      for(let i=1;i<=5;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-i*24}]});await page.waitForTimeout(20);}
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await page.waitForTimeout(350);
      const after=await page.evaluate(()=>({list:document.querySelector('.music-song-list').scrollTop,page:scrollY,index:MuseumMusic.index}));
      assert(after.list>before.list && after.page===before.page && after.index===before.index);
      await page.locator('.music-sort').selectOption('title');
      await page.screenshot({path:`${out}/song-picker-mobile.png`});
      await page.locator('.music-sort').selectOption('album');
    }
    await page.mouse.click(8,100); await settle(page);
    assert.equal(await page.locator('.music-library-toggle').getAttribute('aria-expanded'),'false');
    if(width===390){
      await page.locator('.chapter-card').nth(1).click(); await page.waitForFunction(()=>!!document.querySelector('#media-grid button'));
      assert(await page.evaluate(()=>audioIdentity===MuseumMusic.audio && MuseumMusic.index===5 && !MuseumMusic.audio.paused));
      await page.locator('.music-library-toggle').click();
      assert.equal(await page.locator('.music-sort').inputValue(),'album');
      await page.locator('.music-library-close').click();
      await page.goBack(); await page.waitForFunction(()=>!!document.querySelector('.chapter-card'));
      await page.reload(); await settle(page);
      assert(await page.evaluate(()=>MuseumMusic.audio.paused && MuseumMusic.index===5));
      await page.locator('.music-library-toggle').click();
      assert.equal(await page.locator('.music-sort').inputValue(),'album');
      assert.equal(await page.locator('.music-song[aria-current="true"]').getAttribute('data-track-index'),'5');
      await page.locator('.music-library-close').click();
      await page.locator('.music-panel .music-toggle').click(); await playing(page);
      await page.locator('.chapter-card').nth(1).click(); await page.waitForFunction(()=>!!document.querySelector('#media-grid button'));
      await page.locator('.media-thumb').click(); await page.waitForFunction(()=>{const v=document.querySelector('dialog video');return v&&!v.paused&&v.currentTime>.1;});
      assert(await page.evaluate(()=>MuseumMusic.audio.paused));
      await page.locator('.media-viewer__close').click(); await page.waitForFunction(()=>!document.querySelector('.media-viewer')); await playing(page);
      assert.equal(await page.evaluate(()=>MuseumMusic.index),5);
    }
    report.checks.push(`${width}x${height}: picker bounds, original/title/album sort, grouped albums, direct selection, pause/play continuity, sorted previous/next, same-track position, Escape/outside close`);
    console.log(`PASS ${width}x${height}: music picker and sorting`);
    await context.close();
  }
  report.checks.push('390px native touch list scroll does not scroll page or switch tracks; selection/sort persist across navigation and reload; video resumes the selected track');
  assert.deepEqual(report.errors,[]);
  report.status='passed';
} catch(error){report.status='failed';report.failure=error.stack;if(page&&!page.isClosed())await page.screenshot({path:`${out}/failure.png`});throw error;}
finally{fs.writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2));await browser.close();server.kill();}
