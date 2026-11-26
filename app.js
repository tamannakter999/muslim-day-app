// Muslim Day Offline Mobile App Logic (PWA + Capacitor Android)
(() => {
  const {
    BD_DISTRICTS,
    calculatePrayerTimes,
    toBanglaDigits,
    formatTimeShort,
    getHijriDate,
    getGregorianDate
  } = window.PrayerCalc;

  // Register Offline Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }

  // Translations
  const I18N = {
    bn: {
      appTitle: 'মুসলিম ডে',
      nextWaqt: 'পরবর্তী ওয়াক্ত',
      sehriLabel: 'সাহরীর শেষ সময়',
      iftarLabel: 'ইফতারের সময়',
      sehriSub: 'ফজরের ৩ মিনিট আগে',
      iftarSub: 'মাগরিবের ওয়াক্ত',
      prayerTimesTitle: 'আজকের নামাজের সময়সূচী',
      dailyZikrTitle: 'আজকের দরূদ ও ইস্তিগফার',
      reminderBtn: 'রিমাইন্ডার ↗',
      dailyIstighfarMeaning: 'আমি মহান আল্লাহর কাছে ক্ষমা প্রার্থনা করছি এবং তাঁর দিকেই ফিরে আসছি।',
      reset: 'রিসেট',
      todayTotal: 'আজকের মোট তসবিহ',
      reminderSettings: 'দরূদ ও ইস্তিগফার রিমাইন্ডার',
      duroodRemTitle: 'দরূদ শরীফ রিমাইন্ডার',
      duroodRemDesc: 'ভয়েস বলবে: "দুরুদ পড়ুন" (অফলাইনেও কাজ করবে)',
      istighfarRemTitle: 'ইস্তেগফার রিমাইন্ডার',
      istighfarRemDesc: 'ভয়েস বলবে: "নিজের পাপের জন্য ক্ষমা চান"',
      intervalTitle: 'রিমাইন্ডার বিরতি',
      intervalDesc: 'কত সময় পর পর রিমাইন্ডার আসবে',
      collectionTitle: 'দরূদ ও ইস্তিগফার সমূহ',
      settingsTitle: 'অ্যাপ সেটিংস',
      gpsSetting: 'অটো লোকেশন (GPS)',
      gpsDesc: 'ডাটা অন থাকলে অটোমেটিক আপনার লোকেশন নেবে',
      districtSetting: 'জেলা / শহর (ম্যানুয়াল)',
      districtDesc: 'GPS বন্ধ থাকলে এই জেলার সময় দেখাবে',
      madhabSetting: 'আসর নামাজের মাযহাব',
      madhabDesc: 'বাংলাদেশে সাধারণত হানাফী অনুসরণ করা হয়',
      langSetting: 'ভাষা (Language)',
      darkModeSetting: 'ডার্ক মোড (Dark Mode)',
      darkModeDesc: 'রাতের বেলা চোখের আরামের জন্য',
      navHome: 'হোম',
      navTasbih: 'তসবিহ',
      navReminders: 'রিমাইন্ডার',
      navSettings: 'সেটিংস',
      hanafi: 'হানাফী',
      standard: 'শাফেয়ী',
      on: 'চালু',
      off: 'বন্ধ',
      soundOn: 'সাউন্ড চালু',
      soundOff: 'সাউন্ড বন্ধ',
      targetPrefix: 'লক্ষ্য: ',
      unlimited: 'অসীম',
      currentWaqtTag: 'চলমান ওয়াক্ত',
      prayers: {
        fajr: 'ফজর',
        sunrise: 'সূর্যোদয়',
        dhuhr: 'যোহর',
        asr: 'আসর',
        maghrib: 'মাগরিব',
        isha: 'এশা'
      }
    },
    en: {
      appTitle: 'Muslim Day',
      nextWaqt: 'Next Prayer',
      sehriLabel: 'Sehri Ends',
      iftarLabel: 'Iftar Time',
      sehriSub: '3 min before Fajr',
      iftarSub: 'At Maghrib time',
      prayerTimesTitle: "Today's Prayer Times",
      dailyZikrTitle: 'Daily Durood & Istighfar',
      reminderBtn: 'Reminders ↗',
      dailyIstighfarMeaning: 'I seek forgiveness from Allah the Almighty and repent to Him.',
      reset: 'Reset',
      todayTotal: "Today's Total Tasbih",
      reminderSettings: 'Durood & Istighfar Reminders',
      duroodRemTitle: 'Durood Sharif Reminder',
      duroodRemDesc: 'Voice says: "দুরুদ পড়ুন" (Works offline)',
      istighfarRemTitle: 'Istighfar Reminder',
      istighfarRemDesc: 'Voice says: "নিজের পাপের জন্য ক্ষমা চান"',
      intervalTitle: 'Reminder Interval',
      intervalDesc: 'How often you receive reminders',
      collectionTitle: 'Durood & Istighfar Collection',
      settingsTitle: 'App Settings',
      gpsSetting: 'Auto Location (GPS)',
      gpsDesc: 'Automatically updates location when online',
      districtSetting: 'District / City (Manual)',
      districtDesc: 'Used when GPS is unavailable',
      madhabSetting: 'Asr Madhab',
      madhabDesc: 'Hanafi is standard in Bangladesh',
      langSetting: 'Language',
      darkModeSetting: 'Dark Mode',
      darkModeDesc: 'Comfortable viewing at night',
      navHome: 'Home',
      navTasbih: 'Tasbih',
      navReminders: 'Reminders',
      navSettings: 'Settings',
      hanafi: 'Hanafi',
      standard: 'Standard',
      on: 'Active',
      off: 'Off',
      soundOn: 'Sound On',
      soundOff: 'Sound Off',
      targetPrefix: 'Target: ',
      unlimited: '∞',
      currentWaqtTag: 'Current',
      prayers: {
        fajr: 'Fajr',
        sunrise: 'Sunrise',
        dhuhr: 'Dhuhr',
        asr: 'Asr',
        maghrib: 'Maghrib',
        isha: 'Isha'
      }
    }
  };

  const TASBIH_PRESETS = [
    {
      id: 'subhanallah',
      labelBn: 'সুবহানাল্লাহ',
      labelEn: 'SubhanAllah',
      arabic: 'سُبْحَانَ اللَّهِ',
      meaningBn: 'সুবহানাল্লাহ — আল্লাহ পবিত্র',
      meaningEn: 'Glory be to Allah',
      defaultTarget: 33
    },
    {
      id: 'alhamdulillah',
      labelBn: 'আলহামদুলিল্লাহ',
      labelEn: 'Alhamdulillah',
      arabic: 'الْحَمْدُ لِلَّهِ',
      meaningBn: 'আলহামদুলিল্লাহ — সকল প্রশংসা আল্লাহর',
      meaningEn: 'All praise is due to Allah',
      defaultTarget: 33
    },
    {
      id: 'allahuakbar',
      labelBn: 'আল্লাহু আকবার',
      labelEn: 'Allahu Akbar',
      arabic: 'اللَّهُ أَكْبَرُ',
      meaningBn: 'আল্লাহু আকবার — আল্লাহ সর্বশ্রেষ্ঠ',
      meaningEn: 'Allah is the Greatest',
      defaultTarget: 34
    },
    {
      id: 'astaghfirullah',
      labelBn: 'আস্তাগফিরুল্লাহ',
      labelEn: 'Astaghfirullah',
      arabic: 'أَسْتَغْفِرُ اللَّهَ',
      meaningBn: 'আস্তাগফিরুল্লাহ — আমি আল্লাহর কাছে ক্ষমা চাই',
      meaningEn: 'I seek forgiveness from Allah',
      defaultTarget: 100
    },
    {
      id: 'durood',
      labelBn: 'দরূদ শরীফ',
      labelEn: 'Durood Sharif',
      arabic: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ',
      meaningBn: 'আল্লাহুম্মা সাল্লি আলা মুহাম্মাদ',
      meaningEn: 'O Allah, send blessings upon Muhammad (ﷺ)',
      defaultTarget: 100
    },
    {
      id: 'kalima',
      labelBn: 'লা ইলাহা ইল্লাল্লাহ',
      labelEn: 'La ilaha illallah',
      arabic: 'لَا إِلَهَ إِلَّا اللَّهُ',
      meaningBn: 'আল্লাহ ছাড়া কোনো সত্য মাবুদ নেই',
      meaningEn: 'There is no deity worthy of worship except Allah',
      defaultTarget: 100
    }
  ];

  const DUROOD_ISTIGHFAR_LIST = [
    {
      type: 'durood',
      tagBn: 'দরূদ শরীফ',
      tagEn: 'Durood',
      arabic: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ',
      pronunBn: 'উচ্চারণ: আল্লাহুম্মা সাল্লি আলা মুহাম্মাদিওঁ ওয়া আলা আলি মুহাম্মাদ।',
      meaningBn: 'অর্থ: হে আল্লাহ! আপনি মুহাম্মাদ (ﷺ) এবং তাঁর পরিবারবর্গের ওপর রহমত বর্ষণ করুন।',
      meaningEn: 'O Allah, send prayers upon Muhammad and upon the family of Muhammad.'
    },
    {
      type: 'istighfar',
      tagBn: 'ইস্তিগফার',
      tagEn: 'Istighfar',
      arabic: 'أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ الَّذِي لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ وَأَتُوبُ إِلَيْهِ',
      pronunBn: 'উচ্চারণ: আস্তাগফিরুল্লাহাল আজীমাল্লাযী লা ইলাহা ইল্লা হুয়াল হাইয়্যুল কাইয়্যুমু ওয়া আতুবু ইলাইহ।',
      meaningBn: 'অর্থ: আমি মহান আল্লাহর কাছে ক্ষমা চাই, যিনি ছাড়া কোনো মাবুদ নেই, তিনি চিরঞ্জীব ও সর্বসত্তার ধারক, এবং তাঁর দিকেই ফিরে আসি।',
      meaningEn: 'I seek the forgiveness of Allah the Mighty, whom there is none worthy of worship except Him, the Living, the Eternal, and I repent to Him.'
    },
    {
      type: 'istighfar',
      tagBn: 'সংক্ষিপ্ত ইস্তিগফার',
      tagEn: 'Short Istighfar',
      arabic: 'رَبِّ اغْفِرْ لِي وَتُبْ عَلَيَّ إِنَّكَ أَنْتَ التَّوَّابُ الرَّحِيمُ',
      pronunBn: 'উচ্চারণ: রাব্বিগফিরলী ওয়া তুব আলাইয়্যা ইন্নাকা আনতাত তাওয়াবুর রাহীম।',
      meaningBn: 'অর্থ: হে আমার রব! আমাকে ক্ষমা করুন এবং আমার তাওবা কবুল করুন। নিশ্চয়ই আপনি তাওবা কবুলকারী ও পরম দয়ালু।',
      meaningEn: 'My Lord, forgive me and accept my repentance. Indeed, You are the Accepting of repentance, the Merciful.'
    }
  ];

  // Persisted State
  const todayKey = new Date().toISOString().slice(0, 10);
  const saved = JSON.parse(localStorage.getItem('muslim_day_state_v2') || '{}');

  const state = {
    districtId: saved.districtId || 'dhaka',
    useGps: !!saved.useGps,
    gpsLat: saved.gpsLat || null,
    gpsLng: saved.gpsLng || null,
    gpsCity: saved.gpsCity || null,
    madhab: saved.madhab || 'hanafi',
    lang: saved.lang || 'bn',
    darkMode: !!saved.darkMode,
    tasbihPresetId: saved.tasbihPresetId || 'subhanallah',
    tasbihCount: saved.tasbihCount || 0,
    tasbihTarget: saved.tasbihTarget !== undefined ? saved.tasbihTarget : 33,
    tasbihSound: saved.tasbihSound !== undefined ? saved.tasbihSound : true,
    dailyDate: saved.dailyDate === todayKey ? todayKey : todayKey,
    dailyTotal: saved.dailyDate === todayKey ? (saved.dailyTotal || 0) : 0,
    duroodReminder: saved.duroodReminder !== undefined ? saved.duroodReminder : true,
    istighfarReminder: saved.istighfarReminder !== undefined ? saved.istighfarReminder : true,
    reminderInterval: saved.reminderInterval || 30
  };

  function saveState() {
    localStorage.setItem('muslim_day_state_v2', JSON.stringify(state));
  }

  // Loud Voice Playback Engine (uses bundled offline MP3s + Web Audio Gain boost)
  let audioCtx = null;
  function getAudioCtx() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  function playTone(freq = 520, duration = 0.05, type = 'sine', volume = 0.08) {
    try {
      const ctx = getAudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (_) {}
  }

  function playChime() {
    playTone(587.33, 0.18, 'sine', 0.1);
    setTimeout(() => playTone(880, 0.25, 'sine', 0.1), 160);
  }

  // Play offline Bangla male voice clip with loudness boost (1.8x)
  function playVoiceClip(type) {
    const src = type === 'durood' ? './audio/durood_reminder.mp3' : './audio/istighfar_reminder.mp3';
    try {
      const audio = new Audio(src);
      audio.volume = 1.0;
      const ctx = getAudioCtx();
      const source = ctx.createMediaElementSource(audio);
      const gainNode = ctx.createGain();
      gainNode.gain.value = 1.85; // Loud & clear voice boost
      source.connect(gainNode);
      gainNode.connect(ctx.destination);
      audio.play().catch(() => {
        // Fallback if Web Audio routing is restricted
        const fallback = new Audio(src);
        fallback.volume = 1.0;
        fallback.play().catch(() => {});
      });
    } catch (_) {
      const fallback = new Audio(src);
      fallback.volume = 1.0;
      fallback.play().catch(() => {});
    }
  }

  // Format number based on lang
  function fmtNum(n) {
    return state.lang === 'bn' ? toBanglaDigits(n) : String(n);
  }

  // Toast
  let toastTimer = null;
  function showToast(title, body) {
    const toast = document.getElementById('toast');
    document.getElementById('toastTitle').textContent = title;
    document.getElementById('toastBody').textContent = body;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 4500);
  }

  // Tabs
  function switchTab(tabName) {
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    const panel = document.getElementById(`tab-${tabName}`);
    const navBtn = document.querySelector(`.nav-item[data-tab="${tabName}"]`);
    if (panel) panel.classList.add('active');
    if (navBtn) navBtn.classList.add('active');
  }

  // GPS Location Tracking (works on Android Capacitor & Mobile Browser)
  async function detectGpsLocation(silent = false) {
    const statusEl = document.getElementById('gpsStatusText');
    if (!silent && statusEl) {
      statusEl.textContent = state.lang === 'bn' ? 'লোকেশন খোঁজা হচ্ছে...' : 'Detecting location...';
    }

    const onSuccess = async (lat, lng) => {
      state.useGps = true;
      state.gpsLat = lat;
      state.gpsLng = lng;
      state.gpsCity = state.lang === 'bn' ? 'আমার লোকেশন (GPS)' : 'My Location (GPS)';

      // If online, try reverse geocoding for city name
      if (navigator.onLine) {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=${state.lang}`
          );
          if (res.ok) {
            const data = await res.json();
            const city =
              data.address?.city ||
              data.address?.town ||
              data.address?.state_district ||
              data.address?.county;
            if (city) state.gpsCity = city;
          }
        } catch (_) {}
      }

      saveState();
      updatePrayerTimes();
      if (statusEl) {
        statusEl.textContent =
          state.lang === 'bn'
            ? `সক্রিয়: ${state.gpsCity} (${lat.toFixed(2)}, ${lng.toFixed(2)})`
            : `Active: ${state.gpsCity} (${lat.toFixed(2)}, ${lng.toFixed(2)})`;
      }
      if (!silent) {
        showToast(
          state.lang === 'bn' ? '📍 লোকেশন আপডেট হয়েছে' : '📍 Location Updated',
          state.gpsCity
        );
      }
    };

    const onError = () => {
      if (!silent && statusEl) {
        statusEl.textContent =
          state.lang === 'bn'
            ? 'GPS পাওয়া যায়নি — ম্যানুয়াল জেলা ব্যবহৃত হচ্ছে'
            : 'GPS unavailable — using manual district';
      }
    };

    // Prefer Capacitor Geolocation plugin when running as Android APK
    if (window.Capacitor?.Plugins?.Geolocation) {
      try {
        const perm = await window.Capacitor.Plugins.Geolocation.requestPermissions();
        if (perm.location === 'granted' || perm.coarseLocation === 'granted') {
          const pos = await window.Capacitor.Plugins.Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 10000
          });
          onSuccess(pos.coords.latitude, pos.coords.longitude);
          return;
        }
      } catch (_) {}
    }

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        pos => onSuccess(pos.coords.latitude, pos.coords.longitude),
        onError,
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }
      );
    } else {
      onError();
    }
  }

  // Render District Dropdown
  function renderDistrictOptions() {
    const sel = document.getElementById('districtSelect');
    sel.innerHTML = '';
    BD_DISTRICTS.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.id;
      opt.textContent = state.lang === 'bn' ? d.nameBn : d.nameEn;
      if (d.id === state.districtId) opt.selected = true;
      sel.appendChild(opt);
    });
  }

  function getActiveCoords() {
    if (state.useGps && state.gpsLat !== null && state.gpsLng !== null) {
      return {
        lat: state.gpsLat,
        lng: state.gpsLng,
        label: state.gpsCity || (state.lang === 'bn' ? 'GPS লোকেশন' : 'GPS Location')
      };
    }
    const district = BD_DISTRICTS.find(d => d.id === state.districtId) || BD_DISTRICTS[0];
    return {
      lat: district.lat,
      lng: district.lng,
      label: state.lang === 'bn' ? district.nameBn : district.nameEn
    };
  }

  // Render Prayer Times & Countdown
  let currentTimes = null;

  function updatePrayerTimes() {
    const now = new Date();
    const loc = getActiveCoords();
    const t = I18N[state.lang];
    const tzOffset = -now.getTimezoneOffset() / 60;

    document.getElementById('currentDistrictLabel').textContent = loc.label;
    document.getElementById('hijriDate').textContent = getHijriDate(now, state.lang);
    document.getElementById('gregorianDate').textContent = getGregorianDate(now, state.lang);
    document.getElementById('madhabBadge').textContent =
      state.madhab === 'hanafi' ? t.hanafi : t.standard;

    currentTimes = calculatePrayerTimes(now, loc.lat, loc.lng, state.madhab, tzOffset);

    document.getElementById('sehriTime').textContent = formatTimeShort(currentTimes.sehri, state.lang);
    document.getElementById('iftarTime').textContent = formatTimeShort(currentTimes.iftar, state.lang);
    document.getElementById('sehriSub').textContent = t.sehriSub;
    document.getElementById('iftarSub').textContent = t.iftarSub;

    const schedule = [
      { key: 'fajr', icon: '🌌', time: currentTimes.fajr, isPrayer: true },
      { key: 'sunrise', icon: '🌅', time: currentTimes.sunrise, isPrayer: false },
      { key: 'dhuhr', icon: '☀️', time: currentTimes.dhuhr, isPrayer: true },
      { key: 'asr', icon: '🌤️', time: currentTimes.asr, isPrayer: true },
      { key: 'maghrib', icon: '🌇', time: currentTimes.maghrib, isPrayer: true },
      { key: 'isha', icon: '🌙', time: currentTimes.isha, isPrayer: true }
    ];

    let activeKey = 'isha';
    for (let i = 0; i < schedule.length; i++) {
      if (now >= schedule[i].time) activeKey = schedule[i].key;
    }

    const listEl = document.getElementById('prayerList');
    listEl.innerHTML = '';
    schedule.forEach(item => {
      const row = document.createElement('div');
      const isCurrent = item.isPrayer && item.key === activeKey;
      row.className = `prayer-item ${isCurrent ? 'active-waqt' : ''} ${!item.isPrayer ? 'sunrise-row' : ''}`;
      row.innerHTML = `
        <div class="prayer-left">
          <span class="prayer-icon">${item.icon}</span>
          <div>
            <div class="prayer-name">${t.prayers[item.key]}</div>
            ${isCurrent ? `<div class="prayer-sub">${t.currentWaqtTag}</div>` : ''}
          </div>
        </div>
        <div class="prayer-time">${formatTimeShort(item.time, state.lang)}</div>
      `;
      listEl.appendChild(row);
    });

    updateCountdown();
  }

  function updateCountdown() {
    if (!currentTimes) return;
    const now = new Date();
    const t = I18N[state.lang];
    const waqts = [
      { key: 'fajr', time: currentTimes.fajr },
      { key: 'dhuhr', time: currentTimes.dhuhr },
      { key: 'asr', time: currentTimes.asr },
      { key: 'maghrib', time: currentTimes.maghrib },
      { key: 'isha', time: currentTimes.isha }
    ];

    let next = waqts.find(w => w.time > now);
    if (!next) {
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const loc = getActiveCoords();
      const tzOffset = -now.getTimezoneOffset() / 60;
      const tomTimes = calculatePrayerTimes(tomorrow, loc.lat, loc.lng, state.madhab, tzOffset);
      next = { key: 'fajr', time: tomTimes.fajr };
    }

    const diffMs = Math.max(0, next.time - now);
    const hrs = String(Math.floor(diffMs / 3600000)).padStart(2, '0');
    const mins = String(Math.floor((diffMs % 3600000) / 60000)).padStart(2, '0');
    const secs = String(Math.floor((diffMs % 60000) / 1000)).padStart(2, '0');

    document.getElementById('nextWaqtLabel').textContent = t.nextWaqt;
    document.getElementById('nextWaqtName').textContent = t.prayers[next.key];
    document.getElementById('nextWaqtCountdown').textContent = fmtNum(`${hrs}:${mins}:${secs}`);
    document.getElementById('nextWaqtAt').textContent = formatTimeShort(next.time, state.lang);
  }

  // Tasbih Logic
  const RING_CIRCUMFERENCE = 2 * Math.PI * 95;

  function renderTasbihPresets() {
    const wrap = document.getElementById('tasbihPresets');
    wrap.innerHTML = '';
    TASBIH_PRESETS.forEach(p => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `preset-chip ${p.id === state.tasbihPresetId ? 'active' : ''}`;
      btn.textContent = state.lang === 'bn' ? p.labelBn : p.labelEn;
      btn.addEventListener('click', () => {
        state.tasbihPresetId = p.id;
        state.tasbihCount = 0;
        state.tasbihTarget = p.defaultTarget;
        saveState();
        renderTasbihPresets();
        renderTasbihStage();
      });
      wrap.appendChild(btn);
    });
  }

  function renderTasbihStage() {
    const preset = TASBIH_PRESETS.find(p => p.id === state.tasbihPresetId) || TASBIH_PRESETS[0];
    const t = I18N[state.lang];

    document.getElementById('tasbihArabic').textContent = preset.arabic;
    document.getElementById('tasbihMeaning').textContent =
      state.lang === 'bn' ? preset.meaningBn : preset.meaningEn;

    document.getElementById('tasbihCount').textContent = fmtNum(state.tasbihCount);
    const targetText = state.tasbihTarget === 0 ? t.unlimited : fmtNum(state.tasbihTarget);
    document.getElementById('tasbihTargetLabel').textContent = `/ ${targetText}`;
    document.getElementById('targetCycleText').textContent = `${t.targetPrefix}${targetText}`;
    document.getElementById('soundStateText').textContent = state.tasbihSound ? t.soundOn : t.soundOff;
    document.getElementById('dailyTotalCount').textContent = fmtNum(state.dailyTotal);

    const progressEl = document.getElementById('tasbihProgress');
    if (state.tasbihTarget > 0) {
      const ratio = Math.min(1, state.tasbihCount / state.tasbihTarget);
      progressEl.style.strokeDashoffset = RING_CIRCUMFERENCE * (1 - ratio);
    } else {
      progressEl.style.strokeDashoffset = RING_CIRCUMFERENCE * 0.75;
    }
  }

  function handleTasbihTap() {
    state.tasbihCount += 1;
    state.dailyTotal += 1;

    if (state.tasbihTarget > 0 && state.tasbihCount === state.tasbihTarget) {
      if (state.tasbihSound) playChime();
      const preset = TASBIH_PRESETS.find(p => p.id === state.tasbihPresetId);
      const name = state.lang === 'bn' ? preset.labelBn : preset.labelEn;
      showToast(
        state.lang === 'bn' ? 'মাশাআল্লাহ! লক্ষ্য পূর্ণ হয়েছে' : 'MashaAllah! Target Completed',
        state.lang === 'bn'
          ? `${name} — ${fmtNum(state.tasbihTarget)} বার সম্পন্ন হয়েছে।`
          : `${name} — ${state.tasbihTarget} times completed.`
      );
    } else if (state.tasbihSound) {
      playTone(520, 0.04, 'sine', 0.07);
    }

    saveState();
    renderTasbihStage();
  }

  // Reminders Logic (Separate Loud Bangla Voice for Durood & Istighfar)
  let duroodTimerId = null;
  let istighfarTimerId = null;

  function renderDuaCollection() {
    const container = document.getElementById('duaCollection');
    container.innerHTML = '';
    DUROOD_ISTIGHFAR_LIST.forEach(item => {
      const div = document.createElement('div');
      div.className = 'dua-card';
      div.innerHTML = `
        <div class="dua-header">
          <span class="dua-tag">${state.lang === 'bn' ? item.tagBn : item.tagEn}</span>
        </div>
        <div class="arabic-text">${item.arabic}</div>
        ${state.lang === 'bn' ? `<div class="dua-pronun">${item.pronunBn}</div>` : ''}
        <div class="dua-meaning">${state.lang === 'bn' ? item.meaningBn : item.meaningEn}</div>
      `;
      container.appendChild(div);
    });
  }

  function triggerSingleReminder(type) {
    const isDurood = type === 'durood';
    const title = isDurood ? '🕌 দুরুদ শরীফ রিমাইন্ডার' : '🤲 ইস্তেগফার রিমাইন্ডার';
    const body = isDurood
      ? 'দুরুদ পড়ুন — اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ'
      : 'নিজের পাপের জন্য ক্ষমা চান — أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ';

    playVoiceClip(type);
    showToast(title, body);

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: './icon.svg' });
    }
  }

  // Native Android Offline Notification Channels (Capacitor LocalNotifications)
  async function syncNativeAndroidReminders() {
    const LN = window.Capacitor?.Plugins?.LocalNotifications;
    if (!LN) return;
    try {
      const perm = await LN.requestPermissions();
      if (perm.display !== 'granted') return;

      // Create two separate Android notification channels with custom offline male Bangla voice
      await LN.createChannel({
        id: 'durood_channel',
        name: 'দুরুদ শরীফ রিমাইন্ডার',
        description: 'ভয়েস রিমাইন্ডার: দুরুদ পড়ুন',
        sound: 'durood_reminder.mp3',
        importance: 5,
        visibility: 1
      });
      await LN.createChannel({
        id: 'istighfar_channel',
        name: 'ইস্তেগফার রিমাইন্ডার',
        description: 'ভয়েস রিমাইন্ডার: নিজের পাপের জন্য ক্ষমা চান',
        sound: 'istighfar_reminder.mp3',
        importance: 5,
        visibility: 1
      });

      // Cancel old scheduled notifications
      await LN.cancel({ notifications: [{ id: 101 }, { id: 102 }] });

      const mins = Number(state.reminderInterval) || 30;
      const toSchedule = [];

      if (state.duroodReminder) {
        toSchedule.push({
          id: 101,
          title: '🕌 দুরুদ শরীফ রিমাইন্ডার',
          body: 'দুরুদ পড়ুন — اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ',
          channelId: 'durood_channel',
          sound: 'durood_reminder.mp3',
          schedule: { every: 'minute', count: mins, allowWhileIdle: true }
        });
      }

      if (state.istighfarReminder) {
        toSchedule.push({
          id: 102,
          title: '🤲 ইস্তেগফার রিমাইন্ডার',
          body: 'নিজের পাপের জন্য ক্ষমা চান — أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ',
          channelId: 'istighfar_channel',
          sound: 'istighfar_reminder.mp3',
          schedule: {
            at: new Date(Date.now() + Math.floor(mins / 2) * 60 * 1000),
            every: 'minute',
            count: mins,
            allowWhileIdle: true
          }
        });
      }

      if (toSchedule.length > 0) {
        await LN.schedule({ notifications: toSchedule });
      }
    } catch (_) {}
  }

  function scheduleReminders() {
    clearInterval(duroodTimerId);
    clearInterval(istighfarTimerId);

    const badge = document.getElementById('reminderStatusBadge');
    const t = I18N[state.lang];
    const anyOn = state.duroodReminder || state.istighfarReminder;
    badge.textContent = anyOn ? t.on : t.off;

    const ms = Number(state.reminderInterval) * 60 * 1000;
    if (state.duroodReminder) {
      duroodTimerId = setInterval(() => triggerSingleReminder('durood'), ms);
    }
    if (state.istighfarReminder) {
      // Stagger Istighfar by half interval so both never overlap!
      setTimeout(() => {
        if (state.istighfarReminder) {
          istighfarTimerId = setInterval(() => triggerSingleReminder('istighfar'), ms);
        }
      }, Math.floor(ms / 2));
    }

    syncNativeAndroidReminders();
  }

  // Apply Language & Theme
  function applyI18n() {
    const t = I18N[state.lang];
    document.documentElement.lang = state.lang;
    document.getElementById('appTitle').textContent = t.appTitle;
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (t[key]) el.textContent = t[key];
    });
    renderDistrictOptions();
    updatePrayerTimes();
    renderTasbihPresets();
    renderTasbihStage();
    renderDuaCollection();
    scheduleReminders();
  }

  function applyTheme() {
    document.body.classList.toggle('dark', state.darkMode);
    document.getElementById('darkModeToggle').checked = state.darkMode;
  }

  // Init
  function init() {
    document.getElementById('madhabSelect').value = state.madhab;
    document.getElementById('langSelect').value = state.lang;
    document.getElementById('duroodToggle').checked = state.duroodReminder;
    document.getElementById('istighfarToggle').checked = state.istighfarReminder;
    document.getElementById('reminderInterval').value = String(state.reminderInterval);

    // Bottom nav
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    document.getElementById('locationBtn').addEventListener('click', () => switchTab('settings'));
    document.getElementById('goToRemindersBtn').addEventListener('click', () => switchTab('reminders'));

    // Tasbih events
    document.getElementById('tasbihTapBtn').addEventListener('click', handleTasbihTap);
    document.getElementById('tasbihResetBtn').addEventListener('click', () => {
      state.tasbihCount = 0;
      saveState();
      renderTasbihStage();
    });
    document.getElementById('tasbihTargetBtn').addEventListener('click', () => {
      const targets = [33, 100, 0];
      const idx = targets.indexOf(state.tasbihTarget);
      state.tasbihTarget = targets[(idx + 1) % targets.length];
      saveState();
      renderTasbihStage();
    });
    document.getElementById('tasbihSoundBtn').addEventListener('click', () => {
      state.tasbihSound = !state.tasbihSound;
      saveState();
      renderTasbihStage();
    });

    // Reminder events
    document.getElementById('duroodToggle').addEventListener('change', e => {
      state.duroodReminder = e.target.checked;
      saveState();
      scheduleReminders();
    });
    document.getElementById('istighfarToggle').addEventListener('change', e => {
      state.istighfarReminder = e.target.checked;
      saveState();
      scheduleReminders();
    });
    document.getElementById('reminderInterval').addEventListener('change', e => {
      state.reminderInterval = Number(e.target.value);
      saveState();
      scheduleReminders();
    });

    // Separate Loud Voice Test Buttons
    document.getElementById('testDuroodBtn').addEventListener('click', () => {
      triggerSingleReminder('durood');
    });
    document.getElementById('testIstighfarBtn').addEventListener('click', () => {
      triggerSingleReminder('istighfar');
    });

    // Settings events
    document.getElementById('detectGpsBtn').addEventListener('click', () => {
      detectGpsLocation(false);
    });
    document.getElementById('districtSelect').addEventListener('change', e => {
      state.districtId = e.target.value;
      state.useGps = false;
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
      applyI18n();
    });
    document.getElementById('darkModeToggle').addEventListener('change', e => {
      state.darkMode = e.target.checked;
      saveState();
      applyTheme();
    });

    // Auto-track GPS when data comes online
    window.addEventListener('online', () => {
      if (state.useGps) detectGpsLocation(true);
    });

    applyTheme();
    applyI18n();

    // Update countdown every second
    setInterval(updateCountdown, 1000);
  }

  init();
})();
