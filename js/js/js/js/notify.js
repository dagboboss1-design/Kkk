// DAGBO · Notifications, toasts, voice, Telegram, clock
function pushNotif(type, title, body) {
    STATE.notifications.unshift({ type, title: String(title), body: String(body), time: Date.now() });
    STATE.notifications = STATE.notifications.slice(0, 30);
    saveState();
    const b = document.getElementById('notifBadge');
    if (b) b.classList.remove('hidden');
    if ('Notification' in window && Notification.permission === 'granted') {
        try { new Notification(title, { body: body, icon: 'https://cdn-icons-png.flaticon.com/512/2933/2933859.png', vibrate: [200, 100, 200] }); } catch (e) {}
    }
}

function showToast(msg, type = 'info') {
    const toast = document.createElement('div');
    let cls = 'bg-darkSurface border-accentBlue text-white';
    if (type === 'success') cls = 'bg-accentGreen/20 border-accentGreen text-accentGreen';
    if (type === 'error') cls = 'bg-accentRed/20 border-accentRed text-accentRed';
    toast.className = `fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl border ${cls} text-xs font-medium shadow-xl backdrop-blur-md animate-bounce max-w-[90%]`;
    toast.innerText = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function vib(p = [200, 100, 200], isAlert = false) {
    if (STATE.soundMode === 'off') return;
    if (STATE.soundMode === 'alerts' && !isAlert) return;
    if ('vibrate' in navigator) { try { navigator.vibrate(p); } catch (e) {} }
}

function speak(text, isAlert = false) {
    if (STATE.soundMode === 'off') return;
    if (STATE.soundMode === 'alerts' && !isAlert) return;
    if (!('speechSynthesis' in window)) return;
    try {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 1.1;
        if (STATE.voiceName && STATE.voiceName !== 'default') {
            const voices = speechSynthesis.getVoices();
            const selected = voices.find(v => v.name === STATE.voiceName);
            if (selected) u.voice = selected;
        }
        speechSynthesis.speak(u);
    } catch (e) {}
}

function populateVoices() {
    if (!('speechSynthesis' in window)) return;
    const voices = speechSynthesis.getVoices();
    const sel = document.getElementById('sVoice');
    if (!sel) return;
    sel.innerHTML = '<option value="default">Default System Voice</option>';
    voices.forEach(v => { sel.innerHTML += `<option value="${v.name}">${v.name} (${v.lang})</option>`; });
    sel.value = STATE.voiceName;
}

async function sendTg(text) {
    if (!STATE.tgToken || !STATE.tgChatId) return;
    try { await fetch(`https://api.telegram.org/bot${STATE.tgToken}/sendMessage?chat_id=${STATE.tgChatId}&text=${encodeURIComponent(text)}`); } catch (e) {}
}

function updateClock() {
    const n = new Date();
    const localH = n.getHours(), localM = String(n.getMinutes()).padStart(2, '0');
    const h = n.getUTCHours(), m = String(n.getUTCMinutes()).padStart(2, '0');
    let session = 'Asian';
    if (h >= 7 && h < 13) session = 'London';
    else if (h >= 13 && h < 21) session = 'New York';
    else if (h >= 21 || h < 7) session = 'Sydney';
    const el = document.getElementById('sessionClock');
    if (el) el.innerText = `${session} | L: ${localH}:${localM} | GMT: ${h}:${m}`;
}

function checkAutoBackup() {
    const last = localStorage.getItem('dagbo_last_backup') || 0;
    if (Date.now() - last > 86400000) {
        localStorage.setItem('dagbo_last_backup', Date.now());
        exportBackup(true);
        pushNotif('alert', 'Auto Backup', 'Daily backup file downloaded.');
    }
}

function openNotifications() {
    document.getElementById('notifBadge')?.classList.add('hidden');
    const list = STATE.notifications.slice(0, 20);
    openModal(`<div class="space-y-3"><div class="flex justify-between items-center"><h3 class="font-heading font-bold text-sm text-white">🔔 Notifications</h3><button onclick="closeModal()" class="text-xs text-slate-400">✕</button></div>${list.length === 0 ? `<div class="text-center py-8 text-slate-500 text-xs">No notifications yet</div>` : list.map(n => `<div class="rounded-xl bg-darkBg border border-darkBorder p-3 space-y-1"><div class="flex justify-between items-center"><span class="text-[11px] font-bold text-white">${esc(n.title)}</span><span class="text-[9px] text-slate-500">${new Date(n.time).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span></div><div class="text-[10px] ${n.type === 'win' ? 'text-accentGreen' : n.type === 'loss' ? 'text-accentRed' : 'text-slate-300'}">${esc(n.body)}</div></div>`).join('')}${list.length > 0 ? `<button onclick="clearNotifs()" class="w-full py-2 rounded-xl bg-darkBg border border-accentRed/30 text-accentRed text-[10px] font-bold">Clear All</button>` : ''}</div>`);
}
function clearNotifs() { STATE.notifications = []; saveState(); closeModal(); showToast('Notifications cleared', 'success'); }
