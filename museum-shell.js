(() => {
  if (window.MuseumShell) return;
  const pages = {
    'index.html': ['styles.css', null],
    'archive.html': ['archive.css', 'archive.js'],
    'chapter.html': ['chapter.css', 'chapter.js'],
    'story.html': ['story.css', 'story.js'],
    'month.html': ['month.css', 'month.js'],
  };
  const wrapper = document.createElement('div');
  wrapper.id = 'museum-page';
  wrapper.append(...document.body.childNodes);
  document.body.append(wrapper);
  let controller = new AbortController();
  let inFlight;
  let navigation = 0;
  let displayedURL = new URL(location.href);
  const positions = new Map();
  const pageName = url => url.pathname.split('/').pop() || 'index.html';
  const status = document.createElement('p');
  status.className = 'music-route-status';
  status.setAttribute('role', 'status');
  status.hidden = true;
  document.body.append(status);
  const scrollToURL = (url, pop) => {
    const stored = positions.get(url.href);
    if (pop && stored) window.scrollTo({ left: stored.x, top: stored.y, behavior: 'instant' });
    else if (url.hash) {
      let id;
      try { id = decodeURIComponent(url.hash.slice(1)); } catch { return; }
      document.getElementById(id)?.scrollIntoView({ behavior: 'instant' });
    } else window.scrollTo({ top: 0, behavior: 'instant' });
  };
  const navigate = async (url, { pop = false } = {}) => {
    const token = ++navigation;
    inFlight?.abort();
    inFlight = new AbortController();
    const signal = inFlight.signal;
    positions.set(displayedURL.href, { x: scrollX, y: scrollY });
    if (url.pathname === displayedURL.pathname && url.search === displayedURL.search) {
      if (!pop) history.pushState({}, '', url);
      displayedURL = url;
      status.hidden = true;
      scrollToURL(url, pop);
      return;
    }
    status.textContent = 'Membuka halaman…';
    status.hidden = false;
    let stylesheet;
    let swapped = false;
    try {
      const response = await fetch(url, { signal });
      if (!response.ok) throw new Error('Page unavailable');
      const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
      if (token !== navigation) return;
      const [css, script] = pages[pageName(url)];
      stylesheet = document.createElement('link');
      stylesheet.rel = 'stylesheet';
      stylesheet.href = new URL(css, url);
      stylesheet.media = 'not all';
      await new Promise((resolve, reject) => {
        stylesheet.onload = resolve;
        stylesheet.onerror = reject;
        signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
        document.head.insertBefore(stylesheet, document.querySelector('link[href$="media.css"]'));
      });
      if (token !== navigation) { stylesheet.remove(); return; }
      window.MuseumMedia?.closeViewer();
      wrapper.querySelectorAll('video').forEach(video => video.pause());
      controller.abort();
      controller = new AbortController();
      const oldStyles = [...document.querySelectorAll('link[rel="stylesheet"]')].filter(link => Object.values(pages).some(([name]) => new URL(name, url).href === link.href) && link !== stylesheet);
      doc.body.querySelectorAll('script').forEach(script => script.remove());
      wrapper.replaceChildren(...doc.body.childNodes);
      swapped = true;
      stylesheet.media = 'all';
      oldStyles.forEach(link => link.remove());
      document.title = doc.title;
      const description = document.querySelector('meta[name="description"]');
      if (description) description.content = doc.querySelector('meta[name="description"]')?.content || '';
      document.querySelector('meta[name="theme-color"]').content = doc.querySelector('meta[name="theme-color"]').content;
      if (!pop) history.pushState({}, '', url);
      displayedURL = url;
      if (script) await new Promise((resolve, reject) => {
        const element = document.createElement('script');
        element.src = new URL(script, url);
        element.onload = () => { element.remove(); resolve(); };
        element.onerror = () => { element.remove(); reject(new Error('Initialization failed')); };
        document.head.append(element);
      });
      displayedURL = new URL(location.href); // Month initialization can normalize its query.
      if (token !== navigation) return;
      window.dispatchEvent(new Event('museum:navigate'));
      status.hidden = true;
      scrollToURL(url, pop);
      const heading = wrapper.querySelector('h1, main');
      if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
    } catch (error) {
      if (token !== navigation || error.name === 'AbortError') { if (!swapped) stylesheet?.remove(); return; }
      if (!swapped) stylesheet?.remove();
      status.replaceChildren(document.createTextNode('Halaman belum dapat dibuka. '));
      const retry = document.createElement('a');
      retry.href = url;
      retry.dataset.fullReload = '';
      retry.textContent = 'Muat ulang halaman (musik akan berhenti)';
      status.append(retry);
      status.hidden = false;
    }
  };
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || link.hasAttribute('download') || link.target || link.hasAttribute('data-full-reload')) return;
    const url = new URL(link.href);
    if (url.origin !== location.origin || !pages[pageName(url)] || url.pathname.replace(/[^/]*$/, '') !== location.pathname.replace(/[^/]*$/, '')) return;
    event.preventDefault();
    void navigate(url);
  });
  history.scrollRestoration = 'manual';
  window.addEventListener('load', () => { displayedURL = new URL(location.href); }, { once: true });
  window.addEventListener('popstate', () => { void navigate(new URL(location.href), { pop: true }); });
  window.MuseumShell = { get signal() { return controller.signal; } };
})();
