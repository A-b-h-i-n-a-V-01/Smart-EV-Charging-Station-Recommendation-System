/**
 * ChargeIQ – app.js
 * Smart EV Charging Station Recommendation System
 *
 * This file handles:
 *  - Particle animation on home page
 *  - Navbar scroll behavior
 *  - Searchable city dropdown
 *  - Charger type custom dropdown
 *  - Form validation
 *  - Flask API integration (calls /api/recommend)
 *  - Demo fallback when backend is not available
 *  - Result card population with animated score bars
 */

'use strict';

/* ══════════════════════════════════════
   CITY DATA
   Add/remove cities to match your Flask backend dataset
══════════════════════════════════════ */
const CITIES = [
  'Atlanta', 'Austin', 'Boston', 'Chicago', 'Denver',
  'Las Vegas', 'Los Angeles', 'Miami', 'Minneapolis', 'New York',
  'Phoenix', 'Portland', 'San Diego', 'San Francisco', 'Seattle'
].sort();

const AREAS_BY_CITY = {
  "Phoenix": [
    "Parkwood",
    "Camelback East",
    "South Mountain",
    "Paradise Valley",
    "South-West"
  ],
  "Seattle": [
    "South-East",
    "South Lake Union",
    "Wedgwood",
    "North-West",
    "Vashon"
  ],
  "Chicago": [
    "Bowmanville",
    "South Chicago",
    "South Lawndale",
    "North-East",
    "Oak Lawn"
  ],
  "New York": [
    "North Bergen",
    "Mariners Harbor",
    "Brooklyn",
    "Brownsville",
    "East Tremont"
  ],
  "Miami": [
    "West",
    "South",
    "North",
    "North-East",
    "South-East"
  ],
  "Atlanta": [
    "North-East",
    "West",
    "Kirkwood",
    "Sunrise",
    "Vinings"
  ],
  "Boston": [
    "Fort Hill",
    "Mill Hill",
    "Roxbury",
    "Winchester Highlands",
    "Nahant"
  ],
  "Denver": [
    "East",
    "West",
    "South-East",
    "North",
    "North-West"
  ],
  "Las Vegas": [
    "Buffalo",
    "Sunrise Manor",
    "Aliante",
    "Whitney Ranch",
    "Paradise"
  ],
  "Portland": [
    "Vancouver Mall",
    "West Haven-Sylvan",
    "Gilbert",
    "West Tigard",
    "Forest Park"
  ],
  "Los Angeles": [
    "Pico Rivera",
    "Mid-Wilshire",
    "Morton",
    "Westchester",
    "Los Feliz"
  ],
  "Minneapolis": [
    "New Hope",
    "Eagan",
    "Shoreview",
    "Hamline - Midway",
    "South"
  ],
  "San Francisco": [
    "Fort McDowell",
    "South-East",
    "South-West",
    "East",
    "Richmond District"
  ],
  "Austin": [
    "East",
    "West",
    "North-West",
    "EastVillage",
    "Lake City Estates"
  ],
  "San Diego": [
    "Mission Valley",
    "Mission Beach",
    "East",
    "East 2",
    "La Jolla"
  ]
};

/* ══════════════════════════════════════
   FLASK API CONFIG
   Update API_BASE_URL to your Flask backend address
══════════════════════════════════════ */
const API_BASE_URL = 'https://ev-recommend-backend.onrender.com';
const API_ENDPOINT = `${API_BASE_URL}/api/recommend`;

/* ══════════════════════════════════════
   UTILITIES
══════════════════════════════════════ */
const $ = (id) => document.getElementById(id);
const isHomePage = document.body.classList.contains('home-body');
const isRecommendPage = document.body.classList.contains('recommend-body');

/* ══════════════════════════════════════
   NAVBAR – SCROLL EFFECT (home page)
══════════════════════════════════════ */
if (isHomePage) {
  const navbar = $('navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }, { passive: true });
}

/* ══════════════════════════════════════
   PARTICLES – HOME HERO
══════════════════════════════════════ */
function initParticles() {
  const container = $('hero-particles');
  if (!container) return;

  const count = 35;
  for (let i = 0; i < count; i++) {
    const dot = document.createElement('div');
    dot.className = 'particle';
    const size = Math.random() * 5 + 3;
    const left = Math.random() * 100;
    const duration = Math.random() * 20 + 20; // 20s to 40s duration (much slower)
    // Using a negative delay up to max duration ensures particles are evenly distributed vertically
    const delay = (Math.random() * 40) * -1;
    dot.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      left: ${left}%;
      animation-duration: ${duration}s;
      animation-delay: ${delay}s;
      opacity: 0;
    `;
    container.appendChild(dot);
  }
}

if (isHomePage) {
  initParticles();
}

/* ══════════════════════════════════════
   CITY SEARCHABLE DROPDOWN
══════════════════════════════════════ */
function initCityDropdown() {
  const input = $('city-input');
  const listbox = $('city-listbox');
  const arrow = $('city-dropdown-arrow');
  if (!input || !listbox) return;

  let isOpen = false;
  let selectedCity = '';
  let highlightedIdx = -1;

  function renderList(query = '') {
    const filtered = query.trim()
      ? CITIES.filter(c => c.toLowerCase().includes(query.toLowerCase()))
      : CITIES;

    listbox.innerHTML = '';
    if (filtered.length === 0) {
      const li = document.createElement('li');
      li.className = 'dropdown-item no-results';
      li.textContent = 'No cities found';
      listbox.appendChild(li);
      return;
    }

    filtered.forEach((city, idx) => {
      const li = document.createElement('li');
      li.className = 'dropdown-item' + (city === selectedCity ? ' selected' : '');
      li.setAttribute('role', 'option');
      li.setAttribute('data-city', city);
      li.setAttribute('tabindex', '-1');
      li.setAttribute('id', `city-opt-${idx}`);
      li.textContent = city;
      li.addEventListener('mousedown', (e) => {
        e.preventDefault();
        selectCity(city);
      });
      listbox.appendChild(li);
    });
    highlightedIdx = -1;
  }

  function openList() {
    if (isOpen) return;
    isOpen = true;
    renderList(input.value);
    listbox.classList.add('open');
    input.setAttribute('aria-expanded', 'true');
    if (arrow) arrow.style.transform = 'translateY(-50%) rotate(180deg)';
  }

  function closeList() {
    if (!isOpen) return;
    isOpen = false;
    listbox.classList.remove('open');
    input.setAttribute('aria-expanded', 'false');
    if (arrow) arrow.style.transform = 'translateY(-50%) rotate(0deg)';
  }

  function selectCity(city) {
    selectedCity = city;
    input.value = city;
    // Clear error
    const group = $('city-form-group');
    if (group) group.classList.remove('has-error');
    closeList();
    input.blur();

    // Update Area Dropdown
    if (window._updateAreaForCity) {
      window._updateAreaForCity(city);
    }
  }

  function getItems() {
    return Array.from(listbox.querySelectorAll('.dropdown-item:not(.no-results)'));
  }

  input.addEventListener('focus', () => openList());
  input.addEventListener('input', () => {
    selectedCity = '';
    renderList(input.value);
    if (!isOpen) openList();
  });

  input.addEventListener('keydown', (e) => {
    if (!isOpen) { openList(); return; }
    const items = getItems();
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      highlightedIdx = Math.min(highlightedIdx + 1, items.length - 1);
      items.forEach((el, i) => el.classList.toggle('highlighted', i === highlightedIdx));
      if (items[highlightedIdx]) items[highlightedIdx].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      highlightedIdx = Math.max(highlightedIdx - 1, 0);
      items.forEach((el, i) => el.classList.toggle('highlighted', i === highlightedIdx));
      if (items[highlightedIdx]) items[highlightedIdx].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIdx >= 0 && items[highlightedIdx]) {
        selectCity(items[highlightedIdx].dataset.city);
      }
    } else if (e.key === 'Escape') {
      closeList();
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#city-dropdown-wrapper')) closeList();
  });

  // Expose selected city getter
  window._getCityValue = () => selectedCity || input.value.trim();
}

/* ══════════════════════════════════════
   AREA SEARCHABLE DROPDOWN
══════════════════════════════════════ */
function initAreaDropdown() {
  const wrapper = $('area-dropdown-wrapper');
  const input = $('area-input');
  const listbox = $('area-listbox');
  const arrow = $('area-dropdown-arrow');
  if (!input || !listbox || !wrapper) return;

  let isOpen = false;
  let selectedArea = '';
  let highlightedIdx = -1;
  let currentAreas = [];

  function renderList(query = '') {
    const filtered = query.trim()
      ? currentAreas.filter(a => a.toLowerCase().includes(query.toLowerCase()))
      : currentAreas;

    listbox.innerHTML = '';
    if (filtered.length === 0) {
      const li = document.createElement('li');
      li.className = 'dropdown-item no-results';
      li.textContent = 'No areas found';
      listbox.appendChild(li);
      return;
    }

    filtered.forEach((area, idx) => {
      const li = document.createElement('li');
      li.className = 'dropdown-item' + (area === selectedArea ? ' selected' : '');
      li.setAttribute('role', 'option');
      li.setAttribute('data-area', area);
      li.setAttribute('tabindex', '-1');
      li.textContent = area;
      li.addEventListener('mousedown', (e) => {
        e.preventDefault();
        selectArea(area);
      });
      listbox.appendChild(li);
    });
    highlightedIdx = -1;
  }

  function openList() {
    if (isOpen || input.disabled) return;
    isOpen = true;
    renderList(input.value);
    listbox.classList.add('open');
    input.setAttribute('aria-expanded', 'true');
    if (arrow) arrow.style.transform = 'translateY(-50%) rotate(180deg)';
  }

  function closeList() {
    if (!isOpen) return;
    isOpen = false;
    listbox.classList.remove('open');
    input.setAttribute('aria-expanded', 'false');
    if (arrow) arrow.style.transform = 'translateY(-50%) rotate(0deg)';
  }

  function selectArea(area) {
    selectedArea = area;
    input.value = area;
    const group = $('area-form-group');
    if (group) group.classList.remove('has-error');
    closeList();
    input.blur();
  }

  function getItems() {
    return Array.from(listbox.querySelectorAll('.dropdown-item:not(.no-results)'));
  }

  input.addEventListener('focus', () => openList());
  input.addEventListener('input', () => {
    selectedArea = '';
    renderList(input.value);
    if (!isOpen) openList();
  });

  input.addEventListener('keydown', (e) => {
    if (!isOpen) { openList(); return; }
    const items = getItems();
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      highlightedIdx = Math.min(highlightedIdx + 1, items.length - 1);
      items.forEach((el, i) => el.classList.toggle('highlighted', i === highlightedIdx));
      if (items[highlightedIdx]) items[highlightedIdx].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      highlightedIdx = Math.max(highlightedIdx - 1, 0);
      items.forEach((el, i) => el.classList.toggle('highlighted', i === highlightedIdx));
      if (items[highlightedIdx]) items[highlightedIdx].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIdx >= 0 && items[highlightedIdx]) {
        selectArea(items[highlightedIdx].dataset.area);
      }
    } else if (e.key === 'Escape') {
      closeList();
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#area-dropdown-wrapper')) closeList();
  });

  window._updateAreaForCity = (city) => {
    selectedArea = '';
    input.value = '';
    currentAreas = AREAS_BY_CITY[city] || [];

    if (currentAreas.length > 0) {
      input.disabled = false;
      wrapper.classList.remove('disabled');
      input.placeholder = "Search area...";
    } else {
      input.disabled = true;
      wrapper.classList.add('disabled');
      input.placeholder = "No predefined areas";
    }
  };

  window._getAreaValue = () => selectedArea || input.value.trim();
}

/* ══════════════════════════════════════
   CHARGER TYPE CUSTOM DROPDOWN
══════════════════════════════════════ */
function initChargerDropdown() {
  const display = $('charger-display');
  const listbox = $('charger-listbox');
  const text = $('charger-display-text');
  if (!display || !listbox) return;

  let isOpen = false;
  let selectedValue = '';

  function openList() {
    if (isOpen) return;
    isOpen = true;
    listbox.classList.add('open');
    display.setAttribute('aria-expanded', 'true');
  }

  function closeList() {
    if (!isOpen) return;
    isOpen = false;
    listbox.classList.remove('open');
    display.setAttribute('aria-expanded', 'false');
  }

  function selectCharger(value, label) {
    selectedValue = value;
    text.textContent = label;
    display.classList.add('has-value');
    listbox.querySelectorAll('.dropdown-item').forEach(el => {
      el.classList.toggle('selected', el.dataset.value === value);
    });
    const group = $('charger-form-group');
    if (group) group.classList.remove('has-error');
    closeList();
  }

  display.addEventListener('click', () => isOpen ? closeList() : openList());
  display.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); isOpen ? closeList() : openList(); }
    if (e.key === 'Escape') closeList();
  });

  listbox.querySelectorAll('.charger-item').forEach(item => {
    item.addEventListener('click', () => {
      const val = item.dataset.value;
      const label = item.querySelector('.charger-name').textContent;
      selectCharger(val, label);
    });
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#charger-dropdown-wrapper')) closeList();
  });

  window._getChargerValue = () => selectedValue;
}

/* ══════════════════════════════════════
   FORM VALIDATION
══════════════════════════════════════ */
function validateForm() {
  let valid = true;

  const city = window._getCityValue ? window._getCityValue() : '';
  const cityGroup = $('city-form-group');
  if (!city || !CITIES.includes(city)) {
    if (cityGroup) cityGroup.classList.add('has-error');
    valid = false;
  } else {
    if (cityGroup) cityGroup.classList.remove('has-error');
  }

  const charger = window._getChargerValue ? window._getChargerValue() : '';
  const chargerGroup = $('charger-form-group');
  if (!charger) {
    if (chargerGroup) chargerGroup.classList.add('has-error');
    valid = false;
  } else {
    if (chargerGroup) chargerGroup.classList.remove('has-error');
  }

  const area = window._getAreaValue ? window._getAreaValue() : '';
  const areaGroup = $('area-form-group');
  // Only validate area if the selected city has predefined areas
  if (city && AREAS_BY_CITY[city] && AREAS_BY_CITY[city].length > 0) {
    if (!area || !AREAS_BY_CITY[city].includes(area)) {
      if (areaGroup) areaGroup.classList.add('has-error');
      valid = false;
    } else {
      if (areaGroup) areaGroup.classList.remove('has-error');
    }
  }

  return valid;
}

/* ══════════════════════════════════════
   DEMO DATA – used when Flask backend unavailable
   Replace with real API call once backend is running
══════════════════════════════════════ */
function getDemoData(city, chargerType) {
  const stations = [
    {
      station_name: `${city} Central EV Hub`,
      charger_type: chargerType,
      predicted_wait_min: 4,
      distance_km: 1.2,
      available_ports: 5,
      total_ports: 10,
      cost_per_kwh: 0.28,
      score: 9.4
    },
    {
      station_name: `Downtown ${city} Charge Point`,
      charger_type: chargerType,
      predicted_wait_min: 1,
      distance_km: 2.8,
      available_ports: 8,
      total_ports: 12,
      cost_per_kwh: 0.32,
      score: 8.7
    },
    {
      station_name: `${city} Park & Charge`,
      charger_type: chargerType,
      predicted_wait_min: 7,
      distance_km: 0.6,
      available_ports: 3,
      total_ports: 6,
      cost_per_kwh: 0.25,
      score: 8.1
    },
    {
      station_name: `${city} Mall Fast Charger`,
      charger_type: chargerType,
      predicted_wait_min: 10,
      distance_km: 3.5,
      available_ports: 4,
      total_ports: 8,
      cost_per_kwh: 0.18,
      score: 7.6
    }
  ];

  return {
    best_overall: stations[0],
    lowest_wait: stations[1],
    closest: stations[2],
    lowest_cost: stations[3]
  };
}

/* ══════════════════════════════════════
   API CALL / FLASK INTEGRATION
══════════════════════════════════════ */
async function fetchRecommendations(city, area, chargerType) {
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ city, area, charger_type: chargerType }),
      signal: AbortSignal.timeout(8000)
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();
    return { data, fromDemo: false };

  } catch (err) {
    console.warn('[ChargeIQ] Backend unavailable, using demo data.', err.message);
    // Graceful fallback to demo data
    return { data: getDemoData(city, chargerType), fromDemo: true };
  }
}

/* ══════════════════════════════════════
   POPULATE RESULT CARDS
   Fields populated from Flask API response or demo data:
   - station_name
   - charger_type
   - predicted_wait_min  (integer, minutes)
   - distance_km         (float, km)
   - available_ports     (integer)
   - cost_per_kwh        (float, currency per kWh)
   - score               (float, 0–10)
══════════════════════════════════════ */
function populateCard(suffix, stationData) {
  if (!stationData) return;

  const get = (id) => $(id);

  // Station name
  const nameEl = get(`station-name-${suffix}`);
  if (nameEl) nameEl.textContent = stationData.station_name || '—';

  // Charger tag
  const tagEl = get(`charger-tag-${suffix}`);
  if (tagEl) tagEl.textContent = stationData.charger_type || '—';

  // Wait time
  const waitEl = get(`val-wait-${suffix}`);
  if (waitEl) {
    const w = stationData.predicted_wait_min;
    waitEl.textContent = (w !== undefined && w !== null) ? `${w} min` : '—';
  }

  // Distance
  const distEl = get(`val-dist-${suffix}`);
  if (distEl) {
    const d = stationData.distance_km;
    distEl.textContent = (d !== undefined && d !== null) ? `${parseFloat(d).toFixed(1)} km` : '—';
  }

  // Available ports
  const portsEl = get(`val-ports-${suffix}`);
  if (portsEl) {
    const p = stationData.available_ports;
    const t = stationData.total_ports || p; // fallback just in case
    portsEl.textContent = (p !== undefined && p !== null) ? `${p} / ${t} free` : '—';
  }

  // Cost
  const costEl = get(`val-cost-${suffix}`);
  if (costEl) {
    const c = stationData.cost_per_kwh;
    costEl.textContent = (c !== undefined && c !== null) ? `$${parseFloat(c).toFixed(2)}/kWh` : '—';
  }

  // Score
  const scoreNumEl = get(`score-num-${suffix}`);
  const scoreFillEl = get(`score-fill-${suffix}`);
  if (scoreNumEl && scoreFillEl) {
    const s = stationData.score;
    if (s !== undefined && s !== null) {
      const rounded = parseFloat(s).toFixed(1);
      scoreNumEl.textContent = rounded;
      // Animate bar after a short delay
      setTimeout(() => {
        scoreFillEl.style.width = `${Math.min(parseFloat(s) * 10, 100)}%`;
      }, 200);
    } else {
      scoreNumEl.textContent = '—';
    }
  }
}

/* ══════════════════════════════════════
   SHOW / HIDE UI STATES
══════════════════════════════════════ */
function showLoading() {
  const ls = $('loading-state');
  const rs = $('results-section');
  const es = $('empty-state');
  if (ls) ls.classList.remove('hidden');
  if (rs) rs.classList.add('hidden');
  if (es) es.classList.add('hidden');

  // Update button state
  const btn = $('find-station-btn');
  const txt = $('find-btn-text');
  if (btn) { btn.disabled = true; btn.style.opacity = '0.6'; }
  if (txt) txt.textContent = 'Searching…';
}

function showResults(data, city, chargerType, fromDemo) {
  const ls = $('loading-state');
  const rs = $('results-section');
  if (ls) ls.classList.add('hidden');
  if (rs) rs.classList.remove('hidden');

  // Header
  const citySpan = $('results-city-name');
  if (citySpan) citySpan.textContent = city;

  const chargerBadge = $('results-charger-badge');
  if (chargerBadge) chargerBadge.textContent = chargerType;

  const ts = $('results-timestamp');
  if (ts) {
    const now = new Date();
    ts.textContent = `ML Predictions generated using LIVE time: ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` +
      (fromDemo ? ' · Demo Data' : '');
  }

  // Populate all four cards
  populateCard('best', data.best_overall);
  populateCard('wait', data.lowest_wait);
  populateCard('closest', data.closest);
  populateCard('cost', data.lowest_cost);

  // Reset button
  const btn = $('find-station-btn');
  const txt = $('find-btn-text');
  if (btn) { btn.disabled = false; btn.style.opacity = ''; }
  if (txt) txt.textContent = 'Find Best Charging Station';

  // Scroll to results
  setTimeout(() => {
    const rs2 = $('results-section');
    if (rs2) rs2.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

function showEmpty() {
  const ls = $('loading-state');
  const es = $('empty-state');
  if (ls) ls.classList.add('hidden');
  if (es) es.classList.remove('hidden');

  const btn = $('find-station-btn');
  const txt = $('find-btn-text');
  if (btn) { btn.disabled = false; btn.style.opacity = ''; }
  if (txt) txt.textContent = 'Find Best Charging Station';
}

/* ══════════════════════════════════════
   RESET SEARCH
══════════════════════════════════════ */
function resetSearch() {
  const rs = $('results-section');
  const es = $('empty-state');
  if (rs) rs.classList.add('hidden');
  if (es) es.classList.add('hidden');

  // Reset score bars
  ['best', 'wait', 'closest', 'cost'].forEach(s => {
    const fill = $(`score-fill-${s}`);
    if (fill) fill.style.width = '0%';
  });

  // Scroll back to form
  const form = $('form-section');
  if (form) form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Expose for inline onclick
window.resetSearch = resetSearch;

/* ══════════════════════════════════════
   FORM SUBMIT HANDLER
══════════════════════════════════════ */
function initSearchForm() {
  const form = $('search-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    const city = window._getCityValue();
    const area = window._getAreaValue();
    const chargerType = window._getChargerValue();

    showLoading();

    try {
      const { data, fromDemo } = await fetchRecommendations(city, area, chargerType);

      // Check if we got valid data with at least one station
      const hasData = data && (data.best_overall || data.lowest_wait || data.closest || data.lowest_cost);
      if (!hasData) {
        showEmpty();
        return;
      }

      showResults(data, city, chargerType, fromDemo);

    } catch (err) {
      console.error('[ChargeIQ] Unexpected error:', err);
      showEmpty();
    }
  });
}

/* ══════════════════════════════════════
   SCROLL-IN ANIMATION (Intersection Observer)
══════════════════════════════════════ */
function initScrollAnimations() {
  const targets = document.querySelectorAll('.step-card, .preview-card');
  if (!('IntersectionObserver' in window)) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  targets.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(24px)';
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    observer.observe(el);
  });
}

/* ══════════════════════════════════════
   INIT
══════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  if (isRecommendPage) {
    initCityDropdown();
    initAreaDropdown();
    initChargerDropdown();
    initSearchForm();
  }
  initScrollAnimations();
});
