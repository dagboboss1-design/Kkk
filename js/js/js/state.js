// DAGBO · State + persistence
const STATE = {
    balance: parseFloat(localStorage.getItem('dagbo_balance')) || 1000.00,
    riskMode: localStorage.getItem('dagbo_riskMode') || 'Normal',
    defaultRr: parseInt(localStorage.getItem('dagbo_rr')) || 2,
    riskPct: parseFloat(localStorage.getItem('dagbo_riskPct')) || 1.0,
    manualLot: parseFloat(localStorage.getItem('dagbo_manualLot')) || 0,
    twelveKey: localStorage.getItem('dagbo_twelve_key') || DEFAULT_TWELVE,
    workerUrl: localStorage.getItem('dagbo_worker_url') || 'https://dagbo-ai.YOUR-NAME.workers.dev',
    tgToken: localStorage.getItem('dagbo_tg_token') || '',
    tgChatId: localStorage.getItem('dagbo_tg_chat') || '',
    soundMode: localStorage.getItem('dagbo_soundMode') || 'all',
    voiceName: localStorage.getItem('dagbo_voiceName') || 'default',
    autoPilot: localStorage.getItem('dagbo_autopilot') === 'true',
    trades: JSON.parse(localStorage.getItem('dagbo_trades')) || [],
    pendingOrders: JSON.parse(localStorage.getItem('dagbo_pending')) || [],
    alerts: JSON.parse(localStorage.getItem('dagbo_alerts')) || [],
    notifications: JSON.parse(localStorage.getItem('dagbo_notifs')) || [],
    marketData: {},
    isSimulated: false,
    lastUpdated: Date.now(),
    activeChat: JSON.parse(localStorage.getItem('dagbo_chat')) || [{ role: 'assistant', text: 'Hello trader! I am DAGBO AI. Ask me anything.' }],
    propFirm: JSON.parse(localStorage.getItem('dagbo_propfirm')) || { accountSize: 1000, profitTargetPct: 10, dailyLimitPct: 5, maxDDPct: 10, peakBalance: 1000, todayStartBalance: 1000, todayDate: new Date().toDateString() },
    spikeAlerted: JSON.parse(localStorage.getItem('dagbo_spikeAlerts')) || {}
};

function saveState() {
    localStorage.setItem('dagbo_balance', STATE.balance);
    localStorage.setItem('dagbo_riskMode', STATE.riskMode);
    localStorage.setItem('dagbo_rr', STATE.defaultRr);
    localStorage.setItem('dagbo_riskPct', STATE.riskPct);
    localStorage.setItem('dagbo_manualLot', STATE.manualLot);
    localStorage.setItem('dagbo_twelve_key', STATE.twelveKey);
    localStorage.setItem('dagbo_worker_url', STATE.workerUrl);
    localStorage.setItem('dagbo_tg_token', STATE.tgToken);
    localStorage.setItem('dagbo_tg_chat', STATE.tgChatId);
    localStorage.setItem('dagbo_soundMode', STATE.soundMode);
    localStorage.setItem('dagbo_voiceName', STATE.voiceName);
    localStorage.setItem('dagbo_autopilot', STATE.autoPilot);
    localStorage.setItem('dagbo_trades', JSON.stringify(STATE.trades));
    localStorage.setItem('dagbo_pending', JSON.stringify(STATE.pendingOrders));
    localStorage.setItem('dagbo_alerts', JSON.stringify(STATE.alerts));
    localStorage.setItem('dagbo_notifs', JSON.stringify(STATE.notifications.slice(0, 30)));
    localStorage.setItem('dagbo_chat', JSON.stringify(STATE.activeChat));
    localStorage.setItem('dagbo_propfirm', JSON.stringify(STATE.propFirm));
    localStorage.setItem('dagbo_spikeAlerts', JSON.stringify(STATE.spikeAlerted));
}

function backupState(reason) {
    const backups = JSON.parse(localStorage.getItem('dagbo_backups')||'[]');
    backups.unshift({ reason, time: Date.now(), balance: STATE.balance, trades: JSON.parse(JSON.stringify(STATE.trades)), alerts: JSON.parse(JSON.stringify(STATE.alerts)), chat: JSON.parse(JSON.stringify(STATE.activeChat)), notifs: JSON.parse(JSON.stringify(STATE.notifications)), settings: { riskMode: STATE.riskMode, riskPct: STATE.riskPct, defaultRr: STATE.defaultRr, manualLot: STATE.manualLot, soundMode: STATE.soundMode } });
    localStorage.setItem('dagbo_backups', JSON.stringify(backups.slice(0, 10)));
}

function undoLast() {
    const backups = JSON.parse(localStorage.getItem('dagbo_backups')||'[]');
    if (!backups.length) { showToast('Nothing to undo', 'error'); return; }
    const snap = backups[0];
    STATE.balance = snap.balance; STATE.trades = snap.trades; STATE.alerts = snap.alerts; STATE.activeChat = snap.chat; STATE.notifications = snap.notifs;
    Object.assign(STATE, snap.settings);
    saveState();
    backups.shift();
    localStorage.setItem('dagbo_backups', JSON.stringify(backups));
    showToast(`↩️ Undone: ${snap.reason}`, 'success');
    router.navigate(router.current);
}

function exportBackup(auto = false) {
    const json = JSON.stringify({ version: 2, exported: new Date().toISOString(), balance: STATE.balance, trades: STATE.trades, alerts: STATE.alerts, chat: STATE.activeChat, notifs: STATE.notifications, settings: { riskMode: STATE.riskMode, riskPct: STATE.riskPct, defaultRr: STATE.defaultRr, manualLot: STATE.manualLot, soundMode: STATE.soundMode, voiceName: STATE.voiceName, autoPilot: STATE.autoPilot, propFirm: STATE.propFirm } }, null, 2);
    const b = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = `dagbo-backup-${Date.now()}.json`;
    a.click();
    if (!auto && navigator.clipboard) navigator.clipboard.writeText(json).then(() => showToast('📋 Backup copied & downloaded', 'success'));
}

function importBackup() {
    openModal(`<div class="space-y-4"><div class="flex justify-between items-center"><h3 class="font-heading font-bold text-sm text-white">Import</h3><button onclick="closeModal()" class="text-xs text-slate-400">✕</button></div><textarea id="importTxt" rows="8" class="w-full bg-darkBg border border-darkBorder rounded-xl px-3 py-2.5 text-[10px] text-white font-mono" placeholder='{"version":2,...}'></textarea><button onclick="doImport()" class="w-full py-3 rounded-2xl bg-accentGreen text-white font-bold text-sm">Import</button></div>`);
}

function doImport() {
    try {
        const data = JSON.parse(document.getElementById('importTxt').value);
        backupState('Before import');
        STATE.balance = data.balance ?? STATE.balance;
        STATE.trades = data.trades ?? STATE.trades;
        STATE.alerts = data.alerts ?? STATE.alerts;
        STATE.activeChat = data.chat ?? STATE.activeChat;
        STATE.notifications = data.notifs ?? STATE.notifications;
        if (data.settings) Object.assign(STATE, data.settings);
        saveState();
        closeModal();
        showToast('Imported — tap Undo to revert', 'success');
        router.navigate(router.current);
    } catch (e) { showToast('Invalid JSON', 'error'); }
}
