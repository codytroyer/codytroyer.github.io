(function () {
  const root = document.documentElement;

  const STORAGE_KEY = "kingshot:governor-gear-charms:v1";
  const THEME_KEY = "kingshot-theme";

  const yearEl = document.getElementById("year");
  const statusText = document.getElementById("statusText");
  const gearGrid = document.getElementById("gearGrid");
  const resetGearBtn = document.getElementById("resetGear");
  const exportBtn = document.getElementById("exportBtn");
  const importFileEl = document.getElementById("importFile");
  const importBtn = document.getElementById("importBtn");
  const toggleThemeBtn = document.getElementById("toggleTheme");

  const GEAR_ITEMS = ["Crown", "Necklace", "Robe", "Pants", "Ring", "Staff"];

  const GEAR_LEVELS = [
    "Uncommon",
    "Uncommon (1-Star)",
    "Rare",
    "Rare (1-Star)",
    "Rare (2-Star)",
    "Rare (3-Star)",
    "Epic",
    "Epic (1-Star)",
    "Epic (2-Star)",
    "Epic (3-Star)",
    "Epic T1",
    "Epic T1 (1-Star)",
    "Epic T1 (2-Star)",
    "Epic T1 (3-Star)",
    "Mythic",
    "Mythic (1-Star)",
    "Mythic (2-Star)",
    "Mythic (3-Star)",
    "Mythic T1",
    "Mythic T1 (1-Star)",
    "Mythic T1 (2-Star)",
    "Mythic T1 (3-Star)",
    "Mythic T2",
    "Mythic T2 (1-Star)",
    "Mythic T2 (2-Star)",
    "Mythic T2 (3-Star)",
    "Legendary",
    "Legendary (1-Star)",
    "Legendary (2-Star)",
    "Legendary T1",
    "Legendary T2",
    "Legendary T3",
    "Legendary T4",
    "Legendary T5",
    "Legendary T6",
    "Legendary T7",
    "Legendary T8",
    "Legendary T9",
    "Legendary T10",
  ];

  const CHARM_LEVELS = Array.from({ length: 11 }, (_, index) => index + 1);

  function nowIso() {
    return new Date().toISOString();
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function buildDefaultGear() {
    return GEAR_ITEMS.reduce((acc, item) => {
      acc[item] = {
        level: "",
        charms: [1, 1, 1],
      };
      return acc;
    }, {});
  }

  function buildDefaultState() {
    return {
      version: 1,
      updatedAt: nowIso(),
      gear: buildDefaultGear(),
    };
  }

  function sanitizeCharms(raw) {
    if (!Array.isArray(raw)) return [1, 1, 1];
    return [0, 1, 2].map((index) => {
      const value = Number(raw[index]);
      if (!Number.isFinite(value)) return 1;
      if (value < 1) return 1;
      if (value > 11) return 11;
      return value;
    });
  }

  function sanitizeState(input) {
    const defaults = buildDefaultState();
    if (!input || typeof input !== "object") return defaults;

    const gear = buildDefaultGear();
    GEAR_ITEMS.forEach((item) => {
      const raw = input.gear?.[item];
      const level = typeof raw?.level === "string" && GEAR_LEVELS.includes(raw.level)
        ? raw.level
        : "";
      gear[item] = {
        level,
        charms: sanitizeCharms(raw?.charms),
      };
    });

    return {
      version: 1,
      updatedAt: String(input.updatedAt || nowIso()),
      gear,
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return buildDefaultState();
      const parsed = JSON.parse(raw);
      return sanitizeState(parsed);
    } catch {
      return buildDefaultState();
    }
  }

  function saveState(nextState) {
    const payload = {
      ...nextState,
      updatedAt: nowIso(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    state = payload;
  }

  function renderStatus() {
    if (!statusText) return;
    const updated = new Date(state.updatedAt);
    const updatedLabel = Number.isNaN(updated.getTime()) ? "" : ` Last saved: ${updated.toLocaleString()}.`;
    statusText.textContent = `Saved locally.${updatedLabel}`;
  }

  function buildLevelOptions(selected) {
    const empty = `<option value="">Not set</option>`;
    const options = GEAR_LEVELS.map((level) => {
      const isSelected = level === selected ? "selected" : "";
      return `<option value="${escapeHtml(level)}" ${isSelected}>${escapeHtml(level)}</option>`;
    }).join("");
    return `${empty}${options}`;
  }

  function buildCharmOptions(selected) {
    return CHARM_LEVELS.map((level) => {
      const isSelected = Number(level) === Number(selected) ? "selected" : "";
      return `<option value="${level}" ${isSelected}>${level}</option>`;
    }).join("");
  }

  function renderGear() {
    if (!gearGrid) return;

    const cards = GEAR_ITEMS.map((item) => {
      const data = state.gear[item];
      const levelSelectId = `level-${item}`;
      const charmInputs = data.charms.map((value, index) => {
        const inputId = `charm-${item}-${index + 1}`;
        return `
          <div class="charm-item">
            <label class="label" for="${escapeHtml(inputId)}">Charm ${index + 1}</label>
            <select
              class="select"
              id="${escapeHtml(inputId)}"
              data-gear="${escapeHtml(item)}"
              data-type="charm"
              data-index="${index}"
            >
              ${buildCharmOptions(value)}
            </select>
          </div>
        `;
      }).join("");

      return `
        <article class="gear-card">
          <div class="gear-title">
            <h3>${escapeHtml(item)}</h3>
            <span class="gear-meta">3 charms</span>
          </div>
          <div class="gear-controls">
            <div class="gear-row">
              <label class="label" for="${escapeHtml(levelSelectId)}">Gear level</label>
              <select
                class="select"
                id="${escapeHtml(levelSelectId)}"
                data-gear="${escapeHtml(item)}"
                data-type="level"
              >
                ${buildLevelOptions(data.level)}
              </select>
            </div>
            <div class="gear-row">
              <div class="label">Charms</div>
              <div class="charm-grid">
                ${charmInputs}
              </div>
            </div>
          </div>
        </article>
      `;
    }).join("");

    gearGrid.innerHTML = cards;
  }

  function render() {
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());
    renderGear();
    renderStatus();
  }

  function updateGearLevel(gearName, value) {
    saveState({
      ...state,
      gear: {
        ...state.gear,
        [gearName]: {
          ...state.gear[gearName],
          level: value,
        },
      },
    });
    renderStatus();
  }

  function updateCharmLevel(gearName, index, value) {
    const numeric = Number(value);
    const next = state.gear[gearName].charms.map((entry, idx) =>
      idx === index ? numeric : entry
    );
    saveState({
      ...state,
      gear: {
        ...state.gear,
        [gearName]: {
          ...state.gear[gearName],
          charms: sanitizeCharms(next),
        },
      },
    });
    renderStatus();
  }

  function exportData() {
    const payload = JSON.stringify(state, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "kingshot-governor-gear-charms.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function importData(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        const sanitized = sanitizeState(parsed);
        saveState(sanitized);
        render();
      } catch {
        alert("Invalid JSON file. Please select a Kingshot gear export.");
      }
    };
    reader.readAsText(file);
  }

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

  let state = loadState();

  if (gearGrid) {
    gearGrid.addEventListener("change", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLSelectElement)) return;
      const gearName = target.dataset.gear;
      const type = target.dataset.type;
      if (!gearName || !type) return;
      if (type === "level") {
        updateGearLevel(gearName, target.value);
      }
      if (type === "charm") {
        const index = Number(target.dataset.index);
        if (!Number.isFinite(index)) return;
        updateCharmLevel(gearName, index, target.value);
      }
    });
  }

  if (resetGearBtn) {
    resetGearBtn.addEventListener("click", () => {
      state = buildDefaultState();
      saveState(state);
      render();
    });
  }

  if (exportBtn) {
    exportBtn.addEventListener("click", exportData);
  }

  if (importBtn && importFileEl) {
    importBtn.addEventListener("click", () => {
      importData(importFileEl.files?.[0]);
    });
  }

  render();
})();
