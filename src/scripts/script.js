(function () {
  const profiles = new Map(); // id -> { bitrate, name }

  const $ = (sel) => document.querySelector(sel);
  
  // Elements
  const hoursEl = $("#hours");
  const minutesEl = $("#minutes");
  const secondsEl = $("#seconds");
  const baselineBitrateEl = $("#baselineBitrate");
  const costPerTBEl = $("#costPerTB");
  const availableStorageEl = $("#availableStorage");
  const audioBitrateEl = $("#audioBitrate");
  const customSpeedEl = $("#customSpeed");
  
  const container = $("#profilesContainer");
  const barChart = $("#barChart");
  const uploadTable = $("#uploadTable");
  const profileCountEl = $("#profileCount");
  const totalDurationEl = $("#totalDuration");
  const customSpeedHeader = $("#customSpeedHeader");
  
  const reverseModeToggle = $("#reverseMode");
  const targetSizeEl = $("#targetSize");
  const targetSizeUnitEl = $("#targetSizeUnit");
  
  const resolutionEl = $("#resolution");
  const fpsEl = $("#fps");
  const complexityEl = $("#complexity");
  const applySuggestionBtn = $("#applySuggestionBtn");
  const suggestionTextEl = $("#suggestionText");
  
  const themeToggle = $("#themeToggle");
  const shareConfigBtn = $("#shareConfig");
  const exportBtn = $("#exportBtn");
  const toastEl = $("#toast");

  // ===== Theme =====
  function applyTheme(theme) {
    if (theme === "light") {
      document.body.classList.add("light-theme");
      document.body.classList.remove("dark-theme");
      $("#iconSun").style.display = "none";
      $("#iconMoon").style.display = "block";
    } else {
      document.body.classList.remove("light-theme");
      document.body.classList.add("dark-theme");
      $("#iconSun").style.display = "block";
      $("#iconMoon").style.display = "none";
    }
    localStorage.setItem("vbc-theme", theme);
  }

  themeToggle.addEventListener("click", () => {
    const current = document.body.classList.contains("light-theme") ? "light" : "dark";
    applyTheme(current === "light" ? "dark" : "light");
  });

  applyTheme(localStorage.getItem("vbc-theme") || (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"));

  // ===== Helpers =====
  function getNextProfileNumber() {
    const usedNumbers = new Set();
    profiles.forEach((p) => {
      const match = p.name.match(/^Profile #(\d+)$/);
      if (match) usedNumbers.add(parseInt(match[1]));
    });
    let n = 1;
    while (usedNumbers.has(n)) n++;
    return n;
  }

  function getNextId() {
    let id = 1;
    while (profiles.has(id)) id++;
    return id;
  }

  function getTotalSeconds() {
    const h = Math.max(0, parseInt(hoursEl.value) || 0);
    const m = Math.max(0, parseInt(minutesEl.value) || 0);
    const s = Math.max(0, parseInt(secondsEl.value) || 0);
    return h * 3600 + m * 60 + s;
  }

  function fileSizeGB(bitrateMbps, seconds, audioKbps = 0) {
    const totalBitrateMbps = bitrateMbps + audioKbps / 1000;
    return (totalBitrateMbps * 1e6 * seconds) / (8 * 1e9);
  }

  function formatSize(gb) {
    if (gb >= 1000) return (gb / 1000).toFixed(2) + " TB";
    if (gb >= 1) return gb.toFixed(2) + " GB";
    return (gb * 1000).toFixed(1) + " MB";
  }

  function formatDuration(totalSec) {
    if (totalSec < 1) return "<1s";
    const d = Math.floor(totalSec / 86400);
    const h = Math.floor((totalSec % 86400) / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = Math.floor(totalSec % 60);
    let parts = [];
    if (d > 0) parts.push(d + "d");
    if (h > 0) parts.push(h + "h");
    if (m > 0) parts.push(m + "m");
    if (s > 0 || parts.length === 0) parts.push(s + "s");
    return parts.join(" ");
  }

  function formatDurationShort(totalSec) {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = Math.floor(totalSec % 60);
    let parts = [];
    if (h > 0) parts.push(h + "h");
    if (m > 0) parts.push(m + "m");
    if (s > 0 && h === 0) parts.push(s + "s");
    return parts.join(" ") || "0s";
  }

  function uploadSeconds(sizeGB, speedMbps) {
    return (sizeGB * 8 * 1e9) / (speedMbps * 1e6);
  }

  // Bitrate Recommendations Logic
  const recommendationMatrix = {
    "1080p": { "30": { low: 5, med: 8, high: 12 }, "60": { low: 8, med: 12, high: 18 } },
    "4K": { "30": { low: 20, med: 35, high: 50 }, "60": { low: 35, med: 50, high: 80 } },
    "720p": { "30": { low: 3, med: 5, high: 8 }, "60": { low: 5, med: 8, high: 12 } },
  };

  function getRecommendedBitrate() {
    const res = resolutionEl.value;
    const fps = fpsEl.value;
    const comp = complexityEl.value;
    if (recommendationMatrix[res] && recommendationMatrix[res][fps]) {
      return recommendationMatrix[res][fps][comp];
    }
    return null;
  }

  function updateSuggestion() {
    const rec = getRecommendedBitrate();
    if (rec) {
      suggestionTextEl.textContent = `Suggested for ${resolutionEl.value} ${fpsEl.value}fps: ~${rec} Mbps`;
      applySuggestionBtn.classList.remove("hidden");
    } else {
      suggestionTextEl.textContent = "Adjust settings for a recommendation";
      applySuggestionBtn.classList.add("hidden");
    }
  }

  // Listen for changes on all suggestion inputs
  [resolutionEl, fpsEl, complexityEl].forEach(el => {
    el.addEventListener("change", (e) => {
      updateSuggestion();
    });
  });
  
  // Initial update
  setTimeout(updateSuggestion, 500); // Give time for MWC hydration
  
  applySuggestionBtn.addEventListener("click", () => {
    const rec = getRecommendedBitrate();
    if (rec && !reverseModeToggle.selected) {
      // Deselect all platform presets
      presetChips.forEach(c => { c.selected = false; });
      
      baselineBitrateEl.value = rec;
      recalc();
      saveState();
    }
  });

  // Presets (Chips) - Enforce single-selection
  const presetChips = document.querySelectorAll("md-filter-chip");
  presetChips.forEach(chip => {
    chip.addEventListener("click", () => {
      if (!reverseModeToggle.selected) {
        // Deselect others
        presetChips.forEach(c => { if (c !== chip) c.selected = false; });
        
        // If the chip was just selected, apply the values
        if (chip.selected) {
          baselineBitrateEl.value = chip.dataset.bitrate;
          audioBitrateEl.value = chip.dataset.audio;
          recalc();
          saveState();
        }
      } else {
        // Prevent selection in reverse mode
        chip.selected = false;
      }
    });
  });

  // ===== Profiles =====
  function createProfileCard(id, bitrate, name) {
    profiles.set(id, { bitrate, name });

    const card = document.createElement("div");
    card.className = "md3-card profile-card";
    card.dataset.id = id;
    card.innerHTML = `
      <button class="remove-btn" aria-label="Remove profile" title="Remove">
        <span class="material-symbols-outlined">close</span>
      </button>
      <input type="text" class="profile-name-input mb-6" value="${name}" aria-label="Profile name">
      <div class="space-y-6">
        <md-outlined-text-field class="profile-bitrate w-full" label="Bitrate (Mbps)" type="number" value="${bitrate}" min="1"></md-outlined-text-field>
        
        <div class="bg-[var(--md-sys-color-surface-container-low)] p-4 rounded-2xl">
          <div class="text-[10px] uppercase opacity-60 tracking-wider font-bold mb-1">Estimated size</div>
          <div class="text-2xl font-bold profile-size">--</div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="p-3 rounded-xl bg-[var(--md-sys-color-surface-container-highest)]">
             <div class="text-[10px] uppercase opacity-40 font-bold mb-1">vs Baseline</div>
             <div class="text-sm font-bold profile-diff">--</div>
          </div>
          <div class="p-3 rounded-xl bg-[var(--md-sys-color-surface-container-highest)]">
             <div class="text-[10px] uppercase opacity-40 font-bold mb-1">Storage Cost</div>
             <div class="text-sm font-bold profile-cost">--</div>
          </div>
        </div>
      </div>
    `;

    card.querySelector(".remove-btn").addEventListener("click", () => {
      profiles.delete(id);
      card.remove();
      recalc();
      saveState();
    });

    card.querySelector(".profile-bitrate").addEventListener("input", (e) => {
      profiles.get(id).bitrate = Math.max(1, parseFloat(e.target.value) || 1);
      recalc();
      saveState();
    });

    card.querySelector(".profile-name-input").addEventListener("input", (e) => {
      profiles.get(id).name = e.target.value || "Profile #" + id;
      recalc();
      saveState();
    });

    container.appendChild(card);
  }

  function addProfile(defaultBitrate, defaultName) {
    const id = getNextId();
    const bitrate = defaultBitrate || 50;
    const name = defaultName || "Profile #" + getNextProfileNumber();
    createProfileCard(id, bitrate, name);
    recalc();
    saveState();
  }

  // ===== Recalc =====
  function recalc() {
    const seconds = getTotalSeconds();
    const baselineBitrate = Math.max(1, parseFloat(baselineBitrateEl.value) || 100);
    const costPerTB = Math.max(0, parseFloat(costPerTBEl.value) || 20);
    const audioKbps = Math.max(0, parseFloat(audioBitrateEl.value) || 0);
    const storageGB = Math.max(0, parseFloat(availableStorageEl.value) || 0);
    const customSpeed = Math.max(1, parseFloat(customSpeedEl.value) || 50);
    const isReverse = reverseModeToggle.selected;
    
    let targetSizeGB = Math.max(0, parseFloat(targetSizeEl.value) || 0);
    if (targetSizeUnitEl.value === "MB") targetSizeGB /= 1000;
    if (targetSizeUnitEl.value === "TB") targetSizeGB *= 1000;

    totalDurationEl.textContent = formatDurationShort(seconds);
    customSpeedHeader.textContent = "@ " + customSpeed + " Mbps";
    profileCountEl.textContent = profiles.size;

    // Visibility toggles
    document.querySelector(".bitrate-only").classList.toggle('hidden', isReverse);
    document.querySelector(".reverse-only").classList.toggle('hidden', !isReverse);

    const effectiveBaselineBitrate = isReverse && seconds > 0 
      ? Math.max(0, (targetSizeGB * 8 * 1e9) / (seconds * 1e6) - (audioKbps / 1000))
      : baselineBitrate;

    if (isReverse) {
      $("#calculatedReverseBitrate").textContent = effectiveBaselineBitrate > 0 ? effectiveBaselineBitrate.toFixed(2) + " Mbps" : "N/A";
    }

    const baselineSize = fileSizeGB(effectiveBaselineBitrate, seconds, audioKbps);
    const entries = [{ 
      label: "Baseline (" + effectiveBaselineBitrate.toFixed(1) + " Mbps)", 
      size: baselineSize, 
      isBaseline: true, 
      bitrate: effectiveBaselineBitrate 
    }];

    container.querySelectorAll(".profile-card").forEach((card) => {
      const id = parseInt(card.dataset.id);
      const p = profiles.get(id);
      if (!p) return;

      const profBitrate = isReverse ? effectiveBaselineBitrate : p.bitrate;
      const size = fileSizeGB(profBitrate, seconds, audioKbps);
      const cost = (size / 1000) * costPerTB;
      const diffPercent = baselineSize > 0 ? ((size - baselineSize) / baselineSize) * 100 : 0;
      const diffSign = diffPercent >= 0 ? "+" : "";

      card.querySelector(".profile-size").textContent = formatSize(size);
      card.querySelector(".profile-diff").textContent = diffSign + diffPercent.toFixed(1) + "%";
      card.querySelector(".profile-diff").style.color = diffPercent <= 0 ? "var(--md-sys-color-primary)" : "var(--md-sys-color-error)";
      card.querySelector(".profile-cost").textContent = "$" + cost.toFixed(2);
      
      const bInput = card.querySelector(".profile-bitrate");
      bInput.value = profBitrate.toFixed(1);
      bInput.disabled = isReverse;
      bInput.style.opacity = isReverse ? "0.6" : "1";

      entries.push({ label: p.name + " (" + profBitrate.toFixed(1) + " Mbps)", size, isBaseline: false, bitrate: profBitrate });
    });

    // Bar chart
    const maxSize = Math.max(...entries.map((e) => e.size), 0.001);
    barChart.innerHTML = entries
      .map((e) => {
        const pct = Math.max(1, (e.size / maxSize) * 100);
        const cls = e.isBaseline ? "baseline" : "profile";
        return `<div class="bar-row"><div class="bar-label">${e.label}</div><div class="bar-track"><div class="bar-fill ${cls}" style="width: ${pct}%">${formatSize(e.size)}</div></div></div>`;
      })
      .join("");

    // Upload table
    const speeds = [20, 100, 1000, 10000, customSpeed];
    uploadTable.innerHTML = entries
      .map((e) => {
        const cells = speeds.map((sp) => "<td>" + formatDuration(uploadSeconds(e.size, sp)) + "</td>").join("");
        return "<tr><td class='font-bold'>" + e.label + "</td><td>" + formatSize(e.size) + "</td>" + cells + "</tr>";
      })
      .join("");

    // Capacity
    $("#capacityResults").innerHTML = entries
      .map((e) => {
        const recSec = e.bitrate > 0 ? (storageGB * 8 * 1e9) / ((e.bitrate + audioKbps/1000) * 1e6) : 0;
        return `<div class="capacity-row"><span class="cap-label">${e.label}</span><span class="cap-value">${formatDuration(recSec)}</span></div>`;
      })
      .join("");
  }

  // ===== Persistence =====
  function saveState() {
    const state = {
      hours: hoursEl.value,
      minutes: minutesEl.value,
      seconds: secondsEl.value,
      baselineBitrate: baselineBitrateEl.value,
      costPerTB: costPerTBEl.value,
      availableStorage: availableStorageEl.value,
      customSpeed: customSpeedEl.value,
      profiles: Array.from(profiles.entries()).map(([id, p]) => ({ id, bitrate: p.bitrate, name: p.name })),
    };
    localStorage.setItem("vbc-state", JSON.stringify(state));
    return state;
  }

  function getStateString() {
    const s = saveState();
    const parts = ["v2", s.hours, s.minutes, s.seconds, s.baselineBitrate, s.costPerTB, s.availableStorage, s.customSpeed];
    s.profiles.forEach((p) => {
      const name = encodeURIComponent(p.name).replace(/\|/g, "%7C").replace(/,/g, "%2C");
      parts.push(`${p.id},${p.bitrate},${name}`);
    });
    return btoa(unescape(encodeURIComponent(parts.join("|"))));
  }

  function applyState(state) {
    if (!state) return;
    hoursEl.value = state.hours ?? 0;
    minutesEl.value = state.minutes ?? 10;
    secondsEl.value = state.seconds ?? 0;
    baselineBitrateEl.value = state.baselineBitrate ?? 100;
    costPerTBEl.value = state.costPerTB ?? 20;
    availableStorageEl.value = state.availableStorage ?? 500;
    customSpeedEl.value = state.customSpeed ?? 50;

    container.innerHTML = "";
    profiles.clear();

    if (state.profiles && state.profiles.length > 0) {
      state.profiles.forEach((p) => createProfileCard(p.id, p.bitrate, p.name));
    } else {
      addProfile(50);
    }
    recalc();
  }

  function loadFromUrl() {
    const sharedState = new URLSearchParams(window.location.search).get("s");
    if (sharedState) {
      try {
        const decoded = decodeURIComponent(escape(atob(sharedState)));
        if (decoded.startsWith("v2|")) {
          const p = decoded.split("|");
          applyState({
            hours: p[1], minutes: p[2], seconds: p[3], baselineBitrate: p[4],
            costPerTB: p[5], availableStorage: p[6], customSpeed: p[7],
            profiles: p.slice(8).map((profStr) => {
              const [id, bitrate, name] = profStr.split(",");
              return { id: parseInt(id), bitrate: parseFloat(bitrate), name: decodeURIComponent(name) };
            }),
          });
          return true;
        }
      } catch (e) {}
    }
    return false;
  }

  function showToast() {
    toastEl.classList.add("show");
    setTimeout(() => toastEl.classList.remove("show"), 3000);
  }

  // ===== Events =====
  const inputs = [hoursEl, minutesEl, secondsEl, baselineBitrateEl, costPerTBEl, availableStorageEl, customSpeedEl, audioBitrateEl, targetSizeEl, targetSizeUnitEl];
  inputs.forEach(el => el.addEventListener("input", () => { recalc(); saveState(); }));

  reverseModeToggle.addEventListener("change", () => { recalc(); saveState(); });
  $("#addProfile").addEventListener("click", () => addProfile());

  shareConfigBtn.addEventListener("click", () => {
    const url = new URL(window.location.href);
    url.searchParams.set("s", getStateString());
    window.history.replaceState({}, "", url);
    navigator.clipboard.writeText(url.href).then(showToast);
  });

  exportBtn.addEventListener("click", () => {
    const s = saveState();
    const seconds = getTotalSeconds();
    const audio = parseFloat(audioBitrateEl.value) || 0;
    let csv = "Profile,Bitrate (Mbps),Audio (Kbps),File Size (GB),Cost ($)\n";
    const baseSize = fileSizeGB(parseFloat(s.baselineBitrate), seconds, audio);
    csv += `Baseline,${s.baselineBitrate},${audio},${baseSize.toFixed(3)},${((baseSize/1000)*(s.costPerTB||0)).toFixed(2)}\n`;
    s.profiles.forEach(p => {
      const size = fileSizeGB(parseFloat(p.bitrate), seconds, audio);
      csv += `${p.name},${p.bitrate},${audio},${size.toFixed(3)},${((size/1000)*(s.costPerTB||0)).toFixed(2)}\n`;
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bitrate-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // ===== Init =====
  const raw = localStorage.getItem("vbc-state");
  if (!loadFromUrl() && raw) {
    try { applyState(JSON.parse(raw)); } catch(e) {}
  } else if (profiles.size === 0) {
    addProfile(50);
  }
  
  recalc();
  updateSuggestion();
})();
