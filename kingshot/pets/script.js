(function () {
  const root = document.documentElement;

  const STORAGE_KEY = "kingshot:pets:v1";
  const LEGACY_STORAGE_KEY = "kingshot:pets:v0";
  const THEME_KEY = "kingshot-theme";
  const DEBUG_PANEL_KEY = "kingshot:pets:debug";
  const { DEFAULT_PETS, PET_RARITY_BY_NAME } = window.KINGSHOT_PET_CONSTANTS || {};
  if (!DEFAULT_PETS) {
    throw new Error("Missing pet constants. Ensure pet-constants.js is loaded before script.js.");
  }

  const RARITY_MAX_LEVEL = {
    common: 50,
    uncommon: 60,
    rare: 70,
    epic: 80,
    mythical: 100,
  };

  const REFINEMENT_TIERS = [
    { value: "common", label: "Common" },
    { value: "uncommon", label: "Uncommon" },
    { value: "rare", label: "Rare" },
    { value: "epic", label: "Epic" },
    { value: "mythical", label: "Mythical" },
  ];

  const REFINEMENT_FIELDS = [
    { key: "infantryLethality", label: "Infantry Lethality" },
    { key: "infantryHealth", label: "Infantry Health" },
    { key: "cavalryLethality", label: "Cavalry Lethality" },
    { key: "cavalryHealth", label: "Cavalry Health" },
    { key: "archerLethality", label: "Archer Lethality" },
    { key: "archerHealth", label: "Archer Health" },
  ];

  const yearEl = document.getElementById("year");
  const debugPreview = document.getElementById("debugPreview");
  const debugPanel = document.getElementById("debugPanel");

  const tbody = document.getElementById("tbody");
  const emptyState = document.getElementById("emptyState");

  const resetRosterBtn = document.getElementById("resetRoster");
  const searchEl = document.getElementById("search");

  const exportBtn = document.getElementById("exportBtn");
  const importFileEl = document.getElementById("importFile");
  const importBtn = document.getElementById("importBtn");

  const toggleThemeBtn = document.getElementById("toggleTheme");

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

  if (debugPanel) {
    const isDebugEnabled = localStorage.getItem(DEBUG_PANEL_KEY) === "1";
    debugPanel.hidden = !isDebugEnabled;
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function maxLevelForRarity(rarity) {
    return RARITY_MAX_LEVEL[String(rarity || "common").toLowerCase()] || 50;
  }

  function maxAbilityForLevel(level) {
    return Math.max(0, Math.floor(Number(level) / 10));
  }

  function sanitizeTier(value) {
    const normalized = String(value || "common").toLowerCase();
    if (REFINEMENT_TIERS.some((tier) => tier.value === normalized)) return normalized;
    return "common";
  }

  function defaultRefinement() {
    return REFINEMENT_FIELDS.reduce((acc, field) => {
      acc[field.key] = "common";
      return acc;
    }, {});
  }

  function buildDefaultRoster() {
    return DEFAULT_PETS.map((pet, index) => {
      const id = `pet-${index + 1}`;
      return sanitizePet({
        id,
        name: pet.name,
        rarity: pet.rarity,
        unlocked: false,
        level: 1,
        abilityLevel: 0,
        refinement: defaultRefinement(),
        updatedAt: nowIso(),
      });
    });
  }

  function sanitizePet(pet) {
    const name = String(pet.name || "").trim().slice(0, 60);
    const raritySource = PET_RARITY_BY_NAME?.[name] || pet.rarity || "common";
    const rarity = String(raritySource).trim().toLowerCase();
    const maxLevel = maxLevelForRarity(rarity);
    const level = Number.isFinite(Number(pet.level))
      ? Math.min(maxLevel, Math.max(1, Math.floor(Number(pet.level))))
      : 1;
    const abilityMax = maxAbilityForLevel(level);
    const abilityLevel = Number.isFinite(Number(pet.abilityLevel))
      ? Math.min(abilityMax, Math.max(0, Math.floor(Number(pet.abilityLevel))))
      : 0;
    const unlocked = Boolean(pet.unlocked);
    const refinementInput = pet.refinement || {};
    const refinement = REFINEMENT_FIELDS.reduce((acc, field) => {
      acc[field.key] = sanitizeTier(refinementInput[field.key]);
      return acc;
    }, {});
    const id = String(pet.id || "");
    const updatedAt = String(pet.updatedAt || nowIso());

    return {
      id,
      name,
      rarity,
      unlocked,
      level,
      abilityLevel,
      refinement,
      updatedAt,
    };
  }

  function loadRosterFromKey(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map(sanitizePet);
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
    const byId = new Map(saved.map((pet) => [pet.id, pet]));
    const byName = new Map(saved.map((pet) => [pet.name, pet]));
    return defaults.map((pet) => {
      const match = byId.get(pet.id) || byName.get(pet.name);
      if (!match) return pet;
      return sanitizePet({
        ...pet,
        ...match,
        id: pet.id,
        name: pet.name,
      });
    });
  }

  const loadedRoster = loadRoster();
  let roster = mergeWithDefaults(loadedRoster);
  if (!localStorage.getItem(STORAGE_KEY)) {
    saveRoster(roster);
  }

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
      .filter((pet) => {
        if (!q) return true;
        const hay = [pet.name].join(" ").toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  function refinementCell(pet, fieldKey, disabledAttr) {
    const selected = pet.refinement?.[fieldKey] || "common";
    return `
      <select class="select select-sm" data-field="refine:${escapeHtml(fieldKey)}" ${disabledAttr}>
        ${REFINEMENT_TIERS.map((tier) => `
          <option value="${tier.value}" ${tier.value === selected ? "selected" : ""}>${tier.label}</option>
        `).join("")}
      </select>
    `;
  }

  function render() {
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());

    const view = rosterForView();
    if (tbody) {
      tbody.innerHTML = view.map((pet) => {
        const lockedClass = pet.unlocked ? "" : " is-locked";
        const disabledAttr = pet.unlocked ? "" : "disabled";
        const rarityClass = `rarity-${String(pet.rarity || "common").toLowerCase()}`;
        const levelMax = maxLevelForRarity(pet.rarity);
        const levelOptions = Array.from({ length: levelMax }, (_, index) => index + 1);
        const abilityMax = maxAbilityForLevel(pet.level);
        const abilityOptions = Array.from({ length: abilityMax + 1 }, (_, index) => index);

        return `
          <tr class="${lockedClass.trim()}" data-id="${escapeHtml(pet.id)}">
            <td><strong class="${escapeHtml(rarityClass)}">${escapeHtml(pet.name)}</strong></td>
            <td class="num">
              <input class="checkbox" type="checkbox" data-field="unlocked" ${pet.unlocked ? "checked" : ""} />
            </td>
            <td class="num">
              <select class="select select-sm" data-field="level" ${disabledAttr}>
                ${levelOptions.map((value) => `
                  <option value="${value}" ${value === Number(pet.level) ? "selected" : ""}>${value}</option>
                `).join("")}
              </select>
            </td>
            <td class="num">
              <select class="select select-sm" data-field="abilityLevel" ${disabledAttr}>
                ${abilityOptions.map((value) => `
                  <option value="${value}" ${value === Number(pet.abilityLevel) ? "selected" : ""}>${value}</option>
                `).join("")}
              </select>
            </td>
            <td class="num">${refinementCell(pet, "infantryLethality", disabledAttr)}</td>
            <td class="num">${refinementCell(pet, "infantryHealth", disabledAttr)}</td>
            <td class="num">${refinementCell(pet, "cavalryLethality", disabledAttr)}</td>
            <td class="num">${refinementCell(pet, "cavalryHealth", disabledAttr)}</td>
            <td class="num">${refinementCell(pet, "archerLethality", disabledAttr)}</td>
            <td class="num">${refinementCell(pet, "archerHealth", disabledAttr)}</td>
          </tr>
        `;
      }).join("");
    }

    const hasAny = roster.length > 0;
    if (emptyState) emptyState.hidden = hasAny;

    if (debugPreview && debugPanel && !debugPanel.hidden) {
      const preview = roster
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(({ id, ...rest }) => rest);
      debugPreview.textContent = JSON.stringify(preview, null, 2);
    }
  }

  function updatePetField(id, field, value) {
    const pet = roster.find((item) => item.id === id);
    if (!pet) return;

    if (field === "unlocked") {
      pet.unlocked = Boolean(value);
    } else if (field === "level") {
      const maxLevel = maxLevelForRarity(pet.rarity);
      pet.level = Math.min(maxLevel, Math.max(1, Math.floor(Number(value) || 1)));
      const abilityMax = maxAbilityForLevel(pet.level);
      pet.abilityLevel = Math.min(abilityMax, pet.abilityLevel || 0);
    } else if (field === "abilityLevel") {
      const abilityMax = maxAbilityForLevel(pet.level);
      pet.abilityLevel = Math.min(abilityMax, Math.max(0, Math.floor(Number(value) || 0)));
    } else if (field.startsWith("refine:")) {
      const key = field.replace("refine:", "");
      if (!REFINEMENT_FIELDS.some((item) => item.key === key)) return;
      pet.refinement = {
        ...pet.refinement,
        [key]: sanitizeTier(value),
      };
    }

    pet.updatedAt = nowIso();
    saveRoster(roster);
  }

  if (tbody) {
    tbody.addEventListener("change", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;
      const row = target.closest("tr");
      const id = row?.getAttribute("data-id");
      const field = target.getAttribute("data-field");
      if (!id || !field) return;

      const value = target instanceof HTMLInputElement && target.type === "checkbox"
        ? target.checked
        : target.value;
      updatePetField(id, field, value);
      render();
    });
  }

  if (resetRosterBtn) {
    resetRosterBtn.addEventListener("click", () => {
      const ok = confirm("Reset all pets back to default locked values?");
      if (!ok) return;

      roster = buildDefaultRoster();
      saveRoster(roster);
      render();
    });
  }

  if (searchEl) searchEl.addEventListener("input", render);

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
        schema: "kingshot:pets:v1",
        exportedAt: nowIso(),
        pets: roster,
      };
      const file = `kingshot-pets-${new Date().toISOString().slice(0, 10)}.json`;
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

        const pets = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed?.pets)
            ? parsed.pets
            : null;

        if (!pets) {
          alert("Invalid file format. Expected an array or an object with a 'pets' array.");
          return;
        }

        const ok = confirm("Import will REPLACE your current roster. Continue?");
        if (!ok) return;

        roster = mergeWithDefaults(pets.map(sanitizePet));
        saveRoster(roster);
        render();

        alert(`Imported ${roster.length} pets.`);
        importFileEl.value = "";
      } catch (err) {
        alert("Import failed. Ensure the file is valid JSON.");
      }
    });
  }

  render();
})();
