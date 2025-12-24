// --- APP STATE ---
let state = {
    entries: {},
    rate: 60,
    voiceEnabled: true,
    darkMode: true
};

let activeDate = new Date();
let pendingQuantity = 0;
let calendarMonth = new Date();
let tempEditDateKey = null;

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Boot Screen Logic
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        if(splash) {
            splash.style.opacity = '0';
            setTimeout(() => splash.remove(), 500);
        }
    }, 2000); 

    lucide.createIcons();
    loadData();
    applyTheme();

    // 2. Inputs & Toggles
    const rateInput = document.getElementById('rate-input');
    if (rateInput) rateInput.value = state.rate;
    const voiceToggle = document.getElementById('voice-toggle');
    if (voiceToggle) voiceToggle.checked = state.voiceEnabled;
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) themeToggle.checked = state.darkMode;

    // 3. Button Listeners
    document.getElementById('btn-today').addEventListener('click', setToday);
    document.getElementById('btn-yesterday').addEventListener('click', setYesterday);
    document.getElementById('btn-settings').addEventListener('click', () => {
        toggleSettings();
        pushHistoryState('settings');
    });
    document.getElementById('close-settings').addEventListener('click', () => {
        toggleSettings();
        history.back();
    });
    document.getElementById('btn-rate-edit').addEventListener('click', () => {
        toggleSettings();
        pushHistoryState('settings');
    });

    // Confirmation Modal Listeners
    document.getElementById('btn-cancel-edit').addEventListener('click', closeConfirmModal);
    document.getElementById('btn-confirm-edit').addEventListener('click', proceedToEdit);

    // 4. Initial View
    setToday();
    renderCalendar();
    updateHisaabDisplay();
    checkReminder();
    
    // Voice Warmup
    if(window.speechSynthesis) {
        window.speechSynthesis.getVoices();
    }

    // 5. Back Button Support
    window.addEventListener('popstate', (event) => {
        const settings = document.getElementById('settings-modal');
        if (!settings.classList.contains('hidden')) {
            settings.classList.add('hidden');
            return;
        }
        const hisaabView = document.getElementById('hisaab-view');
        if (!hisaabView.classList.contains('hidden')) {
            switchTab('entry', false);
        }
    });
});

// --- NAVIGATION ---
function pushHistoryState(view) {
    history.pushState({ view: view }, "", "");
}

function switchTab(tabId, pushState = true) {
    const entryView = document.getElementById('entry-view');
    const hisaabView = document.getElementById('hisaab-view');
    const navEntry = document.getElementById('nav-entry');
    const navHisaab = document.getElementById('nav-hisaab');

    if (tabId === 'entry') {
        entryView.classList.remove('hidden');
        hisaabView.classList.add('hidden');
        navEntry.classList.replace('text-theme-muted', 'text-blue-500');
        navHisaab.classList.replace('text-blue-500', 'text-theme-muted');
    } else {
        if(pushState) pushHistoryState('hisaab');
        entryView.classList.add('hidden');
        hisaabView.classList.remove('hidden');
        navHisaab.classList.replace('text-theme-muted', 'text-blue-500');
        navEntry.classList.replace('text-blue-500', 'text-theme-muted');
        
        updateHisaabDisplay();
        renderCalendar();
    }
}

// --- THEME ---
function applyTheme() {
    const body = document.body;
    if (state.darkMode) {
        body.removeAttribute('data-theme');
        document.querySelector('meta[name="theme-color"]').setAttribute('content', '#0f172a');
    } else {
        body.setAttribute('data-theme', 'light');
        document.querySelector('meta[name="theme-color"]').setAttribute('content', '#f0f9ff');
    }
}

// --- DATE & EDITING LOGIC ---
function formatDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function getTodayKey() { return formatDateKey(new Date()); }

function setToday() {
    activeDate = new Date();
    updateEntryView();
}

function setYesterday() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    activeDate = d;
    updateEntryView();
}

// 1. EDIT FLOW: Calendar Click -> Modal
function editDate(dateKey) {
    tempEditDateKey = dateKey;
    const modal = document.getElementById('confirm-modal');
    modal.classList.remove('hidden');
}

function closeConfirmModal() {
    document.getElementById('confirm-modal').classList.add('hidden');
    tempEditDateKey = null;
}

// 2. EDIT FLOW: User Confirms -> Redirect to Entry with Data (FIXED HERE)
function proceedToEdit() {
    // Pehle date save kar lo, kyunki closeConfirmModal usse null kar dega
    const targetDate = tempEditDateKey;
    
    closeConfirmModal();
    
    if(targetDate) {
        activeDate = new Date(targetDate);
        switchTab('entry'); // Ab yeh sahi se redirect karega
        updateEntryView();  // Aur data fill karega
    }
}

function updateEntryView() {
    const key = formatDateKey(activeDate);
    const todayKey = getTodayKey();
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = formatDateKey(yesterday);

    const headerText = document.getElementById('header-date-display');
    const btnToday = document.getElementById('btn-today');
    const btnYesterday = document.getElementById('btn-yesterday');
    const quickNav = document.getElementById('quick-date-nav');
    const editBanner = document.getElementById('edit-mode-banner');

    const activeClass = ['bg-blue-600', 'text-white', 'shadow-md'];
    const inactiveClass = ['text-theme-muted', 'hover:bg-theme-main', 'bg-transparent', 'shadow-none'];

    btnToday.className = "flex-1 py-1.5 px-4 rounded-full text-xs font-bold transition-all";
    btnYesterday.className = "flex-1 py-1.5 px-4 rounded-full text-xs font-bold transition-all";

    if (key === todayKey) {
        headerText.textContent = "Aaj (Today)";
        quickNav.classList.remove('hidden');
        editBanner.classList.add('hidden');
        btnToday.classList.add(...activeClass);
        btnYesterday.classList.add(...inactiveClass);
    } else if (key === yesterdayKey) {
        headerText.textContent = "Kal (Yesterday)";
        quickNav.classList.remove('hidden');
        editBanner.classList.add('hidden');
        btnYesterday.classList.add(...activeClass);
        btnToday.classList.add(...inactiveClass);
    } else {
        const options = { day: 'numeric', month: 'short' };
        headerText.textContent = activeDate.toLocaleDateString('en-IN', options);
        quickNav.classList.add('hidden');
        editBanner.classList.remove('hidden');
    }

    // FILL DATA
    if (state.entries[key] !== undefined) pendingQuantity = state.entries[key];
    else pendingQuantity = 0;
    
    updateMilkVisuals();
}

// --- MILK LOGIC ---
function addMilk(amount) {
    if (pendingQuantity === -1) pendingQuantity = 0;
    pendingQuantity += amount;
    if (pendingQuantity > 10) pendingQuantity = 10;
    updateMilkVisuals();
    // No Voice here
}

function clearEntry() {
    pendingQuantity = 0;
    updateMilkVisuals();
}

function markNoMilk() {
    pendingQuantity = -1;
    updateMilkVisuals();
}

function updateMilkVisuals() {
    const display = document.getElementById('quantity-display');
    const visual = document.getElementById('milk-visual');
    const status = document.getElementById('status-text');

    if (pendingQuantity === -1) {
        display.textContent = "0";
        display.className = "text-5xl font-bold text-red-500 tracking-tight drop-shadow-xl";
        status.textContent = "Chutti (No Milk)";
        status.className = "text-xs text-red-400 font-bold mt-1";
        visual.style.height = "0%";
    } else {
        display.textContent = pendingQuantity.toFixed(1);
        display.className = "text-5xl font-bold text-theme-main tracking-tight drop-shadow-xl";
        status.textContent = "Niche tap karke add karein";
        status.className = "text-xs text-theme-muted font-medium mt-1";
        
        const percentage = Math.min((pendingQuantity / 2.5) * 100, 100);
        visual.style.height = `${percentage}%`;
    }
}

function saveEntry() {
    const key = formatDateKey(activeDate);
    const todayKey = getTodayKey();
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = formatDateKey(yesterday);
    
    // Save
    if (pendingQuantity === -1) state.entries[key] = 0.001; 
    else if (pendingQuantity === 0) delete state.entries[key];
    else state.entries[key] = pendingQuantity;

    saveDataToLocal();
    
    // 3. VOICE LOGIC (On Save Only)
    if(state.voiceEnabled) {
        let timePrefix = "";
        const dateParts = activeDate.toLocaleDateString('en-IN', {day: 'numeric', month: 'long'}).split(' ');
        
        if(key === todayKey) timePrefix = "Aaj";
        else if(key === yesterdayKey) timePrefix = "Kal";
        else timePrefix = `${dateParts[0]} ${dateParts[1]} ko`;

        let msg = "";
        if(pendingQuantity === -1 || pendingQuantity === 0.001) {
            msg = `${timePrefix} doodh nahi aaya`;
        } else if(pendingQuantity === 0) {
            msg = `${timePrefix} entry hata di`;
        } else {
            let qtySpeech = pendingQuantity + " litre";
            if(pendingQuantity === 0.5) qtySpeech = "Aadha litre";
            else if(pendingQuantity === 1) qtySpeech = "Ek litre";
            else if(pendingQuantity === 1.5) qtySpeech = "Dedh litre";
            else if(pendingQuantity === 2) qtySpeech = "Do litre";
            else if(pendingQuantity === 2.5) qtySpeech = "Dha-ee litre";
            
            msg = `${timePrefix} ${qtySpeech} doodh diya`;
        }
        speak(msg);
    }

    // Popup
    let popupTitle = "Saved!";
    let popupDesc = "Entry update ho gayi.";
    if(key !== todayKey) {
        popupTitle = "Date Updated";
        popupDesc = activeDate.toLocaleDateString();
    }
    showPopup(popupTitle, popupDesc);
    
    // 4. RESET LOGIC: Redirect to Today if editing past
    if(key !== todayKey) {
        setTimeout(() => {
            setToday(); 
        }, 1500); 
    }
    
    renderCalendar();
    updateHisaabDisplay();
}

function showPopup(title, desc) {
    const modal = document.getElementById('success-modal');
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-desc').textContent = desc;
    
    modal.classList.remove('hidden');
    const content = document.getElementById('success-content');
    content.classList.remove('scale-95');
    content.classList.add('scale-100');

    setTimeout(() => {
        content.classList.remove('scale-100');
        content.classList.add('scale-95');
        modal.classList.add('hidden');
    }, 2000);
}

// --- UTILS ---
function toggleSettings() {
    const modal = document.getElementById('settings-modal');
    modal.classList.toggle('hidden');
    lucide.createIcons();
}

function saveSettings() {
    const inputVal = document.getElementById('rate-input').value;
    const newRate = parseInt(inputVal);
    if(!isNaN(newRate) && newRate >= 0) state.rate = newRate;
    
    state.voiceEnabled = document.getElementById('voice-toggle').checked;
    state.darkMode = document.getElementById('theme-toggle').checked;
    
    applyTheme();
    saveDataToLocal();
    updateHisaabDisplay();
    
    toggleSettings();
    history.back(); 
    showPopup("Settings Saved", "Changes apply ho gaye.");
}

function checkReminder() {
    const hour = new Date().getHours();
    const todayKey = getTodayKey();
    if (hour >= 20 && state.entries[todayKey] === undefined) {
        const status = document.getElementById('status-text');
        status.textContent = "⚠️ Aaj ki entry baki hai!";
        status.className = "text-xs text-amber-500 font-bold mt-1 animate-pulse";
    }
}

function saveDataToLocal() {
    localStorage.setItem('milkAppMaa_v3', JSON.stringify(state));
}

function loadData() {
    const saved = localStorage.getItem('milkAppMaa_v3');
    if(saved) {
        const parsed = JSON.parse(saved);
        state = { ...state, ...parsed };
        if(state.darkMode === undefined) {
             state.darkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
    } else {
        state.darkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
}

// --- CALENDAR & HISAAB ---
function changeMonth(delta) {
    calendarMonth.setMonth(calendarMonth.getMonth() + delta);
    renderCalendar();
    updateHisaabDisplay();
}

function renderCalendar() {
    const container = document.getElementById('calendar-days');
    container.innerHTML = '';
    
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const mNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    document.getElementById('calendar-month-display').textContent = `${mNames[month]} ${year}`;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay();

    for(let i=0; i<firstDayIndex; i++) container.appendChild(document.createElement('div'));

    for(let d=1; d<=daysInMonth; d++) {
        const dateKey = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const val = state.entries[dateKey];
        
        const btn = document.createElement('button');
        btn.className = "aspect-square rounded-lg flex flex-col items-center justify-center border border-transparent active:scale-90 transition-transform";
        btn.onclick = () => editDate(dateKey);

        const dayNum = document.createElement('span');
        dayNum.textContent = d;
        btn.appendChild(dayNum);

        if (val === undefined) {
            btn.classList.add('bg-theme-main', 'text-theme-muted');
            if(dateKey === getTodayKey()) btn.classList.add('border-blue-500');
        } else if (val === 0.001) {
            btn.classList.add('bg-red-500/20', 'text-red-500', 'font-bold');
        } else {
            btn.classList.add('bg-green-500/20', 'text-green-500', 'font-bold');
            const sub = document.createElement('span');
            sub.className = "text-[8px] leading-none opacity-90";
            sub.textContent = val;
            btn.appendChild(sub);
        }
        container.appendChild(btn);
    }
}

function updateHisaabDisplay() {
    const y = calendarMonth.getFullYear();
    const m = calendarMonth.getMonth();
    const days = new Date(y, m + 1, 0).getDate();
    let total = 0;
    for(let d=1; d<=days; d++) {
        const k = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        if(state.entries[k] && state.entries[k] > 0.002) total += state.entries[k];
    }
    const bill = Math.round(total * state.rate);
    document.getElementById('total-liters-display').textContent = total.toFixed(1);
    document.getElementById('total-bill-display').textContent = bill;
    document.getElementById('current-rate-display').textContent = state.rate;
}

function shareOnWhatsapp() {
    const mNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthStr = mNames[calendarMonth.getMonth()];
    const liters = document.getElementById('total-liters-display').textContent;
    const bill = document.getElementById('total-bill-display').textContent;
    const msg = `Namaste!%0A*Doodh Hisaab - ${monthStr}*%0A------------------%0AKul Doodh: ${liters} L%0APoora Bill: ₹${bill}%0A------------------%0ASent from Doodh Hisaab App`;
    window.open(`https://wa.me/?text=${msg}`, '_blank');
}

function speak(text) {
    if(!state.voiceEnabled) return;
    window.speechSynthesis.cancel(); // INSTANT SPEECH FIX
    
    const u = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const v = voices.find(v => v.lang.includes('hi-IN')) || voices.find(v => v.lang.includes('en-IN'));
    if(v) u.voice = v;
    window.speechSynthesis.speak(u);
}