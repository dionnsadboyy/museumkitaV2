(() => {
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
  document.querySelector("#intro-photo").src = introPhoto(earliest, 7);
  document.querySelector("#intro-strip-back").src = introPhoto(earliest, 0);
  document.querySelector("#intro-strip-front").src = introPhoto(latest, 1);
  document.querySelector("#intro-caption").innerHTML = `${escapeHTML(latest.subtitle)} <span>♡</span>`;

  const renderCover = (album) => {
    if (album.coverType === "video") {
      return `
        <div class="memory-cover memory-cover--video" data-video-frame>
          <span class="video-label">Video memory</span>
          <button class="play-video" type="button" data-video="${escapeHTML(album.cover)}" aria-label="Putar video: ${escapeHTML(album.title)}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7z" /></svg>
            <span>Play memory</span>
          </button>
        </div>`;
    }
    return `
      <figure class="memory-cover">
        <img src="${escapeHTML(album.cover)}" alt="${escapeHTML(album.title)} — ${escapeHTML(album.subtitle)}" loading="lazy" decoding="async" />
      </figure>`;
  };

  const renderPhotos = (album) => (album.photos || []).slice(1, 3).map((src, index) => `
    <figure class="memory-print">
      <img src="${escapeHTML(src)}" alt="${escapeHTML(album.title)} — foto ${index + 2}" loading="lazy" decoding="async" />
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
    const video = document.createElement("video");
    video.className = "story-video-player";
    video.controls = true;
    video.playsInline = true;
    video.preload = "none";
    video.setAttribute("aria-label", "Memory video");
    video.src = source;
    if (frame) frame.replaceChildren(video);
    else button.replaceWith(video);
    try {
      await video.play();
    } catch {
      video.focus();
    }
  });
})();
