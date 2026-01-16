(function () {
  const root = document.documentElement;

  const STORAGE_KEY = "kingshot:research:v1";
  const THEME_KEY = "kingshot-theme";

  const yearEl = document.getElementById("year");
  const statusText = document.getElementById("statusText");
  const treeGrid = document.getElementById("treeGrid");
  const emptyState = document.getElementById("emptyState");
  const searchEl = document.getElementById("search");
  const resetProgressBtn = document.getElementById("resetProgress");
  const resetBonusesBtn = document.getElementById("resetBonuses");
  const bonusGrid = document.getElementById("bonusGrid");
  const exportBtn = document.getElementById("exportBtn");
  const importFileEl = document.getElementById("importFile");
  const importBtn = document.getElementById("importBtn");
  const toggleThemeBtn = document.getElementById("toggleTheme");

  const RESEARCH_TREES = [
    {
      id: "growth",
      name: "Growth",
      tiersDefault: 7,
      stagesPerTier: 3,
      branches: [
        { name: "Tooling Up" },
        { name: "Ward Expansion" },
        { name: "Camp Expansion" },
        { name: "Tool Enhancement" },
        { name: "Bandaging" },
        { name: "Trainer Tools" },
        { name: "Command Tactics" },
      ],
    },
    {
      id: "economy",
      name: "Economy",
      tiersDefault: 6,
      stagesPerTier: 3,
      branches: [
        { name: "Bread Output" },
        { name: "Wood Output" },
        { name: "Food Foraging" },
        { name: "Wood Gathering" },
        { name: "Stone Output" },
        { name: "Stone Gathering" },
        { name: "Iron Output", tiers: 5 },
        { name: "Iron Mining", tiers: 5 },
      ],
    },
    {
      id: "battle",
      name: "Battle",
      tiersDefault: 6,
      stagesPerTier: 6,
      branches: [
        { name: "Weapons Prep" },
        { name: "Reprisal Tactics" },
        { name: "Precision Targeting" },
        { name: "Cavalry Charge" },
        { name: "Defensive Formations" },
        { name: "Picket Lines" },
        { name: "Bulwark Formations" },
        { name: "Special Defensive Training" },
        { name: "Survival Techniques" },
        { name: "Assault Techniques" },
        { name: "Regimental Expansion" },
        { name: "Close Combat" },
        { name: "Targeted Sniping" },
        { name: "Lance Upgrade" },
        { name: "Shield Upgrade" },
        { name: "Leathercraft" },
        { name: "Fortified Mail" },
      ],
    },
  ];

  const BONUS_GROUPS = [
    {
      id: "growth",
      title: "Growth stats",
      stats: [
        { key: "researchSpeed", label: "Research Speed (%)" },
        { key: "constructionSpeed", label: "Construction Speed (%)" },
        { key: "healingSpeed", label: "Healing Speed (%)" },
        { key: "trainingSpeed", label: "Training Speed (%)" },
        { key: "infirmaryCapacity", label: "Infirmary Capacity (#)" },
        { key: "trainingCapacity", label: "Training Capacity (#)" },
        { key: "marchQueue", label: "March Queue (#)" },
      ],
    },
    {
      id: "economy",
      title: "Economy stats",
      stats: [
        { key: "breadOutput", label: "Bread Output (%)" },
        { key: "woodOutput", label: "Wood Output (%)" },
        { key: "stoneOutput", label: "Stone Output (%)" },
        { key: "ironOutput", label: "Iron Output (%)" },
        { key: "breadGathering", label: "Bread Gathering Speed (%)" },
        { key: "woodGathering", label: "Wood Gathering Speed (%)" },
        { key: "stoneGathering", label: "Stone Gathering Speed (%)" },
        { key: "ironGathering", label: "Iron Gathering Speed (%)" },
      ],
    },
    {
      id: "battle",
      title: "Battle stats",
      stats: [
        { key: "infantryAttack", label: "Infantry Attack (%)" },
        { key: "infantryDefense", label: "Infantry Defense (%)" },
        { key: "infantryLethality", label: "Infantry Lethality (%)" },
        { key: "infantryHealth", label: "Infantry Health (%)" },
        { key: "cavalryAttack", label: "Cavalry Attack (%)" },
        { key: "cavalryDefense", label: "Cavalry Defense (%)" },
        { key: "cavalryLethality", label: "Cavalry Lethality (%)" },
        { key: "cavalryHealth", label: "Cavalry Health (%)" },
        { key: "archerAttack", label: "Archer Attack (%)" },
        { key: "archerDefense", label: "Archer Defense (%)" },
        { key: "archerLethality", label: "Archer Lethality (%)" },
        { key: "archerHealth", label: "Archer Health (%)" },
      ],
    },
  ];

  function slugify(value) {
    return String(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function buildBranchId(treeId, branchName) {
    return `${treeId}:${slugify(branchName)}`;
  }

  function createEmptyProgress(tiers, stagesPerTier) {
    return Array.from({ length: tiers }, () =>
      Array.from({ length: stagesPerTier }, () => false)
    );
  }

  function lastStageIndices(stagesPerTier) {
    if (stagesPerTier <= 1) return [0];
    return [stagesPerTier - 2, stagesPerTier - 1];
  }

  function romanNumeral(value) {
    const numerals = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
    return numerals[value - 1] || String(value);
  }

  function isStageUnlocked(progress, tierIndex, stageIndex, stagesPerTier) {
    if (tierIndex === 0) {
      if (stageIndex === 0) return true;
      return Boolean(progress[tierIndex]?.[stageIndex - 1]);
    }

    const prevTier = progress[tierIndex - 1];
    const requiredStages = lastStageIndices(stagesPerTier);
    const prevTierReady = requiredStages.every((idx) => Boolean(prevTier?.[idx]));
    if (!prevTierReady) return false;
    if (stageIndex === 0) return true;
    return Boolean(progress[tierIndex]?.[stageIndex - 1]);
  }

  function normalizeBranchProgress(raw, tiers, stagesPerTier) {
    const cleaned = createEmptyProgress(tiers, stagesPerTier);
    for (let tierIndex = 0; tierIndex < tiers; tierIndex += 1) {
      for (let stageIndex = 0; stageIndex < stagesPerTier; stageIndex += 1) {
        const unlocked = isStageUnlocked(cleaned, tierIndex, stageIndex, stagesPerTier);
        const rawValue = Boolean(raw?.[tierIndex]?.[stageIndex]);
        cleaned[tierIndex][stageIndex] = unlocked && rawValue;
      }
    }
    return cleaned;
  }

  function buildDefaultBonuses() {
    const bonuses = {};
    BONUS_GROUPS.forEach((group) => {
      bonuses[group.id] = {};
      group.stats.forEach((stat) => {
        bonuses[group.id][stat.key] = 0;
      });
    });
    return bonuses;
  }

  function buildDefaultState() {
    const branches = {};
    RESEARCH_TREES.forEach((tree) => {
      tree.branches.forEach((branch) => {
        const tiers = branch.tiers || tree.tiersDefault;
        const id = buildBranchId(tree.id, branch.name);
        branches[id] = normalizeBranchProgress(null, tiers, tree.stagesPerTier);
      });
    });
    return {
      version: 1,
      updatedAt: nowIso(),
      branches,
      bonuses: buildDefaultBonuses(),
    };
  }

  function sanitizeBonuses(input) {
    const defaults = buildDefaultBonuses();
    if (!input || typeof input !== "object") return defaults;
    BONUS_GROUPS.forEach((group) => {
      group.stats.forEach((stat) => {
        const raw = input?.[group.id]?.[stat.key];
        const value = Number(raw);
        defaults[group.id][stat.key] = Number.isFinite(value) ? value : 0;
      });
    });
    return defaults;
  }

  function sanitizeState(input) {
    const defaults = buildDefaultState();
    if (!input || typeof input !== "object") return defaults;

    const branches = {};
    RESEARCH_TREES.forEach((tree) => {
      tree.branches.forEach((branch) => {
        const tiers = branch.tiers || tree.tiersDefault;
        const id = buildBranchId(tree.id, branch.name);
        branches[id] = normalizeBranchProgress(input.branches?.[id], tiers, tree.stagesPerTier);
      });
    });

    return {
      version: 1,
      updatedAt: String(input.updatedAt || nowIso()),
      branches,
      bonuses: sanitizeBonuses(input.bonuses),
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

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function countCompleted(progress) {
    return progress.reduce((total, tier) =>
      total + tier.filter(Boolean).length, 0);
  }

  function countTotal(progress) {
    return progress.reduce((total, tier) => total + tier.length, 0);
  }

  function renderTree() {
    if (!treeGrid) return;

    const query = (searchEl?.value || "").trim().toLowerCase();
    let totalBranches = 0;

    const markup = RESEARCH_TREES.map((tree) => {
      const branches = tree.branches.filter((branch) => {
        if (!query) return true;
        return branch.name.toLowerCase().includes(query);
      });

      if (!branches.length) return "";
      totalBranches += branches.length;

      const branchCards = branches.map((branch) => {
        const tiers = branch.tiers || tree.tiersDefault;
        const branchId = buildBranchId(tree.id, branch.name);
        const progress = state.branches[branchId];
        const completed = countCompleted(progress);
        const totalStages = countTotal(progress);

        const tierRows = progress.map((tier, tierIndex) => {
          const stages = tier.map((stageValue, stageIndex) => {
            const unlocked = isStageUnlocked(progress, tierIndex, stageIndex, tree.stagesPerTier);
            const statusClass = stageValue ? "done" : "";
            const lockClass = unlocked ? "" : "locked";
            const inputId = `${branchId}-t${tierIndex + 1}-s${stageIndex + 1}`;
            const label = `Stage ${stageIndex + 1}`;

            return `
              <input
                id="${escapeHtml(inputId)}"
                class="stage-check ${statusClass} ${lockClass}"
                type="checkbox"
                aria-label="${escapeHtml(label)}"
                data-branch="${escapeHtml(branchId)}"
                data-tier="${tierIndex}"
                data-stage="${stageIndex}"
                ${stageValue ? "checked" : ""}
                ${unlocked ? "" : "disabled"}
              />
            `;
          }).join("");

          return `
            <div class="tier-row">
              <div>
                <div class="tier-label">${romanNumeral(tierIndex + 1)}</div>
                <div class="branch-meta">${tier.filter(Boolean).length}/${tier.length} stages</div>
              </div>
              <div class="stage-group">
                <span class="stage-label">Stage</span>
                <div class="stage-row">${stages}</div>
              </div>
            </div>
          `;
        }).join("");

        return `
          <article class="branch-card">
            <div class="branch-header">
              <h4 class="branch-title">${escapeHtml(branch.name)}</h4>
              <span class="branch-meta">${completed}/${totalStages} complete</span>
            </div>
            <div class="tier-list">${tierRows}</div>
          </article>
        `;
      }).join("");

      return `
        <section class="tree-section">
          <div class="tree-title">
            <div>
              <h3>${escapeHtml(tree.name)}</h3>
              <div class="tree-sub">${tree.stagesPerTier} stages per tier · ${tree.tiersDefault} tiers</div>
            </div>
          </div>
          <div class="branch-grid">${branchCards}</div>
        </section>
      `;
    }).join("");

    treeGrid.innerHTML = markup;
    if (emptyState) emptyState.hidden = totalBranches > 0;
  }

  function renderBonuses() {
    if (!bonusGrid) return;

    const markup = BONUS_GROUPS.map((group) => {
      const items = group.stats.map((stat) => {
        const value = state.bonuses?.[group.id]?.[stat.key] ?? 0;
        const inputId = `${group.id}-${stat.key}`;
        return `
          <div class="bonus-item">
            <label for="${escapeHtml(inputId)}">${escapeHtml(stat.label)}</label>
            <input
              class="input"
              id="${escapeHtml(inputId)}"
              type="number"
              step="0.01"
              data-group="${escapeHtml(group.id)}"
              data-stat="${escapeHtml(stat.key)}"
              value="${escapeHtml(value)}"
            />
          </div>
        `;
      }).join("");

      return `
        <article class="bonus-card">
          <h3>${escapeHtml(group.title)}</h3>
          <div class="bonus-list">${items}</div>
        </article>
      `;
    }).join("");

    bonusGrid.innerHTML = markup;
  }

  function renderStatus() {
    if (!statusText) return;
    let completed = 0;
    let total = 0;
    Object.values(state.branches).forEach((progress) => {
      completed += countCompleted(progress);
      total += countTotal(progress);
    });
    statusText.textContent = `Saved locally. ${completed}/${total} stages complete.`;
  }

  function render() {
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());
    renderTree();
    renderBonuses();
    renderStatus();
  }

  function updateBranchProgress(branchId, tierIndex, stageIndex, checked) {
    const tree = RESEARCH_TREES.find((item) => branchId.startsWith(item.id + ":"));
    if (!tree) return;

    const branch = tree.branches.find((item) => buildBranchId(tree.id, item.name) === branchId);
    const tiers = branch?.tiers || tree.tiersDefault;
    const progress = normalizeBranchProgress(state.branches[branchId], tiers, tree.stagesPerTier);

    if (!progress[tierIndex]) return;
    progress[tierIndex][stageIndex] = checked;
    const normalized = normalizeBranchProgress(progress, tiers, tree.stagesPerTier);

    saveState({
      ...state,
      branches: {
        ...state.branches,
        [branchId]: normalized,
      },
    });
  }

  function updateBonusValue(groupId, statKey, value) {
    const numeric = Number(value);
    const sanitized = Number.isFinite(numeric) ? numeric : 0;
    saveState({
      ...state,
      bonuses: {
        ...state.bonuses,
        [groupId]: {
          ...state.bonuses[groupId],
          [statKey]: sanitized,
        },
      },
    });
  }

  function exportData() {
    const payload = JSON.stringify(state, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "kingshot-research.json";
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
        alert("Invalid JSON file. Please select a Kingshot research export.");
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

  if (searchEl) {
    searchEl.addEventListener("input", () => {
      renderTree();
    });
  }

  if (treeGrid) {
    treeGrid.addEventListener("change", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (target.type !== "checkbox") return;
      const branchId = target.dataset.branch;
      const tierIndex = Number(target.dataset.tier);
      const stageIndex = Number(target.dataset.stage);
      if (!branchId || !Number.isFinite(tierIndex) || !Number.isFinite(stageIndex)) return;
      updateBranchProgress(branchId, tierIndex, stageIndex, target.checked);
      render();
    });
  }

  if (bonusGrid) {
    bonusGrid.addEventListener("input", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      const groupId = target.dataset.group;
      const statKey = target.dataset.stat;
      if (!groupId || !statKey) return;
      updateBonusValue(groupId, statKey, target.value);
      renderStatus();
    });
  }

  if (resetProgressBtn) {
    resetProgressBtn.addEventListener("click", () => {
      state = buildDefaultState();
      saveState(state);
      render();
    });
  }

  if (resetBonusesBtn) {
    resetBonusesBtn.addEventListener("click", () => {
      saveState({
        ...state,
        bonuses: buildDefaultBonuses(),
      });
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
