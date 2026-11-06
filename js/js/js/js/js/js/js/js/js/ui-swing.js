// DAGBO · Swing view + scanner + order modals
function renderSwing(c, selected = 'GOLD', tf = '15M') {
    const d = STATE.marketData[selected];
    if (!d || !d.sparkline || d.sparkline.length < 10) {
        c.innerHTML = `<div class="p-4 space-y-3"><div class="rounded-3xl bg-darkSurface border border-darkBorder p-6 text-center"><div class="text-lg font-bold">⏸️ NO TRADE</div><p class="text-xs text-slate-400 mt-2">Waiting for real candle data for ${esc(selected)} ${esc(tf)}.<br>Tick snapshots are not enough for EMA/RSI/ATR.</p><button onclick="fetchPrices(true)" class="mt-4 px-4 py-2 rounded-xl bg-accentBlue text-white text-xs font-bold">Refresh Data</button></div></div>`;
        return;
    }
    const pair = PAIRS.find(p => p.symbol === selected) || PAIRS[0];
    const data = STATE.marketData[pair.symbol] || { price: 4061 };
    const price = data.price;
    const spark = data.sparkline || [price, price, price, price, price];
    const atr = calcATR(spark, spark, spark);
    const ema = calcEMA(spark, Math.min(spark.length, 10));
    const rsi = calcRSI(spark);
    let patternMsg = 'None Detected', pColor = 'text-slate-400';
    let sigType = (price > ema && rsi < 70) ? 'BUY' : (price < ema && rsi > 30) ? 'SELL' : (Math.random() > 0.5 ? 'BUY' : 'SELL');
    const c1 = spark[spark.length - 3] || price;
    const c2 = spark[spark.length - 2] || price;
    const c3 = spark[spark.length - 1] || price;
    if (c1 < c2 && c3 > c2) { patternMsg = 'Bullish Momentum'; pColor = 'text-accentGreen'; sigType = 'BUY'; }
    else if (c1 > c2 && c3 < c2) { patternMsg = 'Bearish Momentum'; pColor = 'text-accentRed'; sigType = 'SELL'; }
    else if (Math.abs(c3 - price) < price * 0.0005 && data.change > 0) { patternMsg = 'Bullish Pin Bar'; pColor = 'text-accentGreen'; }
    else if (Math.abs(c3 - price) < price * 0.0005 && data.change < 0) { patternMsg = 'Bearish Pin Bar'; pColor = 'text-accentRed'; }
    const slDist = atr * 1.5;
    const sl = sigType === 'BUY' ? price - slDist : price + slDist;
    const tp = sigType === 'BUY' ? price + slDist * STATE.defaultRr : price - slDist * STATE.defaultRr;
    const autoLot = calcAutoLot(pair.symbol, slDist / getPipSize(pair.symbol), STATE.balance, STATE.riskPct);
    const final = finalLot(pair.symbol, slDist / getPipSize(pair.symbol));
    const dec = getDecimals(pair.symbol);

    c.innerHTML = `<div class="p-4 space-y-3">
        <div class="flex items-center justify-between bg-darkSurface p-3 rounded-2xl border border-darkBorder"><select onchange="router.navigate('swing', this.value, '${tf}')" class="bg-darkBg text-white font-bold text-sm px-3 py-1.5 rounded-xl border border-darkBorder outline-none">${PAIRS.map(p => `<option value="${p.symbol}" ${p.symbol === pair.symbol ? 'selected' : ''}>${p.symbol}</option>`).join('')}</select><div class="text-right"><span class="text-[10px] text-slate-400 block">${tf} · Price</span><span class="font-heading font-bold text-sm text-white">$${fmtPrice(price, dec)}</span></div></div>
        <div class="flex items-center justify-between bg-darkSurface p-3 rounded-2xl border border-darkBorder text-xs"><span class="text-slate-300 font-semibold">Timeframe:</span><div class="flex space-x-1">${['5M','15M','1H','4H','1D'].map(t => `<button onclick="router.navigate('swing','${pair.symbol}','${t}')" class="px-2 py-1 rounded-lg font-bold text-[10px] ${tf === t ? 'bg-accentBlue text-white' : 'bg-darkBg text-slate-400 border border-darkBorder'}">${t}</button>`).join('')}</div></div>
        <div class="flex items-center justify-between bg-darkSurface p-3 rounded-2xl border border-darkBorder text-xs"><span class="text-slate-300 font-semibold">RR:</span><div class="flex space-x-1.5">${[2,3,4].map(rr => `<button onclick="setRr(${rr},'${pair.symbol}','${tf}')" class="px-3 py-1 rounded-xl font-bold ${STATE.defaultRr === rr ? 'bg-accentBlue text-white' : 'bg-darkBg text-slate-400 border border-darkBorder'}">1:${rr}</button>`).join('')}</div></div>
        <div class="flex items-center justify-between p-3 rounded-2xl bg-darkSurface border border-darkBorder text-xs"><div class="flex items-center space-x-2"><span class="w-2 h-2 rounded-full bg-accentGreen animate-pulse"></span><span class="text-slate-300">Candle closes:</span></div><span id="cd" class="font-mono font-bold text-accentBlue">--:--</span></div>
        <div class="rounded-3xl bg-gradient-to-br from-darkSurface to-darkBg border border-darkBorder p-5 space-y-3">
            <div class="flex justify-between items-center"><span class="text-xs font-bold uppercase text-slate-400">Trade Setup</span><span class="text-xs font-extrabold px-3 py-1 rounded-full ${sigType === 'BUY' ? 'bg-accentGreen/20 text-accentGreen' : 'bg-accentRed/20 text-accentRed'}">${sigType} 1:${STATE.defaultRr}</span></div>
            <div class="flex justify-between text-[11px] border-b border-darkBorder/50 pb-2 mb-2"><span class="text-slate-400">Chart Pattern:</span><span class="font-bold ${pColor}">${patternMsg}</span></div>
            <div class="grid grid-cols-3 gap-2 text-center">
                <div class="p-2 rounded-xl bg-darkBg border border-darkBorder"><span class="text-[9px] text-slate-400 block">Entry</span><span class="font-bold text-xs text-white">$${fmtPrice(price, dec)}</span></div>
                <div class="p-2 rounded-xl bg-darkBg border border-darkBorder"><span class="text-[9px] text-slate-400 block">SL (ATR)</span><span class="font-bold text-xs text-accentRed">$${fmtPrice(sl, dec)}</span></div>
                <div class="p-2 rounded-xl bg-darkBg border border-darkBorder"><span class="text-[9px] text-slate-400 block">TP</span><span class="font-bold text-xs text-accentGreen">$${fmtPrice(tp, dec)}</span></div>
            </div>
            <div class="rounded-2xl bg-darkBg border border-accentBlue/30 p-3 space-y-1 text-[11px]">
                <div class="flex justify-between"><span class="text-slate-400">Risk ${STATE.riskPct}%</span><span class="text-white font-bold">$${fmtPrice(STATE.balance * STATE.riskPct / 100)}</span></div>
                <div class="flex justify-between"><span class="text-slate-400">Auto lot</span><span class="text-accentBlue font-bold">${autoLot.toFixed(2)}</span></div>
                <div class="flex justify-between"><span class="text-slate-400">EMA50 / RSI</span><span class="text-white font-bold">${fmtPrice(ema, dec)} / ${rsi.toFixed(1)}</span></div>
            </div>
            <button onclick="openChart('${pair.symbol}', '${tf}')" class="w-full py-2 rounded-xl bg-darkBg border border-darkBorder text-slate-300 font-semibold text-xs">📈 ${tf} Chart</button>
            <div class="flex space-x-2 pt-2">
                <button onclick="openPendingOrderModal('${pair.symbol}', '${sigType}', ${price}, ${sl}, ${tp}, ${final})" class="flex-1 py-3.5 rounded-2xl bg-darkSurface border border-accentBlue text-accentBlue font-extrabold text-xs">⏳ Pending</button>
                <button onclick="openChecklist('${pair.symbol}','${sigType}',${price},${sl},${tp},${final},'${tf}')" class="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-accentGreen to-emerald-600 text-white font-extrabold text-xs">🚀 Market</button>
            </div>
        </div>
    </div>`;
    startCd(tf);
}
function setRr(rr, sym, tf) { STATE.defaultRr = rr; saveState(); renderSwing(document.getElementById('appContent'), sym, tf); showToast(`RR 1:${rr}`, 'success'); }

function startCd(tf = '15M') {
    if (cdIv) clearInterval(cdIv);
    const tfSecs = { '5M': 300, '15M': 900, '1H': 3600, '4H': 14400, '1D': 86400 }[tf] || 900;
    const tick = () => {
        const now = Math.floor(Date.now() / 1000);
        const rem = tfSecs - (now % tfSecs);
        const h = Math.floor(rem / 3600);
        const m = Math.floor((rem % 3600) / 60);
        const s = rem % 60;
        const el = document.getElementById('cd');
        if (el) {
            if (tfSecs >= 3600) el.innerText = `${h}h ${String(m).padStart(2, '0')}m`;
            else el.innerText = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        }
    };
    tick();
    cdIv = setInterval(tick, 1000);
}

function openChecklist(sym, type, entry, sl, tp, lots, tf = '15M') {
    const openRisk = STATE.trades.filter(t => t.status === 'OPEN').reduce((a, t) => a + (Math.abs(t.entry - t.sl) * t.lots * getMultiplier(t.symbol)), 0);
    const newRisk = Math.abs(entry - sl) * lots * getMultiplier(sym);
    const maxRisk = STATE.balance * 0.03;
    let todayPnL = STATE.balance - STATE.propFirm.todayStartBalance;
    let dailyLimit = STATE.propFirm.accountSize * (STATE.propFirm.dailyLimitPct / 100);
    let blockMsg = '';
    if (openRisk + newRisk > maxRisk) blockMsg = `Max 3% risk reached. Open: $${fmtPrice(openRisk)}, Max: $${fmtPrice(maxRisk)}`;
    if (todayPnL <= -dailyLimit) blockMsg = `Prop Firm Daily Loss Limit Hit! ($${fmtPrice(todayPnL)})`;
    const dec = getDecimals(sym);

    openModal(`<div class="space-y-4"><div class="flex justify-between items-center"><h3 class="font-heading font-bold text-sm text-white">Pre-Trade Checklist</h3><button onclick="closeModal()" class="text-xs text-slate-400">✕</button></div>
    ${blockMsg ? `<div class="bg-accentRed/20 border border-accentRed/50 p-3 rounded-xl text-accentRed text-xs font-bold text-center">🛑 BLOCKED: ${blockMsg}</div>` : ''}
    <div class="rounded-2xl bg-darkBg border border-darkBorder p-3 text-center"><div class="text-xs text-slate-400">${type} ${sym} · ${tf}</div><div class="text-sm font-bold text-white mt-1">${lots.toFixed(2)} lots · Risk $${fmtPrice(Math.abs(entry - sl) * lots * getMultiplier(sym))}</div></div>
    <textarea id="tradeNote" placeholder="Why are you taking this trade?" class="w-full bg-darkBg border border-darkBorder rounded-xl px-3 py-2 text-xs text-white outline-none mb-2"></textarea>
    <div class="flex flex-wrap gap-2 mb-2">
        ${['Confident', 'Patient', 'FOMO', 'Revenge', 'Bored'].map(e => `<button onclick="document.getElementById('tradeEmotion').value='${e}'; this.parentElement.querySelectorAll('button').forEach(b=>b.classList.remove('bg-accentBlue')); this.classList.add('bg-accentBlue');" class="px-3 py-1.5 rounded-lg border border-darkBorder bg-darkBg text-[10px] text-slate-300 font-bold">${e}</button>`).join('')}
        <input type="hidden" id="tradeEmotion" value="Confident">
    </div>
    <div class="space-y-2">${['Trend aligns','Entry at key level','SL beyond swing','RR ≥ 1:2','No news in 30 min','I accept the risk'].map((item, i) => `<label class="flex items-center space-x-3 p-3 rounded-xl bg-darkBg border border-darkBorder"><input type="checkbox" id="cf${i}" onchange="updateCf()" class="w-4 h-4 accent-accentGreen"><span class="text-xs text-slate-200">${item}</span></label>`).join('')}</div>
    <button id="cfBtn" onclick="executeTrade('${sym}','${type}',${entry},${sl},${tp},${lots},'${tf}')" disabled class="w-full py-3.5 rounded-2xl bg-slate-600 text-slate-400 font-extrabold text-sm">Complete checklist</button></div>`);
}

function updateCf() {
    const all = [0, 1, 2, 3, 4, 5].every(i => document.getElementById(`cf${i}`)?.checked);
    const b = document.getElementById('cfBtn');
    if (!b) return;
    if (all) { b.disabled = false; b.className = 'w-full py-3.5 rounded-2xl bg-gradient-to-r from-accentGreen to-emerald-600 text-white font-extrabold text-sm'; b.innerText = '✓ EXECUTE'; }
    else { b.disabled = true; b.className = 'w-full py-3.5 rounded-2xl bg-slate-600 text-slate-400 font-extrabold text-sm'; b.innerText = 'Complete checklist'; }
}

function runScanner() {
    vib([100, 50, 100]);
    openModal(`<div class="space-y-4 py-8 text-center"><div class="text-6xl animate-spin inline-block" style="animation-duration:1.5s">⚡</div><div class="font-heading font-bold text-sm text-white">Scanning...</div></div>`);
    setTimeout(() => { const results = runAutoScan(); if (!results.length) { closeModal(); showToast('No setups found', 'error'); return; } renderScanResults(results); }, 1600);
}

function renderScanResults(results) {
    const top = results[0];
    openModal(`<div class="space-y-4"><div class="flex justify-between items-center"><h3 class="font-heading font-bold text-sm text-white">⚡ Scanner Results</h3><button onclick="closeModal()" class="text-xs text-slate-400">✕</button></div>
        <div class="rounded-2xl bg-gradient-to-br from-accentGreen/20 to-darkSurface border-2 border-accentGreen/40 p-4 space-y-2"><div class="flex justify-between items-center"><span class="text-[10px] font-bold uppercase text-accentGreen">🏆 #1 Best Setup</span><span class="text-[10px] bg-accentGreen/30 text-accentGreen px-2 py-0.5 rounded-full font-bold">${top.confidence}% conf</span></div><div class="text-lg font-extrabold text-white">${top.symbol} <span class="text-xs text-slate-400">${top.tf}</span></div><div class="flex justify-between text-[11px] text-slate-300"><span class="font-bold ${top.direction === 'BUY' ? 'text-accentGreen' : 'text-accentRed'}">${top.direction}</span><span>Vol ${(top.volatility * 100).toFixed(2)}%</span></div></div>
        <div class="space-y-2">${results.slice(1).map(r => `<button onclick='openScanPlan(${JSON.stringify(r).replace(/'/g, "&#39;")})' class="w-full text-left rounded-2xl bg-darkSurface border border-darkBorder p-3"><div class="flex justify-between items-center"><div><span class="text-sm font-bold text-white">${r.symbol}</span><span class="text-[10px] text-accentBlue ml-1">${r.tf}</span><span class="ml-2 text-[10px] font-bold ${r.direction === 'BUY' ? 'text-accentGreen' : 'text-accentRed'}">${r.direction}</span></div><span class="text-[10px] text-accentGreen font-bold">${r.confidence}%</span></div></button>`).join('')}</div>
        <button onclick='openScanPlan(${JSON.stringify(top).replace(/'/g, "&#39;")})' class="w-full py-3 rounded-2xl bg-gradient-to-r from-accentGreen to-emerald-600 text-white font-extrabold text-xs">🎯 View #1 Trade Plan</button></div>`);
}

function openScanPlan(r) {
    const price = STATE.marketData[r.symbol]?.price || 0;
    const slPips = slPipsForTf(r.tf, r.symbol);
    const slDist = slPips * getPipSize(r.symbol);
    const sl = r.direction === 'BUY' ? price - slDist : price + slDist;
    const tp = r.direction === 'BUY' ? price + slDist * STATE.defaultRr : price - slDist * STATE.defaultRr;
    const lot = finalLot(r.symbol, slPips);
    const dec = getDecimals(r.symbol);
    openModal(`<div class="space-y-4"><div class="flex justify-between items-center"><h3 class="font-heading font-bold text-sm text-white">${r.symbol} · ${r.tf}</h3><button onclick="closeModal()" class="text-xs text-slate-400">✕</button></div><div class="rounded-2xl bg-darkBg border border-darkBorder p-4 space-y-2 text-xs"><div class="flex justify-between"><span class="text-slate-400">Direction</span><span class="font-bold ${r.direction === 'BUY' ? 'text-accentGreen' : 'text-accentRed'}">${r.direction}</span></div><div class="flex justify-between"><span class="text-slate-400">Entry</span><span class="text-white font-bold">$${fmtPrice(price, dec)}</span></div><div class="flex justify-between"><span class="text-slate-400">SL</span><span class="text-accentRed font-bold">$${fmtPrice(sl, dec)}</span></div><div class="flex justify-between"><span class="text-slate-400">TP</span><span class="text-accentGreen font-bold">$${fmtPrice(tp, dec)}</span></div><div class="flex justify-between"><span class="text-slate-400">Lot</span><span class="text-accentBlue font-bold">${lot.toFixed(2)}</span></div></div>
        <div class="flex space-x-2">
            <button onclick="openPendingOrderModal('${r.symbol}', '${r.direction}', ${price}, ${sl}, ${tp}, ${lot})" class="flex-1 py-3.5 rounded-2xl bg-darkSurface border border-accentBlue text-accentBlue font-extrabold text-xs">⏳ Pending</button>
            <button onclick="openChecklist('${r.symbol}','${r.direction}',${price},${sl},${tp},${lot},'${r.tf}')" class="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-accentGreen to-emerald-600 text-white font-extrabold text-xs">🚀 Market</button>
        </div></div>`);
}

function openPendingOrderModal(sym, dir, price, sl, tp, lot) {
    const dec = getDecimals(sym);
    openModal(`<div class="space-y-4">
        <div class="flex justify-between items-center"><h3 class="font-heading font-bold text-sm text-white">Set Pending Order</h3><button onclick="closeModal()" class="text-xs text-slate-400">✕</button></div>
        <div class="rounded-2xl bg-darkBg border border-darkBorder p-4 space-y-2 text-xs">
            <div class="flex justify-between"><span class="text-slate-400">Symbol</span><span class="text-white font-bold">${sym}</span></div>
            <div class="flex justify-between"><span class="text-slate-400">Current Price</span><span class="text-white font-bold">$${fmtPrice(price, dec)}</span></div>
        </div>
        <div><label class="text-[10px] text-slate-400 block mb-1">Order Type</label><select id="pType" class="w-full bg-darkBg text-white text-xs px-3 py-2.5 rounded-xl border border-darkBorder"><option value="BUY LIMIT">BUY LIMIT (Buy below current price)</option><option value="SELL LIMIT">SELL LIMIT (Sell above current price)</option><option value="BUY STOP">BUY STOP (Buy breakout above price)</option><option value="SELL STOP">SELL STOP (Sell breakdown below price)</option></select></div>
        <div><label class="text-[10px] text-slate-400 block mb-1">Trigger Price</label><input type="number" id="pPrice" value="${fmtPrice(price, dec)}" step="0.01" class="w-full bg-darkBg text-white text-xs px-3 py-2.5 rounded-xl border border-darkBorder"></div>
        <button onclick="savePendingOrder('${sym}', ${sl}, ${tp}, ${lot})" class="w-full py-3 rounded-2xl bg-accentBlue text-white font-bold text-sm">Set Pending Order</button>
    </div>`);
}

function openAlertModal() {
    openModal(`<div class="space-y-4"><div class="flex justify-between items-center"><h3 class="font-heading font-bold text-sm text-white">Set Alert</h3><button onclick="closeModal()" class="text-xs text-slate-400">✕</button></div><div><label class="text-[10px] text-slate-400 block mb-1">Pair</label><select id="aP" class="w-full bg-darkBg text-white text-xs px-3 py-2.5 rounded-xl border border-darkBorder">${PAIRS.map(p => `<option value="${p.symbol}">${p.symbol}</option>`).join('')}</select></div><div><label class="text-[10px] text-slate-400 block mb-1">Condition</label><select id="aC" class="w-full bg-darkBg text-white text-xs px-3 py-2.5 rounded-xl border border-darkBorder"><option value="above">Above</option><option value="below">Below</option></select></div><div><label class="text-[10px] text-slate-400 block mb-1">Target</label><input type="number" id="aT" placeholder="2900" class="w-full bg-darkBg text-white text-xs px-3 py-2.5 rounded-xl border border-darkBorder"></div><button onclick="saveAlert()" class="w-full py-3 rounded-2xl bg-accentBlue text-white font-bold text-xs">Set Alert</button></div>`);
}
function saveAlert() {
    const sym = document.getElementById('aP').value, cond = document.getElementById('aC').value, tgt = parseFloat(document.getElementById('aT').value);
    if (!tgt) { showToast('Enter target', 'error'); return; }
    STATE.alerts.push({ symbol: sym, condition: cond, target: tgt });
    saveState();
    closeModal();
    showToast(`Alert: ${sym} ${cond} $${tgt}`, 'success');
}
