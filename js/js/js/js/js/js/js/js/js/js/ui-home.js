// DAGBO · Home view
function renderHome(c) {
    const timeSince = Math.round((Date.now() - STATE.lastUpdated) / 1000);
    const updateStr = timeSince < 60 ? `${timeSince}s ago` : `${Math.floor(timeSince / 60)}m ago`;

    c.innerHTML = `<div class="p-4 space-y-4">
        <div class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900/40 via-darkSurface to-darkSurface border border-darkBorder p-6 shadow-2xl"><div class="flex justify-between items-start mb-2"><span class="text-xs font-semibold uppercase text-slate-400">Virtual Balance</span><span class="text-[10px] bg-accentGreen/10 text-accentGreen border border-accentGreen/30 px-2 py-0.5 rounded-full">Live PnL</span></div><div class="text-3xl sm:text-4xl font-extrabold font-heading tabular-nums text-white mb-4">$${fmtPrice(STATE.balance)}</div><div class="grid grid-cols-3 gap-2 pt-3 border-t border-darkBorder/60"><button onclick="router.navigate('swing')" class="flex flex-col items-center py-2 rounded-xl bg-darkBg/60 border border-darkBorder"><span class="text-accentBlue font-bold text-sm">Swing</span><span class="text-[10px] text-slate-400">Setup</span></button><button onclick="router.navigate('spike')" class="flex flex-col items-center py-2 rounded-xl bg-darkBg/60 border border-darkBorder"><span class="text-accentGold font-bold text-sm">Spike</span><span class="text-[10px] text-slate-400">News</span></button><button onclick="router.navigate('ai')" class="flex flex-col items-center py-2 rounded-xl bg-darkBg/60 border border-darkBorder"><span class="text-indigo-400 font-bold text-sm">AI</span><span class="text-[10px] text-slate-400">Expert</span></button></div></div>
        ${renderPropFirm()}
        <button onclick="runScanner()" class="w-full rounded-2xl bg-gradient-to-r from-accentBlue to-indigo-600 text-white p-4 flex items-center justify-between shadow-lg shadow-blue-500/30"><div class="text-left"><div class="text-xs font-bold uppercase tracking-wider">⚡ Auto Scanner</div><div class="text-[10px] text-white/80 mt-0.5">Find the best pair + timeframe now</div></div><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg></button>
        <div class="flex justify-between items-center"><h2 class="font-heading font-bold text-sm text-slate-200 uppercase">Markets <span class="text-[9px] text-slate-500 font-normal ml-1">Updated ${updateStr}</span></h2><button onclick="fetchPrices(true)" class="text-xs text-accentBlue font-medium">↻ Refresh</button></div>
        <div class="grid grid-cols-1 gap-2.5">${PAIRS.map(p => {
            const d = STATE.marketData[p.symbol] || { price: 0, change: 0, sparkline: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] };
            const pos = d.change >= 0;
            const dec = getDecimals(p.symbol);
            return `<div onclick="router.navigate('swing', '${p.symbol}')" class="flex items-center justify-between p-3.5 rounded-2xl bg-darkSurface border border-darkBorder cursor-pointer"><div class="flex items-center space-x-3"><div class="w-10 h-10 rounded-xl bg-darkBg border border-darkBorder flex items-center justify-center font-bold text-xs text-slate-200">${p.symbol.split('/')[0].slice(0, 3)}</div><div><div class="font-bold text-sm text-white">${p.symbol}</div><div class="text-[10px] text-slate-400">${p.name}</div></div></div><div class="flex items-center space-x-3"><div class="w-16 h-7 flex items-center justify-end">${sparkSvg(d.sparkline, pos ? '#10B981' : '#EF4444')}</div><div class="text-right"><div class="font-heading font-bold text-sm tabular-nums text-white" data-px="${p.symbol}">$${fmtPrice(d.price, dec)}</div><div class="text-[11px] font-semibold ${pos ? 'text-accentGreen' : 'text-accentRed'}" data-chg="${p.symbol}">${pos ? '+' : ''}${d.change}%</div></div></div></div>`;
        }).join('')}</div>
        ${renderPendingOrders()}
    </div>`;
}

function renderPendingOrders() {
    if (!STATE.pendingOrders || STATE.pendingOrders.length === 0) return '';
    return `<div class="rounded-3xl bg-darkSurface border border-darkBorder p-4 space-y-2">
        <div class="flex justify-between items-center"><h3 class="font-heading font-bold text-xs text-slate-400 uppercase">⏳ Pending Orders</h3><span class="text-[10px] text-slate-500">${STATE.pendingOrders.length}</span></div>
        ${STATE.pendingOrders.map(o => `
            <div class="rounded-xl bg-darkBg border border-darkBorder p-3 space-y-1">
                <div class="flex justify-between items-center">
                    <div><span class="text-[10px] font-bold ${o.type.includes('BUY') ? 'text-accentGreen' : 'text-accentRed'}">${o.type}</span><span class="text-xs font-bold text-white ml-1">${o.symbol}</span></div>
                    <button onclick="event.stopPropagation(); cancelPendingOrder(${o.id})" class="text-[10px] text-accentRed font-bold px-2 py-1 rounded-lg border border-accentRed/40">Cancel</button>
                </div>
                <div class="grid grid-cols-3 gap-1 text-[10px] text-slate-400">
                    <div>Trigger: <strong class="text-white">$${fmtPrice(o.orderPrice, getDecimals(o.symbol))}</strong></div>
                    <div>SL: <strong class="text-accentRed">$${fmtPrice(o.sl, getDecimals(o.symbol))}</strong></div>
                    <div>TP: <strong class="text-accentGreen">$${fmtPrice(o.tp, getDecimals(o.symbol))}</strong></div>
                </div>
            </div>
        `).join('')}
    </div>`;
}

function renderPropFirm() {
    const floating = STATE.trades.filter(t => t.status === 'OPEN').reduce((a, t) => a + (t.pnl || 0), 0);
    const pf = STATE.propFirm, cur = STATE.balance + floating, today = new Date().toDateString();
    if (pf.todayDate !== today) { pf.todayDate = today; pf.todayStartBalance = cur; saveState(); }
    if (cur > pf.peakBalance) { pf.peakBalance = cur; saveState(); }
    const target = pf.accountSize * (1 + pf.profitTargetPct / 100);
    const tp = Math.min(100, Math.max(0, ((cur - pf.accountSize) / (target - pf.accountSize)) * 100));
    const pnl = cur - pf.todayStartBalance;
    const dLimit = pf.accountSize * (pf.dailyLimitPct / 100);
    const du = Math.min(100, (Math.abs(Math.min(0, pnl)) / dLimit) * 100);
    const dd = pf.peakBalance - cur;
    const maxDD = pf.accountSize * (pf.maxDDPct / 100);
    const ddu = Math.min(100, (dd / maxDD) * 100);
    return `<div class="rounded-2xl bg-darkSurface border border-darkBorder p-4 space-y-2" onclick="openPropFirmModal()"><div class="flex justify-between items-center"><span class="text-[10px] font-bold uppercase text-accentBlue">🎯 Prop Firm</span><span class="text-[10px] text-slate-400">$${pf.accountSize.toLocaleString()}</span></div><div class="space-y-1.5"><div><div class="flex justify-between text-[10px] mb-0.5"><span class="text-slate-400">Target ${pf.profitTargetPct}%</span><span class="text-accentGreen font-bold">${tp.toFixed(0)}%</span></div><div class="h-1.5 rounded-full bg-darkBg overflow-hidden"><div class="h-full bg-accentGreen" style="width:${tp}%"></div></div></div><div><div class="flex justify-between text-[10px] mb-0.5"><span class="text-slate-400">Daily ${pf.dailyLimitPct}%</span><span class="${du > 70 ? 'text-accentRed' : 'text-accentGold'} font-bold">${du.toFixed(0)}%</span></div><div class="h-1.5 rounded-full bg-darkBg overflow-hidden"><div class="h-full ${du > 70 ? 'bg-accentRed' : 'bg-accentGold'}" style="width:${du}%"></div></div></div><div><div class="flex justify-between text-[10px] mb-0.5"><span class="text-slate-400">MaxDD ${pf.maxDDPct}%</span><span class="${ddu > 70 ? 'text-accentRed' : 'text-accentBlue'} font-bold">${ddu.toFixed(0)}%</span></div><div class="h-1.5 rounded-full bg-darkBg overflow-hidden"><div class="h-full ${ddu > 70 ? 'bg-accentRed' : 'bg-accentBlue'}" style="width:${ddu}%"></div></div></div></div></div>`;
}

function openPropFirmModal() {
    const floating = STATE.trades.filter(t => t.status === 'OPEN').reduce((a, t) => a + (t.pnl || 0), 0);
    const pf = STATE.propFirm, cur = STATE.balance + floating;
    openModal(`<div class="space-y-4"><div class="flex justify-between items-center"><h3 class="font-heading font-bold text-sm text-white">Prop Firm Tracker</h3><button onclick="closeModal()" class="text-xs text-slate-400">✕</button></div><div class="rounded-2xl bg-darkBg border border-darkBorder p-4 space-y-2 text-xs"><div class="flex justify-between"><span class="text-slate-400">Account Size</span><strong class="text-white">$${pf.accountSize.toLocaleString()}</strong></div><div class="flex justify-between"><span class="text-slate-400">Equity (incl. open)</span><strong class="${floating >= 0 ? 'text-accentGreen' : 'text-accentRed'}">$${fmtPrice(cur)}</strong></div><div class="flex justify-between"><span class="text-slate-400">Peak</span><strong class="text-accentGreen">$${fmtPrice(pf.peakBalance)}</strong></div><div class="flex justify-between"><span class="text-slate-400">Target</span><strong class="text-accentGreen">${pf.profitTargetPct}%</strong></div><div class="flex justify-between"><span class="text-slate-400">Daily Limit</span><strong class="text-accentGold">${pf.dailyLimitPct}%</strong></div><div class="flex justify-between"><span class="text-slate-400">Max DD</span><strong class="text-accentRed">${pf.maxDDPct}%</strong></div></div><button onclick="closeModal(); router.navigate('settings');" class="w-full py-2.5 rounded-xl bg-darkBg border border-darkBorder text-slate-300 font-bold text-xs">Edit in Settings</button></div>`);
                                                                                       }
