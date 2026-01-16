(function () {
  const root = document.documentElement;
  const yearEl = document.getElementById("year");
  const toggleThemeBtn = document.getElementById("toggleTheme");

  const infantryInput = document.getElementById("infantry");
  const cavalryInput = document.getElementById("cavalry");
  const archersInput = document.getElementById("archers");
  const bearCapacityInput = document.getElementById("bearCapacity");
  const joinCapacityInput = document.getElementById("joinCapacity");
  const joinCountInput = document.getElementById("joinCount");

  const infantryBar = document.getElementById("infantryBar");
  const cavalryBar = document.getElementById("cavalryBar");
  const archerBar = document.getElementById("archerBar");
  const capacityBar = document.getElementById("capacityBar");

  const totalCapacityEl = document.getElementById("totalCapacity");
  const capacityNoteEl = document.getElementById("capacityNote");
  const percentSplitEl = document.getElementById("percentSplit");
  const splitNoteEl = document.getElementById("splitNote");
  const deployedTotalEl = document.getElementById("deployedTotal");
  const deployedNoteEl = document.getElementById("deployedNote");
  const coverageEl = document.getElementById("coverage");
  const coverageNoteEl = document.getElementById("coverageNote");
  const planRows = document.getElementById("planRows");

  const storageKey = "kingshot-theme";
  const HERO_STORAGE_KEY = "kingshot:heroes:v2";
  const HERO_LEGACY_KEY = "kingshot:heroes:v1";
  const HERO_TYPES = ["Infantry", "Cavalry", "Archer"];

  function applyTheme(theme) {
    if (theme === "light" || theme === "dark") {
      root.dataset.theme = theme;
    } else {
      delete root.dataset.theme;
    }
  }

  const saved = localStorage.getItem(storageKey);
  if (saved) applyTheme(saved);

  if (toggleThemeBtn) {
    toggleThemeBtn.addEventListener("click", () => {
      const current = root.dataset.theme === "light" ? "light" : "dark";
      const next = current === "light" ? "dark" : "light";
      applyTheme(next);
      localStorage.setItem(storageKey, next);
    });
  }

  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  function parseNumber(value) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function formatNumber(value) {
    return value.toLocaleString("en-US");
  }

  function formatPercent(value) {
    return `${Math.round(value * 100)}%`;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function setBar(barEl, percent) {
    if (!barEl) return;
    const safe = clamp(percent, 0, 1) * 100;
    barEl.style.width = `${safe}%`;
  }

  function allocateRemaining(remaining, cavAvailable, infAvailable) {
    let cavalry = Math.min(cavAvailable, remaining / 2);
    let infantry = Math.min(infAvailable, remaining / 2);
    let leftover = remaining - cavalry - infantry;

    if (leftover > 0) {
      const cavRoom = cavAvailable - cavalry;
      const infRoom = infAvailable - infantry;
      if (cavRoom >= infRoom) {
        const addCav = Math.min(leftover, cavRoom);
        cavalry += addCav;
        leftover -= addCav;
      }
      if (leftover > 0) {
        const addInf = Math.min(leftover, infAvailable - infantry);
        infantry += addInf;
        leftover -= addInf;
      }
    }

    return { cavalry, infantry };
  }

  function allocateByPercent(capacity, percents) {
    const base = percents.map((percent) => capacity * percent);
    const floors = base.map((value) => Math.floor(value));
    let remainder = capacity - floors.reduce((sum, value) => sum + value, 0);

    const fractional = base.map((value, index) => ({
      index,
      frac: value - Math.floor(value),
    }));
    fractional.sort((a, b) => b.frac - a.frac);

    const results = [...floors];
    let i = 0;
    while (remainder > 0) {
      results[fractional[i % fractional.length].index] += 1;
      remainder -= 1;
      i += 1;
    }

    return results;
  }

  function loadRoster() {
    const tryLoad = (key) => {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    };
    const current = tryLoad(HERO_STORAGE_KEY);
    if (current.length) return current;
    return tryLoad(HERO_LEGACY_KEY);
  }

  function buildHeroPools() {
    const roster = loadRoster();
    const unlocked = roster.filter((hero) => hero?.unlocked && HERO_TYPES.includes(hero?.type));
    const pools = HERO_TYPES.reduce((acc, type) => {
      acc[type] = unlocked
        .filter((hero) => hero.type === type)
        .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      return acc;
    }, {});
    return pools;
  }

  function assignSquadHeroes(pools) {
    const hasAllTypes = HERO_TYPES.every((type) => pools[type]?.length);
    if (!hasAllTypes) return null;
    const selection = HERO_TYPES.map((type) => pools[type].shift());
    return selection.map((hero) => hero?.name || "").filter(Boolean);
  }

  function render() {
    const infantry = parseNumber(infantryInput?.value);
    const cavalry = parseNumber(cavalryInput?.value);
    const archers = parseNumber(archersInput?.value);
    const bearCapacity = parseNumber(bearCapacityInput?.value);
    const joinCapacity = parseNumber(joinCapacityInput?.value);
    const joinCount = clamp(parseNumber(joinCountInput?.value), 1, 6);

    if (joinCountInput) joinCountInput.value = joinCount;

    const totalTroops = infantry + cavalry + archers;
    const totalCapacity = bearCapacity + joinCapacity * joinCount;

    const archersUsed = Math.min(archers, totalCapacity);
    const remaining = Math.max(totalCapacity - archersUsed, 0);

    const { cavalry: cavalryUsed, infantry: infantryUsed } = allocateRemaining(
      remaining,
      cavalry,
      infantry,
    );

    const totalUsed = Math.min(totalCapacity, archersUsed + cavalryUsed + infantryUsed);
    const coverage = totalCapacity > 0 ? totalUsed / totalCapacity : 0;

    const percentInf = totalUsed > 0 ? infantryUsed / totalUsed : 0;
    const percentCav = totalUsed > 0 ? cavalryUsed / totalUsed : 0;
    const percentArch = totalUsed > 0 ? archersUsed / totalUsed : 0;

    setBar(infantryBar, totalTroops > 0 ? infantry / totalTroops : 0);
    setBar(cavalryBar, totalTroops > 0 ? cavalry / totalTroops : 0);
    setBar(archerBar, totalTroops > 0 ? archers / totalTroops : 0);
    setBar(capacityBar, totalTroops > 0 ? totalCapacity / totalTroops : 0);

    if (totalCapacityEl) totalCapacityEl.textContent = formatNumber(totalCapacity);
    if (capacityNoteEl) {
      capacityNoteEl.textContent = totalCapacity
        ? `Bear rally + ${joinCount} squads.`
        : "Enter capacities to see totals.";
    }

    if (percentSplitEl) {
      percentSplitEl.textContent = `${formatPercent(percentInf)} / ${formatPercent(percentCav)} / ${formatPercent(percentArch)}`;
    }

    if (splitNoteEl) {
      splitNoteEl.textContent = totalUsed
        ? "Percent of deployed troops."
        : "No troops assigned yet.";
    }

    if (deployedTotalEl) deployedTotalEl.textContent = formatNumber(totalUsed);
    if (deployedNoteEl) {
      deployedNoteEl.textContent = totalCapacity
        ? `${formatNumber(Math.max(totalCapacity - totalUsed, 0))} slots unfilled.`
        : "Enter capacity to start.";
    }

    if (coverageEl) coverageEl.textContent = formatPercent(coverage);
    if (coverageNoteEl) {
      coverageNoteEl.textContent = totalCapacity
        ? `${formatNumber(totalUsed)} / ${formatNumber(totalCapacity)} capacity filled.`
        : "Waiting for capacity inputs.";
    }

    if (!planRows) return;

    const percents = [percentInf, percentCav, percentArch];
    const bearEffective = Math.round(bearCapacity * coverage);
    const joinEffective = Math.round(joinCapacity * coverage);

    const [bearInf, bearCav, bearArch] = allocateByPercent(bearEffective, percents);
    const bearUnfilled = Math.max(bearCapacity - bearEffective, 0);

    const heroPools = buildHeroPools();
    const squadRows = Array.from({ length: joinCount }, (_, index) => {
      const [squadInf, squadCav, squadArch] = allocateByPercent(joinEffective, percents);
      const squadUnfilled = Math.max(joinCapacity - joinEffective, 0);
      const heroNames = assignSquadHeroes(heroPools);
      const heroMarkup = heroNames
        ? heroNames.map((name) => `<span class="hero-pill">${escapeHtml(name)}</span>`).join("")
        : "";
      return {
        label: `Squad ${index + 1}`,
        capacity: joinCapacity,
        infantry: squadInf,
        cavalry: squadCav,
        archers: squadArch,
        heroes: heroMarkup,
        unfilled: squadUnfilled,
      };
    });

    const totals = squadRows.reduce(
      (acc, row) => {
        acc.capacity += row.capacity;
        acc.infantry += row.infantry;
        acc.cavalry += row.cavalry;
        acc.archers += row.archers;
        acc.unfilled += row.unfilled;
        return acc;
      },
      {
        capacity: bearCapacity,
        infantry: bearInf,
        cavalry: bearCav,
        archers: bearArch,
        unfilled: bearUnfilled,
      },
    );

    const squadRowsMarkup = squadRows.map((row) => `
      <tr>
        <td>${escapeHtml(row.label)}</td>
        <td class="num">${formatNumber(row.capacity)}</td>
        <td class="num">${formatNumber(row.infantry)}</td>
        <td class="num">${formatNumber(row.cavalry)}</td>
        <td class="num">${formatNumber(row.archers)}</td>
        <td class="num hero-cell">${row.heroes}</td>
        <td class="num">${formatNumber(row.unfilled)}</td>
      </tr>
    `).join("");

    planRows.innerHTML = `
      <tr>
        <td>Bear rally (lead)</td>
        <td class="num">${formatNumber(bearCapacity)}</td>
        <td class="num">${formatNumber(bearInf)}</td>
        <td class="num">${formatNumber(bearCav)}</td>
        <td class="num">${formatNumber(bearArch)}</td>
        <td class="num hero-cell"></td>
        <td class="num">${formatNumber(bearUnfilled)}</td>
      </tr>
      ${squadRowsMarkup}
      <tr>
        <td><strong>Grand total</strong></td>
        <td class="num"><strong>${formatNumber(totals.capacity)}</strong></td>
        <td class="num"><strong>${formatNumber(totals.infantry)}</strong></td>
        <td class="num"><strong>${formatNumber(totals.cavalry)}</strong></td>
        <td class="num"><strong>${formatNumber(totals.archers)}</strong></td>
        <td class="num hero-cell"></td>
        <td class="num"><strong>${formatNumber(totals.unfilled)}</strong></td>
      </tr>
    `;
  }

  [infantryInput, cavalryInput, archersInput, bearCapacityInput, joinCapacityInput, joinCountInput]
    .filter(Boolean)
    .forEach((input) => {
      input.addEventListener("input", render);
    });

  render();
})();
