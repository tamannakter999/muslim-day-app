// Muslim Day v3 — Ultra-Fast, Lightweight, Offline-First Mobile App
(() => {
  const {
    BD_DIVISIONS, BD_DISTRICTS, calculatePrayerTimes,
    gregorianToHijri, getHijriDateString, getGregorianDate,
    toBanglaDigits, formatTimeShort
  } = window.PrayerCalc;

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
  }

  const DEFAULT_TASBIHS = [
    { id: 'subhanallah', label: 'সুবহানাল্লাহ', arabic: 'سُبْحَانَ اللَّهِ', meaning: 'আল্লাহ পবিত্র', target: 33 },
    { id: 'alhamdulillah', label: 'আলহামদুলিল্লাহ', arabic: 'الْحَمْدُ لِلَّهِ', meaning: 'সকল প্রশংসা আল্লাহর', target: 33 },
    { id: 'allahuakbar', label: 'আল্লাহু আকবার', arabic: 'اللَّهُ أَكْبَرُ', meaning: 'আল্লাহ সর্বশ্রেষ্ঠ', target: 34 },
    { id: 'astaghfirullah', label: 'আস্তাগফিরুল্লাহ', arabic: 'أَسْتَغْفِرُ اللَّهَ', meaning: 'আমি আল্লাহর কাছে ক্ষমা চাই', target: 100 },
    { id: 'durood', label: 'দরূদ শরীফ', arabic: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ', meaning: 'আল্লাহুম্মা সাল্লি আলা মুহাম্মাদ', target: 100 },
    { id: 'kalima', label: 'লা ইলাহা ইল্লাল্লাহ', arabic: 'لَا إِلَهَ إِلَّا اللَّهُ', meaning: 'আল্লাহ ছাড়া কোনো মাবুদ নেই', target: 100 }
  ];

  const now0 = new Date();
  const DAY_KEY = now0.toISOString().slice(0, 10);
  const MONTH_KEY = DAY_KEY.slice(0, 7);
  const YEAR_KEY = DAY_KEY.slice(0, 4);

  const saved = JSON.parse(localStorage.getItem('muslim_day_v3') || '{}');
  const state = {
    divisionId: saved.divisionId || 'dhaka',
    districtId: saved.districtId || 'dhaka',
    useGps: !!saved.useGps,
    gpsLat: saved.gpsLat || null,
    gpsLng: saved.gpsLng || null,
    gpsCity: saved.gpsCity || null,
    hijriAdjust: saved.hijriAdjust !== undefined ? Number(saved.hijriAdjust) : -1,
    madhab: saved.madhab || 'hanafi',
    lang: saved.lang || 'bn',
    darkMode: saved.darkMode !== undefined ? !!saved.darkMode : true,

    // Tasbih
    tasbihList: Array.isArray(saved.tasbihList) && saved.tasbihList.length ? saved.tasbihList : DEFAULT_TASBIHS,
    activeTasbihId: saved.activeTasbihId || 'subhanallah',
    tasbihCounts: saved.tasbihCounts || {}, // current session count per tasbihId
    tasbihSound: saved.tasbihSound !== undefined ? saved.tasbihSound : true,
    // Stats: { [tasbihId]: { dayKey, day, monthKey, month, yearKey, year } }
    tasbihStats: saved.tasbihStats || {},

    // Reminders
    duroodOn: saved.duroodOn !== undefined ? saved.duroodOn : true,
    duroodMin: Number(saved.duroodMin) || 15,
    istighfarOn: saved.istighfarOn !== undefined ? saved.istighfarOn : true,
    istighfarMin: Number(saved.istighfarMin) || 20,
    quiet1On: saved.quiet1On !== undefined ? saved.quiet1On : true,
    quiet1Start: saved.quiet1Start || '22:00',
    quiet1End: saved.quiet1End || '07:00',
    quiet2On: !!saved.quiet2On,
    quiet2Start: saved.quiet2Start || '10:00',
    quiet2End: saved.quiet2End || '17:00'
  };

  let savePending = false;
  function saveState() {
    if (savePending) return;
    savePending = true;
    setTimeout(() => {
      localStorage.setItem('muslim_day_v3', JSON.stringify(state));
      savePending = false;
    }, 150);
  }

  const fmtNum = n => (state.lang === 'bn' ? toBanglaDigits(n) : String(n));

  // Audio Engine (reused context for zero-lag taps)
  let audioCtx = null;
  function getCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  function playClick() {
    if (!state.tasbihSound) return;
    try {
      const ctx = getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 540;
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.035);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.035);
    } catch (_) {}
  }

  function playCompleteChime() {
    if (!state.tasbihSound) return;
    try {
      const ctx = getCtx();
      [587.3, 880].forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = f;
        const t = ctx.currentTime + idx * 0.14;
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(t); osc.stop(t + 0.22);
      });
    } catch (_) {}
  }

  function playVoiceClip(type) {
    const src = type === 'durood' ? './audio/durood_reminder.mp3' : './audio/istighfar_reminder.mp3';
    try {
      const audio = new Audio(src);
      audio.volume = 1.0;
      const ctx = getCtx();
      const source = ctx.createMediaElementSource(audio);
      const gain = ctx.createGain();
      gain.gain.value = 1.9;
      source.connect(gain); gain.connect(ctx.destination);
      audio.play().catch(() => { const f = new Audio(src); f.play().catch(() => {}); });
    } catch (_) {
      const f = new Audio(src); f.play().catch(() => {});
    }
  }

  // Toast
  let toastTimer = null;
  function showToast(title, body) {
    const el = document.getElementById('toast');
    document.getElementById('toastTitle').textContent = title;
    document.getElementById('toastBody').textContent = body;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 4000);
  }

  // Navigation
  function switchTab(name) {
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.getElementById(`tab-${name}`)?.classList.add('active');
    document.querySelector(`.nav-item[data-tab="${name}"]`)?.classList.add('active');
  }

  // Location Helpers
  function getActiveCoords() {
    if (state.useGps && state.gpsLat !== null && state.gpsLng !== null) {
      return { lat: state.gpsLat, lng: state.gpsLng, label: state.gpsCity || 'GPS লোকেশন' };
    }
    const d = BD_DISTRICTS.find(x => x.id === state.districtId) || BD_DISTRICTS[0];
    return { lat: d.lat, lng: d.lng, label: state.lang === 'bn' ? d.nameBn : d.nameEn };
  }

  async function detectGps(silent = false) {
    const st = document.getElementById('gpsStatusText');
    if (!silent && st) st.textContent = 'লোকেশন খোঁজা হচ্ছে...';

    const onOk = async (lat, lng) => {
      state.useGps = true;
      state.gpsLat = lat;
      state.gpsLng = lng;
      state.gpsCity = 'GPS লোকেশন';
      if (navigator.onLine) {
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=${state.lang}`);
          if (r.ok) {
            const j = await r.json();
            const c = j.address?.suburb || j.address?.town || j.address?.city || j.address?.state_district;
            if (c) state.gpsCity = c;
          }
        } catch (_) {}
      }
      saveState();
      updatePrayerTimes();
      if (st) st.textContent = `সক্রিয়: ${state.gpsCity}`;
      if (!silent) showToast('📍 লোকেশন আপডেট', state.gpsCity);
    };

    const onErr = () => { if (!silent && st) st.textContent = 'GPS পাওয়া যায়নি — ম্যানুয়াল জেলা চালু আছে'; };

    if (window.Capacitor?.Plugins?.Geolocation) {
      try {
        const p = await window.Capacitor.Plugins.Geolocation.requestPermissions();
        if (p.location === 'granted' || p.coarseLocation === 'granted') {
          const pos = await window.Capacitor.Plugins.Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
          return onOk(pos.coords.latitude, pos.coords.longitude);
        }
      } catch (_) {}
    }
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(p => onOk(p.coords.latitude, p.coords.longitude), onErr, { timeout: 10000 });
    } else onErr();
  }

  function renderDivisionDistricts() {
    const divSel = document.getElementById('divisionSelect');
    const distSel = document.getElementById('districtSelect');
    divSel.innerHTML = '';
    Object.entries(BD_DIVISIONS).forEach(([id, obj]) => {
      const o = document.createElement('option');
      o.value = id; o.textContent = state.lang === 'bn' ? obj.bn : obj.en;
      if (id === state.divisionId) o.selected = true;
      divSel.appendChild(o);
    });

    distSel.innerHTML = '';
    const list = BD_DISTRICTS.filter(d => d.div === state.divisionId);
    list.forEach(d => {
      const o = document.createElement('option');
      o.value = d.id; o.textContent = state.lang === 'bn' ? d.nameBn : d.nameEn;
      if (d.id === state.districtId) o.selected = true;
      distSel.appendChild(o);
    });
  }

  // Prayer Times, Forbidden Times, Ishraq/Chasht & Special Islamic Days
  let currentTimes = null;
  function updatePrayerTimes() {
    const now = new Date();
    const loc = getActiveCoords();
    const tz = -now.getTimezoneOffset() / 60;

    document.getElementById('currentDistrictLabel').textContent = loc.label;
    document.getElementById('hijriDate').textContent = getHijriDateString(now, state.lang, state.hijriAdjust);
    document.getElementById('gregorianDate').textContent = getGregorianDate(now, state.lang);
    document.getElementById('madhabBadge').textContent = state.madhab === 'hanafi' ? 'হানাফী' : 'শাফেয়ী';

    // Special Day / Nafal Fast Auto-Detector
    const hijri = gregorianToHijri(now, state.hijriAdjust);
    const dow = now.getDay(); // 1=Mon, 4=Thu
    const alerts = [];
    if ([13, 14, 15].includes(hijri.day)) alerts.push(`🌙 আজ আইয়ামে বীজের রোজার দিন (${fmtNum(hijri.day)} তারিখ)`);
    if (dow === 1 || dow === 4) alerts.push(`📅 আজ ${dow === 1 ? 'সোমবার' : 'বৃহস্পতিবার'} — সুন্নাহ নফল রোজার দিন`);
    if (hijri.month === 8 && hijri.day === 14) alerts.push('✨ আজ দিবাগত রাত শবে বরাত (১৫ শাবান)');
    if (hijri.month === 9 && hijri.day >= 21 && hijri.day % 2 === 1) alerts.push('✨ রমজানের বিজোড় রাত — শবে কদর তালাশ করুন');

    const banner = document.getElementById('specialDayBanner');
    if (alerts.length) {
      banner.style.display = 'block';
      document.getElementById('specialDayText').textContent = alerts.join(' • ');
    } else {
      banner.style.display = 'none';
    }

    currentTimes = calculatePrayerTimes(now, loc.lat, loc.lng, state.madhab, tz);
    document.getElementById('sehriTime').textContent = formatTimeShort(currentTimes.sehri, state.lang);
    document.getElementById('iftarTime').textContent = formatTimeShort(currentTimes.iftar, state.lang);

    const schedule = [
      { key: 'fajr', name: 'ফজর', icon: '🌌', time: currentTimes.fajr, p: true },
      { key: 'sunrise', name: 'সূর্যোদয়', icon: '🌅', time: currentTimes.sunrise, p: false },
      { key: 'dhuhr', name: 'যোহর', icon: '☀️', time: currentTimes.dhuhr, p: true },
      { key: 'asr', name: 'আসর', icon: '🌤️', time: currentTimes.asr, p: true },
      { key: 'maghrib', name: 'মাগরিব', icon: '🌇', time: currentTimes.maghrib, p: true },
      { key: 'isha', name: 'এশা', icon: '🌙', time: currentTimes.isha, p: true }
    ];

    let activeKey = 'isha';
    schedule.forEach(s => { if (now >= s.time) activeKey = s.key; });

    document.getElementById('prayerList').innerHTML = schedule.map(item => `
      <div class="prayer-item ${item.p && item.key === activeKey ? 'active-waqt' : ''}">
        <div class="prayer-left">
          <span>${item.icon}</span>
          <div>
            <div class="prayer-name">${item.name}</div>
            ${item.p && item.key === activeKey ? '<div class="prayer-sub">চলমান ওয়াক্ত</div>' : ''}
          </div>
        </div>
        <div class="prayer-time">${formatTimeShort(item.time, state.lang)}</div>
      </div>
    `).join('');

    // Ishraq & Chasht
    const nf = currentTimes.nafal;
    document.getElementById('nafalTimesList').innerHTML = `
      <div class="prayer-item">
        <div class="prayer-left"><span>🌤️</span><div class="prayer-name">ইশরাক</div></div>
        <div class="prayer-time">${formatTimeShort(nf.ishraqStart, state.lang)} – ${formatTimeShort(nf.ishraqEnd, state.lang)}</div>
      </div>
      <div class="prayer-item">
        <div class="prayer-left"><span>☀️</span><div class="prayer-name">চাশত (দুহা)</div></div>
        <div class="prayer-time">${formatTimeShort(nf.chashtStart, state.lang)} – ${formatTimeShort(nf.chashtEnd, state.lang)}</div>
      </div>
    `;

    // Forbidden Times
    const fb = currentTimes.forbidden;
    document.getElementById('forbiddenList').innerHTML = `
      <div class="prayer-item forbidden-row">
        <div class="prayer-name">সূর্যোদয়ের সময়</div>
        <div class="prayer-time">${formatTimeShort(fb.sunriseStart, state.lang)} – ${formatTimeShort(fb.sunriseEnd, state.lang)}</div>
      </div>
      <div class="prayer-item forbidden-row">
        <div class="prayer-name">দ্বিপ্রহর (যাওয়াল)</div>
        <div class="prayer-time">${formatTimeShort(fb.zawalStart, state.lang)} – ${formatTimeShort(fb.zawalEnd, state.lang)}</div>
      </div>
      <div class="prayer-item forbidden-row">
        <div class="prayer-name">সূর্যাস্তের সময়</div>
        <div class="prayer-time">${formatTimeShort(fb.sunsetStart, state.lang)} – ${formatTimeShort(fb.sunsetEnd, state.lang)}</div>
      </div>
    `;

    updateCountdown();
  }

  function updateCountdown() {
    if (!currentTimes) return;
    const now = new Date();
    const waqts = [
      { name: 'ফজর', time: currentTimes.fajr },
      { name: 'যোহর', time: currentTimes.dhuhr },
      { name: 'আসর', time: currentTimes.asr },
      { name: 'মাগরিব', time: currentTimes.maghrib },
      { name: 'এশা', time: currentTimes.isha }
    ];
    let next = waqts.find(w => w.time > now);
    if (!next) {
      const tom = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const loc = getActiveCoords();
      const tomT = calculatePrayerTimes(tom, loc.lat, loc.lng, state.madhab, -now.getTimezoneOffset() / 60);
      next = { name: 'ফজর', time: tomT.fajr };
    }
    const diff = Math.max(0, next.time - now);
    const h = String(Math.floor(diff / 3600000)).padStart(2, '0');
    const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
    const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
    document.getElementById('nextWaqtName').textContent = next.name;
    document.getElementById('nextWaqtCountdown').textContent = fmtNum(`${h}:${m}:${s}`);
    document.getElementById('nextWaqtAt').textContent = formatTimeShort(next.time, state.lang);
  }

  // ==================== ULTRA-FAST TASBIH ENGINE ====================
  const RING_C = 2 * Math.PI * 97;

  function getActiveTasbih() {
    return state.tasbihList.find(t => t.id === state.activeTasbihId) || state.tasbihList[0];
  }

  function recordTasbihStat(tasbihId, delta) {
    let st = state.tasbihStats[tasbihId] || { dayKey: DAY_KEY, day: 0, monthKey: MONTH_KEY, month: 0, yearKey: YEAR_KEY, year: 0 };
    if (st.dayKey !== DAY_KEY) { st.dayKey = DAY_KEY; st.day = 0; }
    if (st.monthKey !== MONTH_KEY) { st.monthKey = MONTH_KEY; st.month = 0; }
    if (st.yearKey !== YEAR_KEY) { st.yearKey = YEAR_KEY; st.year = 0; }
    st.day += delta;
    st.month += delta;
    st.year += delta;
    state.tasbihStats[tasbihId] = st;
  }

  function renderTasbihPresets() {
    const wrap = document.getElementById('tasbihPresets');
    wrap.innerHTML = '';
    state.tasbihList.forEach(t => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `preset-chip ${t.id === state.activeTasbihId ? 'active' : ''}`;
      btn.textContent = t.label;
      btn.addEventListener('click', () => {
        state.activeTasbihId = t.id;
        saveState();
        renderTasbihPresets();
        updateTasbihDisplay();
      });
      wrap.appendChild(btn);
    });
  }

  // Fast DOM-only update (zero full re-render on tap!)
  function updateTasbihDisplay() {
    const t = getActiveTasbih();
    const count = state.tasbihCounts[t.id] || 0;
    const target = Number(t.target) || 0;

    document.getElementById('tasbihArabic').textContent = t.arabic || t.label;
    document.getElementById('tasbihMeaning').textContent = t.meaning || '';
    document.getElementById('tasbihCount').textContent = fmtNum(count);
    document.getElementById('tasbihTargetLabel').textContent = target > 0 ? `/ ${fmtNum(target)}` : '/ অসীম';
    document.getElementById('customTargetInput').placeholder = `লক্ষ্য (বর্তমান: ${target > 0 ? fmtNum(target) : 'অসীম'})`;
    document.getElementById('soundStateText').textContent = state.tasbihSound ? 'সাউন্ড চালু' : 'সাউন্ড বন্ধ';

    const inner = document.getElementById('tasbihBtnInner');
    const prog = document.getElementById('tasbihProgress');
    const done = target > 0 && count >= target;
    inner.classList.toggle('completed', done);

    if (target > 0) {
      prog.style.strokeDashoffset = RING_C * (1 - Math.min(1, count / target));
    } else {
      prog.style.strokeDashoffset = RING_C * 0.75;
    }
  }

  function renderTasbihSummary() {
    const tbody = document.getElementById('tasbihSummaryBody');
    let totalToday = 0;
    tbody.innerHTML = state.tasbihList.map(t => {
      const st = state.tasbihStats[t.id] || {};
      const d = st.dayKey === DAY_KEY ? (st.day || 0) : 0;
      const m = st.monthKey === MONTH_KEY ? (st.month || 0) : 0;
      const y = st.yearKey === YEAR_KEY ? (st.year || 0) : 0;
      totalToday += d;
      return `<tr>
        <td>${t.label}</td>
        <td class="num">${fmtNum(d)}</td>
        <td class="num">${fmtNum(m)}</td>
        <td class="num">${fmtNum(y)}</td>
      </tr>`;
    }).join('');
    document.getElementById('totalAllToday').textContent = `আজ: ${fmtNum(totalToday)}`;
  }

  function handleInstantTasbihTap() {
    const t = getActiveTasbih();
    const target = Number(t.target) || 0;
    const current = state.tasbihCounts[t.id] || 0;

    // Hard stop at target!
    if (target > 0 && current >= target) {
      showToast('লক্ষ্য পূর্ণ হয়েছে ✅', `${t.label} — ${fmtNum(target)} বার সম্পন্ন! নতুন করে গুনতে রিসেট দিন।`);
      return;
    }

    const next = current + 1;
    state.tasbihCounts[t.id] = next;
    recordTasbihStat(t.id, 1);

    if (target > 0 && next === target) {
      playCompleteChime();
      showToast('মাশাআল্লাহ! লক্ষ্য পূর্ণ ✅', `${t.label} — ${fmtNum(target)} বার সম্পন্ন হয়েছে।`);
    } else {
      playClick();
    }

    updateTasbihDisplay();
    renderTasbihSummary();
    saveState();
  }

  // ==================== NAMAZ & NAFAL ACCORDION ====================
  function renderNamazTab() {
    const data = window.NAMAZ_DATA;
    document.getElementById('namazAccordion').innerHTML = data.prayers.map(p => `
      <div class="acc-item">
        <button class="acc-header" type="button"><span>${p.title}</span><span>▾</span></button>
        <div class="acc-body">
          <div class="arabic-text">${p.arabic}</div>
          <div class="pronun">${p.pronun}</div>
          <div class="meaning">${p.meaning}</div>
        </div>
      </div>
    `).join('');

    document.getElementById('nafalAccordion').innerHTML = data.nafal.map(n => `
      <div class="acc-item">
        <button class="acc-header" type="button"><span>${n.title}</span><span>▾</span></button>
        <div class="acc-body" style="white-space: pre-line;">${n.body}</div>
      </div>
    `).join('');

    document.querySelectorAll('.acc-header').forEach(btn => {
      btn.addEventListener('click', () => btn.parentElement.classList.toggle('open'));
    });
  }

  // ==================== REMINDERS + QUIET HOURS ====================
  function parseHHMM(str) {
    const [h, m] = (str || '00:00').split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }

  function isInQuietWindow(nowDate, startStr, endStr) {
    const cur = nowDate.getHours() * 60 + nowDate.getMinutes();
    const s = parseHHMM(startStr);
    const e = parseHHMM(endStr);
    if (s <= e) return cur >= s && cur < e;
    return cur >= s || cur < e; // spans midnight (e.g. 22:00 -> 07:00)
  }

  function isQuietNow(date = new Date()) {
    if (state.quiet1On && isInQuietWindow(date, state.quiet1Start, state.quiet1End)) return true;
    if (state.quiet2On && isInQuietWindow(date, state.quiet2Start, state.quiet2End)) return true;
    return false;
  }

  let lastVoiceTime = 0;
  function triggerReminder(type, isTest = false) {
    if (!isTest && isQuietNow()) return;

    // Prevent overlap if both fire at the exact same second
    const nowMs = Date.now();
    const delay = nowMs - lastVoiceTime < 3500 ? 3500 : 0;
    lastVoiceTime = nowMs + delay;

    setTimeout(() => {
      const isDurood = type === 'durood';
      const title = isDurood ? '🕌 দুরুদ শরীফ রিমাইন্ডার' : '🤲 ইস্তেগফার রিমাইন্ডার';
      const body = isDurood ? 'দুরুদ পড়ুন' : 'নিজের পাপের জন্য ক্ষমা চান';
      playVoiceClip(type);
      showToast(title, body);
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body, icon: './icon.svg' });
      }
    }, delay);
  }

  let duroodTimer = null;
  let istighfarTimer = null;

  async function syncNativeAndroidNotifications() {
    const LN = window.Capacitor?.Plugins?.LocalNotifications;
    if (!LN) return;
    try {
      const perm = await LN.requestPermissions();
      if (perm.display !== 'granted') return;

      await LN.createChannel({ id: 'durood_channel', name: 'দুরুদ রিমাইন্ডার', sound: 'durood_reminder.mp3', importance: 5, visibility: 1 });
      await LN.createChannel({ id: 'istighfar_channel', name: 'ইস্তেগফার রিমাইন্ডার', sound: 'istighfar_reminder.mp3', importance: 5, visibility: 1 });

      // Cancel previous scheduled reminders (IDs 200..260)
      const pending = await LN.getPending();
      if (pending?.notifications?.length) {
        await LN.cancel({ notifications: pending.notifications.map(n => ({ id: n.id })) });
      }

      // Schedule next 24 hours of non-quiet-hour reminders (max 50 to stay within Android limits)
      const list = [];
      let nextId = 200;
      const nowMs = Date.now();
      const horizonMs = nowMs + 12 * 3600 * 1000;

      if (state.duroodOn && state.duroodMin >= 1) {
        for (let t = nowMs + state.duroodMin * 60000; t <= horizonMs && list.length < 25; t += state.duroodMin * 60000) {
          const dt = new Date(t);
          if (!isQuietNow(dt)) {
            list.push({ id: nextId++, title: '🕌 দুরুদ শরীফ রিমাইন্ডার', body: 'দুরুদ পড়ুন', channelId: 'durood_channel', sound: 'durood_reminder.mp3', schedule: { at: dt, allowWhileIdle: true } });
          }
        }
      }

      if (state.istighfarOn && state.istighfarMin >= 1) {
        for (let t = nowMs + state.istighfarMin * 60000; t <= horizonMs && list.length < 50; t += state.istighfarMin * 60000) {
          const dt = new Date(t + 5000); // +5s offset so it never collides with Durood
          if (!isQuietNow(dt)) {
            list.push({ id: nextId++, title: '🤲 ইস্তেগফার রিমাইন্ডার', body: 'নিজের পাপের জন্য ক্ষমা চান', channelId: 'istighfar_channel', sound: 'istighfar_reminder.mp3', schedule: { at: dt, allowWhileIdle: true } });
          }
        }
      }

      if (list.length) await LN.schedule({ notifications: list });
    } catch (_) {}
  }

  function scheduleReminders() {
    clearInterval(duroodTimer);
    clearInterval(istighfarTimer);
    const anyOn = state.duroodOn || state.istighfarOn;
    document.getElementById('reminderStatusBadge').textContent = anyOn ? 'চালু' : 'বন্ধ';

    if (state.duroodOn && state.duroodMin >= 1) {
      duroodTimer = setInterval(() => triggerReminder('durood'), state.duroodMin * 60000);
    }
    if (state.istighfarOn && state.istighfarMin >= 1) {
      istighfarTimer = setInterval(() => triggerReminder('istighfar'), state.istighfarMin * 60000);
    }
    syncNativeAndroidNotifications();
  }

  // ==================== INIT ====================
  function init() {
    // Sync UI controls
    document.body.classList.toggle('dark', state.darkMode);
    document.getElementById('darkModeToggle').checked = state.darkMode;
    document.getElementById('hijriAdjustSelect').value = String(state.hijriAdjust);
    document.getElementById('madhabSelect').value = state.madhab;
    document.getElementById('langSelect').value = state.lang;

    document.getElementById('duroodToggle').checked = state.duroodOn;
    document.getElementById('duroodMinutes').value = state.duroodMin;
    document.getElementById('istighfarToggle').checked = state.istighfarOn;
    document.getElementById('istighfarMinutes').value = state.istighfarMin;
    document.getElementById('quiet1Toggle').checked = state.quiet1On;
    document.getElementById('quiet1Start').value = state.quiet1Start;
    document.getElementById('quiet1End').value = state.quiet1End;
    document.getElementById('quiet2Toggle').checked = state.quiet2On;
    document.getElementById('quiet2Start').value = state.quiet2Start;
    document.getElementById('quiet2End').value = state.quiet2End;

    // Nav
    document.querySelectorAll('.nav-item').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));
    document.getElementById('locationBtn').addEventListener('click', () => switchTab('settings'));

    // Ultra-fast Tasbih pointerdown listener on entire circle
    const tapZone = document.getElementById('tasbihTapZone');
    tapZone.addEventListener('pointerdown', e => {
      e.preventDefault();
      tapZone.classList.add('pressed');
      handleInstantTasbihTap();
      setTimeout(() => tapZone.classList.remove('pressed'), 70);
    });

    document.getElementById('tasbihResetBtn').addEventListener('click', () => {
      const t = getActiveTasbih();
      state.tasbihCounts[t.id] = 0;
      saveState();
      updateTasbihDisplay();
    });

    document.getElementById('tasbihSoundBtn').addEventListener('click', () => {
      state.tasbihSound = !state.tasbihSound;
      saveState();
      updateTasbihDisplay();
    });

    document.getElementById('saveTargetBtn').addEventListener('click', () => {
      const val = parseInt(document.getElementById('customTargetInput').value, 10);
      if (isNaN(val) || val < 0) return;
      const t = getActiveTasbih();
      t.target = val;
      document.getElementById('customTargetInput').value = '';
      saveState();
      updateTasbihDisplay();
      showToast('লক্ষ্য সেট হয়েছে', `${t.label} — নতুন লক্ষ্য: ${val === 0 ? 'অসীম' : fmtNum(val)}`);
    });

    document.getElementById('manualAddBtn').addEventListener('click', () => {
      const val = parseInt(document.getElementById('manualAddInput').value, 10);
      if (isNaN(val) || val <= 0) return;
      const t = getActiveTasbih();
      recordTasbihStat(t.id, val);
      document.getElementById('manualAddInput').value = '';
      saveState();
      renderTasbihSummary();
      showToast('তসবিহ যোগ হয়েছে ✅', `${t.label} (+${fmtNum(val)}) সামারিতে যুক্ত হয়েছে।`);
    });

    document.getElementById('addCustomTasbihBtn').addEventListener('click', () => {
      const name = document.getElementById('newTasbihName').value.trim();
      const target = parseInt(document.getElementById('newTasbihTarget').value, 10) || 100;
      if (!name) return;
      const id = 'custom_' + Date.now();
      state.tasbihList.push({ id, label: name, arabic: name, meaning: 'কাস্টম তসবিহ', target });
      state.activeTasbihId = id;
      document.getElementById('newTasbihName').value = '';
      saveState();
      renderTasbihPresets();
      updateTasbihDisplay();
      renderTasbihSummary();
      showToast('নতুন তসবিহ যুক্ত হয়েছে', name);
    });

    // Save Reminders
    document.getElementById('saveRemindersBtn').addEventListener('click', () => {
      state.duroodOn = document.getElementById('duroodToggle').checked;
      state.duroodMin = Math.max(1, parseInt(document.getElementById('duroodMinutes').value, 10) || 15);
      state.istighfarOn = document.getElementById('istighfarToggle').checked;
      state.istighfarMin = Math.max(1, parseInt(document.getElementById('istighfarMinutes').value, 10) || 20);
      state.quiet1On = document.getElementById('quiet1Toggle').checked;
      state.quiet1Start = document.getElementById('quiet1Start').value;
      state.quiet1End = document.getElementById('quiet1End').value;
      state.quiet2On = document.getElementById('quiet2Toggle').checked;
      state.quiet2Start = document.getElementById('quiet2Start').value;
      state.quiet2End = document.getElementById('quiet2End').value;
      saveState();
      scheduleReminders();
      showToast('✅ রিমাইন্ডার সেভ হয়েছে', `দুরুদ: ${fmtNum(state.duroodMin)} মি. | ইস্তেগফার: ${fmtNum(state.istighfarMin)} মি.`);
    });

    document.getElementById('testDuroodBtn').addEventListener('click', () => triggerReminder('durood', true));
    document.getElementById('testIstighfarBtn').addEventListener('click', () => triggerReminder('istighfar', true));

    // Settings
    document.getElementById('detectGpsBtn').addEventListener('click', () => detectGps(false));
    document.getElementById('divisionSelect').addEventListener('change', e => {
      state.divisionId = e.target.value;
      const firstDist = BD_DISTRICTS.find(d => d.div === state.divisionId);
      if (firstDist) state.districtId = firstDist.id;
      state.useGps = false;
      saveState();
      renderDivisionDistricts();
      updatePrayerTimes();
    });
    document.getElementById('districtSelect').addEventListener('change', e => {
      state.districtId = e.target.value;
      state.useGps = false;
      saveState();
      updatePrayerTimes();
    });
    document.getElementById('hijriAdjustSelect').addEventListener('change', e => {
      state.hijriAdjust = Number(e.target.value);
      saveState();
      updatePrayerTimes();
    });
    document.getElementById('madhabSelect').addEventListener('change', e => {
      state.madhab = e.target.value;
      saveState();
      updatePrayerTimes();
    });
    document.getElementById('langSelect').addEventListener('change', e => {
      state.lang = e.target.value;
      saveState();
      renderDivisionDistricts();
      updatePrayerTimes();
      updateTasbihDisplay();
      renderTasbihSummary();
    });
    document.getElementById('darkModeToggle').addEventListener('change', e => {
      state.darkMode = e.target.checked;
      document.body.classList.toggle('dark', state.darkMode);
      saveState();
    });

    renderDivisionDistricts();
    updatePrayerTimes();
    renderTasbihPresets();
    updateTasbihDisplay();
    renderTasbihSummary();
    renderNamazTab();
    scheduleReminders();

    setInterval(updateCountdown, 1000);
  }

  init();
})();
