(() => {
  const museum = window.our_museum;
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

  const posterFor = (album) => album.coverType === "photo"
    ? album.cover
    : (album.photos || [])[0] || "";

  const getMediaItems = (album) => {
    const items = [];
    const add = (type, src) => {
      if (src && !items.some((item) => item.src === src)) {
        items.push({ type, src, poster: type === "video" ? posterFor(album) : "" });
      }
    };

    if (album.cover) add(album.coverType === "video" ? "video" : "photo", album.cover);
    (album.photos || []).forEach((src) => add("photo", src));
    (album.videos || []).forEach((src) => add("video", src));
    return items;
  };

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
      stage.innerHTML = `<img class="stage-photo" src="${escapeHTML(active.src)}" data-fallback="${escapeHTML(posterFor(chapter))}" alt="${escapeHTML(displayTitle(chapter.title))} — ${selectedMedia + 1}" fetchpriority="high" decoding="async" />`;
      return;
    }

    const poster = active.poster
      ? `<img class="stage-video__poster" src="${escapeHTML(active.poster)}" alt="" fetchpriority="high" decoding="async" />`
      : `<span class="stage-video__mood" aria-hidden="true">${escapeHTML(chapter.mood || "")}</span>`;
    stage.innerHTML = `<div class="stage-video">${poster}<button class="stage-play" type="button" data-play-video="${escapeHTML(active.src)}" data-poster="${escapeHTML(active.poster)}" aria-label="Putar video ${selectedMedia + 1}">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7z" /></svg><span>Putar video</span>
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
      const visual = item.type === "photo"
        ? `<img src="${escapeHTML(item.src)}" data-fallback="${escapeHTML(posterFor(chapter))}" alt="" loading="lazy" decoding="async" />`
        : `${item.poster ? `<img src="${escapeHTML(item.poster)}" alt="" loading="lazy" decoding="async" />` : `<span class="video-thumb__mood" aria-hidden="true">${escapeHTML(chapter.mood || "")}</span>`}<span class="thumb-play" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="m7 4 9 6-9 6z" /></svg></span>`;
      return `<button class="media-thumb${item.type === "video" ? " media-thumb--video" : ""}${selected ? " is-selected" : ""}" type="button" data-media-index="${index}" aria-label="Pilih ${escapeHTML(label)}" aria-pressed="${selected}">
        ${visual}<span class="media-kind" aria-hidden="true">${item.type === "video" ? "▶" : "▧"}</span>
      </button>`;
    }).join("");
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

    const thumbnail = item.coverType === "photo" ? item.cover : (item.photos || [])[0];
    const thumb = thumbnail
      ? `<img src="${escapeHTML(thumbnail)}" alt="" loading="lazy" decoding="async" />`
      : `<span class="pager-video" aria-hidden="true">${escapeHTML(item.mood || "▶")}</span>`;
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
  document.querySelector("#chapter-story").innerHTML = storyParagraphs(chapter.story);

  mediaItems = getMediaItems(chapter);
  renderMediaGrid();
  content.addEventListener("error", (event) => {
    const image = event.target;
    if (!(image instanceof HTMLImageElement)) return;
    const fallback = image.dataset.fallback;
    if (fallback && !image.dataset.fallbackUsed && image.getAttribute("src") !== fallback) {
      image.dataset.fallbackUsed = "true";
      image.src = fallback;
    } else {
      image.remove();
    }
  }, true);

  document.querySelector("#media-grid").addEventListener("click", (event) => {
    const button = event.target.closest("[data-media-index]");
    if (!button) return;
    selectedMedia = Number(button.dataset.mediaIndex);
    renderMediaGrid();
  });

  document.querySelector("#chapter-stage").addEventListener("click", async (event) => {
    const button = event.target.closest("[data-play-video]");
    if (!button) return;
    const video = document.createElement("video");
    video.className = "memory-video-player";
    video.controls = true;
    video.playsInline = true;
    video.preload = "none";
    if (button.dataset.poster) video.poster = button.dataset.poster;
    video.src = button.dataset.playVideo;
    document.querySelector("#chapter-stage").replaceChildren(video);
    try {
      await video.play();
    } catch {
      video.focus();
    }
  });

  document.querySelector("#stage-next").addEventListener("click", () => {
    if (mediaItems.length < 2) return;
    selectedMedia = (selectedMedia + 1) % mediaItems.length;
    renderMediaGrid();
  });

  const previous = chapters[currentIndex - 1];
  const next = chapters[currentIndex + 1];
  document.querySelector("#chapter-pager").innerHTML = `${renderPagerItem(previous, "previous", "Sebelumnya")}<span class="pager-divider" aria-hidden="true"></span>${renderPagerItem(next, "next", "Selanjutnya")}`;
})();
