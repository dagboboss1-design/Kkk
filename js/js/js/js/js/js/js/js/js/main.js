// DAGBO · Bootstrap
if ('serviceWorker' in navigator) {
    (async () => {
        try { await navigator.serviceWorker.register('./sw.js', { scope: './' }); console.log('SW registered from ./sw.js'); return; } catch (e) {}
        try {
            const swCode = `self.addEventListener('install', e => self.skipWaiting()); self.addEventListener('activate', e => self.clients.claim());`;
            const blob = new Blob([swCode], { type: 'application/javascript' });
            await navigator.serviceWorker.register(URL.createObjectURL(blob));
        } catch (e) { console.log('SW failed', e.message); }
    })();
}

function checkOnboarding() {
    if (!localStorage.getItem('dagbo_onboarded')) {
        openModal(`
            <div class="space-y-4 text-center">
                <div class="text-4xl mb-2">⚡</div>
                <h2 class="font-heading font-bold text-lg text-white">Welcome to DAGBO</h2>
                <p class="text-xs text-slate-400 leading-relaxed">Professional Trading Terminal. All trading is SIMULATED on a virtual account. Data is provided for educational purposes. Past performance does not guarantee future results. Trade responsibly.</p>
                <button onclick="localStorage.setItem('dagbo_onboarded', 'true'); closeModal();" class="w-full py-3 rounded-2xl bg-accentBlue text-white font-bold">I Understand</button>
            </div>
        `);
    }
}

// Timers
setInterval(updateClock, 1000);
updateClock();
setInterval(checkAutoBackup, 3600000);
setInterval(() => fetchPrices(false), 60000);
setInterval(checkPendingOrders, 3000);

setInterval(async () => {
    const events = await fetchNews() || fallbackEvents();
    const now = Date.now();
    for (let ev of events) {
        if (ev.impact !== 'High') continue;
        const timeUntil = ev.date.getTime() - now;
        const keyPre = ev.title + '_pre';
        const keyPost = ev.title + '_post';
        if (timeUntil <= 15 * 60000 && timeUntil > 5 * 60000 && !STATE.spikeAlerted[keyPre]) {
            STATE.spikeAlerted[keyPre] = true;
            saveState();
            generatePreSpikeSignal(ev);
        }
        if (timeUntil <= -5 * 60000 && timeUntil > -15 * 60000 && !STATE.spikeAlerted[keyPost]) {
            STATE.spikeAlerted[keyPost] = true;
            saveState();
            generatePostSpikeSignal(ev);
        }
    }
}, 60000);

// Global error boundary
window.addEventListener('error', (e) => {
    try { showToast('⚠ ' + (e.message || 'Unexpected error'), 'error'); } catch (_e) {}
    console.error('[DAGBO error]', e.error || e.message);
});
window.addEventListener('unhandledrejection', (e) => {
    try { showToast('⚠ Async error: ' + (e.reason?.message || 'unknown'), 'error'); } catch (_e) {}
    console.error('[DAGBO unhandled]', e.reason);
});

// Initial render
router.navigate('home');
checkOnboarding();
fetchPrices(true);
