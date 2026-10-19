(() => {
  if (window.MuseumMusic) return;
  const playlist = window.MuseumPlaylist || [];
  if (!playlist.length) return;
  let saved = {};
  try { saved = JSON.parse(sessionStorage.getItem('museum-music') || '{}'); } catch { /* Storage can be unavailable. */ }
  let index = Math.max(0, playlist.findIndex(track => track.src === saved.src));
  let mode = ['pill', 'expanded', 'mini'].includes(saved.mode) ? saved.mode : 'pill';
  let restoreTime = Number.isFinite(saved.time) && saved.time > 0 ? saved.time : 0;
  let resumeAfterVideo = false;
  let buffering = false;
  let status = saved.time > 0 ? 'Tekan play untuk melanjutkan.' : '';
  let request = 0;
  let lastSave = 0;
  const videos = new Set();
  const audio = document.createElement('audio');
  audio.id = 'museum-audio';
  audio.preload = 'none';
  audio.volume = Number.isFinite(saved.volume) ? Math.max(0, Math.min(1, saved.volume)) : 1;
  const root = document.createElement('aside');
  root.className = 'music-player';
  root.setAttribute('aria-label', 'Pemutar musik');
  const playIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 4 13 8-13 8z"/></svg>';
  const pauseIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h4v16H6zm8 0h4v16h-4z"/></svg>';
  const coverIcon = '<svg viewBox="0 0 40 34" aria-hidden="true"><path d="M3 11 20 3l17 8H3Zm4 3h26M8 15v12m8-12v12m8-12v12m8-12v12M5 29h30M3 32h34"/></svg>';
  const bars = '<span class="music-bars" aria-hidden="true"><i></i><i></i><i></i></span>';
  root.innerHTML = `<div class="music-pill"><button class="music-open" type="button" aria-label="Buka pemutar musik" aria-controls="music-panel" aria-expanded="false"><span class="music-cover"></span><span class="music-pill-title"></span></button><button class="music-toggle" type="button" aria-label="Putar musik"></button>${bars}</div>
    <div class="music-panel" id="music-panel" hidden><button class="music-handle" type="button" aria-label="Kecilkan ke pill"></button><div class="music-track"><span class="music-cover"></span><div class="music-track-copy"><h2 class="music-title"></h2><p class="music-artist"></p></div>${bars}</div><input class="music-seek" type="range" min="0" max="0" step="0.1" value="0" aria-label="Posisi lagu" disabled><div class="music-times"><span class="music-elapsed">0:00</span><span class="music-duration">0:00</span></div><div class="music-controls"><button class="music-previous" type="button" aria-label="Lagu sebelumnya"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h3v16H4zm16 0v16L8 12z"/></svg></button><button class="music-toggle" type="button" aria-label="Putar musik"></button><button class="music-next" type="button" aria-label="Lagu berikutnya"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 4h3v16h-3zM4 4l12 8-12 8z"/></svg></button></div><button class="music-minimize" type="button">Sembunyikan ke cover kecil</button></div>
    <button class="music-mini" type="button" aria-label="Tampilkan pill musik" hidden><span class="music-cover"></span></button><p class="music-status" role="status" aria-live="polite" hidden></p>`;
  document.body.append(audio, root);
  const seek = root.querySelector('.music-seek');
  const save = () => {
    try { sessionStorage.setItem('museum-music', JSON.stringify({ src: playlist[index].src, time: audio.currentTime || restoreTime, volume: audio.volume, mode })); } catch { /* Playback still works without storage. */ }
  };
  const format = value => `${Math.floor((value || 0) / 60)}:${String(Math.floor((value || 0) % 60)).padStart(2, '0')}`;
  const updateTime = () => {
    const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    seek.max = duration;
    seek.value = audio.currentTime;
    seek.disabled = !duration;
    seek.setAttribute('aria-valuetext', `${format(audio.currentTime)} dari ${format(duration)}`);
    root.querySelector('.music-elapsed').textContent = format(audio.currentTime);
    root.querySelector('.music-duration').textContent = format(duration);
    if (Date.now() - lastSave > 1000) { save(); lastSave = Date.now(); }
  };
  const render = () => {
    root.classList.toggle('is-playing', !audio.paused && !buffering && !audio.ended);
    root.querySelectorAll('.music-toggle').forEach(button => {
      const pending = buffering || !audio.paused || resumeAfterVideo;
      button.innerHTML = pending ? pauseIcon : playIcon;
      button.setAttribute('aria-label', pending ? 'Jeda musik' : 'Putar musik');
    });
    const message = root.querySelector('.music-status');
    message.textContent = status;
    message.hidden = !status;
  };
  const setMode = (next, focus = false) => {
    mode = next;
    root.dataset.mode = mode;
    root.querySelector('.music-pill').hidden = mode !== 'pill';
    root.querySelector('.music-panel').hidden = mode !== 'expanded';
    root.querySelector('.music-mini').hidden = mode !== 'mini';
    root.querySelector('.music-open').setAttribute('aria-expanded', String(mode === 'expanded'));
    save();
    position();
    if (focus) root.querySelector(mode === 'expanded' ? '.music-handle' : mode === 'mini' ? '.music-mini' : '.music-open').focus({ preventScroll: true });
  };
  const renderTrack = () => {
    const track = playlist[index];
    root.querySelector('.music-pill-title').textContent = track.title;
    root.querySelector('.music-title').textContent = track.title;
    root.querySelector('.music-artist').textContent = track.artist || 'Artis tidak tersedia';
    root.querySelectorAll('.music-cover').forEach(cover => {
      cover.innerHTML = coverIcon;
      if (track.cover) {
        const img = new Image();
        img.alt = '';
        img.src = track.cover;
        img.onerror = () => { cover.innerHTML = coverIcon; };
        cover.replaceChildren(img);
      }
    });
    root.querySelectorAll('.music-previous, .music-next').forEach(button => { button.hidden = playlist.length < 2; button.disabled = playlist.length < 2; });
    updateTime();
  };
  const activeVideo = () => {
    for (const video of videos) if (!video.isConnected || video.paused || video.ended) videos.delete(video);
    return videos.size > 0;
  };
  const start = async () => {
    if (activeVideo()) { status = 'Video sedang diputar. Jeda video untuk memutar musik.'; render(); return; }
    const token = ++request;
    buffering = true;
    status = 'Memuat lagu…';
    render();
    if (!audio.getAttribute('src')) audio.src = playlist[index].src;
    try {
      await audio.play();
      if (token !== request) return;
      buffering = false;
      status = '';
    } catch (error) {
      if (token !== request) return;
      buffering = false;
      status = error.name === 'NotAllowedError' ? 'Tekan play untuk melanjutkan.' : 'Lagu gagal dimuat. Tekan play untuk mencoba lagi.';
    }
    render();
  };
  const pause = () => {
    ++request;
    resumeAfterVideo = false;
    buffering = false;
    status = '';
    audio.pause();
    save();
    render();
  };
  const changeTrack = direction => {
    if (playlist.length < 2) return;
    const keepPlaying = !audio.paused || buffering || resumeAfterVideo;
    pause();
    index = (index + direction + playlist.length) % playlist.length;
    restoreTime = 0;
    audio.removeAttribute('src');
    audio.load();
    status = '';
    renderTrack();
    save();
    if (keepPlaying && activeVideo()) { resumeAfterVideo = true; status = 'Musik dijeda selama video diputar.'; }
    else if (keepPlaying) void start();
    render();
  };
  root.addEventListener('click', event => {
    if (Date.now() < suppressClick) { event.preventDefault(); return; }
    const button = event.target.closest('button');
    if (button?.matches('.music-toggle')) {
      if (!audio.paused || buffering || resumeAfterVideo) pause();
      else { if (audio.error) { audio.load(); } void start(); }
    } else if (button?.matches('.music-mini')) setMode('pill', true);
    else if (button?.matches('.music-open')) setMode('expanded', true);
    else if (button?.matches('.music-handle')) setMode('pill', true);
    else if (button?.matches('.music-minimize')) setMode('mini', true);
    else if (button?.matches('.music-next')) changeTrack(1);
    else if (button?.matches('.music-previous')) changeTrack(-1);
    else if (mode === 'pill') setMode('expanded', true);
  });
  root.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); setMode(mode === 'expanded' ? 'pill' : 'mini', true); }
    if (event.target === seek) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); changeTrack(event.key === 'ArrowLeft' ? -1 : 1); }
  });
  seek.addEventListener('input', () => { if (Number.isFinite(audio.duration)) { audio.currentTime = Number(seek.value); restoreTime = 0; updateTime(); save(); } });
  let gesture;
  let suppressClick = 0;
  root.addEventListener('pointerdown', event => {
    if (event.button !== 0 || event.target.closest('input')) return;
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY };
  });
  window.addEventListener('pointerup', event => {
    if (gesture?.id !== event.pointerId) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    gesture = undefined;
    if (root.hasPointerCapture(event.pointerId)) root.releasePointerCapture(event.pointerId);
    if (Math.abs(dx) >= 42 && Math.abs(dx) > Math.abs(dy) * 1.35) { changeTrack(dx < 0 ? 1 : -1); suppressClick = Date.now() + 350; }
    else if (dy >= 42 && dy > Math.abs(dx) * 1.35) { setMode(mode === 'expanded' ? 'pill' : 'mini', true); suppressClick = Date.now() + 350; }
    else if (event.pointerType === 'touch' && Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      // Some mobile browsers swallow the first compatibility click after a swipe.
      // Activate a completed touch tap here, then ignore its duplicate native click.
      const button = event.target.closest('button');
      suppressClick = 0;
      if (button && root.contains(button)) button.click();
      else root.click();
      suppressClick = Date.now() + 350;
    }
  });
  root.addEventListener('pointercancel', () => { gesture = undefined; });
  audio.addEventListener('loadedmetadata', () => {
    if (restoreTime) { audio.currentTime = Math.min(restoreTime, Math.max(0, audio.duration - .1)); restoreTime = 0; }
    updateTime();
  });
  audio.addEventListener('timeupdate', updateTime);
  audio.addEventListener('volumechange', save);
  audio.addEventListener('playing', () => {
    if (activeVideo()) { resumeAfterVideo = true; audio.pause(); return; }
    buffering = false; status = ''; render();
  });
  audio.addEventListener('waiting', () => { if (!audio.paused) { buffering = true; status = 'Memuat lagu…'; render(); } });
  audio.addEventListener('pause', () => { buffering = false; save(); render(); });
  audio.addEventListener('ended', () => { resumeAfterVideo = false; if (playlist.length > 1) { changeTrack(1); void start(); } else { status = 'Lagu selesai. Tekan play untuk memutar lagi.'; render(); } });
  audio.addEventListener('error', () => { buffering = false; resumeAfterVideo = false; status = 'Lagu gagal dimuat. Tekan play untuk mencoba lagi.'; render(); });
  const resume = () => {
    if (activeVideo() || !resumeAfterVideo) return;
    resumeAfterVideo = false;
    void start();
  };
  document.addEventListener('play', event => {
    if (!(event.target instanceof HTMLVideoElement)) return;
    videos.add(event.target);
    if (!audio.paused || buffering) {
      resumeAfterVideo = true;
      ++request;
      audio.pause();
      buffering = false;
      status = 'Musik dijeda selama video diputar.';
      render();
    }
  }, true);
  for (const type of ['pause', 'ended', 'error']) document.addEventListener(type, event => {
    if (!(event.target instanceof HTMLVideoElement)) return;
    videos.delete(event.target);
    // A replacement video can start in the same task; wait before deciding to resume.
    setTimeout(resume, 0);
  }, true);
  new MutationObserver(() => { if (resumeAfterVideo) setTimeout(resume, 0); }).observe(document.body, { childList: true, subtree: true });
  function position() {
    const dock = document.querySelector('.bottom-dock');
    root.style.bottom = dock ? `calc(${Math.ceil(dock.getBoundingClientRect().height) + 24}px + env(safe-area-inset-bottom))` : 'calc(12px + env(safe-area-inset-bottom))';
    document.documentElement.style.setProperty('--music-space', `${Math.ceil(root.getBoundingClientRect().height) + 24}px`);
  }
  new ResizeObserver(position).observe(root);
  window.addEventListener('resize', position);
  window.addEventListener('museum:navigate', position);
  window.addEventListener('pagehide', save);
  window.MuseumMusic = { audio, playlist, get index() { return index; }, pause };
  renderTrack();
  setMode(mode);
  render();
})();
