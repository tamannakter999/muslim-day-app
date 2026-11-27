// Muslim Day v4 — Ultra-Lightweight, Fast, Offline-First Mobile App
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
    { id: 'subhanallah', label: 'সুবহানাল্লাহ', arabic: 'سُبْحَانَ اللَّهِ', meaning: 'সুবহানাল্লাহ — আল্লাহ পবিত্র', target: 33 },
    { id: 'alhamdulillah', label: 'আলহামদুলিল্লাহ', arabic: 'الْحَمْدُ لِلَّهِ', meaning: 'আলহামদুলিল্লাহ — সকল প্রশংসা আল্লাহর', target: 33 },
    { id: 'allahuakbar', label: 'আল্লাহু আকবার', arabic: 'اللَّهُ أَكْبَرُ', meaning: 'আল্লাহু আকবার — আল্লাহ সর্বশ্রেষ্ঠ', target: 34 },
    { id: 'astaghfirullah', label: 'আস্তাগফিরুল্লাহ', arabic: 'أَسْتَغْفِرُ اللَّهَ', meaning: 'আস্তাগফিরুল্লাহ — আমি আল্লাহর কাছে ক্ষমা চাই', target: 100 },
    { id: 'durood', label: 'দরূদ শরীফ', arabic: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ', meaning: 'আল্লাহুম্মা সাল্লি আলা মুহাম্মাদ', target: 100 },
    { id: 'kalima', label: 'লা ইলাহা ইল্লাল্লাহ', arabic: 'لَا إِلَهَ إِلَّا اللَّهُ', meaning: 'আল্লাহ ছাড়া কোনো মাবুদ নেই', target: 100 }
  ];

  const now0 = new Date();
  const DAY_KEY = now0.toISOString().slice(0, 10);
  const MONTH_KEY = DAY_KEY.slice(0, 7);
  const YEAR_KEY = DAY_KEY.slice(0, 4);

  const saved = JSON.parse(localStorage.getItem('muslim_day_v4') || localStorage.getItem('muslim_day_v3') || '{}');
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
    tasbihCounts: saved.tasbihCounts || {},
    tasbihSound: saved.tasbihSound !== undefined ? saved.tasbihSound : true,
    tasbihStats: saved.tasbihStats || {},

    // Multi-date Amol History: { 'YYYY-MM-DD': { namaz: {...}, amal: {...} } }
    amolHistory: saved.amolHistory || {},

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
    quiet2End: saved.quiet2End || '17:00',
    reminderVibrate: saved.reminderVibrate !== undefined ? !!saved.reminderVibrate : true
  };

  let savePending = false;
  function saveState() {
    if (savePending) return;
    savePending = true;
    setTimeout(() => {
      localStorage.setItem('muslim_day_v4', JSON.stringify(state));
      savePending = false;
    }, 150);
  }

  const fmtNum = n => (state.lang === 'bn' ? toBanglaDigits(n) : String(n));

  // ==================== AUDIO ENGINE WITH SEQUENTIAL VOICE QUEUE ====================
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

  // Sequential queue so if Durood & Istighfar trigger together, #1 finishes then #2 speaks!
  const voiceQueue = [];
  let isSpeaking = false;

  function enqueueVoice(type) {
    voiceQueue.push(type);
    if (!isSpeaking) processVoiceQueue();
  }

  function processVoiceQueue() {
    if (!voiceQueue.length) { isSpeaking = false; return; }
    isSpeaking = true;
    const type = voiceQueue.shift();
    const isDurood = type === 'durood';
    const src = isDurood ? './audio/durood_reminder.mp3' : './audio/istighfar_reminder.mp3';
    const title = isDurood ? '🕌 দুরুদ শরীফ রিমাইন্ডার' : '🤲 ইস্তেগফার রিমাইন্ডার';
    const body = isDurood ? 'দুরুদ পড়ুন' : 'নিজের পাপের জন্য ক্ষমা চান';

    showToast(title, body);
    if (state.reminderVibrate && navigator.vibrate) navigator.vibrate([180, 80, 180]);
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: './icon.png' });
    }

    const done = () => setTimeout(processVoiceQueue, 450);
    try {
      const audio = new Audio(src);
      audio.volume = 1.0;
      audio.onended = done;
      audio.onerror = done;
      const ctx = getCtx();
      const source = ctx.createMediaElementSource(audio);
      const gain = ctx.createGain();
      gain.gain.value = 1.9;
      source.connect(gain); gain.connect(ctx.destination);
      audio.play().catch(done);
    } catch (_) {
      const f = new Audio(src);
      f.onended = done; f.onerror = done;
      f.play().catch(done);
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

  function switchTab(name) {
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.getElementById(`tab-${name}`)?.classList.add('active');
    document.querySelector(`.nav-item[data-tab="${name}"]`)?.classList.add('active');
  }

  // ==================== LOCATION ====================
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
      state.useGps = true; state.gpsLat = lat; state.gpsLng = lng; state.gpsCity = 'GPS লোকেশন';
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
      saveState(); updatePrayerTimes();
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
    BD_DISTRICTS.filter(d => d.div === state.divisionId).forEach(d => {
      const o = document.createElement('option');
      o.value = d.id; o.textContent = state.lang === 'bn' ? d.nameBn : d.nameEn;
      if (d.id === state.districtId) o.selected = true;
      distSel.appendChild(o);
    });
  }

  // ==================== AYYAM AL-BEED GREGORIAN DATE FINDER ====================
  function getUpcomingAyyamDates(fromDate) {
    const found = [];
    for (let i = 0; i < 32 && found.length < 3; i++) {
      const d = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate() + i);
      const h = gregorianToHijri(d, state.hijriAdjust);
      if ([13, 14, 15].includes(h.day)) found.push(d);
    }
    return found;
  }

  function formatShortBnDate(d) {
    return new Intl.DateTimeFormat('bn-BD', { day: 'numeric', month: 'long' }).format(d);
  }

  // ==================== PRAYER TIMES & DAILY TRACKER ====================
  let currentTimes = null;
  function updatePrayerTimes() {
    const now = new Date();
    const loc = getActiveCoords();
    const tz = -now.getTimezoneOffset() / 60;

    document.getElementById('currentDistrictLabel').textContent = loc.label;
    document.getElementById('hijriDate').textContent = getHijriDateString(now, state.lang, state.hijriAdjust);
    document.getElementById('gregorianDate').textContent = getGregorianDate(now, state.lang);
    document.getElementById('madhabBadge').textContent = state.madhab === 'hanafi' ? 'হানাফী' : 'শাফেয়ী';

    // Special Day + Ayyam al-Beed Exact Gregorian Dates
    const hijri = gregorianToHijri(now, state.hijriAdjust);
    const ayyamDates = getUpcomingAyyamDates(now);
    const ayyamText = ayyamDates.length ? ayyamDates.map(formatShortBnDate).join(', ') : '';
    const ayyamBox = document.getElementById('ayyamInfoBox');
    if (ayyamBox && ayyamText) {
      ayyamBox.textContent = `📅 এই মাসে আইয়ামে বীজের রোজা: ${ayyamText}`;
    }

    const alerts = [];
    if ([13, 14, 15].includes(hijri.day)) alerts.push(`🌙 আজ আইয়ামে বীজের রোজার দিন (${fmtNum(hijri.day)} তারিখ)`);
    else if (ayyamDates.length) {
      const daysLeft = Math.round((ayyamDates[0] - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
      if (daysLeft === 1 || daysLeft === 2 || daysLeft === 7 || hijri.day === 1) {
        alerts.push(`🌙 আইয়ামে বীজের রোজা আসছে: ${ayyamText}`);
      }
    }
    const dow = now.getDay();
    if (dow === 1 || dow === 4) alerts.push(`📅 আজ ${dow === 1 ? 'সোমবার' : 'বৃহস্পতিবার'} — সুন্নাহ নফল রোজার দিন`);
    if (hijri.month === 8 && hijri.day === 14) alerts.push('✨ আজ দিবাগত রাত শবে বরাত');
    if (hijri.month === 9 && hijri.day >= 21 && hijri.day % 2 === 1) alerts.push('✨ রমজানের বিজোড় রাত — শবে কদর তালাশ করুন');

    const banner = document.getElementById('specialDayBanner');
    if (alerts.length) {
      banner.style.display = 'block';
      document.getElementById('specialDayText').textContent = alerts.join(' • ');
    } else banner.style.display = 'none';

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

    const nf = currentTimes.nafal;
    document.getElementById('nafalTimesList').innerHTML = `
      <div class="prayer-item"><div class="prayer-left"><span>🌤️</span><div class="prayer-name">ইশরাক</div></div><div class="prayer-time">${formatTimeShort(nf.ishraqStart, state.lang)} – ${formatTimeShort(nf.ishraqEnd, state.lang)}</div></div>
      <div class="prayer-item"><div class="prayer-left"><span>☀️</span><div class="prayer-name">চাশত (দুহা)</div></div><div class="prayer-time">${formatTimeShort(nf.chashtStart, state.lang)} – ${formatTimeShort(nf.chashtEnd, state.lang)}</div></div>
    `;

    const fb = currentTimes.forbidden;
    document.getElementById('forbiddenList').innerHTML = `
      <div class="prayer-item forbidden-row"><div class="prayer-name">সূর্যোদয়ের সময়</div><div class="prayer-time">${formatTimeShort(fb.sunriseStart, state.lang)} – ${formatTimeShort(fb.sunriseEnd, state.lang)}</div></div>
      <div class="prayer-item forbidden-row"><div class="prayer-name">দ্বিপ্রহর (যাওয়াল)</div><div class="prayer-time">${formatTimeShort(fb.zawalStart, state.lang)} – ${formatTimeShort(fb.zawalEnd, state.lang)}</div></div>
      <div class="prayer-item forbidden-row"><div class="prayer-name">সূর্যাস্তের সময়</div><div class="prayer-time">${formatTimeShort(fb.sunsetStart, state.lang)} – ${formatTimeShort(fb.sunsetEnd, state.lang)}</div></div>
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

  // ==================== CHRONOLOGICAL AMOL TRACKER & REPORTS ====================
  const AMOL_FLOW = [
    {
      group: '🌅 ফজর ও সকালের আমল',
      namazKey: 'fajr', namazLabel: 'ফজর নামাজ',
      amals: [
        { k: 'fajr_ayatul', l: 'ফজরের পর আয়াতুল কুরসী' },
        { k: 'morning_istighfar', l: 'সকালের সাইয়্যিদুল ইস্তিগফার' },
        { k: 'morning_quran', l: 'সকালের কুরআন তিলাওয়াত' }
      ]
    },
    {
      group: '☀️ যোহরের আমল',
      namazKey: 'dhuhr', namazLabel: 'যোহর নামাজ',
      amals: [{ k: 'dhuhr_ayatul', l: 'যোহরের পর আয়াতুল কুরসী' }]
    },
    {
      group: '🌤️ আসর ও সন্ধ্যার আমল',
      namazKey: 'asr', namazLabel: 'আসর নামাজ',
      amals: [
        { k: 'asr_ayatul', l: 'আসরের পর আয়াতুল কুরসী' },
        { k: 'evening_istighfar', l: 'সন্ধ্যার সাইয়্যিদুল ইস্তিগফার' }
      ]
    },
    {
      group: '🌇 মাগরিবের আমল',
      namazKey: 'maghrib', namazLabel: 'মাগরিব নামাজ',
      amals: [{ k: 'maghrib_ayatul', l: 'মাগরিবের পর আয়াতুল কুরসী' }]
    },
    {
      group: '🌙 এশা ও রাতের আমল',
      namazKey: 'isha', namazLabel: 'এশা নামাজ',
      amals: [
        { k: 'isha_ayatul', l: 'এশার পর আয়াতুল কুরসী' },
        { k: 'night_mulk', l: 'ঘুমের আগে সূরা মুলক / তসবিহ' }
      ]
    }
  ];

  let selectedAmolDate = DAY_KEY;
  let reportMode = 'daily'; // daily | monthly | yearly | custom

  function getDayRecord(dateStr) {
    if (!state.amolHistory[dateStr]) {
      state.amolHistory[dateStr] = {
        namaz: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
        amal: {}
      };
    }
    return state.amolHistory[dateStr];
  }

  function renderAmolReport() {
    const fromVal = document.getElementById('reportFromDate').value || DAY_KEY;
    const toVal = document.getElementById('reportToDate').value || DAY_KEY;
    const selMonth = selectedAmolDate.slice(0, 7);
    const selYear = selectedAmolDate.slice(0, 4);

    let keys = [];
    let title = '📊 দৈনিক রিপোর্ট';
    if (reportMode === 'daily') {
      keys = [selectedAmolDate];
      title = selectedAmolDate === DAY_KEY ? '📊 আজকের রিপোর্ট' : `📊 রিপোর্ট (${selectedAmolDate})`;
    } else if (reportMode === 'monthly') {
      keys = Object.keys(state.amolHistory).filter(k => k.startsWith(selMonth));
      if (!keys.length) keys = [selectedAmolDate];
      title = `📊 মাসিক রিপোর্ট (${selMonth})`;
    } else if (reportMode === 'yearly') {
      keys = Object.keys(state.amolHistory).filter(k => k.startsWith(selYear));
      if (!keys.length) keys = [selectedAmolDate];
      title = `📊 বার্ষিক রিপোর্ট (${selYear})`;
    } else {
      keys = Object.keys(state.amolHistory).filter(k => k >= fromVal && k <= toVal);
      title = `📊 কাস্টম রিপোর্ট (${fromVal} → ${toVal})`;
    }

    let done = 0, qaza = 0, amalDone = 0, amalTotal = 0;
    const totalAmalsPerDay = 9;
    keys.forEach(k => {
      const rec = state.amolHistory[k];
      if (!rec) return;
      Object.values(rec.namaz || {}).forEach(v => { if (v === 1) done++; else if (v === 2) qaza++; });
      Object.values(rec.amal || {}).forEach(v => { if (v) amalDone++; });
      amalTotal += totalAmalsPerDay;
    });

    const pct = amalTotal > 0 ? Math.round((amalDone / amalTotal) * 100) : 0;
    document.getElementById('reportSummaryTitle').textContent = title;
    document.getElementById('repNamazDone').textContent = fmtNum(done);
    document.getElementById('repNamazQaza').textContent = fmtNum(qaza);
    document.getElementById('repAmalPct').textContent = fmtNum(pct) + '%';
    document.getElementById('namazTrackerBadge').textContent = `আদায়: ${fmtNum(done)} | কাজা: ${fmtNum(qaza)}`;
  }

  function renderTracker() {
    const rec = getDayRecord(selectedAmolDate);
    const wrap = document.getElementById('chronologicalAmolFlow');
    wrap.innerHTML = '';

    AMOL_FLOW.forEach(block => {
      const sec = document.createElement('div');
      sec.style.cssText = 'margin-bottom:12px; padding-bottom:10px; border-bottom:1px solid var(--border);';

      const hdr = document.createElement('div');
      hdr.style.cssText = 'font-size:13px; font-weight:700; color:var(--primary); margin-bottom:7px;';
      hdr.textContent = block.group;
      sec.appendChild(hdr);

      // Namaz button (cycles: pending -> done -> qaza)
      const nState = rec.namaz[block.namazKey] || 0;
      const nBtn = document.createElement('button');
      nBtn.type = 'button';
      nBtn.className = 'prayer-item';
      nBtn.style.cssText = `width:100%; margin-bottom:6px; cursor:pointer; font-family:inherit; color:var(--text); ${
        nState === 1 ? 'background:var(--primary-light); border-color:var(--primary);' :
        nState === 2 ? 'background:var(--danger-soft); border-color:var(--danger);' : ''
      }`;
      nBtn.innerHTML = `<span style="font-weight:600; font-size:13.5px;">${block.namazLabel}</span><span style="font-size:13px;">${nState === 1 ? '✅ আদায়' : nState === 2 ? '⚠️ কাজা' : '⬜ বাকি'}</span>`;
      nBtn.addEventListener('click', () => {
        rec.namaz[block.namazKey] = (nState + 1) % 3;
        saveState();
        renderTracker();
      });
      sec.appendChild(nBtn);

      // Related Amals right under that prayer
      block.amals.forEach(a => {
        const checked = !!rec.amal[a.k];
        const aBtn = document.createElement('button');
        aBtn.type = 'button';
        aBtn.className = 'prayer-item';
        aBtn.style.cssText = `width:100%; margin-bottom:5px; padding:8px 12px; cursor:pointer; font-family:inherit; color:var(--text); ${checked ? 'background:var(--primary-light); border-color:var(--primary);' : ''}`;
        aBtn.innerHTML = `<span style="font-size:12.5px;">↳ ${a.l}</span><span>${checked ? '✅' : '⬜'}</span>`;
        aBtn.addEventListener('click', () => {
          rec.amal[a.k] = !checked;
          saveState();
          renderTracker();
        });
        sec.appendChild(aBtn);
      });

      wrap.appendChild(sec);
    });

    renderAmolReport();

    // Daily Quran & Hadith on Home
    const qh = window.NAMAZ_DATA.dailyQuranHadith;
    const idx = now0.getDate() % qh.length;
    document.getElementById('dailyQuranText').textContent = qh[idx].quran;
    document.getElementById('dailyHadithText').textContent = qh[idx].hadith;
  }

  // ==================== ULTRA-FAST TASBIH + FULL CRUD ====================
  const RING_C = 2 * Math.PI * 97;
  let editingTasbihId = null;

  function getActiveTasbih() {
    return state.tasbihList.find(t => t.id === state.activeTasbihId) || state.tasbihList[0];
  }

  function recordTasbihStat(tasbihId, delta) {
    let st = state.tasbihStats[tasbihId] || { dayKey: DAY_KEY, day: 0, monthKey: MONTH_KEY, month: 0, yearKey: YEAR_KEY, year: 0 };
    if (st.dayKey !== DAY_KEY) { st.dayKey = DAY_KEY; st.day = 0; }
    if (st.monthKey !== MONTH_KEY) { st.monthKey = MONTH_KEY; st.month = 0; }
    if (st.yearKey !== YEAR_KEY) { st.yearKey = YEAR_KEY; st.year = 0; }
    st.day += delta; st.month += delta; st.year += delta;
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

  function updateTasbihDisplay() {
    const t = getActiveTasbih();
    if (!t) return;
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
    inner.classList.toggle('completed', target > 0 && count >= target);
    prog.style.strokeDashoffset = target > 0 ? RING_C * (1 - Math.min(1, count / target)) : RING_C * 0.75;
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
      return `<tr><td>${t.label}</td><td class="num">${fmtNum(d)}</td><td class="num">${fmtNum(m)}</td><td class="num">${fmtNum(y)}</td></tr>`;
    }).join('');
    document.getElementById('totalAllToday').textContent = `আজ: ${fmtNum(totalToday)}`;
  }

  function handleInstantTasbihTap() {
    const t = getActiveTasbih();
    if (!t) return;
    const target = Number(t.target) || 0;
    const current = state.tasbihCounts[t.id] || 0;
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
    } else playClick();

    updateTasbihDisplay();
    renderTasbihSummary();
    saveState();
  }

  // ==================== NAMAZ & AZKAR ACCORDION ====================
  function renderNamazTab() {
    const data = window.NAMAZ_DATA;
    const buildAcc = arr => arr.map(p => `
      <div class="acc-item">
        <button class="acc-header" type="button"><span>${p.title}</span><span>▾</span></button>
        <div class="acc-body">
          <div class="arabic-text" style="white-space:pre-line;">${p.arabic}</div>
          <div class="pronun" style="white-space:pre-line;">${p.pronun}</div>
          <div class="meaning" style="white-space:pre-line;">${p.meaning}</div>
        </div>
      </div>
    `).join('');

    document.getElementById('dailyAzkarAccordion').innerHTML = buildAcc(data.dailyAzkar);
    document.getElementById('namazAccordion').innerHTML = buildAcc(data.prayers);
    document.getElementById('nafalAccordion').innerHTML = data.nafal.map(n => `
      <div class="acc-item">
        <button class="acc-header" type="button"><span>${n.title}</span><span>▾</span></button>
        <div class="acc-body" style="white-space:pre-line;">${n.body}</div>
      </div>
    `).join('');

    document.querySelectorAll('.acc-header').forEach(btn => {
      btn.addEventListener('click', () => btn.parentElement.classList.toggle('open'));
    });

    // Lazy-render 99 Names of Allah on click (keeps app startup instant!)
    let asmaulRendered = false;
    document.getElementById('toggleAsmaulBtn').addEventListener('click', () => {
      const box = document.getElementById('asmaulContainer');
      const isHidden = box.style.display === 'none';
      box.style.display = isHidden ? 'block' : 'none';
      if (isHidden && !asmaulRendered && window.ASMAUL_HUSNA) {
        asmaulRendered = true;
        document.getElementById('asmaulFazilat').textContent = window.ASMAUL_HUSNA.fazilat;
        document.getElementById('asmaulList').innerHTML = window.ASMAUL_HUSNA.names.map((item, i) => `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:9px 4px; border-bottom:1px solid var(--border); gap:10px;">
            <div style="display:flex; align-items:center; gap:10px;">
              <span style="width:28px; height:28px; border-radius:50%; background:var(--primary-light); color:var(--primary); display:grid; place-items:center; font-size:12px; font-weight:700; flex-shrink:0;">${fmtNum(i + 1)}</span>
              <div>
                <div style="font-size:14px; font-weight:600;">${item[0]}</div>
                <div style="font-size:11.5px; color:var(--text-muted);">${item[2]}</div>
              </div>
            </div>
            <div style="font-size:19px; font-weight:700; color:var(--primary); direction:rtl;">${item[1]}</div>
          </div>
        `).join('');
      }
    });
  }

  // ==================== REMINDERS (FIXED SEPARATE CHANNELS + AYYAM AL-BEED) ====================
  function parseHHMM(str) {
    const [h, m] = (str || '00:00').split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }

  function isInQuietWindow(nowDate, startStr, endStr) {
    const cur = nowDate.getHours() * 60 + nowDate.getMinutes();
    const s = parseHHMM(startStr), e = parseHHMM(endStr);
    return s <= e ? (cur >= s && cur < e) : (cur >= s || cur < e);
  }

  function isQuietNow(date = new Date()) {
    if (state.quiet1On && isInQuietWindow(date, state.quiet1Start, state.quiet1End)) return true;
    if (state.quiet2On && isInQuietWindow(date, state.quiet2Start, state.quiet2End)) return true;
    return false;
  }

  let duroodTimer = null, istighfarTimer = null;

  async function syncNativeAndroidNotifications() {
    const LN = window.Capacitor?.Plugins?.LocalNotifications;
    if (!LN) return;
    try {
      const perm = await LN.requestPermissions();
      if (perm.display !== 'granted') return;

      // Separate channels for Vibration ON vs OFF so toggle works cleanly on Android!
      const vib = !!state.reminderVibrate;
      const dChan = vib ? 'durood_vib_v6' : 'durood_novib_v6';
      const iChan = vib ? 'istighfar_vib_v6' : 'istighfar_novib_v6';

      await LN.createChannel({ id: dChan, name: vib ? 'দুরুদ (ভয়েস+ভাইব্রেশন)' : 'দুরুদ (শুধু ভয়েস)', sound: 'durood_reminder.mp3', importance: 5, visibility: 1, vibration: vib });
      await LN.createChannel({ id: iChan, name: vib ? 'ইস্তেগফার (ভয়েস+ভাইব্রেশন)' : 'ইস্তেগফার (শুধু ভয়েস)', sound: 'istighfar_reminder.mp3', importance: 5, visibility: 1, vibration: vib });
      await LN.createChannel({ id: 'ayyam_ch_v5', name: 'আইয়ামে বীজ রিমাইন্ডার', importance: 4, visibility: 1, vibration: vib });

      const pending = await LN.getPending();
      if (pending?.notifications?.length) {
        await LN.cancel({ notifications: pending.notifications.map(n => ({ id: n.id })) });
      }
      await LN.removeAllDeliveredNotifications().catch(() => {});

      const list = [];
      let nextId = 500;
      const nowMs = Date.now();
      // Keep max 8 upcoming reminders per type so Android NEVER floods old stacked notifications
      const maxPerType = 8;
      const duroodTimes = [];

      if (state.duroodOn && state.duroodMin >= 1) {
        for (let i = 1; i <= maxPerType; i++) {
          const t = nowMs + i * state.duroodMin * 60000;
          const dt = new Date(t);
          if (!isQuietNow(dt)) {
            duroodTimes.push(t);
            list.push({
              id: nextId++, title: '🕌 দুরুদ শরীফ রিমাইন্ডার', body: 'দুরুদ পড়ুন',
              channelId: dChan, sound: 'durood_reminder.mp3',
              schedule: { at: dt, allowWhileIdle: true }
            });
          }
        }
      }

      if (state.istighfarOn && state.istighfarMin >= 1) {
        for (let i = 1; i <= maxPerType; i++) {
          let t = nowMs + i * state.istighfarMin * 60000;
          if (duroodTimes.some(dt => Math.abs(dt - t) < 35000)) t += 35000;
          const dt = new Date(t);
          if (!isQuietNow(dt)) {
            list.push({
              id: nextId++, title: '🤲 ইস্তেগফার রিমাইন্ডার', body: 'নিজের পাপের জন্য ক্ষমা চান',
              channelId: iChan, sound: 'istighfar_reminder.mp3',
              schedule: { at: dt, allowWhileIdle: true }
            });
          }
        }
      }

      // Schedule Ayyam al-Beed Reminders (7 days before, 2 days before morning/evening)
      const ayyamDates = getUpcomingAyyamDates(new Date());
      if (ayyamDates.length) {
        const firstDay = ayyamDates[0];
        const dateLabel = ayyamDates.map(formatShortBnDate).join(', ');
        const addAyyamAlert = (daysBefore, hour, msg) => {
          const d = new Date(firstDay.getFullYear(), firstDay.getMonth(), firstDay.getDate() - daysBefore, hour, 0, 0);
          if (d.getTime() > nowMs) {
            list.push({ id: nextId++, title: '🌙 আইয়ামে বীজের রোজা', body: msg, channelId: 'ayyam_ch_v4', schedule: { at: d, allowWhileIdle: true } });
          }
        };
        addAyyamAlert(7, 8, `৭ দিন পর এই মাসে আইয়ামে বীজের রোজা: ${dateLabel}`);
        addAyyamAlert(2, 8, `২ দিন পর আইয়ামে বীজের রোজা: ${dateLabel}`);
        addAyyamAlert(2, 17, `মনে রাখবেন—আইয়ামে বীজের রোজা: ${dateLabel}`);
        addAyyamAlert(1, 8, `আগামীকাল থেকে আইয়ামে বীজের রোজা: ${dateLabel}`);
        addAyyamAlert(1, 17, `আগামীকাল আইয়ামে বীজের রোজা—সাহরীর প্রস্তুতি নিন (${dateLabel})`);
      }

      if (list.length) await LN.schedule({ notifications: list });
    } catch (_) {}
  }

  function scheduleReminders() {
    clearInterval(duroodTimer);
    clearInterval(istighfarTimer);
    document.getElementById('reminderStatusBadge').textContent = (state.duroodOn || state.istighfarOn) ? 'চালু' : 'বন্ধ';

    if (state.duroodOn && state.duroodMin >= 1) {
      duroodTimer = setInterval(() => { if (!isQuietNow()) enqueueVoice('durood'); }, state.duroodMin * 60000);
    }
    if (state.istighfarOn && state.istighfarMin >= 1) {
      istighfarTimer = setInterval(() => { if (!isQuietNow()) enqueueVoice('istighfar'); }, state.istighfarMin * 60000);
    }
    syncNativeAndroidNotifications();
  }

  // ==================== INIT ====================
  function init() {
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
    document.getElementById('vibrateToggle').checked = state.reminderVibrate;

    document.querySelectorAll('.nav-item').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));
    document.getElementById('locationBtn').addEventListener('click', () => switchTab('settings'));
    document.getElementById('settingsTopBtn').addEventListener('click', () => switchTab('settings'));

    // Tasbih Instant Tap
    const tapZone = document.getElementById('tasbihTapZone');
    tapZone.addEventListener('pointerdown', e => {
      e.preventDefault();
      tapZone.classList.add('pressed');
      handleInstantTasbihTap();
      setTimeout(() => tapZone.classList.remove('pressed'), 65);
    });

    document.getElementById('tasbihResetBtn').addEventListener('click', () => {
      const t = getActiveTasbih();
      if (!t) return;
      state.tasbihCounts[t.id] = 0;
      saveState(); updateTasbihDisplay();
    });

    document.getElementById('tasbihSoundBtn').addEventListener('click', () => {
      state.tasbihSound = !state.tasbihSound;
      saveState(); updateTasbihDisplay();
    });

    // Collapsible Tasbih Customize Drawer
    document.getElementById('toggleTasbihToolsBtn').addEventListener('click', () => {
      const d = document.getElementById('tasbihToolsDrawer');
      d.style.display = d.style.display === 'none' ? 'block' : 'none';
    });

    // Amol Date & Report Mode Listeners
    const amolDateInput = document.getElementById('amolDatePicker');
    const fromInput = document.getElementById('reportFromDate');
    const toInput = document.getElementById('reportToDate');
    amolDateInput.value = selectedAmolDate;
    fromInput.value = MONTH_KEY + '-01';
    toInput.value = DAY_KEY;

    amolDateInput.addEventListener('change', e => {
      selectedAmolDate = e.target.value || DAY_KEY;
      renderTracker();
    });
    fromInput.addEventListener('change', renderAmolReport);
    toInput.addEventListener('change', renderAmolReport);

    document.querySelectorAll('.report-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        reportMode = btn.dataset.mode;
        document.querySelectorAll('.report-mode-btn').forEach(b => {
          b.style.background = ''; b.style.color = ''; b.style.borderColor = '';
        });
        btn.style.background = 'var(--primary)';
        btn.style.color = '#fff';
        btn.style.borderColor = 'var(--primary)';
        document.getElementById('customRangeRow').style.display = reportMode === 'custom' ? 'flex' : 'none';
        renderAmolReport();
      });
    });

    document.getElementById('saveTargetBtn').addEventListener('click', () => {
      const val = parseInt(document.getElementById('customTargetInput').value, 10);
      if (isNaN(val) || val < 0) return;
      const t = getActiveTasbih();
      t.target = val;
      document.getElementById('customTargetInput').value = '';
      saveState(); updateTasbihDisplay();
      showToast('লক্ষ্য সেট হয়েছে', `${t.label} — নতুন লক্ষ্য: ${val === 0 ? 'অসীম' : fmtNum(val)}`);
    });

    document.getElementById('manualAddBtn').addEventListener('click', () => {
      const val = parseInt(document.getElementById('manualAddInput').value, 10);
      if (isNaN(val) || val <= 0) return;
      const t = getActiveTasbih();
      recordTasbihStat(t.id, val);
      document.getElementById('manualAddInput').value = '';
      saveState(); renderTasbihSummary();
      showToast('তসবিহ যোগ হয়েছে ✅', `${t.label} (+${fmtNum(val)}) সামারিতে যুক্ত হয়েছে।`);
    });

    // Edit & Delete ANY Tasbih (including defaults!)
    document.getElementById('editTasbihBtn').addEventListener('click', () => {
      const t = getActiveTasbih();
      if (!t) return;
      editingTasbihId = t.id;
      document.getElementById('tasbihFormTitle').textContent = '✏️ তসবিহ এডিট করুন';
      document.getElementById('cancelEditTasbihBtn').style.display = 'inline-flex';
      document.getElementById('newTasbihName').value = t.label;
      document.getElementById('newTasbihTarget').value = t.target;
      document.getElementById('newTasbihArabic').value = t.arabic || '';
      document.getElementById('newTasbihMeaning').value = t.meaning || '';
      document.getElementById('newTasbihName').focus();
    });

    document.getElementById('cancelEditTasbihBtn').addEventListener('click', () => {
      editingTasbihId = null;
      document.getElementById('tasbihFormTitle').textContent = '➕ নতুন তসবিহ যোগ করুন';
      document.getElementById('cancelEditTasbihBtn').style.display = 'none';
      document.getElementById('newTasbihName').value = '';
      document.getElementById('newTasbihArabic').value = '';
      document.getElementById('newTasbihMeaning').value = '';
    });

    document.getElementById('deleteTasbihBtn').addEventListener('click', () => {
      if (state.tasbihList.length <= 1) {
        showToast('ডিলিট করা যাবে না', 'অন্তত ১টি তসবিহ থাকতে হবে।');
        return;
      }
      const t = getActiveTasbih();
      state.tasbihList = state.tasbihList.filter(x => x.id !== t.id);
      state.activeTasbihId = state.tasbihList[0].id;
      saveState();
      renderTasbihPresets(); updateTasbihDisplay(); renderTasbihSummary();
      showToast('🗑️ ডিলিট হয়েছে', `${t.label} মুছে ফেলা হয়েছে।`);
    });

    document.getElementById('addCustomTasbihBtn').addEventListener('click', () => {
      const label = document.getElementById('newTasbihName').value.trim();
      const target = parseInt(document.getElementById('newTasbihTarget').value, 10);
      const arabic = document.getElementById('newTasbihArabic').value.trim();
      const meaning = document.getElementById('newTasbihMeaning').value.trim();
      if (!label) return;

      if (editingTasbihId) {
        const t = state.tasbihList.find(x => x.id === editingTasbihId);
        if (t) {
          t.label = label;
          t.target = isNaN(target) ? 100 : target;
          t.arabic = arabic || label;
          t.meaning = meaning || '';
        }
        editingTasbihId = null;
        document.getElementById('tasbihFormTitle').textContent = '➕ নতুন তসবিহ যোগ করুন';
        document.getElementById('cancelEditTasbihBtn').style.display = 'none';
        showToast('✅ আপডেট হয়েছে', label);
      } else {
        const id = 'custom_' + Date.now();
        state.tasbihList.push({ id, label, arabic: arabic || label, meaning, target: isNaN(target) ? 100 : target });
        state.activeTasbihId = id;
        showToast('✅ নতুন তসবিহ যুক্ত হয়েছে', label);
      }

      document.getElementById('newTasbihName').value = '';
      document.getElementById('newTasbihArabic').value = '';
      document.getElementById('newTasbihMeaning').value = '';
      saveState(); renderTasbihPresets(); updateTasbihDisplay(); renderTasbihSummary();
    });

    // Reminders
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
      state.reminderVibrate = document.getElementById('vibrateToggle').checked;
      saveState(); scheduleReminders();
      showToast('✅ রিমাইন্ডার সেভ হয়েছে', `দুরুদ: ${fmtNum(state.duroodMin)} মি. | ইস্তেগফার: ${fmtNum(state.istighfarMin)} মি.`);
    });

    document.getElementById('testDuroodBtn').addEventListener('click', () => enqueueVoice('durood'));
    document.getElementById('testIstighfarBtn').addEventListener('click', () => enqueueVoice('istighfar'));

    // Settings
    document.getElementById('detectGpsBtn').addEventListener('click', () => detectGps(false));
    document.getElementById('divisionSelect').addEventListener('change', e => {
      state.divisionId = e.target.value;
      const f = BD_DISTRICTS.find(d => d.div === state.divisionId);
      if (f) state.districtId = f.id;
      state.useGps = false; saveState(); renderDivisionDistricts(); updatePrayerTimes();
    });
    document.getElementById('districtSelect').addEventListener('change', e => {
      state.districtId = e.target.value; state.useGps = false; saveState(); updatePrayerTimes();
    });
    document.getElementById('hijriAdjustSelect').addEventListener('change', e => {
      state.hijriAdjust = Number(e.target.value); saveState(); updatePrayerTimes(); syncNativeAndroidNotifications();
    });
    document.getElementById('madhabSelect').addEventListener('change', e => {
      state.madhab = e.target.value; saveState(); updatePrayerTimes();
    });
    document.getElementById('langSelect').addEventListener('change', e => {
      state.lang = e.target.value; saveState(); renderDivisionDistricts(); updatePrayerTimes(); updateTasbihDisplay(); renderTasbihSummary();
    });
    document.getElementById('darkModeToggle').addEventListener('change', e => {
      state.darkMode = e.target.checked; document.body.classList.toggle('dark', state.darkMode); saveState();
    });

    renderDivisionDistricts();
    updatePrayerTimes();
    renderTracker();
    renderTasbihPresets();
    updateTasbihDisplay();
    renderTasbihSummary();
    renderNamazTab();
    scheduleReminders();

    setInterval(updateCountdown, 1000);
  }

  init();
})();
