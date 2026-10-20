import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const report = JSON.parse(fs.readFileSync('scripts/audio-playlist-report.json', 'utf8'));
assert.equal(report.pending, 0, 'Finish the sequential import before testing the active catalogue.');
const windowContext = { window: {} };
vm.runInNewContext(fs.readFileSync('music-playlist.js', 'utf8'), windowContext);
const tracks = JSON.parse(JSON.stringify(windowContext.window.MuseumPlaylist));
const verified = report.tracks.filter(track => track.status === 'verified').sort((a,b) => a.number - b.number);
assert.deepEqual(tracks.slice(0, verified.length).map(track=>track.src), verified.map(track=>track.src));
assert.equal(new Set(tracks.map(track=>track.id)).size, tracks.length);
assert.equal(new Set(tracks.map(track=>track.src)).size, tracks.length);
for(const track of tracks){
  for(const key of ['id','title','artist','src','cover','sourceUrl']) assert(key in track, `${track.title}: missing ${key}`);
  assert(fs.existsSync(track.src) && fs.existsSync(track.cover));
}
for(const track of verified){
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(track.src)).digest('hex'),track.sha256);
  assert(track.codec.startsWith('mp3') && track.durationSeconds>30 && track.durationSeconds<1200);
  assert(track.targetBitrateKbps<=160 && track.targetBitrateKbps<=track.sourceBitrateKbps);
  assert(track.verifiedAt && Math.abs(track.durationSeconds-track.sourceDurationSeconds)<4);
}
const legacy = JSON.parse(fs.readFileSync('scripts/audio-playlist-legacy.json','utf8'));
for(const old of legacy){
  assert(fs.existsSync(old.src),'Original legacy files must remain intact');
  assert(tracks.some(track=>track.src===old.src||track.previousSrcs?.includes(old.src)),`${old.title}: old track must be retained or linked to a replacement`);
}
const out='.museum-checks/prepared-audio';fs.mkdirSync(out,{recursive:true});
const results={startedAt:new Date().toISOString(),checks:['Manifest contains only verified requested files, in source order','Legacy files retained; replacements link old paths','MP3 bitrate is capped by source and 160 kbps; complete decode verified during import'],tracks:[],errors:[]};
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'4187'},stdio:['ignore','pipe','inherit']});
await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
const browser=await chromium.launch({channel:'chrome'});
let page;
try{
  const context=await browser.newContext({viewport:{width:390,height:844}});
  page=await context.newPage();
  page.on('pageerror',error=>results.errors.push(error.message));
  const audioRequests=[];
  page.on('request',request=>{if(request.url().includes('/assets/music/'))audioRequests.push(request.url());});
  await page.goto('http://127.0.0.1:4187/archive.html#chapters');
  assert.equal(audioRequests.length,0,'No audio preloads before user play');
  await page.evaluate(()=>{window.audioIdentity=MuseumMusic.audio;});
  await page.locator('.music-open').click();
  await page.locator('.music-library-toggle').click();
  assert.equal(await page.locator('.music-sort').count(),0);
  const order=await page.locator('.music-song').evaluateAll(nodes=>nodes.map(node=>Number(node.dataset.trackIndex)));
  const start=order.indexOf(0);
  const sequence=order.slice(start).concat(order.slice(0,start));
  await page.locator('.music-library-close').click();
  await page.locator('.music-panel .music-toggle').click();
  const waitTrack=index=>page.waitForFunction(index=>MuseumMusic.index===index&&document.querySelector('.music-title').textContent===MuseumMusic.playlist[index].title,index);
  const playing=()=>page.waitForFunction(()=>!MuseumMusic.audio.paused&&!MuseumMusic.audio.error&&MuseumMusic.audio.currentTime>.1&&document.querySelector('.music-player').classList.contains('is-playing'));
  for(let position=0;position<sequence.length;position++){
    const i=sequence[position];
    await waitTrack(i);await playing();
    const actual=await page.evaluate(()=>({src:MuseumMusic.audio.currentSrc,duration:MuseumMusic.audio.duration,same:audioIdentity===MuseumMusic.audio,count:document.querySelectorAll('audio').length}));
    assert.equal(new URL(actual.src).pathname,new URL(tracks[i].src,'http://localhost/').pathname);
    assert(actual.same&&actual.count===1&&actual.duration>30&&actual.duration<1200);
    await page.locator('.music-seek').fill('20');
    await page.waitForFunction(()=>MuseumMusic.audio.currentTime>20.1&&!MuseumMusic.audio.paused);
    results.tracks.push({id:tracks[i].id,title:tracks[i].title,artist:tracks[i].artist,duration:actual.duration,play:true,seek:true});
    console.log(`PASS ${i+1}/${tracks.length}: ${tracks[i].artist} — ${tracks[i].title}`);
    if(position+1<sequence.length)await page.locator('.music-next').click();
  }
  await page.locator('.music-previous').click();await waitTrack(sequence.at(-2));await playing();
  await page.locator('.music-next').click();await waitTrack(sequence.at(-1));await playing();
  await page.evaluate(()=>{MuseumMusic.audio.currentTime=MuseumMusic.audio.duration-.25;});
  await waitTrack(0);await playing();
  results.checks.push('Every active file plays and seeks in Chrome; next/previous and automatic wrap after ended pass');
  await page.locator('.music-library-toggle').click();
  assert.equal(await page.locator('.music-song').count(),tracks.length);

  const selected=await page.locator('.music-song').first().getAttribute('data-track-index');
  await page.locator(`.music-song[data-track-index="${selected}"]`).click();await waitTrack(Number(selected));await playing();
  await page.locator('.music-library-toggle').click();
  await page.locator('.music-library-close').click();
  await page.locator('.music-handle').click();
  await page.locator('.chapter-card').nth(1).click();await page.waitForFunction(()=>!!document.querySelector('.media-thumb'));
  assert(await page.evaluate(()=>audioIdentity===MuseumMusic.audio&&!MuseumMusic.audio.paused));
  await page.locator('.media-thumb').click();await page.waitForFunction(()=>{const v=document.querySelector('dialog video');return v&&!v.paused&&v.currentTime>.1;});
  assert(await page.evaluate(()=>MuseumMusic.audio.paused));
  await page.locator('.media-viewer__close').click();await page.waitForFunction(()=>!document.querySelector('.media-viewer'));await playing();
  results.checks.push('Album-only song picker, internal navigation, single audio instance and video pause/resume preserved');
  // Simulate a prior-session M4A selection after a verified MP3 replacement.
  const migrated=tracks.findIndex(track=>track.previousSrcs?.length);
  if(migrated>=0){
    await page.addInitScript(({src})=>sessionStorage.setItem('museum-music',JSON.stringify({src,time:42,volume:.4,mode:'expanded',sortBy:'original'})),{src:tracks[migrated].previousSrcs[0]});
    await page.reload();
    assert(await page.evaluate(index=>MuseumMusic.index===index&&MuseumMusic.audio.paused,migrated));
    await page.locator('.music-panel .music-toggle').click();await playing();
    assert(await page.evaluate(()=>MuseumMusic.audio.currentTime>=42&&MuseumMusic.audio.volume===.4));
    results.checks.push('Legacy source migration preserves selected song, position and volume; reload requires explicit play');
  }
  assert.deepEqual(results.errors,[]);
  await page.screenshot({path:`${out}/player.png`});
  results.status='passed';
}catch(error){results.status='failed';results.failure=error.stack;if(page&&!page.isClosed())await page.screenshot({path:`${out}/failure.png`});throw error;}
finally{results.finishedAt=new Date().toISOString();fs.writeFileSync(`${out}/report.json`,JSON.stringify(results,null,2));await browser.close();server.kill();}
