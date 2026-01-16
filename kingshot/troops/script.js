(function () {
  const root = document.documentElement;

  const STORAGE_KEY = "kingshot:troops:v1";
  const THEME_KEY = "kingshot-theme";
  const DEBUG_PANEL_KEY = "kingshot:troops:debug";

  const TROOP_TYPES = [
    { id: "infantry", label: "Infantry" },
    { id: "cavalry", label: "Cavalry" },
    { id: "archers", label: "Archers" },
  ];

  const LEVELS = Array.from({ length: 11 }, (_, index) => 11 - index);

  const yearEl = document.getElementById("year");
  const troopGrid = document.getElementById("troopGrid");
  const resetTroopsBtn = document.getElementById("resetTroops");
  const toggleThemeBtn = document.getElementById("toggleTheme");
  const debugPanel = document.getElementById("debugPanel");
  const debugPreview = document.getElementById("debugPreview");

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

  function formatNumber(value) {
    return value.toLocaleString("en-US");
  }

  function parseCount(value) {
    const cleaned = String(value || "").replace(/[^\d]/g, "");
    const parsed = Number.parseInt(cleaned, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function buildDefaultRoster() {
    return TROOP_TYPES.reduce((acc, type) => {
      const levels = LEVELS.reduce((levelsAcc, level) => {
        levelsAcc[level] = 0;
        return levelsAcc;
      }, {});
      acc[type.id] = {
        type: type.id,
        label: type.label,
        levels,
        updatedAt: nowIso(),
      };
      return acc;
    }, {});
  }

  function sanitizeRoster(input) {
    const defaults = buildDefaultRoster();
    const output = {};
    TROOP_TYPES.forEach((type) => {
      const data = input?.[type.id] || {};
      const safeLevels = {};
      LEVELS.forEach((level) => {
        const rawValue = data?.levels?.[level];
        const numeric = Number(rawValue);
        safeLevels[level] = Number.isFinite(numeric) && numeric >= 0 ? Math.floor(numeric) : 0;
      });
      output[type.id] = {
        type: type.id,
        label: type.label,
        levels: safeLevels,
        updatedAt: typeof data?.updatedAt === "string" ? data.updatedAt : defaults[type.id].updatedAt,
      };
    });
    return output;
  }

  function loadRoster() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return buildDefaultRoster();
      const parsed = JSON.parse(raw);
      return sanitizeRoster(parsed);
    } catch {
      return buildDefaultRoster();
    }
  }

  function saveRoster() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(roster));
  }

  function updateDebugPreview() {
    if (debugPreview && debugPanel && !debugPanel.hidden) {
      debugPreview.textContent = JSON.stringify(roster, null, 2);
    }
  }

  function render() {
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());
    if (!troopGrid) return;

    troopGrid.innerHTML = TROOP_TYPES.map((type) => {
      const data = roster[type.id];
      const levelRows = LEVELS.map((level) => {
        const id = `${type.id}-level-${level}`;
        const value = data?.levels?.[level] ?? 0;
        return `
          <div class="level-row">
            <label class="level-label" for="${id}">Level ${level}</label>
            <input
              class="input input-sm"
              id="${id}"
              type="text"
              min="0"
              step="1"
              inputmode="numeric"
              data-type="${type.id}"
              data-level="${level}"
              value="${formatNumber(value)}"
            />
          </div>
        `;
      }).join("");

      return `
        <article class="troop-card" data-type="${type.id}">
          <h3>${type.label}</h3>
          <div class="level-list">
            ${levelRows}
          </div>
        </article>
      `;
    }).join("");

    updateDebugPreview();
  }

  function updateLevel(typeId, level, value) {
    const troop = roster[typeId];
    if (!troop) return;
    const numeric = parseCount(value);
    troop.levels[level] = Math.max(0, Math.floor(numeric));
    troop.updatedAt = nowIso();
    saveRoster();
    updateDebugPreview();
  }

  let roster = loadRoster();
  if (!localStorage.getItem(STORAGE_KEY)) {
    saveRoster();
  }

  if (troopGrid) {
    troopGrid.addEventListener("input", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      const typeId = target.dataset.type;
      const level = Number(target.dataset.level);
      if (!typeId || Number.isNaN(level)) return;
      updateLevel(typeId, level, target.value);
    });

    troopGrid.addEventListener("blur", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      const typeId = target.dataset.type;
      const level = Number(target.dataset.level);
      if (!typeId || Number.isNaN(level)) return;
      const value = roster[typeId]?.levels?.[level] ?? 0;
      target.value = formatNumber(value);
    }, true);
  }

  if (resetTroopsBtn) {
    resetTroopsBtn.addEventListener("click", () => {
      const ok = confirm("Reset all troop counts back to zero?");
      if (!ok) return;
      roster = buildDefaultRoster();
      saveRoster();
      render();
    });
  }

  render();
})();
