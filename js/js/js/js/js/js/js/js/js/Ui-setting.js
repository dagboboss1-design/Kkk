// DAGBO · Settings
function renderSettings(c) {
    c.innerHTML = `<div class="p-4 space-y-4"><h2 class="font-heading font-bold text-base text-white">Settings</h2>
        <button onclick="requestNotifPermission()" class="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-extrabold text-sm shadow-lg mb-2">🔔 Enable Phone Notifications</button>
        <div class="rounded-3xl bg-darkSurface border border-darkBorder p-5 space-y-3"><h3 class="font-heading font-bold text-xs text-accentGreen uppercase">Trading</h3>
        <div><label class="text-[10px] text-slate-400 block mb-1">Risk Mode</label><select id="sMode" class="w-full bg-darkBg border border-darkBorder rounded-xl px-3 py-2.5 text-xs text-white"><option value="Safe" ${STATE.riskMode === 'Safe' ? 'selected' : ''}>Safe</option><option value="Normal" ${STATE.riskMode === 'Normal' ? 'selected' : ''}>Normal</option><option value="Aggressive" ${STATE.riskMode === 'Aggressive' ? 'selected' : ''}>Aggressive</option></select></div>
        <div><label class="text-[10px] text-slate-400 block mb-1">Risk % per trade</label><input type="number" step="0.1" id="sRisk" value="${STATE.riskPct}" class="w-full bg-darkBg border border-darkBorder rounded-xl px-3 py-2.5 text-xs text-white"></div>
        <div><label class="text-[10px] text-slate-400 block mb-1">Manual Lot Override (0 = auto)</label><input type="number" step="0.01" id="sManualLot" value="${STATE.manualLot}" class="w-full bg-darkBg border border-darkBorder rounded-xl px-3 py-2.5 text-xs text-white"></div>
        <div><label class="text-[10px] text-slate-400 block mb-1">Default RR</label><select id="sRr" class="w-full bg-darkBg border border-darkBorder rounded-xl px-3 py-2.5 text-xs text-white"><option value="2" ${STATE.defaultRr === 2 ? 'selected' : ''}>1:2</option><option value="3" ${STATE.defaultRr === 3 ? 'selected' : ''}>1:3</option><option value="4" ${STATE.defaultRr === 4 ? 'selected' : ''}>1:4</option></select></div>
        <div><label class="text-[10px] text-slate-400 block mb-1">Sound Alerts</label><select id="sSound" class="w-full bg-darkBg border border-darkBorder rounded-xl px-3 py-2.5 text-xs text-white"><option value="all" ${STATE.soundMode === 'all' ? 'selected' : ''}>Full (Voice + Vibration)</option><option value="alerts" ${STATE.soundMode === 'alerts' ? 'selected' : ''}>Alerts Only</option><option value="off" ${STATE.soundMode === 'off' ? 'selected' : ''}>Off</option></select></div>
        <div><label class="text-[10px] text-slate-400 block mb-1">AI Voice Persona</label><select id="sVoice" class="w-full bg-darkBg border border-darkBorder rounded-xl px-3 py-2.5 text-xs text-white"></select></div>
        <div class="flex justify-between items-center pt-2 border-t border-darkBorder/50"><span class="text-[10px] text-accentGold font-bold">🤖 Auto-Pilot (85%+ Conf)</span><input type="checkbox" id="sAutoPilot" ${STATE.autoPilot ? 'checked' : ''} class="w-4 h-4 accent-accentGold"></div>
        </div>
        <div class="rounded-3xl bg-darkSurface border border-darkBorder p-5 space-y-3"><h3 class="font-heading font-bold text-xs text-accentBlue uppercase">Prop Firm</h3><div><label class="text-[10px] text-slate-400 block mb-1">Account Size ($)</label><input type="number" id="pfS" value="${STATE.propFirm.accountSize}" class="w-full bg-darkBg border border-darkBorder rounded-xl px-3 py-2.5 text-xs text-white"></div><div class="grid grid-cols-3 gap-2"><div><label class="text-[10px] text-slate-400 block mb-1">Target %</label><input type="number" id="pfT" value="${STATE.propFirm.profitTargetPct}" class="w-full bg-darkBg border border-darkBorder rounded-xl px-2 py-2 text-xs text-white"></div><div><label class="text-[10px] text-slate-400 block mb-1">Daily %</label><input type="number" id="pfD" value="${STATE.propFirm.dailyLimitPct}" class="w-full bg-darkBg border border-darkBorder rounded-xl px-2 py-2 text-xs text-white"></div><div><label class="text-[10px] text-slate-400 block mb-1">MaxDD %</label><input type="number" id="pfDD" value="${STATE.propFirm.maxDDPct}" class="w-full bg-darkBg border border-darkBorder rounded-xl px-2 py-2 text-xs text-white"></div></div></div>
        <div class="rounded-3xl bg-darkSurface border border-darkBorder p-5 space-y-3"><h3 class="font-heading font-bold text-xs text-accentGold uppercase">API Keys</h3><div><label class="text-[10px] text-slate-400 block mb-1">TwelveData</label><input type="text" id="sTwelve" value="${STATE.twelveKey}" class="w-full bg-darkBg border border-darkBorder rounded-xl px-3 py-2.5 text-xs text-white"></div><div><label class="text-[10px] text-slate-400 block mb-1">Worker URL</label><input type="text" id="sWorker" value="${STATE.workerUrl}" class="w-full bg-darkBg border border-darkBorder rounded-xl px-3 py-2.5 text-xs text-white"></div></div>
        <button onclick="saveAll()" class="w-full py-3.5 rounded-2xl bg-accentBlue text-white font-extrabold text-sm">Save All</button>
        <div class="rounded-3xl bg-darkSurface border border-darkBorder p-5 space-y-3"><h3 class="font-heading font-bold text-xs text-accentRed uppercase">🛡️ Safety & Backup</h3><button onclick="undoLast()" class="w-full py-2.5 rounded-xl bg-darkBg border border-accentGreen/40 text-accentGreen font-bold text-xs">↩️ Undo Last Action</button><div class="grid grid-cols-2 gap-2"><button onclick="exportBackup(false)" class="py-2.5 rounded-xl bg-darkBg border border-accentBlue/40 text-accentBlue font-bold text-xs">📤 Export</button><button onclick="importBackup()" class="py-2.5 rounded-xl bg-darkBg border border-accentGold/40 text-accentGold font-bold text-xs">📥 Import</button></div><button onclick="resetAll()" class="w-full py-2.5 rounded-xl bg-darkBg border border-accentRed/40 text-accentRed font-bold text-xs">⚠️ Reset Everything</button></div></div>`;
    populateVoices();
}

function saveAll() {
    STATE.riskMode = document.getElementById('sMode').value;
    STATE.riskPct = parseFloat(document.getElementById('sRisk').value) || 1;
    STATE.manualLot = parseFloat(document.getElementById('sManualLot').value) || 0;
    STATE.defaultRr = parseInt(document.getElementById('sRr').value) || 2;
    STATE.soundMode = document.getElementById('sSound').value;
    STATE.voiceName = document.getElementById('sVoice').value;
    STATE.autoPilot = document.getElementById('sAutoPilot').checked;
    STATE.propFirm.accountSize = parseFloat(document.getElementById('pfS').value) || 10000;
    STATE.propFirm.profitTargetPct = parseFloat(document.getElementById('pfT').value) || 10;
    STATE.propFirm.dailyLimitPct = parseFloat(document.getElementById('pfD').value) || 5;
    STATE.propFirm.maxDDPct = parseFloat(document.getElementById('pfDD').value) || 10;
    STATE.twelveKey = document.getElementById('sTwelve').value.trim();
    STATE.workerUrl = document.getElementById('sWorker').value.trim();
    saveState();
    showToast('Saved!', 'success');
}

function resetAll() {
    confirmAction('FULL RESET?', 'Delete everything? Backups kept.', () => {
        backupState('Full reset');
        const b = localStorage.getItem('dagbo_backups');
        localStorage.clear();
        if (b) localStorage.setItem('dagbo_backups', b);
        location.reload();
    });
}

function requestNotifPermission() {
    if (!('Notification' in window)) { showToast('Your phone/browser does not support notifications.', 'error'); return; }
    Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
            showToast('🔔 Phone Notifications Enabled!', 'success');
            new Notification('DAGBO Connected', { body: 'You will now receive real alerts for trades, news, and price targets.', icon: 'https://cdn-icons-png.flaticon.com/512/2933/2933859.png' });
        } else { showToast('Permission denied. Check browser settings.', 'error'); }
    });
}
