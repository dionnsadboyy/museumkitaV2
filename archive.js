(() => {
  const museum = window.our_museum;
  if (!museum) return;

  const chapters = [...(museum.gallery || [])].sort((a, b) =>
    a.sortDate.localeCompare(b.sortDate) || Number(a.chapter) - Number(b.chapter),
  );
  const chapterGrid = document.querySelector("#chapter-grid");
  const chapterCount = document.querySelector("#chapter-count");
  const emptyState = document.querySelector("#empty-state");
  const searchToggle = document.querySelector("#search-toggle");
  const searchPanel = document.querySelector("#archive-search");
  const searchInput = document.querySelector("#search-input");
  const menuToggle = document.querySelector("#menu-toggle");
  const quickMenu = document.querySelector("#quick-menu");
  let query = "";

  const escapeHTML = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
  const displayTitle = (value = "") => value.replace(/\bnr\b/gi, "NR");
  const storyPreview = (story = "") => {
    const sentence = String(story).split(/[.!?]/)[0].trim();
    return sentence.length > 105 ? `${sentence.slice(0, 102).trimEnd()}…` : sentence;
  };

  chapterCount.textContent = `${chapters.length} chapters`;

  const renderChapters = () => {
    const visibleChapters = chapters.filter((chapter) => {
      const searchable = [
        chapter.chapter, chapter.title, chapter.subtitle, chapter.date,
        chapter.sortDate, chapter.location, chapter.mood, chapter.story,
      ].join(" ").toLocaleLowerCase("id");
      return searchable.includes(query);
    });

    chapterGrid.innerHTML = visibleChapters.map((chapter) => {
      const number = String(chapter.chapter).padStart(2, "0");
      const title = displayTitle(chapter.title);
      const cover = chapter.coverType === "photo" && chapter.cover
        ? `<img src="${escapeHTML(chapter.cover)}" alt="" loading="lazy" decoding="async" />`
        : `<span class="chapter-card__video-cover"><span class="chapter-card__mood" aria-hidden="true">${escapeHTML(chapter.mood || "")}</span><span class="chapter-card__play" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="m7 4 9 6-9 6z" /></svg></span><span class="chapter-card__video-label">Video memory</span></span>`;
      const photos = chapter.photos?.length || 0;
      const videos = chapter.videos?.length || 0;
      const mediaLabel = [photos ? `${photos} foto` : "", videos ? `${videos} video` : ""].filter(Boolean).join(" · ");
      const href = `./chapter.html?chapter=${encodeURIComponent(chapter.chapter)}`;

      return `
        <a class="chapter-card" href="${href}" aria-label="Chapter ${number}: ${escapeHTML(title)} — ${escapeHTML(chapter.subtitle)}">
          <span class="chapter-card__image-wrap">${cover}</span>
          <span class="chapter-card__body">
            <span class="chapter-card__topline"><span class="chapter-card__number">Chapter ${number}</span><span class="chapter-card__arrow" aria-hidden="true"><svg viewBox="0 0 20 16"><path d="M2 8h16m-6-6 6 6-6 6" /></svg></span></span>
            <span class="chapter-card__name">${escapeHTML(title)}</span>
            <span class="chapter-card__subtitle">${escapeHTML(chapter.subtitle)}</span>
            <span class="chapter-card__excerpt">${escapeHTML(storyPreview(chapter.story))}</span>
            <span class="chapter-card__meta">${escapeHTML(chapter.date)} <i aria-hidden="true">·</i> ${escapeHTML(chapter.location)}</span>
            <span class="chapter-card__media">${escapeHTML(mediaLabel)} <span aria-hidden="true">${escapeHTML(chapter.mood || "")}</span></span>
          </span>
        </a>`;
    }).join("");
    emptyState.hidden = visibleChapters.length > 0;
    chapterCount.textContent = query
      ? `${visibleChapters.length} dari ${chapters.length} chapters`
      : `${chapters.length} chapters`;
  };

  renderChapters();

  document.querySelectorAll(".view-toggle__button").forEach((button) => {
    button.addEventListener("click", () => {
      const isList = button.dataset.view === "list";
      chapterGrid.classList.toggle("is-list", isList);
      document.querySelectorAll(".view-toggle__button").forEach((item) => {
        const active = item === button;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-pressed", String(active));
      });
    });
  });

  searchToggle.addEventListener("click", () => {
    const opening = searchPanel.hidden;
    searchPanel.hidden = !opening;
    searchToggle.setAttribute("aria-expanded", String(opening));
    if (opening) searchInput.focus();
  });
  searchPanel.addEventListener("submit", (event) => event.preventDefault());
  searchInput.addEventListener("input", () => {
    query = searchInput.value.trim().toLocaleLowerCase("id");
    renderChapters();
  });

  menuToggle.addEventListener("click", () => {
    const opening = quickMenu.hidden;
    quickMenu.hidden = !opening;
    menuToggle.setAttribute("aria-expanded", String(opening));
  });
  quickMenu.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      quickMenu.hidden = true;
      menuToggle.setAttribute("aria-expanded", "false");
    }
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".header-actions")) {
      quickMenu.hidden = true;
      menuToggle.setAttribute("aria-expanded", "false");
    }
  });
})();
