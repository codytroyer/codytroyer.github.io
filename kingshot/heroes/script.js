(function () {
  const root = document.documentElement;

  // Storage keys (versioned so you can migrate later)
  const STORAGE_KEY = "kingshot:heroes:v2";
  const LEGACY_STORAGE_KEY = "kingshot:heroes:v1";
  const THEME_KEY = "kingshot-theme";
  const DEFAULT_HERO_COUNT = 28;

  // Elements
  const yearEl = document.getElementById("year");
  const debugPreview = document.getElementById("debugPreview");

  const tbody = document.getElementById("tbody");
  const emptyState = document.getElementById("emptyState");

  const resetRosterBtn = document.getElementById("resetRoster");

  const searchEl = document.getElementById("search");

  const exportBtn = document.getElementById("exportBtn");
  const importFileEl = document.getElementById("importFile");
  const importBtn = document.getElementById("importBtn");

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
  // { id, name, rarity, unlocked, level, stars, skills: number[], updatedAt }
  function nowIso() {
    return new Date().toISOString();
  }

  function buildDefaultRoster() {
    return Array.from({ length: DEFAULT_HERO_COUNT }, (_, index) => {
      const id = `hero-${index + 1}`;
      const name = `Hero${index + 1}`;
      return sanitizeHero({
        id,
        name,
        rarity: "Common",
        unlocked: false,
        level: 0,
        stars: 0,
        skills: [0, 0, 0, 0, 0, 0],
        updatedAt: nowIso(),
      });
    });
  }

  function normalizeSkills(input) {
    if (!Array.isArray(input)) return [0, 0, 0, 0, 0, 0];
    const values = input.map((value) => {
      const num = Number(value);
      if (!Number.isFinite(num)) return 0;
      return Math.max(0, Math.floor(num));
    });
    while (values.length < 6) values.push(0);
    return values.slice(0, 6);
  }

  function sanitizeHero(h) {
    const name = String(h.name || "").trim().slice(0, 60);
    const rarity = String(h.rarity || "Common").trim().slice(0, 20) || "Common";
    const level = Number.isFinite(Number(h.level)) ? Math.max(0, Math.floor(Number(h.level))) : 0;
    const stars = Number.isFinite(Number(h.stars)) ? Math.max(0, Math.floor(Number(h.stars))) : 0;
    const unlocked = Boolean(h.unlocked);
    const skills = normalizeSkills(h.skills);
    const id = String(h.id || "");
    const updatedAt = String(h.updatedAt || nowIso());

    return { id, name, rarity, unlocked, level, stars, skills, updatedAt };
  }

  function loadRosterFromKey(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map(sanitizeHero);
    } catch {
      return [];
    }
  }

  function loadRoster() {
    const current = loadRosterFromKey(STORAGE_KEY);
    if (current.length) return current;
    return loadRosterFromKey(LEGACY_STORAGE_KEY);
  }

  function saveRoster(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  function mergeWithDefaults(saved) {
    const defaults = buildDefaultRoster();
    const byId = new Map(saved.map((hero) => [hero.id, hero]));
    const byName = new Map(saved.map((hero) => [hero.name, hero]));
    return defaults.map((hero) => {
      const match = byId.get(hero.id) || byName.get(hero.name);
      if (!match) return hero;
      return sanitizeHero({
        ...hero,
        ...match,
        id: hero.id,
        name: hero.name,
      });
    });
  }

  const loadedRoster = loadRoster();
  let roster = mergeWithDefaults(loadedRoster);
  if (!localStorage.getItem(STORAGE_KEY)) {
    saveRoster(roster);
  }

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

    return roster
      .filter((h) => {
        if (!q) return true;
        const hay = [h.name].join(" ").toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  function render() {
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());
    if (statusText) statusText.textContent = `Saved locally. Heroes: ${roster.length}.`;

    const view = rosterForView();
    const skillsOptions = Array.from({ length: 6 }, (_, value) => value);
    const starsOptions = Array.from({ length: 6 }, (_, value) => value);
    const rarityOptions = ["Common", "Rare", "Epic", "Legendary", "Mythic"];

    if (tbody) {
      tbody.innerHTML = view.map((h) => {
        const lockedClass = h.unlocked ? "" : " is-locked";
        const disabledAttr = h.unlocked ? "" : "disabled";
        const skills = normalizeSkills(h.skills);
        const rarity = h.rarity || "Common";
        return `
          <tr class="${lockedClass.trim()}" data-id="${escapeHtml(h.id)}">
            <td><strong>${escapeHtml(h.name)}</strong></td>
            <td class="num">
              <input class="checkbox" type="checkbox" data-field="unlocked" ${h.unlocked ? "checked" : ""} />
            </td>
            <td class="num">
              <select class="select select-sm" data-field="rarity" ${disabledAttr}>
                ${rarityOptions.map((option) => `
                  <option value="${escapeHtml(option)}" ${option === rarity ? "selected" : ""}>${escapeHtml(option)}</option>
                `).join("")}
              </select>
            </td>
            <td class="num">
              <input class="input input-sm" type="number" data-field="level" min="0" max="80" value="${escapeHtml(h.level)}" ${disabledAttr} />
            </td>
            <td class="num">
              <select class="select select-sm" data-field="stars" ${disabledAttr}>
                ${starsOptions.map((value) => `
                  <option value="${value}" ${value === Number(h.stars) ? "selected" : ""}>${value}</option>
                `).join("")}
              </select>
            </td>
            <td class="num">
              <select class="select select-sm" data-field="skill1" ${disabledAttr}>
                ${skillsOptions.map((value) => `
                  <option value="${value}" ${value === Number(skills[0]) ? "selected" : ""}>${value}</option>
                `).join("")}
              </select>
            </td>
            <td class="num">
              <select class="select select-sm" data-field="skill2" ${disabledAttr}>
                ${skillsOptions.map((value) => `
                  <option value="${value}" ${value === Number(skills[1]) ? "selected" : ""}>${value}</option>
                `).join("")}
              </select>
            </td>
            <td class="num">
              <select class="select select-sm" data-field="skill3" ${disabledAttr}>
                ${skillsOptions.map((value) => `
                  <option value="${value}" ${value === Number(skills[2]) ? "selected" : ""}>${value}</option>
                `).join("")}
              </select>
            </td>
            <td class="num">
              <select class="select select-sm" data-field="skill4" ${disabledAttr}>
                ${skillsOptions.map((value) => `
                  <option value="${value}" ${value === Number(skills[3]) ? "selected" : ""}>${value}</option>
                `).join("")}
              </select>
            </td>
            <td class="num">
              <select class="select select-sm" data-field="skill5" ${disabledAttr}>
                ${skillsOptions.map((value) => `
                  <option value="${value}" ${value === Number(skills[4]) ? "selected" : ""}>${value}</option>
                `).join("")}
              </select>
            </td>
            <td class="num">
              <select class="select select-sm" data-field="skill6" ${disabledAttr}>
                ${skillsOptions.map((value) => `
                  <option value="${value}" ${value === Number(skills[5]) ? "selected" : ""}>${value}</option>
                `).join("")}
              </select>
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

  function updateHeroField(id, field, value) {
    const hero = roster.find((h) => h.id === id);
    if (!hero) return;
    if (field === "unlocked") {
      hero.unlocked = Boolean(value);
    } else if (field === "rarity") {
      hero.rarity = String(value || "Common").trim() || "Common";
    } else if (field === "level") {
      hero.level = Math.max(0, Math.floor(Number(value) || 0));
    } else if (field === "stars") {
      hero.stars = Math.max(0, Math.floor(Number(value) || 0));
    } else if (field.startsWith("skill")) {
      const idx = Number(field.replace("skill", "")) - 1;
      const updated = normalizeSkills(hero.skills);
      updated[idx] = Math.max(0, Math.floor(Number(value) || 0));
      hero.skills = updated;
    }
    hero.updatedAt = nowIso();
    saveRoster(roster);
  }

  // --- Events ---
  if (tbody) {
    tbody.addEventListener("change", (e) => {
      const target = e.target;
      if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;
      const row = target.closest("tr");
      const id = row?.getAttribute("data-id");
      const field = target.getAttribute("data-field");
      if (!id || !field) return;

      const value = target instanceof HTMLInputElement && target.type === "checkbox" ? target.checked : target.value;
      updateHeroField(id, field, value);
      render();
    });
  }

  if (resetRosterBtn) {
    resetRosterBtn.addEventListener("click", () => {
      const ok = confirm("Reset all heroes back to default locked values?");
      if (!ok) return;

      roster = buildDefaultRoster();
      saveRoster(roster);
      render();
    });
  }

  if (searchEl) searchEl.addEventListener("input", render);

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
        schema: "kingshot:heroes:v2",
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

        roster = mergeWithDefaults(heroes.map(sanitizeHero));
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
