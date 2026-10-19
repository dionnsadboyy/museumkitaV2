(() => {
  const escape = (value = '') => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const entry = src => window.museumMedia?.[src];
  const image = (src, { alt = '', size = 'large', priority = false, className = '', responsive = false, sizes = '(max-width: 760px) 94vw, 1000px' } = {}) => {
    const media = entry(src);
    const variants = media && responsive && media.thumbWidth < media.width ? `srcset="${escape(media.thumb)} ${media.thumbWidth}w, ${escape(media.large)} ${media.width}w" sizes="${escape(sizes)}"` : '';
    const width = (size === 'thumb' ? media?.thumbWidth : media?.width) || 1200;
    const height = (size === 'thumb' ? media?.thumbHeight : media?.height) || 900;
    return `<span class="media-image is-loading ${escape(className)}"${media?.preview ? ` style="--media-preview: url('${escape(media.preview)}')"` : ''}><img src="${escape(media?.[size] || src)}" ${variants} width="${width}" height="${height}" alt="${escape(alt)}" loading="${priority ? 'eager' : 'lazy'}" fetchpriority="${priority ? 'high' : 'auto'}" decoding="async" /></span>`;
  };
  const items = album => [
    ...(album.photos || []).map(src => ({ type: 'photo', src })),
    ...(album.videos || []).map(src => ({ type: 'video', src, poster: entry(src)?.large || '' })),
  ];
  const cover = album => album.coverType === 'video' ? (entry(album.cover)?.large || '') : album.cover;
  const initialIndex = (album, media) => Math.max(0, media.findIndex(item => item.src === album.cover));
  const note = album => {
    const text = String(album.chelseaNote || '').trim();
    return text ? `<aside class="chelsea-note" aria-label="Catatan Chelsea"><p class="chelsea-note__label">Catatan Chelsea</p><p>${escape(text)}</p></aside>` : '';
  };
  const settle = image => {
    const frame = image.closest('.media-image');
    if (!frame) return;
    frame.classList.remove('is-loading');
    if (image.naturalWidth) return;
    if (frame.classList.contains('has-error')) return;
    image.hidden = true;
    frame.classList.add('has-error');
    const fallback = document.createElement('span');
    fallback.className = 'media-fallback';
    fallback.setAttribute('role', 'img');
    fallback.setAttribute('aria-label', image.alt || 'Media tidak dapat dimuat');
    fallback.textContent = 'Media belum dapat dimuat';
    frame.append(fallback);
  };
  document.addEventListener('load', event => {
    if (event.target instanceof HTMLImageElement) settle(event.target);
  }, true);
  document.addEventListener('error', event => {
    if (event.target instanceof HTMLImageElement) settle(event.target);
  }, true);
  const observe = root => {
    root.querySelectorAll?.('.media-image img').forEach(img => { if (img.complete) settle(img); });
  };
  new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => {
    if (node.nodeType === 1) observe(node);
  }))).observe(document.documentElement, { childList: true, subtree: true });
  observe(document);
  const play = async (container, src, poster = '') => {
    document.querySelectorAll('video').forEach(video => video.pause());
    const video = document.createElement('video');
    video.className = 'memory-video-player story-video-player';
    video.controls = true;
    video.playsInline = true;
    video.preload = 'none';
    video.setAttribute('aria-label', 'Memory video');
    video.tabIndex = 0;
    if (poster) video.poster = poster;
    video.src = entry(src)?.playback || src;
    const failure = () => {
      if (!container.contains(video)) return;
      const message = document.createElement('p');
      message.className = 'video-error';
      message.setAttribute('role', 'status');
      message.append('Video belum dapat diputar. ');
      const link = document.createElement('a');
      link.href = src;
      link.textContent = 'Buka video asli';
      message.append(link);
      container.replaceChildren(message);
    };
    video.addEventListener('error', failure, { once: true });
    container.replaceChildren(video);
    try { await video.play(); } catch { if (!video.error) video.focus(); }
  };

  let viewerCleanup;
  const openViewer = ({ items: mediaItems, index = 0, title = 'Media', caption = '', trigger = document.activeElement, onChange } = {}) => {
    if (!mediaItems?.length) return;
    viewerCleanup?.();
    const dialog = document.createElement('dialog');
    dialog.className = 'media-viewer';
    dialog.setAttribute('aria-labelledby', 'media-viewer-title');
    // Adapt the reference's scene/card/two-face mechanics to our own photo viewer.
    dialog.innerHTML = `<div class="media-viewer__scene"><div class="media-viewer__interaction"><div class="media-viewer__card">
      <section class="media-viewer__panel media-viewer__front">
        <header class="media-viewer__header"><div class="media-viewer__heading"><span class="media-viewer__eyebrow">Our Museum</span><h2 id="media-viewer-title"></h2></div><button class="media-viewer__close" type="button" aria-label="Tutup media"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg></button></header>
        <div class="media-viewer__photo-frame"><div class="media-viewer__stage"></div></div>
        <footer class="media-viewer__footer"><p class="media-viewer__caption"></p><div class="media-viewer__navigation"><button class="media-viewer__previous" type="button" aria-label="Media sebelumnya"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12H4m7-7-7 7 7 7" /></svg></button><span class="media-viewer__counter" aria-live="polite" aria-atomic="true"></span><button class="media-viewer__spin" type="button" aria-label="Putar kartu 3D" title="Putar kartu 3D"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 8a8 8 0 1 0 0 8M20 3v5h-5" /></svg></button><button class="media-viewer__next" type="button" aria-label="Media berikutnya"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16m-7-7 7 7-7 7" /></svg></button></div></footer>
      </section>
      <div class="media-viewer__back" aria-hidden="true"><span class="media-viewer__back-label">Private Museum</span><svg class="media-viewer__museum-mark" viewBox="0 0 40 34"><path d="M3 11 20 3l17 8H3Zm4 3h26M8 15v12m8-12v12m8-12v12m8-12v12M5 29h30M3 32h34" /></svg><p class="media-viewer__back-title">Our<br>Museum</p><p class="media-viewer__back-motto">every memory<br>deserves a place.</p><span class="media-viewer__back-rule"></span><p class="media-viewer__back-caption">Dion &amp; Chelsea</p></div>
    </div></div></div>`;
    dialog.querySelector('#media-viewer-title').textContent = title;
    dialog.querySelector('.media-viewer__caption').textContent = caption;
    dialog.querySelector('.media-viewer__caption').hidden = !caption;
    const scene = dialog.querySelector('.media-viewer__scene');
    const interaction = dialog.querySelector('.media-viewer__interaction');
    const card = dialog.querySelector('.media-viewer__card');
    const photoFrame = dialog.querySelector('.media-viewer__photo-frame');
    const stage = dialog.querySelector('.media-viewer__stage');
    const closeButton = dialog.querySelector('.media-viewer__close');
    const previous = dialog.querySelector('.media-viewer__previous');
    const next = dialog.querySelector('.media-viewer__next');
    const spinButton = dialog.querySelector('.media-viewer__spin');
    previous.disabled = next.disabled = mediaItems.length < 2;
    let selected = Math.min(Math.max(index, 0), mediaItems.length - 1);
    let closing = false;
    let finished = false;
    let closeTimer;
    let cardMotion;
    const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
    const rest = 'translate3d(0, 0, 0) rotateX(0deg) rotateY(0deg) rotateZ(0deg) scale(1)';
    const currentPose = () => {
      const outer = getComputedStyle(interaction).transform;
      const inner = getComputedStyle(card).transform;
      if (outer === 'none') return inner === 'none' ? rest : inner;
      return new DOMMatrix(outer).multiply(inner === 'none' ? new DOMMatrix() : new DOMMatrix(inner)).toString();
    };
    let tiltFrame;
    let touchMotion;
    let gesture;
    const tilt = { x: 0, y: 0, z: 0, lift: 0 };
    const tiltTarget = { ...tilt };
    const resetInteraction = () => {
      cancelAnimationFrame(tiltFrame);
      touchMotion?.cancel();
      tiltFrame = touchMotion = undefined;
      gesture = undefined;
      photoFrame.classList.remove('is-dragging');
      for (const key of Object.keys(tilt)) tilt[key] = tiltTarget[key] = 0;
      interaction.style.transform = '';
      interaction.style.removeProperty('--sheen');
      interaction.style.removeProperty('--light-x');
      interaction.style.removeProperty('--light-y');
    };
    const followPointer = () => {
      if (closing || finished || motionPreference.matches) return;
      let moving = false;
      for (const key of Object.keys(tilt)) {
        tilt[key] += (tiltTarget[key] - tilt[key]) * .18;
        if (Math.abs(tiltTarget[key] - tilt[key]) > .015) moving = true;
      }
      interaction.style.transform = `translate3d(0, 0, ${tilt.lift}px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) rotateZ(${tilt.z}deg)`;
      interaction.style.setProperty('--sheen', String(Math.min(1, (Math.abs(tilt.x) + Math.abs(tilt.y)) / 10)));
      tiltFrame = moving ? requestAnimationFrame(followPointer) : undefined;
      if (!moving && Object.values(tiltTarget).every(value => value === 0)) resetInteraction();
    };
    const setTilt = (x, y, z = 0, lift = 12) => {
      if (closing || finished || motionPreference.matches || cardMotion) return;
      touchMotion?.cancel();
      touchMotion = undefined;
      Object.assign(tiltTarget, { x, y, z, lift });
      if (!tiltFrame) tiltFrame = requestAnimationFrame(followPointer);
    };
    const releaseTilt = () => setTilt(0, 0, 0, 0);
    const cancelMotion = () => {
      cardMotion?.cancel();
      cardMotion = undefined;
      card.style.willChange = '';
    };
    const sizeCard = () => {
      const media = entry(mediaItems[selected].src);
      const ratio = media ? media.width / media.height : 3 / 4;
      const styles = getComputedStyle(dialog);
      const width = Math.min(720, dialog.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight));
      const height = Math.min(760, dialog.clientHeight - parseFloat(styles.paddingTop) - parseFloat(styles.paddingBottom));
      const chromeHeight = 164;
      const mediaHeight = Math.max(80, Math.min(height - chromeHeight, (width - 30) / ratio));
      scene.style.width = `${Math.min(width, Math.max(Math.min(300, width), mediaHeight * ratio + 30))}px`;
      scene.style.height = `${Math.min(height, mediaHeight + chromeHeight)}px`;
    };
    const runCardMotion = (keyframes, duration) => {
      cardMotion?.cancel();
      resetInteraction();
      card.style.willChange = 'transform';
      const animation = card.animate(keyframes, { duration, fill: 'both' });
      cardMotion = animation;
      animation.finished.then(() => {
        if (cardMotion !== animation || finished) return;
        animation.cancel();
        cardMotion = undefined;
        card.style.willChange = '';
      }).catch(() => {});
      return animation;
    };
    // A visible one-and-a-half turn combines the reference's depth with stronger X/Y/Z rotation.
    const enter = () => {
      if (motionPreference.matches) return;
      cancelMotion();
      runCardMotion([
        { transform: 'translate3d(-24px, 64px, -280px) rotateX(20deg) rotateY(540deg) rotateZ(-18deg) scale(.48)', offset: 0, easing: 'cubic-bezier(.35, 0, .7, .5)' },
        { transform: 'translate3d(16px, 12px, -120px) rotateX(-18deg) rotateY(400deg) rotateZ(12deg) scale(.69)', offset: .22, easing: 'cubic-bezier(.4, .05, .4, 1)' },
        { transform: 'translate3d(-9px, -10px, -35px) rotateX(12deg) rotateY(230deg) rotateZ(-9deg) scale(.84)', offset: .46, easing: 'cubic-bezier(.3, .2, .3, 1)' },
        { transform: 'translate3d(0, -5px, 24px) rotateX(-7deg) rotateY(75deg) rotateZ(5deg) scale(.96)', offset: .68, easing: 'cubic-bezier(.2, .7, .3, 1)' },
        { transform: 'translate3d(0, -2px, 8px) rotateX(3deg) rotateY(-12deg) rotateZ(-2deg) scale(.99)', offset: .86, easing: 'cubic-bezier(.2, .7, .3, 1)' },
        { transform: rest, offset: 1 },
      ], 1000);
    };
    const spin = () => {
      if (closing || finished || motionPreference.matches) return;
      const start = currentPose();
      runCardMotion([
        { transform: start === 'none' ? rest : start, offset: 0, easing: 'cubic-bezier(.45, 0, .7, .5)' },
        { transform: 'translate3d(0, -12px, -45px) rotateX(-14deg) rotateY(90deg) rotateZ(-9deg) scale(.88)', offset: .25, easing: 'cubic-bezier(.4, .1, .4, 1)' },
        { transform: 'translate3d(0, -5px, -70px) rotateX(13deg) rotateY(225deg) rotateZ(10deg) scale(.86)', offset: .53, easing: 'cubic-bezier(.25, .6, .3, 1)' },
        { transform: 'translate3d(0, -3px, 12px) rotateX(-4deg) rotateY(350deg) rotateZ(-3deg) scale(.99)', offset: .82, easing: 'cubic-bezier(.2, .7, .3, 1)' },
        { transform: 'translate3d(0, 0, 0) rotateX(0deg) rotateY(360deg) rotateZ(0deg) scale(1)', offset: 1 },
      ], 820);
    };
    const oldBodyOverflow = document.body.style.overflow;
    const oldRootOverflow = document.documentElement.style.overflow;
    const stopVideo = () => stage.querySelectorAll('video').forEach(video => {
      video.pause();
      video.removeAttribute('src');
      video.load();
    });
    const cleanup = () => {
      if (finished) return;
      finished = true;
      clearTimeout(closeTimer);
      cancelMotion();
      resetInteraction();
      window.removeEventListener('resize', sizeCard);
      motionPreference.removeEventListener('change', motionChanged);
      stopVideo();
      if (dialog.open) dialog.close();
      dialog.remove();
      document.body.style.overflow = oldBodyOverflow;
      document.documentElement.style.overflow = oldRootOverflow;
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
      if (viewerCleanup === cleanup) viewerCleanup = undefined;
    };
    const close = () => {
      if (closing || finished) return;
      closing = true;
      stage.querySelectorAll('video').forEach(video => video.pause());
      dialog.classList.add('is-closing');
      if (motionPreference.matches) { cleanup(); return; }
      const currentTransform = currentPose();
      cancelMotion();
      resetInteraction();
      card.style.willChange = 'transform';
      cardMotion = card.animate([
        { transform: currentTransform === 'none' ? rest : currentTransform, offset: 0 },
        { transform: 'translate3d(0, -8px, 30px) rotateX(10deg) rotateY(-45deg) rotateZ(6deg) scale(.98)', offset: .18 },
        { transform: 'translate3d(12px, 5px, -30px) rotateX(-16deg) rotateY(-200deg) rotateZ(-10deg) scale(.84)', offset: .48 },
        { transform: 'translate3d(-14px, 30px, -140px) rotateX(12deg) rotateY(-400deg) rotateZ(16deg) scale(.66)', offset: .76 },
        { transform: 'translate3d(18px, 64px, -280px) rotateX(-16deg) rotateY(-540deg) rotateZ(22deg) scale(.46)', offset: 1 },
      ], { duration: 680, easing: 'cubic-bezier(.45, .05, .7, .6)', fill: 'both' });
      cardMotion.finished.then(cleanup).catch(() => {});
      closeTimer = setTimeout(cleanup, 740);
    };
    const motionChanged = () => {
      spinButton.disabled = motionPreference.matches;
      if (!motionPreference.matches) return;
      cancelMotion();
      resetInteraction();
      if (closing) cleanup();
    };
    const render = () => {
      stopVideo();
      const active = mediaItems[selected];
      photoFrame.dataset.mediaType = active.type;
      const kind = active.type === 'video' ? 'Video' : 'Foto';
      dialog.querySelector('.media-viewer__counter').textContent = `${selected + 1} / ${mediaItems.length} · ${kind}`;
      sizeCard();
      onChange?.(selected);
      if (active.type === 'video') {
        stage.replaceChildren();
        void play(stage, active.src, active.poster || entry(active.src)?.large);
      } else {
        stage.innerHTML = image(active.src, { alt: `${title} — foto ${selected + 1}`, priority: true });
        stage.querySelector('img').draggable = false;
      }
    };
    const move = direction => {
      if (closing || finished || mediaItems.length < 2) return;
      selected = (selected + direction + mediaItems.length) % mediaItems.length;
      render();
      if (!motionPreference.matches) {
        const current = currentPose();
        runCardMotion([
          { transform: current === 'none' ? rest : current, offset: 0 },
          { transform: `translate3d(${direction * 14}px, -7px, -70px) rotateX(-8deg) rotateY(${direction * 42}deg) rotateZ(${direction * 7}deg) scale(.9)`, offset: .32, easing: 'cubic-bezier(.2, .8, .3, 1)' },
          { transform: `translate3d(0, -2px, 8px) rotateX(2deg) rotateY(${-direction * 6}deg) rotateZ(${-direction * 2}deg) scale(.99)`, offset: .76, easing: 'cubic-bezier(.2, .7, .3, 1)' },
          { transform: rest, offset: 1 },
        ], 460);
      }
    };
    closeButton.addEventListener('click', close);
    previous.addEventListener('click', () => move(-1));
    next.addEventListener('click', () => move(1));
    spinButton.addEventListener('click', spin);
    spinButton.disabled = motionPreference.matches;
    photoFrame.addEventListener('dragstart', event => event.preventDefault());
    photoFrame.addEventListener('pointerdown', event => {
      if (closing || finished || motionPreference.matches || photoFrame.dataset.mediaType !== 'photo' || event.button !== 0) return;
      gesture = { id: event.pointerId, x: event.clientX, y: event.clientY };
      photoFrame.setPointerCapture(event.pointerId);
      photoFrame.classList.add('is-dragging');
      setTilt(-4, 5, -2, -8);
    });
    photoFrame.addEventListener('pointermove', event => {
      if (closing || finished || motionPreference.matches || photoFrame.dataset.mediaType !== 'photo') return;
      const bounds = scene.getBoundingClientRect();
      if (gesture?.id === event.pointerId) {
        const dx = event.clientX - gesture.x;
        const dy = event.clientY - gesture.y;
        setTilt(Math.max(-9, Math.min(9, -dy / bounds.height * 30)), Math.max(-22, Math.min(22, dx / bounds.width * 50)), Math.max(-5, Math.min(5, dx / bounds.width * 10)), 12);
      } else if (event.pointerType === 'mouse') {
        const x = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1));
        const y = Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1));
        interaction.style.setProperty('--light-x', `${50 + x * 35}%`);
        interaction.style.setProperty('--light-y', `${50 + y * 35}%`);
        setTilt(-y * 8, x * 12, x * 2, 16);
      }
    });
    const releaseGesture = event => {
      if (gesture?.id !== event.pointerId) return;
      const dx = event.clientX - gesture.x;
      const dy = event.clientY - gesture.y;
      const swiped = Math.abs(dx) > Math.max(40, scene.clientWidth * .14) && Math.abs(dx) > Math.abs(dy) * 1.3;
      gesture = undefined;
      photoFrame.classList.remove('is-dragging');
      if (photoFrame.hasPointerCapture(event.pointerId)) photoFrame.releasePointerCapture(event.pointerId);
      if (swiped && mediaItems.length > 1) { move(dx < 0 ? 1 : -1); return; }
      if (closing || finished || motionPreference.matches || cardMotion) { resetInteraction(); return; }
      resetInteraction();
      touchMotion = interaction.animate([
        { transform: 'translateZ(-8px) rotateX(-4deg) rotateY(5deg) rotateZ(-2deg)' },
        { transform: 'translateZ(12px) rotateX(3deg) rotateY(-4deg) rotateZ(1.5deg)', offset: .5 },
        { transform: rest },
      ], { duration: 440, easing: 'cubic-bezier(.2, .7, .3, 1)' });
    };
    photoFrame.addEventListener('pointerup', releaseGesture);
    photoFrame.addEventListener('pointercancel', () => { resetInteraction(); });
    photoFrame.addEventListener('pointerleave', event => { if (!gesture && event.pointerType === 'mouse') releaseTilt(); });
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
    dialog.addEventListener('close', cleanup);
    // Require both ends of a pointer gesture outside the panel to avoid closing after a drag.
    let pointerStartedOutside = false;
    const isOutsideCard = target => target === dialog || target === scene;
    dialog.addEventListener('pointerdown', event => { pointerStartedOutside = isOutsideCard(event.target); });
    dialog.addEventListener('click', event => {
      if (isOutsideCard(event.target) && pointerStartedOutside) close();
      pointerStartedOutside = false;
    });
    dialog.addEventListener('keydown', event => {
      if (event.target.closest('video, input, textarea, [contenteditable="true"]')) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        move(event.key === 'ArrowLeft' ? -1 : 1);
      }
    });
    document.body.append(dialog);
    document.body.style.overflow = document.documentElement.style.overflow = 'hidden';
    viewerCleanup = cleanup;
    dialog.showModal();
    window.addEventListener('resize', sizeCard);
    motionPreference.addEventListener('change', motionChanged);
    closeButton.focus({ preventScroll: true });
    render();
    enter();
  };
  window.MuseumMedia = { image, items, cover, initialIndex, note, play, entry, openViewer, closeViewer: () => viewerCleanup?.() };
})();
