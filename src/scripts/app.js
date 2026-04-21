import { cameras } from '../data/cameras.js';

(function () {
  const $ = (sel) => document.querySelector(sel);
  const profiles = new Map();
  let profileIdCounter = 0;
  let toastTimeoutId = null;

  const chartColors = [
    '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6',
    '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16',
  ];
  const uploadSpeeds = [
    { label: '20M', speed: 20 },
    { label: '100M', speed: 100 },
    { label: '1G', speed: 1000 },
    { label: '10G', speed: 10000 },
  ];

  const refs = {
    hoursEl: $('#hours'),
    minutesEl: $('#minutes'),
    secondsEl: $('#seconds'),
    costPerTBEl: $('#costPerTB'),
    availableStorageEl: $('#availableStorage'),
    customSpeedEl: $('#customSpeed'),
    totalDurationEl: $('#totalDuration'),
    profileCountEl: $('#profileCount'),
    customSpeedHeader: $('#customSpeedHeader'),
    container: $('#profilesContainer'),
    profilesEmptyEl: $('#profilesEmpty'),
    barChart: $('#barChart'),
    uploadTable: $('#uploadTable'),
    themeToggle: $('#themeToggle'),
    shareConfigBtn: $('#shareConfig'),
    toastEl: $('#toast'),
    cameraSelect: $('#cameraSelect'),
    codecSelect: $('#codecSelect'),
    addCameraBtn: $('#addCameraProfile'),
    modeCameraBtn: $('#modeCameraBtn'),
    modeManualBtn: $('#modeManualBtn'),
    cameraMode: $('#cameraMode'),
    manualMode: $('#manualMode'),
    manualNameEl: $('#manualName'),
    manualBitrateEl: $('#manualBitrate'),
    manualValidationEl: $('#manualValidation'),
    addManualBtn: $('#addManualProfile'),
    clearAllBtn: $('#clearAll'),
    comparisonSection: $('#comparisonSection'),
    chartSection: $('#chartSection'),
    uploadSection: $('#uploadSection'),
    yieldSection: $('#yieldSection'),
    yieldStorageLabel: $('#yieldStorageLabel'),
    capacityResults: $('#capacityResults'),
    chipButtons: Array.from(document.querySelectorAll('[data-bitrate-chip]')),
    starterButtons: Array.from(document.querySelectorAll('[data-starter-bitrate]')),
    durationPresetButtons: Array.from(document.querySelectorAll('[data-duration-preset]')),
    addStarterSetBtn: $('#addStarterSet'),
  };

  const required = [
    'hoursEl', 'minutesEl', 'secondsEl', 'costPerTBEl', 'availableStorageEl',
    'customSpeedEl', 'totalDurationEl', 'profileCountEl', 'customSpeedHeader',
    'container', 'profilesEmptyEl', 'barChart', 'uploadTable', 'themeToggle',
    'shareConfigBtn', 'toastEl', 'cameraSelect', 'codecSelect', 'addCameraBtn',
    'modeCameraBtn', 'modeManualBtn', 'cameraMode', 'manualMode', 'manualNameEl',
    'manualBitrateEl', 'manualValidationEl', 'addManualBtn', 'clearAllBtn', 'comparisonSection',
    'chartSection', 'uploadSection', 'yieldSection', 'yieldStorageLabel',
    'capacityResults',
  ];

  const missing = required.filter((key) => !refs[key]);
  if (missing.length > 0) {
    console.warn('Bitrate Compare init aborted. Missing elements:', missing.join(', '));
    return;
  }

  const {
    hoursEl,
    minutesEl,
    secondsEl,
    costPerTBEl,
    availableStorageEl,
    customSpeedEl,
    totalDurationEl,
    profileCountEl,
    customSpeedHeader,
    container,
    profilesEmptyEl,
    barChart,
    uploadTable,
    themeToggle,
    shareConfigBtn,
    toastEl,
    cameraSelect,
    codecSelect,
    addCameraBtn,
    modeCameraBtn,
    modeManualBtn,
    cameraMode,
    manualMode,
    manualNameEl,
    manualBitrateEl,
    manualValidationEl,
    addManualBtn,
    clearAllBtn,
    comparisonSection,
    chartSection,
    uploadSection,
    yieldSection,
    yieldStorageLabel,
    capacityResults,
    chipButtons,
    starterButtons,
    durationPresetButtons,
    addStarterSetBtn,
  } = refs;

  function getVisibilityTarget(el) {
    if (el?.matches?.('select') && el.parentElement?.dataset.selectWrap !== undefined) {
      return el.parentElement;
    }
    return el;
  }

  function show(el, displayClass = 'block') {
    const target = getVisibilityTarget(el);
    if (!target) return;
    target.classList.remove('hidden');
    if (displayClass) target.classList.add(displayClass);
  }

  function hide(el, displayClass = 'block') {
    const target = getVisibilityTarget(el);
    if (!target) return;
    if (displayClass) target.classList.remove(displayClass);
    target.classList.add('hidden');
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
  }

  function readBitrate(value, fallback = 100) {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  function setMessage(el, message, type = 'info') {
    if (!el) return;
    el.textContent = message;
    el.dataset.state = message ? type : '';
  }

  function setInputInvalid(el, invalid) {
    if (!el) return;
    el.setAttribute('aria-invalid', invalid ? 'true' : 'false');
  }

  function getUploadHeatClass(uploadTimeSeconds) {
    if (!Number.isFinite(uploadTimeSeconds) || uploadTimeSeconds <= 0) return 'upload-heatmap-cell--idle';
    if (uploadTimeSeconds <= 60) return 'upload-heatmap-cell--fast';
    if (uploadTimeSeconds <= 15 * 60) return 'upload-heatmap-cell--mid';
    if (uploadTimeSeconds <= 60 * 60) return 'upload-heatmap-cell--slow';
    return 'upload-heatmap-cell--very-slow';
  }

  function clampWholeNumberInput(el) {
    if (!el) return 0;
    const nextValue = Math.max(0, parseInt(el.value, 10) || 0);
    el.value = String(nextValue);
    return nextValue;
  }

  function sanitizeDecimalInput(el, fallback, min = 0) {
    if (!el) return fallback;
    const parsed = parseFloat(el.value);
    const nextValue = Number.isFinite(parsed) ? Math.max(min, parsed) : fallback;
    el.value = String(nextValue);
    return nextValue;
  }

  function getSafeProfileName(name, fallback) {
    const trimmed = (name || '').trim();
    return trimmed || fallback;
  }

  function validateManualProfile() {
    const rawName = manualNameEl.value.trim();
    const rawBitrate = parseFloat(manualBitrateEl.value);

    if (!Number.isFinite(rawBitrate) || rawBitrate <= 0) {
      setInputInvalid(manualBitrateEl, true);
      setMessage(manualValidationEl, 'Enter a bitrate greater than 0 Mbps before adding the profile.', 'error');
      return null;
    }

    setInputInvalid(manualBitrateEl, false);
    setMessage(
      manualValidationEl,
      rawName
        ? 'Ready to add. You can still rename and fine-tune it in the comparison table.'
        : 'Name is optional. A default label will be generated when you add the profile.',
      'success'
    );

    return {
      name: rawName || createDefaultProfileName(),
      bitrate: rawBitrate,
    };
  }

  function applyTheme(theme) {
    const iconSun = $('#iconSun');
    const iconMoon = $('#iconMoon');
    const root = document.documentElement;

    root.classList.toggle('light-theme', theme === 'light');

    if (iconSun) iconSun.classList.toggle('hidden', theme === 'light');
    if (iconMoon) iconMoon.classList.toggle('hidden', theme !== 'light');

    root.style.colorScheme = theme;
    localStorage.setItem('vbc-theme', theme);
  }

  function setMode(mode) {
    const isCamera = mode === 'camera';
    cameraMode.hidden = !isCamera;
    cameraMode.classList.toggle('hidden', !isCamera);
    modeCameraBtn.setAttribute('aria-selected', String(isCamera));
    modeManualBtn.setAttribute('aria-selected', String(!isCamera));
    if (!isCamera) {
      manualBitrateEl.focus();
      validateManualProfile();
    }
  }

  function getTotalSeconds() {
    const hours = Math.max(0, parseInt(hoursEl.value, 10) || 0);
    const minutes = Math.max(0, parseInt(minutesEl.value, 10) || 0);
    const seconds = Math.max(0, parseInt(secondsEl.value, 10) || 0);
    return hours * 3600 + minutes * 60 + seconds;
  }

  function syncDurationPresetButtons(totalSeconds = getTotalSeconds()) {
    durationPresetButtons.forEach((btn) => {
      const [hours, minutes, seconds] = (btn.dataset.durationPreset || '0,10,0')
        .split(',')
        .map((value) => Math.max(0, parseInt(value, 10) || 0));
      const isActive = hours * 3600 + minutes * 60 + seconds === totalSeconds;
      btn.setAttribute('aria-pressed', String(isActive));
    });
  }

  function fileSizeGB(bitrateMbps, seconds) {
    return (bitrateMbps * 1e6 * seconds) / (8 * 1e9);
  }

  function formatSize(gb) {
    if (gb >= 1000) return `${(gb / 1000).toFixed(2)} TB`;
    if (gb >= 1) return `${gb.toFixed(2)} GB`;
    return `${(gb * 1000).toFixed(1)} MB`;
  }

  function formatDuration(totalSec) {
    if (totalSec < 1) return '<1s';
    const d = Math.floor(totalSec / 86400);
    const h = Math.floor((totalSec % 86400) / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = Math.floor(totalSec % 60);
    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    if (s > 0 || parts.length === 0) parts.push(`${s}s`);
    return parts.join(' ');
  }

  function formatDurationShort(totalSec) {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = Math.floor(totalSec % 60);
    const parts = [];
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    if (s > 0 && h === 0) parts.push(`${s}s`);
    return parts.join(' ') || '0s';
  }

  function uploadSeconds(sizeGB, speedMbps) {
    return (sizeGB * 8 * 1e9) / (speedMbps * 1e6);
  }

  function updateChipState(activeBitrate) {
    chipButtons.forEach((btn) => {
      const isActive = parseFloat(btn.dataset.bitrateChip) === activeBitrate;
      btn.setAttribute('aria-pressed', String(isActive));
    });
  }

  function createDefaultProfileName() {
    return `Profile ${profiles.size + 1}`;
  }

  function createBitrateLabel(bitrate) {
    return `${bitrate} Mbps`;
  }

  function addStarterProfile(bitrate) {
    const safeBitrate = readBitrate(bitrate, 25);
    if (hasBitrate(safeBitrate)) return false;
    return addProfile(safeBitrate, createBitrateLabel(safeBitrate));
  }

  function createProfileRow(id) {
    const profile = profiles.get(id);
    if (!profile) return;

    const row = document.createElement('tr');
    row.dataset.id = String(id);
    row.className = 'transition hover:bg-white/[0.03] light:hover:bg-zinc-50';
    row.innerHTML = `
      <td class="profile-name-cell min-w-[240px] border-t border-white/10 py-3.5 pr-3 text-zinc-100 light:border-zinc-200 light:text-zinc-900">
        <div class="flex min-w-0 items-center gap-2.5">
          <span class="profile-dot size-2.5 shrink-0 rounded-full bg-(--profile-color)" style="--profile-color:${chartColors[(id - 1) % chartColors.length]}"></span>
          <input
            type="text"
            class="table-input profile-name-input w-full rounded-xl border border-transparent bg-white/[0.03] px-3 py-3 text-sm font-medium text-zinc-100 outline-none transition hover:border-white/10 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 aria-invalid:border-rose-400 aria-invalid:ring-2 aria-invalid:ring-rose-500/20 light:bg-zinc-100 light:text-zinc-900 light:hover:border-zinc-200"
            value="${escapeHtml(profile.name)}"
            name="profile-${id}-name"
            autocomplete="off"
            aria-label="Profile name"
          />
        </div>
      </td>
      <td class="border-t border-white/10 py-3.5 pr-3 text-zinc-400 tabular-nums light:border-zinc-200 light:text-zinc-600">
        <div class="flex items-center gap-2.5">
          <input
            type="number"
            class="table-input bitrate-input max-w-[126px] rounded-xl border border-transparent bg-white/[0.03] px-3 py-3 text-sm font-medium text-zinc-100 outline-none transition hover:border-white/10 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 aria-invalid:border-rose-400 aria-invalid:ring-2 aria-invalid:ring-rose-500/20 light:bg-zinc-100 light:text-zinc-900 light:hover:border-zinc-200"
            value="${profile.bitrate}"
            min="1"
            step="0.1"
            inputmode="decimal"
            name="profile-${id}-bitrate"
            aria-label="Bitrate in megabits per second"
          />
          <span class="text-[11px] font-semibold uppercase tracking-[0.04em] text-zinc-500 light:text-zinc-500">Mbps</span>
        </div>
      </td>
      <td class="profile-size border-t border-white/10 py-3.5 pr-3 font-semibold text-zinc-300 tabular-nums light:border-zinc-200 light:text-zinc-700">--</td>
      <td class="profile-diff border-t border-white/10 py-3.5 pr-3 font-semibold tabular-nums text-zinc-500 data-[trend=positive]:text-emerald-400 data-[trend=negative]:text-rose-400 light:border-zinc-200 light:text-zinc-500 light:data-[trend=positive]:text-emerald-600 light:data-[trend=negative]:text-rose-600">--</td>
      <td class="profile-cost border-t border-white/10 py-3.5 pr-3 font-semibold text-zinc-300 tabular-nums light:border-zinc-200 light:text-zinc-700">--</td>
      <td class="border-t border-white/10 py-3.5 pr-0 light:border-zinc-200">
        <button class="remove-btn inline-flex size-[46px] items-center justify-center rounded-[10px] border border-white/10 text-zinc-500 transition hover:border-rose-400/40 hover:bg-rose-500/8 hover:text-rose-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 light:border-zinc-200 light:hover:border-rose-200 light:hover:bg-rose-50 light:hover:text-rose-600" type="button" aria-label="Remove ${escapeHtml(profile.name)}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </td>
    `;

    const nameInput = row.querySelector('.profile-name-input');
    const bitrateInput = row.querySelector('.bitrate-input');
    const removeBtn = row.querySelector('.remove-btn');
    const sizeCell = row.querySelector('.profile-size');
    const diffCell = row.querySelector('.profile-diff');
    const costCell = row.querySelector('.profile-cost');

    nameInput.addEventListener('input', (event) => {
      const nextValue = event.target.value.trimStart();
      profiles.get(id).name = nextValue || profile.name;
      recalc();
      saveState();
    });

    nameInput.addEventListener('blur', (event) => {
      const safeValue = getSafeProfileName(event.target.value, createDefaultProfileName());
      profiles.get(id).name = safeValue;
      event.target.value = safeValue;
      removeBtn.setAttribute('aria-label', `Remove ${safeValue}`);
      recalc();
      saveState();
    });

    bitrateInput.addEventListener('input', (event) => {
      const parsed = parseFloat(event.target.value);
      const invalid = !Number.isFinite(parsed) || parsed <= 0;
      const duplicate = !invalid && hasBitrateExcept(parsed, id);
      setInputInvalid(event.target, invalid || duplicate);
      if (!invalid && !duplicate) {
        profiles.get(id).bitrate = parsed;
      }
      recalc();
      saveState();
    });

    bitrateInput.addEventListener('blur', (event) => {
      const safeBitrate = readBitrate(event.target.value, 100);
      if (hasBitrateExcept(safeBitrate, id)) {
        event.target.value = String(profiles.get(id).bitrate);
        setInputInvalid(event.target, false);
        showToast(`${safeBitrate} Mbps already exists`);
      } else {
        profiles.get(id).bitrate = safeBitrate;
        event.target.value = String(safeBitrate);
        setInputInvalid(event.target, false);
      }
      recalc();
      saveState();
    });

    removeBtn.addEventListener('click', () => {
      profiles.delete(id);
      row.remove();
      updateVisibility();
      recalc();
      saveState();
    });

    container.appendChild(row);
    row._cells = { sizeCell, diffCell, costCell, removeBtn };
  }

  function hasBitrate(bitrate) {
    const target = readBitrate(bitrate);
    for (const profile of profiles.values()) {
      if (profile.bitrate === target) return true;
    }
    return false;
  }

  function hasBitrateExcept(bitrate, excludeId) {
    const target = readBitrate(bitrate);
    for (const [id, profile] of profiles.entries()) {
      if (id !== excludeId && profile.bitrate === target) return true;
    }
    return false;
  }

  function addProfile(bitrate, name, cameraId = null, codecIndex = null) {
    const safeBitrate = readBitrate(bitrate);
    if (hasBitrate(safeBitrate)) {
      showToast(`${safeBitrate} Mbps already exists`);
      return false;
    }
    const id = ++profileIdCounter;
    profiles.set(id, {
      bitrate: safeBitrate,
      name: name?.trim() || createDefaultProfileName(),
      cameraId,
      codecIndex,
    });
    createProfileRow(id);
    updateVisibility();
    recalc();
    saveState();
    return true;
  }

  function updateVisibility() {
    const hasProfiles = profiles.size > 0;
    [comparisonSection, chartSection, uploadSection, yieldSection].forEach((el) => {
      el.classList.toggle('hidden', !hasProfiles);
    });
    profilesEmptyEl.classList.toggle('hidden', hasProfiles);
    profileCountEl.textContent = String(profiles.size);
  }

  function recalc() {
    const seconds = getTotalSeconds();
    const costPerTB = Math.max(0, parseFloat(costPerTBEl.value) || 0);
    const storageGB = Math.max(0, parseFloat(availableStorageEl.value) || 0);
    const customSpeed = Math.max(1, parseFloat(customSpeedEl.value) || 50);

    totalDurationEl.textContent = formatDurationShort(seconds);
    syncDurationPresetButtons(seconds);
    customSpeedHeader.textContent = `${customSpeed}M`;
    yieldStorageLabel.textContent = `${storageGB} GB`;

    if (seconds === 0) {
      setMessage(profilesEmptyEl, 'Set a duration above 0 seconds to generate file sizes, upload times, and storage yield.', 'warning');
    } else if (profiles.size === 0) {
      setMessage(profilesEmptyEl, 'No profiles yet. Add a bitrate profile or use the starter set to compare file size, upload time, and storage yield.', 'info');
    } else {
      setMessage(profilesEmptyEl, '', 'info');
    }

    const entries = [];

    container.querySelectorAll('[data-id]').forEach((row) => {
      const id = parseInt(row.dataset.id, 10);
      const profile = profiles.get(id);
      if (!profile) return;

      const size = fileSizeGB(profile.bitrate, seconds);
      const cost = (size / 1000) * costPerTB;

      entries.push({
        id,
        row,
        label: profile.name,
        size,
        cost,
        bitrate: profile.bitrate,
        color: chartColors[(id - 1) % chartColors.length],
      });
    });

    entries.sort((a, b) => {
      if (a.size !== b.size) return a.size - b.size;
      return a.id - b.id;
    });

    entries.forEach((entry, index) => {
      container.appendChild(entry.row);

      const baselineSize = entries[0]?.size ?? 0;
      const diffPercent = baselineSize > 0 ? ((entry.size - baselineSize) / baselineSize) * 100 : 0;
      const diffSign = diffPercent >= 0 ? '+' : '';
      const ratio = baselineSize > 0 ? entry.size / baselineSize : 0;

      const sizeEl = entry.row.querySelector('.profile-size');
      const costEl = entry.row.querySelector('.profile-cost');
      const diffEl = entry.row.querySelector('.profile-diff');

      sizeEl.textContent = seconds > 0 ? formatSize(entry.size) : 'Set duration';
      costEl.textContent = entry.size > 0 ? `$${entry.cost.toFixed(2)}` : '$0.00';

      if (index === 0) {
        diffEl.textContent = 'Baseline';
        diffEl.dataset.trend = 'neutral';
      } else {
        diffEl.textContent = seconds > 0 ? `${diffSign}${diffPercent.toFixed(0)}% · ${ratio.toFixed(2)}x` : '--';
        diffEl.dataset.trend = diffPercent <= 0 ? 'positive' : 'negative';
      }
    });

    const maxSize = Math.max(...entries.map((entry) => entry.size), 0.001);
    barChart.innerHTML = entries.map((entry) => {
      const pct = Math.max(3, (entry.size / maxSize) * 100);
      return `<div class="bar-row">
        <div class="bar-label">${escapeHtml(entry.label)}</div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${pct}%;--bar-color:${entry.color}" aria-hidden="true"></div>
        </div>
        <div class="bar-value">${seconds > 0 ? formatSize(entry.size) : 'Set duration'}</div>
      </div>`;
    }).join('');

    const speedColumns = [...uploadSpeeds, { label: `${customSpeed}M`, speed: customSpeed }];
    uploadTable.innerHTML = entries.length
      ? entries.map((entry) => {
        const cells = speedColumns.map((column) => {
          const uploadTime = seconds > 0 ? uploadSeconds(entry.size, column.speed) : 0;
          const heatClass = seconds > 0 ? getUploadHeatClass(uploadTime) : 'upload-heatmap-cell--idle';
          const timeLabel = seconds > 0 ? formatDuration(uploadTime) : 'Set duration';
          const ariaLabel = `${entry.label} ${column.label} ${timeLabel}`;
          return `<div class="upload-heatmap-cell upload-heatmap-cell-speed ${heatClass}" role="cell" aria-label="${escapeHtml(ariaLabel)}" title="${escapeHtml(ariaLabel)}">
            <span class="upload-heatmap-rate">${escapeHtml(column.label)}</span>
            <span class="upload-heatmap-time">${escapeHtml(timeLabel)}</span>
          </div>`;
        }).join('');

        return `<div class="upload-heatmap-row" role="row">
          <div class="upload-heatmap-cell upload-heatmap-cell-label" role="cell">
            <span class="upload-heatmap-name">${escapeHtml(entry.label)}</span>
          </div>
          <div class="upload-heatmap-cell upload-heatmap-cell-size" role="cell">
            ${seconds > 0 ? escapeHtml(formatSize(entry.size)) : 'Set duration'}
          </div>
          ${cells}
        </div>`;
      }).join('')
      : `<div class="upload-heatmap-empty">Add profiles to see upload estimates.</div>`;

    capacityResults.innerHTML = entries.map((entry) => {
      const recSec = entry.bitrate > 0 ? (storageGB * 8 * 1e9) / (entry.bitrate * 1e6) : 0;
      return `<div class="flex items-center justify-between gap-3 rounded-xl bg-zinc-800 px-3 py-2.5 text-xs light:bg-zinc-100">
        <div class="min-w-0">
          <span class="block truncate text-zinc-300 light:text-zinc-700">${escapeHtml(entry.label)}</span>
          <span class="mt-0.5 block text-[11px] text-zinc-500 light:text-zinc-500">${escapeHtml(createBitrateLabel(entry.bitrate))}</span>
        </div>
        <span class="shrink-0 font-bold tabular-nums text-indigo-300 light:text-indigo-600">${storageGB > 0 ? formatDuration(recSec) : 'Add storage'}</span>
      </div>`;
    }).join('');
  }

  function saveState() {
    const state = {
      version: 'v4',
      hours: hoursEl.value,
      minutes: minutesEl.value,
      seconds: secondsEl.value,
      costPerTB: costPerTBEl.value,
      availableStorage: availableStorageEl.value,
      customSpeed: customSpeedEl.value,
      profiles: Array.from(profiles.entries()).map(([id, profile]) => ({
        id,
        bitrate: profile.bitrate,
        name: profile.name,
        cameraId: profile.cameraId,
        codecIndex: profile.codecIndex,
      })),
    };
    localStorage.setItem('vbc-state', JSON.stringify(state));
    return state;
  }

  function getStateString() {
    const state = saveState();
    const parts = [
      'v4',
      state.hours,
      state.minutes,
      state.seconds,
      state.costPerTB,
      state.availableStorage,
      state.customSpeed,
    ];

    state.profiles.forEach((profile) => {
      const name = encodeURIComponent(profile.name).replace(/\|/g, '%7C').replace(/,/g, '%2C');
      parts.push(`${profile.bitrate},${profile.cameraId || ''},${profile.codecIndex ?? ''},${name}`);
    });

    return btoa(unescape(encodeURIComponent(parts.join('|'))));
  }

  function resetProfiles() {
    profiles.clear();
    container.innerHTML = '';
    profileIdCounter = 0;
  }

  function applyState(state) {
    if (!state) return;

    hoursEl.value = state.hours ?? 0;
    minutesEl.value = state.minutes ?? 10;
    secondsEl.value = state.seconds ?? 0;
    costPerTBEl.value = state.costPerTB ?? 20;
    availableStorageEl.value = state.availableStorage ?? 500;
    customSpeedEl.value = state.customSpeed ?? 50;

    resetProfiles();

    if (Array.isArray(state.profiles)) {
      state.profiles.forEach((profile) => {
        addProfile(
          profile.bitrate,
          profile.name,
          profile.cameraId || null,
          profile.codecIndex ?? null
        );
      });
    }

    updateVisibility();
    recalc();
    validateManualProfile();
  }

  function parseV4(parts) {
    return {
      hours: parts[1],
      minutes: parts[2],
      seconds: parts[3],
      costPerTB: parts[4],
      availableStorage: parts[5],
      customSpeed: parts[6],
      profiles: parts.slice(7).map((profileStr) => {
        const tokens = profileStr.split(',');
        return {
          bitrate: parseFloat(tokens[0]),
          cameraId: tokens[1] || null,
          codecIndex: tokens[2] !== '' ? parseInt(tokens[2], 10) : null,
          name: decodeURIComponent(tokens.slice(3).join(',')),
        };
      }),
    };
  }

  function parseV3(parts) {
    return {
      hours: parts[1],
      minutes: parts[2],
      seconds: parts[3],
      costPerTB: parts[5],
      availableStorage: parts[6],
      customSpeed: parts[7],
      profiles: parts.slice(8).map((profileStr) => {
        const tokens = profileStr.split(',');
        return {
          bitrate: parseFloat(tokens[0]),
          cameraId: tokens[2] || null,
          codecIndex: tokens[3] !== '' ? parseInt(tokens[3], 10) : null,
          name: decodeURIComponent(tokens.slice(4).join(',')),
        };
      }),
    };
  }

  function parseV2(parts) {
    return {
      hours: parts[1],
      minutes: parts[2],
      seconds: parts[3],
      costPerTB: parts[5],
      availableStorage: parts[6],
      customSpeed: parts[7],
      profiles: parts.slice(8).map((profileStr) => {
        const tokens = profileStr.split(',');
        return {
          bitrate: parseFloat(tokens[1]),
          name: decodeURIComponent(tokens[2]),
          cameraId: null,
          codecIndex: null,
        };
      }),
    };
  }

  function loadFromUrl() {
    const sharedState = new URLSearchParams(window.location.search).get('s');
    if (!sharedState) return false;

    try {
      const decoded = decodeURIComponent(escape(atob(sharedState)));
      const parts = decoded.split('|');
      if (decoded.startsWith('v4|')) {
        applyState(parseV4(parts));
        return true;
      }
      if (decoded.startsWith('v3|')) {
        applyState(parseV3(parts));
        return true;
      }
      if (decoded.startsWith('v2|')) {
        applyState(parseV2(parts));
        return true;
      }
    } catch (error) {
      console.warn('Unable to load shared state.', error);
    }

    return false;
  }

  function showToast(message = 'Link copied to clipboard') {
    toastEl.textContent = message;
    toastEl.dataset.visible = 'true';
    window.clearTimeout(toastTimeoutId);
    toastTimeoutId = window.setTimeout(() => {
      toastEl.dataset.visible = 'false';
    }, 3000);
  }

  function populateCameraSelect() {
    const brands = [...new Set(cameras.map((camera) => camera.brand))];
    brands.forEach((brand) => {
      const group = document.createElement('optgroup');
      group.label = brand;
      cameras
        .filter((camera) => camera.brand === brand)
        .forEach((camera) => {
          const option = document.createElement('option');
          option.value = camera.id;
          option.textContent = camera.model;
          group.appendChild(option);
        });
      cameraSelect.appendChild(group);
    });
  }

  function syncCodecSelect() {
    const camera = cameras.find((entry) => entry.id === cameraSelect.value);
    codecSelect.innerHTML = '<option value="">Choose codec / bitrate...</option>';

    if (!camera) {
      codecSelect.value = '';
      hide(codecSelect);
      hide(addCameraBtn, 'inline-flex');
      return;
    }

    camera.codecs.forEach((codec, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = `${codec.name} - ${codec.bitrate} Mbps`;
      codecSelect.appendChild(option);
    });

    show(codecSelect);
    hide(addCameraBtn, 'inline-flex');
  }

  themeToggle.addEventListener('click', () => {
    const isLight = document.documentElement.classList.contains('light-theme');
    applyTheme(isLight ? 'dark' : 'light');
  });

  modeCameraBtn.addEventListener('click', () => setMode('camera'));
  modeManualBtn.addEventListener('click', () => setMode('manual'));

  cameraSelect.addEventListener('change', syncCodecSelect);

  codecSelect.addEventListener('change', () => {
    if (codecSelect.value === '') hide(addCameraBtn, 'inline-flex');
    else show(addCameraBtn, 'inline-flex');
  });

  addCameraBtn.addEventListener('click', () => {
    const camera = cameras.find((entry) => entry.id === cameraSelect.value);
    if (!camera || codecSelect.value === '') return;

    const codecIndex = parseInt(codecSelect.value, 10);
    const codec = camera.codecs[codecIndex];
    if (!codec) return;

    addProfile(codec.bitrate, `${camera.brand} ${camera.model} - ${codec.name}`, camera.id, codecIndex);
    cameraSelect.value = '';
    codecSelect.value = '';
    hide(codecSelect);
    hide(addCameraBtn, 'inline-flex');
    setMode('camera');
  });

  starterButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const bitrate = readBitrate(btn.dataset.starterBitrate, 25);
      manualBitrateEl.value = String(bitrate);
      updateChipState(bitrate);
      if (addStarterProfile(bitrate)) {
        setMessage(manualValidationEl, `${createBitrateLabel(bitrate)} added. Add more options or edit the row below.`, 'success');
      } else {
        setMessage(manualValidationEl, `${createBitrateLabel(bitrate)} is already in the comparison table.`, 'info');
      }
    });
  });

  addStarterSetBtn?.addEventListener('click', () => {
    const starterBitrates = [10, 25, 50, 100];
    const addedCount = starterBitrates.reduce((count, bitrate) => {
      return addStarterProfile(bitrate) ? count + 1 : count;
    }, 0);

    setMessage(
      manualValidationEl,
      addedCount > 0
        ? 'Starter set added. Compare the rows below or tune any bitrate inline.'
        : 'Starter set is already in the comparison table.',
      addedCount > 0 ? 'success' : 'info'
    );
  });

  durationPresetButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const [hours, minutes, seconds] = (btn.dataset.durationPreset || '0,10,0')
        .split(',')
        .map((value) => Math.max(0, parseInt(value, 10) || 0));
      hoursEl.value = String(hours);
      minutesEl.value = String(minutes);
      secondsEl.value = String(seconds);
      recalc();
      saveState();
    });
  });

  chipButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const bitrate = readBitrate(btn.dataset.bitrateChip, 100);
      manualBitrateEl.value = String(bitrate);
      updateChipState(bitrate);
      manualBitrateEl.focus();
      manualBitrateEl.select();
      validateManualProfile();
    });
  });

  manualBitrateEl.addEventListener('input', () => {
    updateChipState(readBitrate(manualBitrateEl.value, 0));
    validateManualProfile();
  });

  manualNameEl.addEventListener('input', () => {
    validateManualProfile();
  });

  addManualBtn.addEventListener('click', () => {
    const manualProfile = validateManualProfile();
    if (!manualProfile) return;
    const bitrate = readBitrate(manualProfile.bitrate, 100);
    const name = manualProfile.name;
    manualBitrateEl.value = String(bitrate);
    addProfile(bitrate, name);
    manualNameEl.value = '';
    updateChipState(bitrate);
    setMessage(manualValidationEl, 'Profile added. You can keep adding options or edit the new row below.', 'success');
  });

  clearAllBtn.addEventListener('click', () => {
    resetProfiles();
    updateVisibility();
    recalc();
    saveState();
  });

  [hoursEl, minutesEl, secondsEl, costPerTBEl, availableStorageEl, customSpeedEl]
    .forEach((el) => el.addEventListener('input', () => {
      recalc();
      saveState();
    }));

  [hoursEl, minutesEl, secondsEl].forEach((el) => el.addEventListener('blur', () => {
    clampWholeNumberInput(el);
    recalc();
    saveState();
  }));

  [costPerTBEl, availableStorageEl].forEach((el) => el.addEventListener('blur', () => {
    sanitizeDecimalInput(el, 0, 0);
    recalc();
    saveState();
  }));

  customSpeedEl.addEventListener('blur', () => {
    sanitizeDecimalInput(customSpeedEl, 50, 1);
    recalc();
    saveState();
  });

  shareConfigBtn.addEventListener('click', async () => {
    const url = new URL(window.location.href);
    url.searchParams.set('s', getStateString());
    window.history.replaceState({}, '', url);

    try {
      await navigator.clipboard.writeText(url.href);
      showToast('Link copied to clipboard');
    } catch (error) {
      showToast('Copy failed');
      console.warn('Unable to copy share URL.', error);
    }
  });

  applyTheme(
    localStorage.getItem('vbc-theme') ||
    (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
  );

  populateCameraSelect();
  updateChipState(readBitrate(manualBitrateEl.value, 25));
  setMode('manual');
  validateManualProfile();

  const rawState = localStorage.getItem('vbc-state');
  if (!loadFromUrl() && rawState) {
    try {
      applyState(JSON.parse(rawState));
    } catch (error) {
      console.warn('Unable to load saved state.', error);
    }
  }

  updateVisibility();
  recalc();
})();
