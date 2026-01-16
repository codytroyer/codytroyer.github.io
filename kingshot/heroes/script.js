(function () {
  const root = document.documentElement;

  // Storage keys (versioned so you can migrate later)
  const STORAGE_KEY = "kingshot:heroes:v2";
  const LEGACY_STORAGE_KEY = "kingshot:heroes:v1";
  const THEME_KEY = "kingshot-theme";
  const DEFAULT_HEROES = [
    { name: "Rosa", rarity: "SSR" },
    { name: "Alcar", rarity: "SSR" },
    { name: "Zoe", rarity: "SSR" },
    { name: "Jabel", rarity: "SSR" },
    { name: "Petra", rarity: "SSR" },
    { name: "Long Fei", rarity: "SSR" },
    { name: "Hilde", rarity: "SSR" },
    { name: "Marlin", rarity: "SSR" },
    { name: "Amadeus", rarity: "SSR" },
    { name: "Jaeger", rarity: "SSR" },
    { name: "Margot", rarity: "SSR" },
    { name: "Eric", rarity: "SSR" },
    { name: "Saul", rarity: "SSR" },
    { name: "Helga", rarity: "SSR" },
    { name: "Vivian", rarity: "SSR" },
    { name: "Thrud", rarity: "SSR" },
    { name: "Diana", rarity: "SR" },
    { name: "Chenko", rarity: "SR" },
    { name: "Quinn", rarity: "SR" },
    { name: "Gordon", rarity: "SR" },
    { name: "Howard", rarity: "SR" },
    { name: "Fahd", rarity: "SR" },
    { name: "Amane", rarity: "SR" },
    { name: "Yeonwoo", rarity: "SR" },
    { name: "Forrest", rarity: "R" },
    { name: "Olive", rarity: "R" },
    { name: "Edwin", rarity: "R" },
    { name: "Seth", rarity: "R" },
  ];

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
  // { id, name, rarity, unlocked, level, stars, skills: { conquest: number[], expedition: number[] }, updatedAt }
  function nowIso() {
    return new Date().toISOString();
  }

  function buildDefaultRoster() {
    return DEFAULT_HEROES.map((hero, index) => {
      const id = `hero-${index + 1}`;
      return sanitizeHero({
        id,
        name: hero.name,
        rarity: hero.rarity,
        unlocked: false,
        level: 0,
        stars: 0,
        skills: {
          conquest: [],
          expedition: [],
        },
        updatedAt: nowIso(),
      });
    });
  }

  function skillLimitsForRarity(rarity) {
    const key = String(rarity || "R").toLowerCase();
    if (key === "sr") return { conquest: 3, expedition: 2 };
    if (key === "ssr") return { conquest: 3, expedition: 3 };
    return { conquest: 2, expedition: 2 };
  }

  function normalizeSkillGroup(input, limit) {
    const values = Array.isArray(input) ? input : [];
    const normalized = values.map((value) => {
      const num = Number(value);
      if (!Number.isFinite(num)) return 0;
      return Math.max(0, Math.floor(num));
    });
    while (normalized.length < limit) normalized.push(0);
    return normalized.slice(0, limit);
  }

  function normalizeSkills(input, rarity) {
    const limits = skillLimitsForRarity(rarity);
    if (Array.isArray(input)) {
      return {
        conquest: normalizeSkillGroup(input.slice(0, 3), limits.conquest),
        expedition: normalizeSkillGroup(input.slice(3, 6), limits.expedition),
      };
    }
    const conquest = normalizeSkillGroup(input?.conquest, limits.conquest);
    const expedition = normalizeSkillGroup(input?.expedition, limits.expedition);
    return { conquest, expedition };
  }

  function sanitizeHero(h) {
    const name = String(h.name || "").trim().slice(0, 60);
    const rarity = String(h.rarity || "R").trim().slice(0, 20) || "R";
    const level = Number.isFinite(Number(h.level)) ? Math.max(0, Math.floor(Number(h.level))) : 0;
    const stars = Number.isFinite(Number(h.stars)) ? Math.max(0, Math.floor(Number(h.stars))) : 0;
    const unlocked = Boolean(h.unlocked);
    const skills = normalizeSkills(h.skills, rarity);
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
    if (tbody) {
      tbody.innerHTML = view.map((h) => {
        const lockedClass = h.unlocked ? "" : " is-locked";
        const disabledAttr = h.unlocked ? "" : "disabled";
        const rarity = h.rarity || "R";
        const rarityClass = `rarity-${rarity.toLowerCase()}`;
        const limits = skillLimitsForRarity(rarity);
        const skills = normalizeSkills(h.skills, rarity);
        const conquestDisabled = (index) => (!h.unlocked || index >= limits.conquest) ? "disabled" : "";
        const expeditionDisabled = (index) => (!h.unlocked || index >= limits.expedition) ? "disabled" : "";
        const conquestValue = (index) => skills.conquest[index];
        const expeditionValue = (index) => skills.expedition[index];
        return `
          <tr class="${lockedClass.trim()}" data-id="${escapeHtml(h.id)}">
            <td><strong class="${escapeHtml(rarityClass)}">${escapeHtml(h.name)}</strong></td>
            <td class="num">
              <input class="checkbox" type="checkbox" data-field="unlocked" ${h.unlocked ? "checked" : ""} />
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
              ${limits.conquest >= 1 ? `
                <select class="select select-sm" data-field="conquest1" ${conquestDisabled(0)}>
                  ${skillsOptions.map((value) => `
                    <option value="${value}" ${value === Number(conquestValue(0)) ? "selected" : ""}>${value}</option>
                  `).join("")}
                </select>
              ` : `<span class="muted">—</span>`}
            </td>
            <td class="num">
              ${limits.conquest >= 2 ? `
                <select class="select select-sm" data-field="conquest2" ${conquestDisabled(1)}>
                  ${skillsOptions.map((value) => `
                    <option value="${value}" ${value === Number(conquestValue(1)) ? "selected" : ""}>${value}</option>
                  `).join("")}
                </select>
              ` : `<span class="muted">—</span>`}
            </td>
            <td class="num">
              ${limits.conquest >= 3 ? `
                <select class="select select-sm" data-field="conquest3" ${conquestDisabled(2)}>
                  ${skillsOptions.map((value) => `
                    <option value="${value}" ${value === Number(conquestValue(2)) ? "selected" : ""}>${value}</option>
                  `).join("")}
                </select>
              ` : `<span class="muted">—</span>`}
            </td>
            <td class="num">
              ${limits.expedition >= 1 ? `
                <select class="select select-sm" data-field="expedition1" ${expeditionDisabled(0)}>
                  ${skillsOptions.map((value) => `
                    <option value="${value}" ${value === Number(expeditionValue(0)) ? "selected" : ""}>${value}</option>
                  `).join("")}
                </select>
              ` : `<span class="muted">—</span>`}
            </td>
            <td class="num">
              ${limits.expedition >= 2 ? `
                <select class="select select-sm" data-field="expedition2" ${expeditionDisabled(1)}>
                  ${skillsOptions.map((value) => `
                    <option value="${value}" ${value === Number(expeditionValue(1)) ? "selected" : ""}>${value}</option>
                  `).join("")}
                </select>
              ` : `<span class="muted">—</span>`}
            </td>
            <td class="num">
              ${limits.expedition >= 3 ? `
                <select class="select select-sm" data-field="expedition3" ${expeditionDisabled(2)}>
                  ${skillsOptions.map((value) => `
                    <option value="${value}" ${value === Number(expeditionValue(2)) ? "selected" : ""}>${value}</option>
                  `).join("")}
                </select>
              ` : `<span class="muted">—</span>`}
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
    } else if (field === "level") {
      hero.level = Math.max(0, Math.floor(Number(value) || 0));
    } else if (field === "stars") {
      hero.stars = Math.max(0, Math.floor(Number(value) || 0));
    } else if (field.startsWith("conquest") || field.startsWith("expedition")) {
      const isConquest = field.startsWith("conquest");
      const idx = Number(field.replace(isConquest ? "conquest" : "expedition", "")) - 1;
      if (Number.isNaN(idx) || idx < 0) return;
      const updated = normalizeSkills(hero.skills, hero.rarity);
      const group = isConquest ? updated.conquest : updated.expedition;
      if (idx >= group.length) return;
      group[idx] = Math.max(0, Math.floor(Number(value) || 0));
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
