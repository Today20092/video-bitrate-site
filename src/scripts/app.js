import { cameras } from '../data/cameras.js';

(function () {
  const $ = (sel) => document.querySelector(sel);
  const profiles = new Map();
  let profileIdCounter = 0;

  const chartColors = [
    '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6',
    '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16',
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
  } = refs;

  function show(el) {
    if (el) el.style.display = '';
  }

  function hide(el) {
    if (el) el.style.display = 'none';
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
    el.classList.toggle('is-invalid', invalid);
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
        ? 'Ready to add. You can still rename and fine-tune bitrate after it appears in the comparison table.'
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
    if (theme === 'light') {
      document.body.classList.add('light-theme');
      if (iconSun) iconSun.style.display = 'none';
      if (iconMoon) iconMoon.style.display = '';
    } else {
      document.body.classList.remove('light-theme');
      if (iconSun) iconSun.style.display = '';
      if (iconMoon) iconMoon.style.display = 'none';
    }
    localStorage.setItem('vbc-theme', theme);
  }

  function setMode(mode) {
    const isCamera = mode === 'camera';
    cameraMode.hidden = !isCamera;
    manualMode.hidden = isCamera;
    cameraMode.style.display = isCamera ? '' : 'none';
    manualMode.style.display = isCamera ? 'none' : '';
    modeCameraBtn.classList.toggle('active', isCamera);
    modeManualBtn.classList.toggle('active', !isCamera);
    modeCameraBtn.setAttribute('aria-selected', String(isCamera));
    modeManualBtn.setAttribute('aria-selected', String(!isCamera));
    if (!isCamera) {
      validateManualProfile();
    }
  }

  function getTotalSeconds() {
    const hours = Math.max(0, parseInt(hoursEl.value, 10) || 0);
    const minutes = Math.max(0, parseInt(minutesEl.value, 10) || 0);
    const seconds = Math.max(0, parseInt(secondsEl.value, 10) || 0);
    return hours * 3600 + minutes * 60 + seconds;
  }

  function fileSizeGB(bitrateMbps, seconds) {
    return (bitrateMbps * 1e6 * seconds) / (8 * 1e9);
  }

  function formatSize(gb) {
    if (gb >= 1000) return (gb / 1000).toFixed(2) + ' TB';
    if (gb >= 1) return gb.toFixed(2) + ' GB';
    return (gb * 1000).toFixed(1) + ' MB';
  }

  function formatDuration(totalSec) {
    if (totalSec < 1) return '<1s';
    const d = Math.floor(totalSec / 86400);
    const h = Math.floor((totalSec % 86400) / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = Math.floor(totalSec % 60);
    const parts = [];
    if (d > 0) parts.push(d + 'd');
    if (h > 0) parts.push(h + 'h');
    if (m > 0) parts.push(m + 'm');
    if (s > 0 || parts.length === 0) parts.push(s + 's');
    return parts.join(' ');
  }

  function formatDurationShort(totalSec) {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = Math.floor(totalSec % 60);
    const parts = [];
    if (h > 0) parts.push(h + 'h');
    if (m > 0) parts.push(m + 'm');
    if (s > 0 && h === 0) parts.push(s + 's');
    return parts.join(' ') || '0s';
  }

  function uploadSeconds(sizeGB, speedMbps) {
    return (sizeGB * 8 * 1e9) / (speedMbps * 1e6);
  }

  function updateChipState(activeBitrate) {
    chipButtons.forEach((btn) => {
      const isActive = parseFloat(btn.dataset.bitrateChip) === activeBitrate;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', String(isActive));
    });
  }

  function createDefaultProfileName() {
    return `Profile ${profiles.size + 1}`;
  }

  function createProfileRow(id) {
    const profile = profiles.get(id);
    if (!profile) return;

    const row = document.createElement('tr');
    row.dataset.id = String(id);
    row.innerHTML = `
      <td class="profile-name-cell">
        <div class="profile-name-wrap">
          <span class="profile-dot" style="background:${chartColors[(id - 1) % chartColors.length]}"></span>
          <input
            type="text"
            class="table-input profile-name-input"
            value="${escapeHtml(profile.name)}"
            name="profile-${id}-name"
            autocomplete="off"
            aria-label="Profile name"
          />
        </div>
      </td>
      <td>
        <div class="bitrate-input-wrap">
          <input
            type="number"
            class="table-input bitrate-input"
            value="${profile.bitrate}"
            min="1"
            step="0.1"
            inputmode="decimal"
            name="profile-${id}-bitrate"
            aria-label="Bitrate in megabits per second"
          />
          <span class="table-unit">Mbps</span>
        </div>
      </td>
      <td class="profile-size table-metric">--</td>
      <td class="profile-diff table-metric">--</td>
      <td class="profile-cost table-metric">--</td>
      <td>
        <button class="row-action-btn remove-btn" type="button" aria-label="Remove ${escapeHtml(profile.name)}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
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
      setInputInvalid(event.target, invalid);
      profiles.get(id).bitrate = invalid ? profile.bitrate : parsed;
      recalc();
      saveState();
    });

    bitrateInput.addEventListener('blur', (event) => {
      const safeBitrate = readBitrate(event.target.value, 100);
      profiles.get(id).bitrate = safeBitrate;
      event.target.value = String(safeBitrate);
      setInputInvalid(event.target, false);
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

  function addProfile(bitrate, name, cameraId = null, codecIndex = null) {
    const id = ++profileIdCounter;
    profiles.set(id, {
      bitrate: readBitrate(bitrate),
      name: name?.trim() || createDefaultProfileName(),
      cameraId,
      codecIndex,
    });
    createProfileRow(id);
    updateVisibility();
    recalc();
    saveState();
  }

  function updateVisibility() {
    const hasProfiles = profiles.size > 0;
    [comparisonSection, chartSection, uploadSection, yieldSection].forEach((el) => {
      el.style.display = hasProfiles ? '' : 'none';
    });
    profilesEmptyEl.style.display = hasProfiles ? 'none' : '';
    profileCountEl.textContent = String(profiles.size);
  }

  function recalc() {
    const seconds = getTotalSeconds();
    const costPerTB = Math.max(0, parseFloat(costPerTBEl.value) || 0);
    const storageGB = Math.max(0, parseFloat(availableStorageEl.value) || 0);
    const customSpeed = Math.max(1, parseFloat(customSpeedEl.value) || 50);

    totalDurationEl.textContent = formatDurationShort(seconds);
    customSpeedHeader.textContent = customSpeed + 'M';
    yieldStorageLabel.textContent = storageGB + ' GB';

    if (seconds === 0) {
      setMessage(profilesEmptyEl, 'Set a duration above 0 seconds to generate file sizes, upload times, and storage yield.', 'warning');
    } else if (profiles.size === 0) {
      setMessage(profilesEmptyEl, 'No profiles yet. Add a camera preset or manual bitrate to compare file size, upload time, and storage yield.', 'info');
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

      const sizeEl = entry.row.querySelector('.profile-size');
      const costEl = entry.row.querySelector('.profile-cost');
      const diffEl = entry.row.querySelector('.profile-diff');

      sizeEl.textContent = seconds > 0 ? formatSize(entry.size) : 'Set duration';
      costEl.textContent = entry.size > 0 ? '$' + entry.cost.toFixed(2) : '$0.00';

      if (index === 0) {
        diffEl.textContent = 'Baseline';
        diffEl.dataset.trend = 'neutral';
      } else {
        diffEl.textContent = seconds > 0 ? diffSign + diffPercent.toFixed(0) + '%' : '--';
        diffEl.dataset.trend = diffPercent <= 0 ? 'positive' : 'negative';
      }
    });

    const maxSize = Math.max(...entries.map((entry) => entry.size), 0.001);
    barChart.innerHTML = entries.map((entry) => {
      const pct = Math.max(3, (entry.size / maxSize) * 100);
      return `<div class="bar-row">
        <div class="bar-label">${escapeHtml(entry.label)}</div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${pct}%;background:${entry.color}">${seconds > 0 ? formatSize(entry.size) : 'Set duration'}</div>
        </div>
      </div>`;
    }).join('');

    const speeds = [20, 100, 1000, 10000, customSpeed];
    uploadTable.innerHTML = entries.map((entry) => {
      const cells = speeds.map((speed) => `<td>${entry.size > 0 ? formatDuration(uploadSeconds(entry.size, speed)) : '--'}</td>`).join('');
      return `<tr>
        <td>${escapeHtml(entry.label)}</td>
        <td>${seconds > 0 ? formatSize(entry.size) : 'Set duration'}</td>
        ${cells}
      </tr>`;
    }).join('');

    capacityResults.innerHTML = entries.map((entry) => {
      const recSec = entry.bitrate > 0 ? (storageGB * 8 * 1e9) / (entry.bitrate * 1e6) : 0;
      return `<div class="capacity-row">
        <span class="cap-label">${escapeHtml(entry.label)}</span>
        <span class="cap-value">${storageGB > 0 ? formatDuration(recSec) : 'Add storage'}</span>
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
    toastEl.classList.add('show');
    window.setTimeout(() => toastEl.classList.remove('show'), 3000);
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
      hide(addCameraBtn);
      return;
    }

    camera.codecs.forEach((codec, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = `${codec.name} - ${codec.bitrate} Mbps`;
      codecSelect.appendChild(option);
    });

    show(codecSelect);
    hide(addCameraBtn);
  }

  themeToggle.addEventListener('click', () => {
    const isLight = document.body.classList.contains('light-theme');
    applyTheme(isLight ? 'dark' : 'light');
  });

  modeCameraBtn.addEventListener('click', () => setMode('camera'));
  modeManualBtn.addEventListener('click', () => setMode('manual'));

  cameraSelect.addEventListener('change', syncCodecSelect);

  codecSelect.addEventListener('change', () => {
    if (codecSelect.value === '') hide(addCameraBtn);
    else show(addCameraBtn);
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
    hide(addCameraBtn);
    setMode('camera');
  });

  chipButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const bitrate = readBitrate(btn.dataset.bitrateChip, 100);
      manualBitrateEl.value = String(bitrate);
      updateChipState(bitrate);
      manualBitrateEl.focus();
      manualBitrateEl.select();
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
  updateChipState(readBitrate(manualBitrateEl.value, 100));
  setMode('camera');
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
