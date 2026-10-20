(() => {
  if (window.MuseumMusic) return;
  const playlist = window.MuseumPlaylist || [];
  if (!playlist.length) return;
  let saved = {};
  try { saved = JSON.parse(sessionStorage.getItem('museum-music') || '{}'); } catch { /* Storage can be unavailable. */ }
  let index = Math.max(0, playlist.findIndex(track => track.src === saved.src || track.previousSrcs?.includes(saved.src)));
  let mode = ['pill', 'expanded', 'mini'].includes(saved.mode) ? saved.mode : 'pill';
  const sortBy = 'album';
  let libraryOpen = false;
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
  const bars = '<span class="music-bars" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>';
  root.innerHTML = `<div class="music-cover"><span class="music-cover-photo"></span><span class="music-cover-label">our soundtrack ♡</span></div>
    <div class="music-track-copy"><h2 class="music-title music-pill-title"></h2><p class="music-artist"></p></div>${bars}
    <div class="music-pill"><button class="music-open" type="button" aria-label="Buka pemutar musik" aria-controls="music-panel" aria-expanded="false"></button><button class="music-toggle" type="button" aria-label="Putar musik"></button></div>
    <div class="music-panel" id="music-panel" inert aria-hidden="true"><span class="music-grip" aria-hidden="true"></span><button class="music-handle" type="button" aria-label="Kecilkan ke pill"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button><input class="music-seek" type="range" min="0" max="0" step="0.1" value="0" aria-label="Posisi lagu" disabled><div class="music-times"><span class="music-elapsed">0:00</span><span class="music-duration">0:00</span></div><div class="music-controls"><button class="music-previous" type="button" aria-label="Lagu sebelumnya"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h3v16H4zm16 0v16L8 12z"/></svg></button><button class="music-toggle" type="button" aria-label="Putar musik"></button><button class="music-next" type="button" aria-label="Lagu berikutnya"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 4h3v16h-3zM4 4l12 8-12 8z"/></svg></button></div><p class="music-dedication"><span></span>Dion &amp; Chelsea<span></span></p></div>
    <button class="music-mini" type="button" aria-label="Tampilkan pill musik" inert aria-hidden="true"></button><p class="music-status" role="status" aria-live="polite" hidden></p>`;
  document.body.append(audio, root);
  const libraryToggle = document.createElement('button');
  libraryToggle.className = 'music-library-toggle';
  libraryToggle.type = 'button';
  libraryToggle.setAttribute('aria-label', 'Pilih lagu');
  libraryToggle.setAttribute('aria-expanded', 'false');
  libraryToggle.setAttribute('aria-controls', 'music-library');
  libraryToggle.innerHTML = '<svg class="music-library-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h11M4 11h11M4 16h6m9-5v8m0-8 3-1v7m-3 2c0 1-3 1-3 0s3-1 3 0zm3-2c0 1-3 1-3 0s3-1 3 0z"/></svg><span>Pilih lagu</span><svg class="music-library-chevron" viewBox="0 0 16 16" aria-hidden="true"><path d="m6 4 4 4-4 4"/></svg>';
  root.querySelector('.music-panel').append(libraryToggle);
  const library = document.createElement('section');
  library.className = 'music-library';
  library.id = 'music-library';
  library.inert = true;
  library.setAttribute('aria-hidden', 'true');
  library.setAttribute('aria-labelledby', 'music-library-title');
  library.innerHTML = '<header class="music-library-header"><div><h2 id="music-library-title">Pilih lagu</h2><p class="music-library-count"></p></div><button class="music-library-close" type="button" aria-label="Tutup daftar lagu"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></header><p class="music-library-order">Dikelompokkan menurut album</p><ul class="music-song-list" aria-label="Daftar lagu"></ul>';
  root.append(library);
  const songList = library.querySelector('.music-song-list');
  const collator = new Intl.Collator('id', { sensitivity: 'base', numeric: true });
  const orderedTracks = () => playlist.map((track, trackIndex) => ({ track, trackIndex })).sort((a, b) => {
    if (!a.track.album !== !b.track.album) return a.track.album ? -1 : 1;
    const album = collator.compare(a.track.album || '', b.track.album || '') || collator.compare(a.track.artist || '', b.track.artist || '');
    if (album) return album;
    return collator.compare(a.track.title, b.track.title) || a.trackIndex - b.trackIndex;
  });
  const renderLibrary = () => {
    library.querySelector('.music-library-count').textContent = `${playlist.length} lagu`;
    const fragment = document.createDocumentFragment();
    let lastGroup;
    orderedTracks().forEach(({ track, trackIndex }, position) => {
      const group = track.album ? `${track.album} · ${track.artist || ''}` : 'Tanpa album';
      if (sortBy === 'album' && group !== lastGroup) {
        const heading = document.createElement('li');
        heading.className = 'music-album-heading';
        heading.textContent = group;
        fragment.append(heading);
        lastGroup = group;
      }
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.className = 'music-song';
      button.type = 'button';
      button.dataset.trackIndex = trackIndex;
      button.setAttribute('aria-label', `Pilih ${track.title}, ${track.artist || 'artis tidak tersedia'}`);
      if (trackIndex === index) button.setAttribute('aria-current', 'true');
      const number = document.createElement('span');
      number.className = 'music-song-number';
      number.setAttribute('aria-hidden', 'true');
      number.textContent = trackIndex === index ? '✓' : String(position + 1).padStart(2, '0');
      const copy = document.createElement('span');
      copy.className = 'music-song-copy';
      const title = document.createElement('span');
      title.className = 'music-song-title';
      title.textContent = track.title;
      const detail = document.createElement('span');
      detail.className = 'music-song-detail';
      detail.textContent = [track.artist, sortBy !== 'album' && (track.album || 'Tanpa album')].filter(Boolean).join(' · ');
      copy.append(title, detail);
      button.append(number, copy);
      item.append(button);
      fragment.append(item);
    });
    songList.replaceChildren(fragment);
  };
  const setLibraryOpen = (open, focus = false) => {
    libraryOpen = Boolean(open && mode === 'expanded');
    root.classList.toggle('is-library-open', libraryOpen);
    library.inert = !libraryOpen;
    library.setAttribute('aria-hidden', String(!libraryOpen));
    libraryToggle.setAttribute('aria-expanded', String(libraryOpen));
    root.querySelector('.music-panel').inert = mode !== 'expanded' || libraryOpen;
    root.querySelector('.music-panel').setAttribute('aria-hidden', String(mode !== 'expanded' || libraryOpen));
    root.querySelector('.music-track-copy').setAttribute('aria-hidden', String(mode === 'mini' || libraryOpen));
    if (libraryOpen) {
      renderLibrary();
      songList.scrollTop = 0;
      if (focus) (songList.querySelector('[aria-current="true"]') || songList.querySelector('button'))?.focus({ preventScroll: true });
    } else if (focus && mode === 'expanded') libraryToggle.focus({ preventScroll: true });
  };
  const seek = root.querySelector('.music-seek');
  const save = () => {
    try { sessionStorage.setItem('museum-music', JSON.stringify({ src: playlist[index].src, time: audio.currentTime || restoreTime, volume: audio.volume, mode, sortBy })); } catch { /* Playback still works without storage. */ }
  };
  const format = value => `${Math.floor((value || 0) / 60)}:${String(Math.floor((value || 0) % 60)).padStart(2, '0')}`;
  const updateTime = () => {
    const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    seek.max = duration;
    seek.value = audio.currentTime;
    seek.style.setProperty('--seek-progress', `${duration ? audio.currentTime / duration * 100 : 0}%`);
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
    root.classList.toggle('has-status', Boolean(status));
  };
  const setMode = (next, focus = false) => {
    if (libraryOpen) setLibraryOpen(false);
    mode = next;
    root.dataset.mode = mode;
    for (const [selector, state] of [['.music-pill', 'pill'], ['.music-panel', 'expanded'], ['.music-mini', 'mini']]) {
      const element = root.querySelector(selector);
      element.inert = mode !== state;
      element.setAttribute('aria-hidden', String(mode !== state));
    }
    root.querySelector('.music-track-copy').setAttribute('aria-hidden', String(mode === 'mini'));
    root.querySelector('.music-open').setAttribute('aria-expanded', String(mode === 'expanded'));
    save();
    position();
    if (focus) root.querySelector(mode === 'expanded' ? '.music-handle' : mode === 'mini' ? '.music-mini' : '.music-open').focus({ preventScroll: true });
  };
  const renderTrack = () => {
    const track = playlist[index];
    root.querySelector('.music-title').textContent = track.title;
    root.querySelector('.music-title').title = track.title;
    root.querySelector('.music-artist').textContent = track.artist || 'Artis tidak tersedia';
    root.querySelectorAll('.music-cover-photo').forEach(cover => {
      const source = track.cover || window.MuseumMusicCover;
      if (source && cover.dataset.src !== source) {
        const img = new Image();
        img.alt = '';
        img.src = source;
        img.decoding = 'async';
        img.onerror = () => { img.hidden = true; cover.classList.add('has-error'); };
        cover.classList.remove('has-error');
        cover.dataset.src = source;
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
  const selectTrack = (nextIndex, direction = 1) => {
    if (!Number.isInteger(nextIndex) || !playlist[nextIndex] || nextIndex === index) return;
    const keepPlaying = !audio.paused || buffering || resumeAfterVideo;
    pause();
    index = nextIndex;
    restoreTime = 0;
    audio.removeAttribute('src');
    audio.load();
    status = '';
    animateTrack(direction);
    save();
    if (keepPlaying && activeVideo()) { resumeAfterVideo = true; status = 'Musik dijeda selama video diputar.'; }
    else if (keepPlaying) void start();
    render();
    if (libraryOpen) renderLibrary();
  };
  const changeTrack = direction => {
    if (playlist.length < 2) return;
    const order = orderedTracks().map(item => item.trackIndex);
    const position = order.indexOf(index);
    selectTrack(order[(position + direction + order.length) % order.length], direction);
  };
  root.addEventListener('click', event => {
    if (Date.now() < suppressClick && !event.target.closest('.music-library')) { event.preventDefault(); return; }
    const button = event.target.closest('button');
    if (button?.matches('.music-library-toggle')) setLibraryOpen(true, true);
    else if (button?.matches('.music-library-close')) setLibraryOpen(false, true);
    else if (button?.matches('[data-track-index]')) {
      selectTrack(Number(button.dataset.trackIndex));
      setLibraryOpen(false, true);
    } else if (button?.matches('.music-toggle')) {
      if (!audio.paused || buffering || resumeAfterVideo) pause();
      else { if (audio.error) { audio.load(); } void start(); }
    } else if (button?.matches('.music-mini')) setMode('pill', true);
    else if (button?.matches('.music-open')) setMode('expanded', true);
    else if (button?.matches('.music-handle')) setMode('pill', true);
    else if (button?.matches('.music-next')) changeTrack(1);
    else if (button?.matches('.music-previous')) changeTrack(-1);
    else if (mode === 'pill') setMode('expanded', true);
  });
  root.addEventListener('keydown', event => {
    if (event.key === 'Escape' && libraryOpen) { event.preventDefault(); setLibraryOpen(false, true); return; }
    if (event.target.closest('.music-library, select')) return;
    if (event.key === 'Escape') { event.preventDefault(); setMode(mode === 'expanded' ? 'pill' : 'mini', true); }
    if (event.target === seek) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); changeTrack(event.key === 'ArrowLeft' ? -1 : 1); }
  });
  seek.addEventListener('input', () => { if (Number.isFinite(audio.duration)) { audio.currentTime = Number(seek.value); restoreTime = 0; updateTime(); save(); } });
  let gesture;
  let suppressClick = 0;
  root.addEventListener('pointerdown', event => {
    if (event.button !== 0 || event.target.closest('input, select, .music-library, .music-library-toggle') || gesture) return;
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
  document.addEventListener('pointerdown', event => { if (libraryOpen && !root.contains(event.target)) setLibraryOpen(false); });
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  let trackMotions = [];
  let trackSwapTimer;
  function animateTrack(direction) {
    clearTimeout(trackSwapTimer);
    const elements = ['.music-cover-photo', '.music-track-copy'].map(selector => root.querySelector(selector));
    const starts = elements.map(element => {
      const style = getComputedStyle(element);
      return { translate: style.translate, opacity: style.opacity };
    });
    trackMotions.forEach(animation => animation.cancel());
    trackMotions = [];
    if (motionPreference.matches) { renderTrack(); return; }
    trackSwapTimer = setTimeout(renderTrack, 133);
    elements.forEach((element, i) => {
      trackMotions.push(element.animate([
        { ...starts[i], offset: 0 },
        { translate: `${-direction * 18}px 0`, opacity: 0, offset: .35 },
        { translate: `${direction * 18}px 0`, opacity: 0, offset: .36 },
        { translate: '0 0', opacity: 1, offset: 1 },
      ], { duration: 380, easing: 'cubic-bezier(.22,.8,.28,1)' }));
    });
  }
  motionPreference.addEventListener('change', () => {
    if (motionPreference.matches) { clearTimeout(trackSwapTimer); trackMotions.forEach(animation => animation.cancel()); trackMotions = []; renderTrack(); }
  });
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
    root.style.setProperty('--music-bottom-space', `${dock ? Math.ceil(dock.getBoundingClientRect().height) + 24 : 12}px`);
    document.documentElement.style.setProperty('--music-space', `${Math.ceil(root.getBoundingClientRect().height) + 24}px`);
  }
  new ResizeObserver(position).observe(root);
  window.addEventListener('resize', position);
  window.addEventListener('museum:navigate', () => { if (libraryOpen) setLibraryOpen(false); position(); });
  window.addEventListener('pagehide', save);
  window.MuseumMusic = { audio, playlist, get index() { return index; }, pause };
  renderTrack();
  setMode(mode);
  render();
})();
