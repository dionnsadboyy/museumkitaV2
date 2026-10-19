(() => {
  const museum = window.our_museum;
  const media = window.MuseumMedia;
  if (!museum) return;

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const allAlbums = [...(museum.gallery || [])].sort((a, b) => a.sortDate.localeCompare(b.sortDate));
  const params = new URLSearchParams(window.location.search);
  const requestedMonth = params.get("month") || "";
  const availableMonths = [...new Set(allAlbums.map((album) => album.sortDate.slice(0, 7)))].sort();
  const monthKey = availableMonths.includes(requestedMonth) ? requestedMonth : (availableMonths[0] || "");
  const monthAlbums = allAlbums.filter((album) => album.sortDate.startsWith(monthKey));
  const requestedId = params.get("memory");
  let selectedAlbum = monthAlbums.find((album) => String(album.id) === requestedId) || monthAlbums[0];
  let mediaItems = [];
  let selectedMedia = 0;

  const monthContent = document.querySelector("#month-content");
  const monthEmpty = document.querySelector("#month-empty");
  if (!selectedAlbum) {
    monthEmpty.hidden = false;
    return;
  }

  monthContent.hidden = false;
  const escapeHTML = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
  const displayTitle = (value = "") => value.replace(/\bnr\b/gi, "NR");
  const monthDate = new Date(`${monthKey}-15T12:00:00`);
  const monthLabel = `${monthNames[monthDate.getMonth()]} ${monthDate.getFullYear()}`;
  document.querySelector("#month-label").textContent = monthLabel;
  document.querySelector("#month-back").href = `./archive.html#chapters`;
  document.title = `${monthLabel} — Our Museum`;

  const paragraphs = (story) => {
    const sentences = String(story || "").match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [story || ""];
    const groups = [];
    for (let i = 0; i < sentences.length; i += 2) groups.push(sentences.slice(i, i + 2).join(" ").trim());
    return groups.filter(Boolean).map((part) => `<p>${escapeHTML(part)}</p>`).join("");
  };

  const syncUrl = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("month", monthKey);
    url.searchParams.set("memory", selectedAlbum.id);
    window.history.replaceState({}, "", url);
  };

  const renderMemoryPager = () => {
    const index = monthAlbums.findIndex((album) => album.id === selectedAlbum.id);
    const previous = monthAlbums[index - 1];
    const next = monthAlbums[index + 1];
    const link = (album, side, label) => {
      const direction = side === "previous" ? "←" : "→";
      const thumbnail = album ? media.image(album.cover, { size: 'thumb' }) : '';
      if (!album) return `<span class="pager-item pager-item--${side} is-disabled" aria-disabled="true"><span class="pager-thumb">${thumbnail}</span><span class="pager-copy"><span class="pager-label">${direction} ${label}</span><span class="pager-date">—</span></span></span>`;
      const href = `./month.html?month=${encodeURIComponent(monthKey)}&memory=${encodeURIComponent(album.id)}`;
      return `<a class="pager-item pager-item--${side}" href="${href}"><span class="pager-thumb">${thumbnail}</span><span class="pager-copy"><span class="pager-label">${direction} ${label}</span><span class="pager-title">${escapeHTML(displayTitle(album.title))}</span><span class="pager-date">${escapeHTML(album.date)}</span></span></a>`;
    };
    document.querySelector("#memory-pager").innerHTML = `${link(previous, "previous", "Memory Sebelumnya")}<span class="pager-divider" aria-hidden="true"></span>${link(next, "next", "Memory Selanjutnya")}`;
  };

  const renderActiveMedia = () => {
    const active = mediaItems[selectedMedia];
    const stage = document.querySelector("#memory-stage");
    const count = document.querySelector("#stage-counter");
    const next = document.querySelector("#stage-next");
    count.textContent = `${selectedMedia + 1} / ${mediaItems.length}`;
    next.disabled = mediaItems.length < 2;
    next.hidden = mediaItems.length < 2;

    if (active.type === "video") {
      const poster = active.poster;
      stage.innerHTML = `<div class="stage-video">${media.image(active.src, { alt: selectedAlbum.title, priority: true })}
        <button class="stage-play" type="button" data-video="${escapeHTML(active.src)}" data-poster="${escapeHTML(poster)}" aria-label="Putar video ${selectedMedia + 1}">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7z" /></svg>
        </button>
      </div>`;
    } else {
      stage.innerHTML = media.image(active.src, { alt: `${displayTitle(selectedAlbum.title)} — ${selectedMedia + 1}`, priority: true });
    }

    document.querySelectorAll(".media-thumb").forEach((button, index) => {
      const current = index === selectedMedia;
      button.classList.toggle("is-selected", current);
      button.setAttribute("aria-pressed", String(current));
    });
  };

  const renderMediaGrid = () => {
    const grid = document.querySelector("#media-grid");
    document.querySelector("#media-count").textContent = `${mediaItems.length} media`;
    grid.classList.toggle("media-grid--compact", mediaItems.length < 4);
    grid.innerHTML = mediaItems.map((item, index) => {
      const selected = index === selectedMedia;
      const label = `${displayTitle(selectedAlbum.title)} — ${item.type === "video" ? "video" : `foto ${index + 1}`}`;
      return `<button class="media-thumb ${item.type === "video" ? "media-thumb--video" : ""} ${selected ? "is-selected" : ""}" type="button" data-media-index="${index}" aria-label="Buka ${escapeHTML(label)}" aria-haspopup="dialog" aria-pressed="${selected}">
        ${media.image(item.src, { size: 'thumb' })}${item.type === 'video' ? `<span class="thumb-play" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="m7 4 9 6-9 6z" /></svg></span>` : ''}
        <span class="media-kind" aria-hidden="true">${item.type === "video" ? "▶" : "▧"}</span>
      </button>`;
    }).join("");
    renderActiveMedia();
  };

  const renderMemory = (album) => {
    selectedAlbum = album;
    mediaItems = media.items(album);
    selectedMedia = media.initialIndex(album, mediaItems);
    const [day, month, year] = String(album.date).split(/\s+/);
    document.querySelector("#date-day").textContent = day || "";
    document.querySelector("#date-month-year").innerHTML = `${escapeHTML(month || "")}<br />${escapeHTML(year || "")}`;
    document.querySelector("#memory-title").textContent = displayTitle(album.title);
    document.querySelector("#memory-subtitle").textContent = album.subtitle;
    document.querySelector("#memory-location").querySelector("span").textContent = album.location || "";
    document.querySelector("#memory-mood").textContent = album.mood || "";
    document.querySelector("#memory-mood").hidden = !album.mood;
    document.querySelector("#memory-story").innerHTML = paragraphs(album.story) + media.note(album);
    document.querySelector("#story-note").textContent = album.subtitle || "";
    document.querySelector("#media-title").textContent = "Media dalam momen ini";
    document.querySelector("#memory-title").setAttribute("data-memory-id", album.id);
    renderMediaGrid();
    renderMemoryPager();
    syncUrl();
  };

  document.querySelector("#media-grid").addEventListener("click", (event) => {
    const thumb = event.target.closest("[data-media-index]");
    if (!thumb) return;
    media.openViewer({ items: mediaItems, index: Number(thumb.dataset.mediaIndex), title: displayTitle(selectedAlbum.title), caption: [selectedAlbum.date, selectedAlbum.location].filter(Boolean).join(' · '), trigger: thumb, onChange: index => {
      selectedMedia = index;
      renderActiveMedia();
    } });
  });
  document.querySelector("#stage-next").addEventListener("click", () => {
    if (mediaItems.length < 2) return;
    selectedMedia = (selectedMedia + 1) % mediaItems.length;
    renderActiveMedia();
  });
  document.querySelector("#memory-stage").addEventListener("click", async (event) => {
    const button = event.target.closest("[data-video]");
    if (!button) return;
    await media.play(document.querySelector('#memory-stage'), button.dataset.video, button.dataset.poster);
  });

  renderMemory(selectedAlbum);
})();
