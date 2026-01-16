(function () {
  const root = document.documentElement;

  // Storage keys (versioned so you can migrate later)
  const STORAGE_KEY = "kingshot:heroes:v1";
  const THEME_KEY = "kingshot-theme";

  // Elements
  const yearEl = document.getElementById("year");
  const debugPreview = document.getElementById("debugPreview");

  const tbody = document.getElementById("tbody");
  const emptyState = document.getElementById("emptyState");

  const addHeroBtn = document.getElementById("addHero");
  const clearAllBtn = document.getElementById("clearAll");

  const searchEl = document.getElementById("search");
  const tagFilterEl = document.getElementById("tagFilter");

  const exportBtn = document.getElementById("exportBtn");
  const importFileEl = document.getElementById("importFile");
  const importBtn = document.getElementById("importBtn");

  const dialog = document.getElementById("heroDialog");
  const form = document.getElementById("heroForm");
  const dialogTitle = document.getElementById("dialogTitle");

  const heroIdEl = document.getElementById("heroId");
  const nameEl = document.getElementById("name");
  const levelEl = document.getElementById("level");
  const starsEl = document.getElementById("stars");
  const tagsEl = document.getElementById("tags");
  const notesEl = document.getElementById("notes");

  const cancelBtn = document.getElementById("cancelBtn");
  const toggleThemeBtn = document.getElementById("toggleTheme");

  const statusText = document.getElementById("statusText");

  // --- Theme persistence ---
  function applyTheme(theme) {
    if (theme === "light" || theme === "dark") root.dataset.theme = theme;
    else delete root.dataset.theme;
  }
  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme) applyTheme(savedTheme);

  if (toggleThemeBtn) {
    toggleThemeBtn.addEventListener("click", () => {
      const current = root.dataset.theme === "light" ? "light" : "dark";
      const next = current === "light" ? "dark" : "light";
      applyTheme(next);
      localStorage.setItem(THEME_KEY, next);
    });
  }

  // --- Data model ---
  // Hero shape:
  // { id, name, level, stars, tags: string[], notes, updatedAt }
  function nowIso() {
    return new Date().toISOString();
  }

  function randomId() {
    // Not cryptographic; sufficient for client-only IDs
    return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
  }

  function normalizeTags(input) {
    if (!input) return [];
    return input
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => t.toLowerCase());
  }

  function sanitizeHero(h) {
    const name = String(h.name || "").trim().slice(0, 60);
    const level = Number.isFinite(Number(h.level)) ? Math.max(1, Math.floor(Number(h.level))) : 1;
    const stars = Number.isFinite(Number(h.stars)) ? Math.max(0, Math.floor(Number(h.stars))) : 0;
    const tags = Array.isArray(h.tags) ? h.tags.map((x) => String(x).trim().toLowerCase()).filter(Boolean) : normalizeTags(h.tags);
    const notes = String(h.notes || "").trim().slice(0, 500);
    const id = String(h.id || randomId());
    const updatedAt = String(h.updatedAt || nowIso());

    return { id, name, level, stars, tags, notes, updatedAt };
  }

  function loadRoster() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map(sanitizeHero);
    } catch {
      return [];
    }
  }

  function saveRoster(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  let roster = loadRoster();

  // --- Rendering ---
  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function rosterForView() {
    const q = (searchEl?.value || "").trim().toLowerCase();
    const tag = tagFilterEl?.value || "all";

    return roster
      .filter((h) => {
        if (!q) return true;
        const hay = [h.name, h.notes, (h.tags || []).join(" "), String(h.level), String(h.stars)].join(" ").toLowerCase();
        return hay.includes(q);
      })
      .filter((h) => {
        if (tag === "all") return true;
        return (h.tags || []).includes(tag);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  function updateTagFilterOptions() {
    if (!tagFilterEl) return;

    const allTags = new Set();
    for (const h of roster) for (const t of (h.tags || [])) allTags.add(t);

    const current = tagFilterEl.value || "all";
    const tags = Array.from(allTags).sort();

    tagFilterEl.innerHTML = `<option value="all">All</option>` + tags.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join("");

    // restore selection if possible
    if (tags.includes(current)) tagFilterEl.value = current;
    else tagFilterEl.value = "all";
  }

  function render() {
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());
    if (statusText) statusText.textContent = `Saved locally. Heroes: ${roster.length}.`;

    updateTagFilterOptions();

    const view = rosterForView();

    if (tbody) {
      tbody.innerHTML = view.map((h) => {
        const tags = (h.tags || []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join(" ");
        const notes = escapeHtml(h.notes || "");
        return `
          <tr>
            <td><strong>${escapeHtml(h.name)}</strong></td>
            <td class="num">${escapeHtml(h.level)}</td>
            <td class="num">${escapeHtml(h.stars)}</td>
            <td>${tags || `<span class="muted">—</span>`}</td>
            <td>${notes || `<span class="muted">—</span>`}</td>
            <td class="actions-col">
              <div class="row-actions">
                <button class="btn" type="button" data-action="edit" data-id="${escapeHtml(h.id)}">Edit</button>
                <button class="btn danger" type="button" data-action="delete" data-id="${escapeHtml(h.id)}">Delete</button>
              </div>
            </td>
          </tr>
        `;
      }).join("");
    }

    const hasAny = roster.length > 0;
    if (emptyState) emptyState.hidden = hasAny;

    if (debugPreview) {
      const preview = roster
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(({ id, ...rest }) => rest); // omit ids in preview to reduce noise
      debugPreview.textContent = JSON.stringify(preview, null, 2);
    }
  }

  // --- Dialog helpers ---
  function openAddDialog() {
    heroIdEl.value = "";
    nameEl.value = "";
    levelEl.value = "1";
    starsEl.value = "0";
    tagsEl.value = "";
    notesEl.value = "";
    dialogTitle.textContent = "Add hero";
    dialog.showModal();
    nameEl.focus();
  }

  function openEditDialog(id) {
    const hero = roster.find((h) => h.id === id);
    if (!hero) return;

    heroIdEl.value = hero.id;
    nameEl.value = hero.name;
    levelEl.value = String(hero.level);
    starsEl.value = String(hero.stars);
    tagsEl.value = (hero.tags || []).join(", ");
    notesEl.value = hero.notes || "";
    dialogTitle.textContent = "Edit hero";
    dialog.showModal();
    nameEl.focus();
  }

  function upsertHeroFromForm() {
    const id = (heroIdEl.value || "").trim();
    const hero = sanitizeHero({
      id: id || randomId(),
      name: nameEl.value,
      level: levelEl.value,
      stars: starsEl.value,
      tags: normalizeTags(tagsEl.value),
      notes: notesEl.value,
      updatedAt: nowIso(),
    });

    if (!hero.name) return;

    const idx = roster.findIndex((h) => h.id === hero.id);
    if (idx >= 0) roster[idx] = hero;
    else roster.push(hero);

    saveRoster(roster);
    render();
  }

  // --- Events ---
  if (addHeroBtn) addHeroBtn.addEventListener("click", openAddDialog);

  if (cancelBtn) cancelBtn.addEventListener("click", () => dialog.close());

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      upsertHeroFromForm();
      dialog.close();
    });
  }

  if (tbody) {
    tbody.addEventListener("click", (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;

      const action = target.getAttribute("data-action");
      const id = target.getAttribute("data-id");
      if (!action || !id) return;

      if (action === "edit") {
        openEditDialog(id);
      } else if (action === "delete") {
        const hero = roster.find((h) => h.id === id);
        const label = hero?.name ? ` "${hero.name}"` : "";
        const ok = confirm(`Delete hero${label}? This cannot be undone.`);
        if (!ok) return;

        roster = roster.filter((h) => h.id !== id);
        saveRoster(roster);
        render();
      }
    });
  }

  if (clearAllBtn) {
    clearAllBtn.addEventListener("click", () => {
      const ok = confirm("Clear ALL heroes? This cannot be undone.");
      if (!ok) return;

      roster = [];
      saveRoster(roster);
      render();
    });
  }

  if (searchEl) searchEl.addEventListener("input", render);
  if (tagFilterEl) tagFilterEl.addEventListener("change", render);

  // Export / Import
  function download(filename, text) {
    const blob = new Blob([text], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      const payload = {
        schema: "kingshot:heroes:v1",
        exportedAt: nowIso(),
        heroes: roster,
      };
      const file = `kingshot-heroes-${new Date().toISOString().slice(0, 10)}.json`;
      download(file, JSON.stringify(payload, null, 2));
    });
  }

  if (importBtn) {
    importBtn.addEventListener("click", async () => {
      const file = importFileEl?.files?.[0];
      if (!file) {
        alert("Choose a JSON file first.");
        return;
      }
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);

        const heroes = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed?.heroes)
            ? parsed.heroes
            : null;

        if (!heroes) {
          alert("Invalid file format. Expected an array or an object with a 'heroes' array.");
          return;
        }

        const ok = confirm("Import will REPLACE your current roster. Continue?");
        if (!ok) return;

        roster = heroes.map(sanitizeHero);
        saveRoster(roster);
        render();

        alert(`Imported ${roster.length} heroes.`);
        importFileEl.value = "";
      } catch (err) {
        alert("Import failed. Ensure the file is valid JSON.");
      }
    });
  }

  // Initial render
  render();
})();

