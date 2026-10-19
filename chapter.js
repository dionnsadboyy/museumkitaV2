(() => {
  const museum = window.our_museum;
  const media = window.MuseumMedia;
  if (!museum) return;

  const chapters = [...(museum.gallery || [])].sort((a, b) =>
    String(a.sortDate || "").localeCompare(String(b.sortDate || "")) || Number(a.chapter) - Number(b.chapter),
  );
  const params = new URLSearchParams(window.location.search);
  const requestedChapter = params.get("chapter");
  const currentIndex = chapters.findIndex((item) => String(item.chapter) === requestedChapter);
  const chapter = chapters[currentIndex];
  const content = document.querySelector("#chapter-content");
  const empty = document.querySelector("#chapter-empty");

  if (!chapter) {
    empty.hidden = false;
    return;
  }

  content.hidden = false;

  const escapeHTML = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
  const displayTitle = (value = "") => String(value).replace(/\bnr\b/gi, "NR");
  const dateParts = String(chapter.date || "").trim().split(/\s+/);
  const displayNumber = String(chapter.chapter).padStart(2, "0");
  let mediaItems = [];
  let selectedMedia = 0;

  const storyParagraphs = (story = "") => {
    const sentences = String(story).match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [];
    const paragraphs = [];
    for (let index = 0; index < sentences.length; index += 3) {
      const paragraph = sentences.slice(index, index + 3).join(" ").trim();
      if (paragraph) paragraphs.push(`<p>${escapeHTML(paragraph)}</p>`);
    }
    return paragraphs.join("");
  };

  const renderStage = () => {
    const stage = document.querySelector("#chapter-stage");
    const counter = document.querySelector("#stage-counter");
    const nextButton = document.querySelector("#stage-next");
    const active = mediaItems[selectedMedia];
    counter.textContent = `${selectedMedia + 1} / ${mediaItems.length}`;
    nextButton.disabled = mediaItems.length < 2;
    nextButton.hidden = mediaItems.length < 2;

    if (active.type === "photo") {
      stage.innerHTML = media.image(active.src, { alt: `${displayTitle(chapter.title)} — ${selectedMedia + 1}`, priority: true });
      return;
    }

    const poster = media.image(active.src, { alt: `Cuplikan ${displayTitle(chapter.title)}`, priority: true });
    stage.innerHTML = `<div class="stage-video">${poster}<button class="stage-play" type="button" data-play-video="${escapeHTML(active.src)}" data-poster="${escapeHTML(active.poster)}" aria-label="Putar video ${selectedMedia + 1}">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7z" /></svg>
    </button></div>`;
  };

  const renderMediaGrid = () => {
    const grid = document.querySelector("#media-grid");
    const photoCount = chapter.photos?.length || 0;
    const videoCount = chapter.videos?.length || 0;
    const counts = [photoCount ? `${photoCount} foto` : "", videoCount ? `${videoCount} video` : ""].filter(Boolean);
    document.querySelector("#media-count").textContent = `${mediaItems.length} media${counts.length ? ` · ${counts.join(" · ")}` : ""}`;
    grid.classList.toggle("media-grid--compact", mediaItems.length < 4);
    grid.classList.toggle("media-grid--two", mediaItems.length === 2);
    grid.classList.toggle("media-grid--single", mediaItems.length === 1);
    grid.innerHTML = mediaItems.map((item, index) => {
      const label = item.type === "video" ? `video ${index + 1}` : `foto ${index + 1}`;
      const selected = index === selectedMedia;
      const visual = media.image(item.src, { size: 'thumb' }) + (item.type === 'video' ? `<span class="thumb-play" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="m7 4 9 6-9 6z" /></svg></span>` : '');
      return `<button class="media-thumb${item.type === "video" ? " media-thumb--video" : ""}${selected ? " is-selected" : ""}" type="button" data-media-index="${index}" aria-label="Buka ${escapeHTML(label)}" aria-haspopup="dialog" aria-pressed="${selected}">
        ${visual}<span class="media-kind" aria-hidden="true">${item.type === "video" ? "▶" : "▧"}</span>
      </button>`;
    }).join("");
  };

  const selectMedia = (index) => {
    selectedMedia = index;
    document.querySelectorAll('[data-media-index]').forEach((button, i) => {
      button.classList.toggle('is-selected', i === index);
      button.setAttribute('aria-pressed', String(i === index));
    });
    renderStage();
  };

  const renderPagerItem = (item, direction, label) => {
    const isPrevious = direction === "previous";
    const arrow = isPrevious ? "←" : "→";
    if (!item) {
      return `<span class="pager-item pager-item--${direction} is-disabled" aria-disabled="true">
        <span class="pager-thumb" aria-hidden="true"></span>
        <span class="pager-copy"><span class="pager-label">${arrow} ${label}</span><span class="pager-date">—</span></span>
      </span>`;
    }

    const thumb = media.image(item.cover, { size: 'thumb' });
    return `<a class="pager-item pager-item--${direction}" href="./chapter.html?chapter=${encodeURIComponent(item.chapter)}">
      <span class="pager-thumb">${thumb}</span>
      <span class="pager-copy"><span class="pager-label">${arrow} ${label}</span><span class="pager-title">Chapter ${String(item.chapter).padStart(2, "0")} · ${escapeHTML(displayTitle(item.title))}</span><span class="pager-date">${escapeHTML(item.date)}</span></span>
    </a>`;
  };

  document.title = `${displayTitle(chapter.title)} — Our Museum`;
  document.querySelector("#chapter-number").textContent = `Chapter ${displayNumber}`;
  document.querySelector("#date-day").textContent = dateParts[0] || "";
  const monthYear = dateParts.slice(1).join(" ");
  const dateElement = document.querySelector("#date-month-year");
  dateElement.textContent = monthYear;
  dateElement.dateTime = chapter.sortDate || "";
  document.querySelector("#chapter-title").textContent = displayTitle(chapter.title);
  document.querySelector("#chapter-subtitle").textContent = chapter.subtitle || "";
  document.querySelector("#chapter-location").textContent = chapter.location || "";
  const moodElement = document.querySelector("#chapter-mood");
  moodElement.textContent = chapter.mood || "";
  moodElement.hidden = !chapter.mood;
  document.querySelector("#story-note-mood").textContent = chapter.mood || "";
  document.querySelector("#story-note-date").textContent = chapter.date || "";
  document.querySelector("#chapter-story").innerHTML = storyParagraphs(chapter.story) + media.note(chapter);

  mediaItems = media.items(chapter);
  selectedMedia = media.initialIndex(chapter, mediaItems);
  renderMediaGrid();
  renderStage();

  document.querySelector("#media-grid").addEventListener("click", (event) => {
    const button = event.target.closest("[data-media-index]");
    if (!button) return;
    media.openViewer({ items: mediaItems, index: Number(button.dataset.mediaIndex), title: displayTitle(chapter.title), caption: [chapter.date, chapter.location].filter(Boolean).join(' · '), trigger: button, onChange: selectMedia });
  });

  document.querySelector("#chapter-stage").addEventListener("click", async (event) => {
    const button = event.target.closest("[data-play-video]");
    if (!button) return;
    await media.play(document.querySelector('#chapter-stage'), button.dataset.playVideo, button.dataset.poster);
  });

  document.querySelector("#stage-next").addEventListener("click", () => {
    if (mediaItems.length < 2) return;
    selectMedia((selectedMedia + 1) % mediaItems.length);
  });

  const previous = chapters[currentIndex - 1];
  const next = chapters[currentIndex + 1];
  document.querySelector("#chapter-pager").innerHTML = `${renderPagerItem(previous, "previous", "Sebelumnya")}<span class="pager-divider" aria-hidden="true"></span>${renderPagerItem(next, "next", "Selanjutnya")}`;
})();
