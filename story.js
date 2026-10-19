(() => {
  const media = window.MuseumMedia;
  const albums = [...(window.our_museum?.gallery || [])].sort((a, b) =>
    a.sortDate.localeCompare(b.sortDate),
  );
  if (!albums.length) return;

  const escapeHTML = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
  const displayTitle = (value = "") => value.replace(/\bnr\b/gi, "NR");

  const earliest = albums[0];
  const latest = albums[albums.length - 1];
  const introPhoto = (album, index = 0) => album.photos?.[index] || album.cover;
  document.querySelector("#intro-photo").outerHTML = media.image(earliest.cover, { alt: 'Momen bersama di awal perjalanan', priority: true });
  document.querySelector("#intro-strip-back").outerHTML = media.image(introPhoto(earliest, 0), { size: 'thumb' });
  document.querySelector("#intro-strip-front").outerHTML = media.image(latest.cover, { size: 'thumb' });
  document.querySelector("#intro-caption").innerHTML = `${escapeHTML(latest.subtitle)} <span>♡</span>`;

  const renderCover = (album) => {
    if (album.coverType === "video") {
      return `
        <div class="memory-cover memory-cover--video" data-video-frame>
          ${media.image(album.cover, { alt: album.title })}
          <button class="play-video" type="button" data-video="${escapeHTML(album.cover)}" aria-label="Putar video: ${escapeHTML(album.title)}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7z" /></svg>
          </button>
        </div>`;
    }
    return `
      <figure class="memory-cover">
        ${media.image(album.cover, { alt: `${album.title} — ${album.subtitle}` })}
      </figure>`;
  };

  const renderPhotos = (album) => (album.photos || []).slice(1, 3).map((src, index) => `
    <figure class="memory-print">
      ${media.image(src, { size: 'thumb', alt: `${album.title} — foto ${index + 2}` })}
    </figure>`).join("");

  const renderClips = (album) => {
    const clips = album.coverType === "video" ? (album.videos || []).slice(1) : (album.videos || []);
    return clips.map((src, index) => `
      <button class="clip-button" type="button" data-video="${escapeHTML(src)}" aria-label="Putar video ${index + 1}: ${escapeHTML(album.title)}">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m7 4 9 6-9 6z" /></svg>
        <span>Video ${String(index + 1).padStart(2, "0")}</span>
    </button>`).join("");
  };

  const renderTimeGap = (previous, current) => {
    const previousDay = new Date(`${previous.sortDate}T12:00:00`);
    const currentDay = new Date(`${current.sortDate}T12:00:00`);
    const days = Math.round((currentDay - previousDay) / 86400000);
    if (!Number.isFinite(days) || days < 1) return "";
    const label = days === 1 ? "keesokan harinya" : `${days} hari kemudian`;
    return `<p class="story-gap" aria-hidden="true"><span></span>${label}<span></span></p>`;
  };

  document.querySelector("#story-journey").innerHTML = albums.map((album, index) => {
    const extras = renderPhotos(album) + renderClips(album);
    const location = album.location ? `<span class="memory-location">${escapeHTML(album.location)}</span>` : "";
    const mood = album.mood ? `<span class="memory-mood" aria-label="Suasana memory">${escapeHTML(album.mood)}</span>` : "";
    const sortDate = escapeHTML(album.sortDate);
    const timeGap = index ? renderTimeGap(albums[index - 1], album) : "";
    return `${timeGap}
      <section class="story-moment ${index % 2 ? "story-moment--reverse" : ""}" id="moment-${escapeHTML(album.id)}" aria-labelledby="moment-title-${escapeHTML(album.id)}">
        <div class="moment-copy">
          <p class="moment-date"><time datetime="${sortDate}">${escapeHTML(album.date)}</time></p>
          <h2 id="moment-title-${escapeHTML(album.id)}">${escapeHTML(displayTitle(album.title))}</h2>
          <p class="moment-subtitle">${escapeHTML(album.subtitle)}</p>
          <p class="moment-story">${escapeHTML(album.story)}</p>
          ${media.note(album)}
          <div class="moment-meta">${location}${mood}</div>
          ${extras ? `<div class="moment-media" aria-label="Foto dan video ${escapeHTML(album.title)}">${extras}</div>` : ""}
        </div>
        <div class="moment-visual">${renderCover(album)}</div>
      </section>`;
  }).join("");

  document.querySelector("#story-journey").addEventListener("click", async (event) => {
    const button = event.target.closest("[data-video]");
    if (!button) return;

    const source = button.dataset.video;
    const frame = button.closest("[data-video-frame]");
    const container = frame || document.createElement('span');
    if (!frame) button.replaceWith(container);
    await media.play(container, source, media.entry(source)?.large);
  });
})();
