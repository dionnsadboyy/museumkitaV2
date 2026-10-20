import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import ffmpeg from 'ffmpeg-static';

const root = process.cwd();
const cache = path.resolve('.museum-checks/audio-playlist');
fs.mkdirSync(cache, { recursive: true });
const sources = JSON.parse(fs.readFileSync('scripts/audio-playlist-sources.json', 'utf8'));
const reportFile = 'scripts/audio-playlist-report.json';
const legacyFile = 'scripts/audio-playlist-legacy.json';
const archive = path.resolve('scripts/audio-download-archive.txt');
const yt = process.env.MUSEUM_YTDLP || path.resolve('.museum-checks/tools/yt-dlp.exe');
assert(fs.existsSync(yt) && fs.existsSync(ffmpeg), 'Install yt-dlp and ffmpeg from their official releases first.');
const readJSON = file => {
  const bytes = fs.readFileSync(file);
  return JSON.parse(bytes[0] === 255 && bytes[1] === 254 ? bytes.subarray(2).toString('utf16le') : bytes.toString('utf8').replace(/^\uFEFF/, ''));
};
if (!fs.existsSync(legacyFile)) {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync('music-playlist.js', 'utf8'), context);
  const previousSources = readJSON('scripts/music-sources.json').tracks;
  const tracks = JSON.parse(JSON.stringify(context.window.MuseumPlaylist));
  tracks.forEach(track => {
    track.sourceUrl ||= previousSources.find(source => source.src === track.src)?.sourceUrl || '';
    track.id ||= track.sourceUrl ? `youtube:${new URL(track.sourceUrl).searchParams.get('v')}` : `legacy:${path.basename(track.src, path.extname(track.src))}`;
  });
  fs.writeFileSync(legacyFile, JSON.stringify(tracks, null, 2) + '\n');
}
const legacy = readJSON(legacyFile);
const report = fs.existsSync(reportFile) ? readJSON(reportFile) : { policy: 'Sequential public-source downloads; no login, cookies, alternate clients, DRM bypass or restricted-source retries. MP3 bitrate never exceeds known source audio bitrate.', tracks: [] };
const normalize = value => String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[’']/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim();
const compact = value => normalize(value).replace(/\s/g, '');
const songKey = track => `${compact(track.title)}|${compact(track.artist.split(/\s+(?:feat\.?|ft\.?|featuring)\s+/i)[0])}`;
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function run(executable, args, timeout = 90000) {
  const result = spawnSync(executable, args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, timeout, windowsHide: true });
  if (result.error || result.status !== 0) throw new Error((result.stderr || result.error?.message || 'Tool failed').trim());
  return result.stdout;
}
function probe(file, full = false) {
  const result = spawnSync(ffmpeg, ['-hide_banner', '-nostdin', '-i', file], { encoding: 'utf8', windowsHide: true });
  const text = result.stderr || '';
  const match = text.match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
  const stream = text.match(/Stream[^\n]+Audio: ([^,\r\n]+)/);
  if (!match || !stream) throw new Error('Unreadable file or no audio stream');
  const duration = Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
  if (duration < 30 || duration > 1200) throw new Error(`Implausible song duration: ${duration}s`);
  const bitrate = Number(text.match(/Audio:[^\r\n]*?([\d.]+) kb\/s/)?.[1] || text.match(/bitrate:\s*([\d.]+) kb\/s/)?.[1] || 0);
  if (full) run(ffmpeg, ['-v', 'error', '-nostdin', '-xerror', '-i', file, '-map', '0:a:0', '-f', 'null', '-']);
  return { durationSeconds: duration, codec: stream[1], bitrateKbps: bitrate };
}
function checkpoint() {
  report.updatedAt = new Date().toISOString();
  report.requested = sources.length;
  report.successful = report.tracks.filter(track => track.status === 'verified').length;
  report.failed = report.tracks.filter(track => track.status !== 'verified').length;
  report.pending = sources.length - report.tracks.length;
  report.totalRequestedBytes = report.tracks.reduce((sum, track) => sum + (track.status === 'verified' ? track.bytes : 0), 0);
  report.tracks.sort((a, b) => a.number - b.number);
  fs.writeFileSync(reportFile + '.tmp', JSON.stringify(report, null, 2) + '\n');
  fs.renameSync(reportFile + '.tmp', reportFile);
}
function versionCheck(item, info) {
  if (info.id !== item.videoId) throw new Error('METADATA: video id does not match the requested URL');
  if (info.has_drm || ['private', 'premium_only', 'subscriber_only', 'needs_auth', 'needs_subscription'].includes(info.availability)) throw new Error('RESTRICTED: source requires authentication/subscription or DRM');
  if (info.is_live || info.live_status === 'is_live') throw new Error('METADATA: live stream differs from the requested song');
  const baseTitle = item.title.replace(/\s*\(Acoustic Version\)/i, '');
  const actual = compact(info.title);
  const expected = compact(baseTitle);
  const shortMatch = expected.length < 6 ? ` ${normalize(info.title)} `.includes(` ${normalize(baseTitle)} `) || actual.includes(`sheilaon7${expected}`) : actual.includes(expected);
  if (!shortMatch) throw new Error(`METADATA: title mismatch: ${info.title}`);
  const primaryEvidence = compact([info.title, info.artist, ...(info.artists || []), info.channel].filter(Boolean).join(' '));
  const evidence = primaryEvidence + compact(info.description?.slice(0, 2000));
  const artists = item.artist.split(/\s+(?:feat\.?|ft\.?|featuring)\s+/i);
  for (const [artistIndex, artist] of artists.entries()) {
    const name = compact(artist);
    const proof = artistIndex ? evidence : primaryEvidence;
    if (!proof.includes(name) && !(name === 'dewa19' && proof.includes('dewa'))) throw new Error(`METADATA: artist not established: ${artist}; source: ${info.title} / ${info.channel}`);
  }
  if (/\b(remix|sped[ -]?up|slowed|reverb|karaoke|instrumental|live|concert|konser)\b/i.test(info.title)) throw new Error(`METADATA: different version: ${info.title}`);
  if (/\bcover\b/i.test(info.title) && item.number !== 11) throw new Error(`METADATA: cover version: ${info.title}`);
  if (item.number === 33 && !/acoustic|akustik/i.test(info.title)) throw new Error(`METADATA: requested Acoustic Version, found ${info.title}`);
  if (!Number.isFinite(info.duration) || info.duration < 30 || info.duration > 1200) throw new Error('METADATA: duration is not a plausible full song');
}
function markArchive(id) {
  const line = `youtube ${id}`;
  const lines = fs.existsSync(archive) ? fs.readFileSync(archive, 'utf8').split(/\r?\n/) : [];
  if (!lines.includes(line)) fs.appendFileSync(archive, line + '\n');
}
async function prepare(item) {
  assert(/^[a-z0-9-]+$/.test(item.slug) && /^[\w-]{11}$/.test(item.videoId));
  const sourceUrl = `https://www.youtube.com/watch?v=${item.videoId}`;
  const src = `./assets/music/${String(item.number).padStart(2, '0')}-${item.slug}.mp3`;
  const prior = report.tracks.find(track => track.number === item.number);
  if (prior?.status === 'unavailable_or_restricted') {
    console.log(`[${item.number}/39] SKIP recorded access restriction: ${item.artist} — ${item.title}`);
    return;
  }
  if (prior?.status === 'verified' && fs.existsSync(src) && hash(src) === prior.sha256) {
    probe(src, true);
    console.log(`[${item.number}/39] RESUME verified: ${item.artist} — ${item.title}`);
    return;
  }
  console.log(`[${item.number}/39] Checking: ${item.artist} — ${item.title}`);
  const entry = { ...item, id: `youtube:${item.videoId}`, sourceUrl, src, cover: './assets/thumbnails/painting-date/painting-date2.webp' };
  const previous = legacy.find(track => track.sourceUrl === sourceUrl && fs.existsSync(track.src));
  try {
    let info;
    const infoFile = path.join(cache, `${item.videoId}.info.json`);
    const oldInfo = `.museum-checks/music-downloads/${item.videoId}.info.json`;
    if (previous && fs.existsSync(oldInfo)) info = readJSON(oldInfo);
    else if (item.number === 1 && fs.existsSync('.museum-checks/pilot-audio-info.json')) info = readJSON('.museum-checks/pilot-audio-info.json');
    else {
      const json = run(yt, ['--ignore-config', '--js-runtimes', 'node', '--no-playlist', '--skip-download', '--dump-single-json', '-f', 'bestaudio', '--retries', '1', '--extractor-retries', '1', '--socket-timeout', '15', sourceUrl]);
      info = JSON.parse(json);
    }
    versionCheck(item, info);
    entry.sourceTitle = info.title;
    entry.sourceChannel = info.channel;
    entry.sourceDurationSeconds = info.duration;
    fs.writeFileSync(infoFile, JSON.stringify(info));
    let input;
    let sourceBitrate;
    if (previous) {
      input = previous.src;
      sourceBitrate = probe(input).bitrateKbps;
      entry.reusedLocalSource = previous.src;
    } else {
      const formats = info.formats.filter(format => format.vcodec === 'none' && format.acodec && format.acodec !== 'none' && !format.has_drm);
      const descending = list => list.sort((a, b) => (b.abr || 0) - (a.abr || 0));
      const format = descending(formats.filter(format => format.abr >= 160))[0] || descending(formats.filter(format => format.ext === 'm4a' && format.abr >= 128))[0] || descending(formats)[0];
      if (!format) throw new Error('RESTRICTED: no unencrypted audio-only format available');
      entry.sourceFormat = format.format_id;
      entry.sourceCodec = format.acodec;
      sourceBitrate = format.abr || format.tbr || 0;
      const outputTemplate = path.join(cache, `${item.videoId}.%(ext)s`);
      input = path.join(cache, `${item.videoId}.${format.ext}`);
      if (!fs.existsSync(input)) run(yt, ['--ignore-config', '--js-runtimes', 'node', '--load-info-json', infoFile, '--no-playlist', '-f', format.format_id, '--fixup', 'never', '--download-archive', archive, '--continue', '--retries', '1', '--extractor-retries', '1', '--fragment-retries', '1', '--socket-timeout', '15', '--no-progress', '-o', outputTemplate], 180000);
      if (!fs.existsSync(input)) throw new Error('Cached source is missing (archive retained); no completed file was overwritten');
    }
    const sourceProbe = probe(input);
    if (Math.abs(sourceProbe.durationSeconds - info.duration) > 4) throw new Error('Downloaded audio duration differs from source metadata');
    sourceBitrate ||= sourceProbe.bitrateKbps;
    if (!sourceBitrate) throw new Error('Cannot establish source audio bitrate; refusing to upscale blindly');
    const target = [32, 40, 48, 56, 64, 80, 96, 112, 128, 160].filter(rate => rate <= Math.floor(sourceBitrate)).at(-1);
    if (!target) throw new Error(`Source bitrate too low: ${sourceBitrate}`);
    entry.sourceBitrateKbps = sourceBitrate;
    entry.targetBitrateKbps = target;
    const temporary = path.join(cache, `${item.videoId}.verified.mp3`);
    run(ffmpeg, ['-y', '-hide_banner', '-nostdin', '-i', input, '-map', '0:a:0', '-vn', '-c:a', 'libmp3lame', '-b:a', `${target}k`, '-map_metadata', '-1', '-metadata', `title=${item.title}`, '-metadata', `artist=${item.artist}`, '-metadata', `comment=${sourceUrl}`, '-id3v2_version', '3', temporary]);
    const verified = probe(temporary, true);
    if (!verified.codec.startsWith('mp3') || Math.abs(verified.durationSeconds - info.duration) > 4) throw new Error('Output verification failed');
    fs.copyFileSync(temporary, src);
    Object.assign(entry, verified, { status: 'verified', bytes: fs.statSync(src).size, sha256: hash(src), verifiedAt: new Date().toISOString() });
    markArchive(item.videoId);
    console.log(`[${item.number}/39] OK ${target} kbps, ${verified.durationSeconds}s, ${entry.bytes} bytes${previous ? ' (local source reused)' : ''}`);
  } catch (error) {
    entry.status = /METADATA:/.test(error.message) ? 'metadata_mismatch' : /RESTRICTED:|403|429|Sign in|sign in|login|DRM|not available|unavailable|Private|members.only|confirm your age/i.test(error.message) ? 'unavailable_or_restricted' : 'failed';
    entry.reason = error.message.slice(-2500);
    console.log(`[${item.number}/39] SKIP ${entry.status}: ${entry.reason.replace(/\n/g, ' ').slice(0, 220)}`);
  }
  report.tracks = report.tracks.filter(track => track.number !== item.number);
  report.tracks.push(entry);
  checkpoint();
}
function publishManifest() {
  const cover = './assets/thumbnails/painting-date/painting-date2.webp';
  const verified = report.tracks.filter(track => track.status === 'verified').sort((a, b) => a.number - b.number);
  const active = verified.map(track => {
    assert(fs.existsSync(track.src) && hash(track.src) === track.sha256);
    const previous = legacy.filter(old => old.sourceUrl === track.sourceUrl || songKey(old) === songKey(track));
    return { id: track.id, title: track.title, artist: track.artist, src: track.src, cover, sourceUrl: track.sourceUrl, album: previous.find(old => old.album)?.album || '', previousSrcs: previous.map(old => old.src) };
  });
  for (const old of legacy) {
    if (active.some(track => track.sourceUrl && track.sourceUrl === old.sourceUrl || songKey(track) === songKey(old))) continue;
    const verified = probe(old.src, true);
    active.push({ ...old, id: old.id, sourceUrl: old.sourceUrl || '', cover });
    assert(verified.durationSeconds > 0);
  }
  assert.equal(new Set(active.map(track => track.src)).size, active.length);
  const header = '// Central active playlist. Generated by scripts/prepare-audio-playlist.mjs --sync.\n// Only verified requested MP3s are included, followed by retained legacy tracks.\n';
  fs.writeFileSync('music-playlist.js', `${header}window.MuseumMusicCover = ${JSON.stringify(cover)};\nwindow.MuseumPlaylist = ${JSON.stringify(active, null, 2)};\n`);
  report.activeTracks = active.length;
  report.activeAudioBytes = active.reduce((sum, track) => sum + fs.statSync(track.src).size, 0);
  report.allMusicBytes = fs.readdirSync('assets/music').filter(name => /\.(mp3|m4a|ogg|wav)$/i.test(name)).reduce((sum, name) => sum + fs.statSync(path.join('assets/music', name)).size, 0);
  checkpoint();
  console.log(`Active playlist: ${active.length} verified tracks; requested OK ${report.successful}/39, failed ${report.failed}, pending ${report.pending}`);
  const mib = bytes => (bytes / 1048576).toFixed(2);
  const clean = text => String(text || '').replace(/\|/g, '\\|').replace(/[\r\n]+/g, ' ').trim();
  const rows = report.tracks.map(track => `| ${String(track.number).padStart(2, '0')} | ${clean(track.artist)} — ${clean(track.title)} | ${track.status === 'verified' ? 'Berhasil' : 'Gagal'} | ${track.status === 'verified' ? `${track.durationSeconds.toFixed(2)} dtk · ${track.targetBitrateKbps} kbps · ${mib(track.bytes)} MiB` : clean(track.reason).slice(-500)} | [Sumber](${track.sourceUrl})${track.status === 'verified' ? ` · [MP3](${track.src})` : ''} |`);
  fs.writeFileSync('AUDIO-PLAYLIST-REPORT.md', [
    '# Audio playlist — hasil persiapan', '',
    `Diperbarui: ${new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'long', timeStyle: 'short' }).format(new Date())} WIB.`, '',
    `- Daftar sumber: ${sources.length}; berhasil diverifikasi: ${report.successful}; gagal: ${report.failed}; belum diproses: ${report.pending}.`,
    `- MP3 daftar baru: ${mib(report.totalRequestedBytes)} MiB. Audio aktif termasuk lagu lama: ${mib(report.activeAudioBytes)} MiB (${active.length} lagu).`,
    `- Total folder assets/music (termasuk file lama yang tetap disimpan): ${mib(report.allMusicBytes)} MiB.`,
    '- Seluruh file baru mempunyai stream MP3 dan durasi masuk akal, serta telah didekode penuh oleh FFmpeg sebelum masuk playlist.',
    '- Bitrate MP3 dibatasi maksimum 160 kbps dan mengikuti bitrate sumber jika lebih rendah. File lama tidak dikompres atau diubah.',
    '- Download archive: scripts/audio-download-archive.txt. Cache sumber: .museum-checks/audio-playlist/. Jalankan npm.cmd run audio:prepare untuk melanjutkan; file terverifikasi dilewati.',
    '- Tidak memakai login, cookies browser, alternatif client, atau bypass DRM/akses. Kesalahan akses/versi dicatat dan dilewati.',
    '- Hasil pengujian browser setelah persiapan: .museum-checks/prepared-audio/report.json (periksa status dan timestamp laporan). Tidak ada deploy.', '',
    '| No. | Lagu | Hasil | Verifikasi / alasan | Tautan |',
    '| --- | --- | --- | --- | --- |', ...rows, '',
    'Detail lengkap: scripts/audio-playlist-report.json. Manifest aktif terpusat: music-playlist.js; hanya file yang berhasil diverifikasi masuk sebagai tambahan baru.', '',
  ].join('\n'));
}
if (process.argv.includes('--sync')) publishManifest();
else {
  const selected = process.argv.includes('--first') ? sources.slice(0, 1) : sources;
  for (const item of selected) await prepare(item);
  if (!process.argv.includes('--first')) publishManifest();
  checkpoint();
}
