// DAGBO · Router + modal system
const router = {
    current: 'home',
    navigate(pageId, param = null, tf = null) {
        if (typeof cdIv !== 'undefined' && cdIv) { clearInterval(cdIv); cdIv = null; }
        this.current = pageId;
        document.querySelectorAll('nav button[id^="nav-"]').forEach(b => { b.classList.remove('text-accentBlue'); b.classList.add('text-slate-400'); });
        const a = document.getElementById(`nav-${pageId}`);
        if (a) { a.classList.remove('text-slate-400'); a.classList.add('text-accentBlue'); }
        const c = document.getElementById('appContent');
        c.scrollTop = 0;
        if (pageId === 'home') renderHome(c);
        else if (pageId === 'swing') renderSwing(c, param, tf);
        else if (pageId === 'spike') renderSpike(c);
        else if (pageId === 'ai') renderAI(c);
        else if (pageId === 'journal') renderJournal(c);
        else if (pageId === 'settings') renderSettings(c);
    }
};

function openModal(html) {
    const o = document.getElementById('modalOverlay'), c = document.getElementById('modalContent');
    c.innerHTML = html;
    o.classList.remove('hidden');
    setTimeout(() => { o.classList.remove('opacity-0'); c.classList.add('open'); }, 10);
}

function closeModal() {
    const o = document.getElementById('modalOverlay'), c = document.getElementById('modalContent');
    o.classList.add('opacity-0');
    c.classList.remove('open');
    try { if (window._dagboActiveChart) { window._dagboActiveChart.remove(); window._dagboActiveChart = null; } } catch (_e) {}
    setTimeout(() => o.classList.add('hidden'), 300);
}

function confirmAction(title, message, onConfirm, destructive = true) {
    openModal(`<div class="space-y-4"><div class="flex justify-between items-center"><h3 class="font-heading font-bold text-sm ${destructive ? 'text-accentRed' : 'text-white'}">${destructive ? '⚠️ ' : ''}${title}</h3><button onclick="closeModal()" class="text-xs text-slate-400">✕</button></div><div class="rounded-2xl bg-darkBg border ${destructive ? 'border-accentRed/40' : 'border-darkBorder'} p-4 text-xs text-slate-300">${message}</div><div class="grid grid-cols-2 gap-2"><button onclick="closeModal()" class="py-3 rounded-2xl bg-darkSurface border border-darkBorder text-slate-300 font-bold text-sm">Cancel</button><button id="cfmBtn" class="py-3 rounded-2xl ${destructive ? 'bg-accentRed' : 'bg-accentGreen'} text-white font-bold text-sm">${destructive ? 'Yes, proceed' : 'Confirm'}</button></div></div>`);
    document.getElementById('cfmBtn').onclick = () => { closeModal(); onConfirm(); };
}
