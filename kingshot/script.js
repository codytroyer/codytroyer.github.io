(function () {
  const root = document.documentElement;

  const yearEl = document.getElementById("year");
  const statusEl = document.getElementById("statusText");
  const siteStatusEl = document.getElementById("siteStatus");
  const buildBadge = document.getElementById("buildBadge");

  const toolGrid = document.getElementById("toolGrid");
  const emptyState = document.getElementById("emptyState");
  const resetBtn = document.getElementById("resetFilters");

  const searchEl = document.getElementById("search");
  const statusFilterEl = document.getElementById("statusFilter");
  const toggleThemeBtn = document.getElementById("toggleTheme");

  // --- Configurable tool catalog ---
  // status: live | beta | wip | planned
  // href: set to "#" until the tool exists; later replace with "calculator/" etc.
  const tools = [
    {
      title: "Heroes Roster",
      status: "live",
      desc: "Enter and save your heroes once. Other tools will reuse this roster for calculations and optimization.",
      tags: ["heroes", "profile", "saved data"],
      href: "heroes/",
      cta: "Open",
      disabled: false,
    },
    {
      title: "Bear Event Optimizer",
      status: "live",
      desc: "Optimize Bear rally and join rally troop splits with archer-first, capacity-aware planning.",
      tags: ["bear", "rally", "optimizer"],
      href: "bear-event-optimizer/",
      cta: "Open",
      disabled: false,
    },


    {
      title: "Upgrade Cost Calculator",
      status: "planned",
      desc: "Estimate upgrade requirements and compare paths by cost and efficiency. Designed to be transparent and auditable.",
      tags: ["upgrades", "cost", "planning"],
      href: "#",
      cta: "Coming soon",
      disabled: true,
    },
    {
      title: "Event Timing Planner",
      status: "planned",
      desc: "Plan resource spending around event windows. Model tradeoffs between short-term points and long-term growth.",
      tags: ["events", "timing", "strategy"],
      href: "#",
      cta: "Coming soon",
      disabled: true,
    },
    {
      title: "Resource Conversion Helper",
      status: "planned",
      desc: "Convert between resource types and quantify opportunity costs. Good for evaluating bundles and resource decisions.",
      tags: ["resources", "efficiency"],
      href: "#",
      cta: "Coming soon",
      disabled: true,
    },
    {
      title: "Rally / Formation Optimizer",
      status: "planned",
      desc: "Explore formation choices and expected outcomes under constraints. Start simple; add depth once validated.",
      tags: ["combat", "rally", "formation"],
      href: "#",
      cta: "Coming soon",
      disabled: true,
    },
    {
      title: "Daily Checklist Builder",
      status: "wip",
      desc: "A lightweight routine builder to reduce missed value. The goal is consistency without overwhelm.",
      tags: ["daily", "routine", "QoL"],
      href: "#",
      cta: "In progress",
      disabled: true,
    },
    {
      title: "Data Notes / Methodology",
      status: "beta",
      desc: "Explain assumptions, data sourcing, and validation approach. This will evolve alongside the tool suite.",
      tags: ["methodology", "transparency"],
      href: "#",
      cta: "Preview",
      disabled: true,
    },
  ];

  // --- Helpers ---
  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function statusLabel(status) {
    switch (status) {
      case "live": return "Live";
      case "beta": return "Beta";
      case "wip": return "In progress";
      case "planned": return "Planned";
      default: return status;
    }
  }

  function matchesSearch(tool, q) {
    if (!q) return true;
    const haystack = [
      tool.title,
      tool.desc,
      ...(tool.tags || []),
      tool.status
    ].join(" ").toLowerCase();
    return haystack.includes(q.toLowerCase());
  }

  function matchesStatus(tool, status) {
    if (!status || status === "all") return true;
    return tool.status === status;
  }

  function renderTools(list) {
    if (!toolGrid) return;

    toolGrid.innerHTML = list.map((t) => {
      const title = escapeHtml(t.title);
      const desc = escapeHtml(t.desc);
      const tags = (t.tags || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("");
      const stat = escapeHtml(t.status);
      const statText = escapeHtml(statusLabel(t.status));
      const cta = escapeHtml(t.cta || "Open");

      const href = t.href || "#";
      const disabled = Boolean(t.disabled);
      const action = disabled
        ? `<span class="btn ghost" aria-disabled="true">${cta}</span>`
        : `<a class="btn primary" href="${escapeHtml(href)}">${cta}</a>`;

      return `
        <article class="tool-card">
          <div class="tool-top">
            <h3 class="tool-title">${title}</h3>
            <span class="status ${stat}">${statText}</span>
          </div>
          <p class="tool-desc">${desc}</p>
          <div class="tag-row" aria-label="Tags">${tags}</div>
          <div class="tool-actions">
            ${action}
          </div>
        </article>
      `;
    }).join("");

    const hasAny = list.length > 0;
    if (emptyState) emptyState.hidden = hasAny;
  }

  function applyFilters() {
    const q = (searchEl?.value || "").trim();
    const status = statusFilterEl?.value || "all";

    const filtered = tools
      .filter((t) => matchesSearch(t, q))
      .filter((t) => matchesStatus(t, status));

    renderTools(filtered);
  }

  // --- Theme persistence ---
  const storageKey = "kingshot-theme";
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

  // --- Status / footer ---
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  if (siteStatusEl) siteStatusEl.textContent = "Live";
  if (buildBadge) buildBadge.textContent = "Static site";

  if (statusEl) {
    const now = new Date();
    statusEl.textContent = `Last loaded: ${now.toLocaleString()}. Tools list: ${tools.length}.`;
  }

  // --- Wire controls ---
  if (searchEl) searchEl.addEventListener("input", applyFilters);
  if (statusFilterEl) statusFilterEl.addEventListener("change", applyFilters);

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (searchEl) searchEl.value = "";
      if (statusFilterEl) statusFilterEl.value = "all";
      applyFilters();
    });
  }

  // Initial render
  applyFilters();
})();
