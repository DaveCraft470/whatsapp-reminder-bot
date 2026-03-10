document.addEventListener("DOMContentLoaded", async () => {
  // Theme
  const themeBtn = document.getElementById("themeToggle");
  let isLight = localStorage.getItem("theme") === "light";

  function applyTheme() {
    document.body.classList.toggle("light", isLight);
    themeBtn.textContent = isLight ? "Dark" : "Light";

    if (window.dashboardChart) {
      const textColor = getComputedStyle(document.body).getPropertyValue("--text-2").trim();
      const gridColor = getComputedStyle(document.body).getPropertyValue("--border").trim();
      window.dashboardChart.options.scales.x.ticks.color = textColor;
      window.dashboardChart.options.scales.y.ticks.color = textColor;
      window.dashboardChart.options.scales.y.grid.color = gridColor;
      window.dashboardChart.update();
    }
  }

  themeBtn.addEventListener("click", () => {
    isLight = !isLight;
    localStorage.setItem("theme", isLight ? "light" : "dark");
    applyTheme();
  });

  applyTheme();

  // Animate a number counting up from 0
  function animateCount(el, target, duration = 900) {
    const start = performance.now();
    const update = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(eased * target);
      if (progress < 1) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  }

  // Animate a progress bar filling to a percentage
  function animateBar(el, pct, delay = 0) {
    setTimeout(() => {
      el.style.width = `${Math.min(pct, 100)}%`;
    }, delay);
  }

  try {
    const response = await fetch("/api/status");
    const data = await response.json();
    if (!data.success) throw new Error("API returned failure");

    const { stats, limits, uptime, jobs, version } = data;
    const hasErrors = stats.errorsToday > 0;

    // Version
    document.getElementById("versionBadge").textContent = `v${version}`;

    // Status badge
    const badge = document.getElementById("systemBadge");
    const statusDot = document.getElementById("statusDot");
    const statusText = document.getElementById("statusText");
    badge.className = `status-badge ${hasErrors ? "error" : "ok"}`;
    statusDot.className = `status-dot ${hasErrors ? "" : "pulse"}`;
    statusText.textContent = hasErrors ? "Degraded" : "Operational";

    // Uptime text
    document.getElementById("uptimeText").textContent =
      `Uptime: ${uptime.days}d ${uptime.hours}h ${uptime.minutes}m ${uptime.seconds}s`;

    // Sync time
    document.getElementById("syncTime").textContent =
      `Synced: ${new Date().toLocaleTimeString()}`;

    // AI status label
    const aiStatusEl = document.getElementById("aiStatusText");
    aiStatusEl.textContent = hasErrors ? "Degraded" : "Online";
    aiStatusEl.style.color = hasErrors ? "var(--rose)" : "var(--green)";

    // Uptime blocks (90-day history)
    const vizContainer = document.getElementById("uptimeViz");
    const emptyCount = 90 - stats.daysTracked;

    for (let i = 0; i < emptyCount; i++) {
      const block = document.createElement("div");
      block.className = "uptime-block empty";
      block.title = "No data recorded";
      vizContainer.appendChild(block);
    }

    stats.historyRaw.forEach((day) => {
      const block = document.createElement("div");
      block.className = `uptime-block ${day.error_count > 0 ? "error" : "ok"}`;
      const date = new Date(day.usage_date).toLocaleDateString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
      });
      block.title = `${date} — Errors: ${day.error_count}`;
      vizContainer.appendChild(block);
    });

    // Metric limits
    document.getElementById("geminiLimit").textContent = limits.gemini;
    document.getElementById("groqLimit").textContent   = limits.groq;
    document.getElementById("orLimit").textContent     = limits.openrouter;
    document.getElementById("tavilyLimit").textContent = limits.tavily;
    document.getElementById("serperLimit").textContent = limits.serper;

    // Animated counters
    animateCount(document.getElementById("geminiCount"), stats.gemini);
    animateCount(document.getElementById("groqCount"),   stats.groq);
    animateCount(document.getElementById("orCount"),     stats.openrouter);
    animateCount(document.getElementById("tavilyCount"), stats.tavily);
    animateCount(document.getElementById("serperCount"), stats.serper);

    // Animated progress bars
    animateBar(document.getElementById("geminiBar"), (stats.gemini / limits.gemini) * 100, 100);
    animateBar(document.getElementById("groqBar"),   (stats.groq   / limits.groq)   * 100, 200);
    animateBar(document.getElementById("orBar"),     (stats.openrouter / limits.openrouter) * 100, 300);
    animateBar(document.getElementById("tavilyBar"), (stats.tavily / limits.tavily) * 100, 400);
    animateBar(document.getElementById("serperBar"), (stats.serper / limits.serper) * 100, 500);

    // Chart
    const ctx = document.getElementById("usageChart").getContext("2d");
    const textColor = getComputedStyle(document.body).getPropertyValue("--text-2").trim();
    const gridColor = getComputedStyle(document.body).getPropertyValue("--border").trim();

    window.dashboardChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: stats.historyLabels,
        datasets: [
          {
            label: "Requests",
            data: stats.historyData,
            borderColor: "#3b82f6",
            backgroundColor: "rgba(59, 130, 246, 0.06)",
            fill: true,
            tension: 0.35,
            pointRadius: 3,
            pointBackgroundColor: "#3b82f6",
            borderWidth: 1.5,
          },
          {
            label: "Failures",
            data: stats.errorData,
            borderColor: "#f43f5e",
            borderDash: [4, 4],
            tension: 0.2,
            pointRadius: 2,
            borderWidth: 1,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        animation: { duration: 600, easing: "easeOutQuart" },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "rgba(13, 17, 23, 0.92)",
            titleFont: { family: "IBM Plex Mono", size: 11 },
            bodyFont: { family: "IBM Plex Mono", size: 11 },
            borderColor: "#1e2a38",
            borderWidth: 1,
            padding: 10,
            callbacks: {
              title: (ctx) =>
                new Date(ctx[0].label).toLocaleDateString("en-US", {
                  weekday: "long", month: "long", day: "numeric",
                }),
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: gridColor, lineWidth: 0.5 },
            ticks: { color: textColor, font: { family: "IBM Plex Mono", size: 10 }, stepSize: 5 },
          },
          x: {
            grid: { display: false },
            ticks: {
              color: textColor,
              font: { family: "IBM Plex Mono", size: 10 },
              callback: (_, i) =>
                new Date(stats.historyLabels[i]).toLocaleDateString("en-US", { weekday: "short" }),
            },
          },
        },
      },
    });

    // Jobs table
    const tbody = document.getElementById("jobsTableBody");
    tbody.innerHTML = "";

    if (jobs && jobs.length > 0) {
      jobs.forEach((job) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td class="job-name">${job.name}</td>
          <td class="job-schedule">${job.schedule}</td>
          <td class="job-desc">${job.description}</td>
          <td><span class="job-status ${job.status}">${job.status}</span></td>
        `;
        tbody.appendChild(tr);
      });
    } else {
      tbody.innerHTML = `<tr><td colspan="4" class="loading-cell">No processes registered.</td></tr>`;
    }

    // Reveal page
    document.body.classList.add("loaded");

  } catch (err) {
    console.error("[dashboard] Initialisation failed:", err);
    const badge = document.getElementById("systemBadge");
    badge.className = "status-badge error";
    document.getElementById("statusText").textContent = "Error";
    document.body.classList.add("loaded");
  }
});