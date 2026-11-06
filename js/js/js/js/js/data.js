// DAGBO · Market data, alerts, pending orders, news, analysis
async function fetchPrices(force = false) {
    const now = Date.now();
    if (!force && now - STATE.lastUpdated < 60000) return;
    let success = false;

    try {
        const goldRes = await fetch('https://api.gold-api.com/price/XAU');
        if (goldRes.ok) {
            const goldData = await goldRes.json();
            if (goldData && goldData.price) {
                if (!STATE.marketData['GOLD']) STATE.marketData['GOLD'] = { sparkline: [] };
                STATE.marketData['GOLD'].price = parseFloat(goldData.price);
                STATE.marketData['GOLD'].change = 0.15;
                STATE.marketData['GOLD'].sparkline.push(STATE.marketData['GOLD'].price);
                if (STATE.marketData['GOLD'].sparkline.length > 30) STATE.marketData['GOLD'].sparkline.shift();
                success = true;
            }
        }
    } catch (e) { console.log('Gold fetch failed'); }

    try {
        const forexRes = await fetch('https://open.er-api.com/v6/latest/USD');
        if (forexRes.ok) {
            const forexData = await forexRes.json();
            if (forexData && forexData.rates) {
                const r = forexData.rates;
                ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD'].forEach(sym => {
                    if (!STATE.marketData[sym]) STATE.marketData[sym] = { sparkline: [] };
                    let price = sym.startsWith('USD/') ? r[sym.split('/')[1]] : 1 / r[sym.split('/')[0]];
                    STATE.marketData[sym].price = price;
                    STATE.marketData[sym].change = 0.1;
                    STATE.marketData[sym].sparkline.push(price);
                    if (STATE.marketData[sym].sparkline.length > 30) STATE.marketData[sym].sparkline.shift();
                });
                success = true;
            }
        }
    } catch (e) { console.log('Forex fetch failed'); }

    try {
        const binanceRes = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT');
        if (binanceRes.ok) {
            const btcData = await binanceRes.json();
            if (!STATE.marketData['BTC/USD']) STATE.marketData['BTC/USD'] = { sparkline: [] };
            STATE.marketData['BTC/USD'].price = parseFloat(btcData.lastPrice);
            STATE.marketData['BTC/USD'].change = parseFloat(btcData.priceChangePercent);
            STATE.marketData['BTC/USD'].sparkline.push(parseFloat(btcData.lastPrice));
            success = true;
        }
    } catch (e) { console.log('BTC fetch failed'); }

    PAIRS.forEach(p => {
        if (!STATE.marketData[p.symbol] || !STATE.marketData[p.symbol].price) {
            STATE.marketData[p.symbol] = { price: p.base, change: 0, sparkline: [p.base] };
        }
    });

    STATE.isSimulated = !success;
    STATE.lastUpdated = Date.now();
    updateSimBadge();
    checkAlerts();
    checkPendingOrders();
    updateHomePrices();
}

function updateSimBadge() {
    document.getElementById('simBadge')?.classList.toggle('hidden', !STATE.isSimulated);
    document.getElementById('livePill')?.classList.toggle('hidden', STATE.isSimulated);
}

function updateHomePrices() {
    if (router.current !== 'home') return;
    PAIRS.forEach(p => {
        const d = STATE.marketData[p.symbol];
        if (!d) return;
        const dec = getDecimals(p.symbol);
        const px = document.querySelector(`[data-px="${p.symbol}"]`);
        const ch = document.querySelector(`[data-chg="${p.symbol}"]`);
        if (px) px.textContent = '$' + fmtPrice(d.price, dec);
        if (ch) {
            ch.textContent = (d.change >= 0 ? '+' : '') + d.change + '%';
            ch.className = 'text-[11px] font-semibold ' + (d.change >= 0 ? 'text-accentGreen' : 'text-accentRed');
        }
    });
}

function checkPendingOrders() {
    let triggered = false;
    STATE.pendingOrders.forEach((o, idx) => {
        if (o.status !== 'PENDING') return;
        const cur = STATE.marketData[o.symbol]?.price;
        if (!cur) return;
        let hit = false;
        if (o.type === 'BUY LIMIT' && cur <= o.orderPrice) hit = true;
        if (o.type === 'SELL LIMIT' && cur >= o.orderPrice) hit = true;
        if (o.type === 'BUY STOP' && cur >= o.orderPrice) hit = true;
        if (o.type === 'SELL STOP' && cur <= o.orderPrice) hit = true;
        if (hit) {
            STATE.trades.unshift({ id: Date.now(), symbol: o.symbol, type: o.type.includes('BUY') ? 'BUY' : 'SELL', entry: o.orderPrice, sl: o.sl, tp: o.tp, lots: o.lots, tf: '15M', rrRatio: '1:2', pnl: 0, status: 'OPEN', time: new Date().toISOString(), risk0: Math.abs(o.orderPrice - o.sl), partialClosed: false, partialPnl: 0, note: 'Pending Order', emotion: 'Confident' });
            STATE.pendingOrders.splice(idx, 1);
            triggered = true;
            showToast(`🚀 Pending Order Triggered: ${o.type} ${o.symbol}`, 'success');
            pushNotif('trade', 'Pending Order Hit', `${o.type} ${o.symbol} opened at $${fmtPrice(cur)}`);
            speak(`Pending order executed on ${o.symbol}`, true);
        }
    });
    if (triggered) { saveState(); if (router.current === 'journal') renderJournal(document.getElementById('appContent')); }
}

function checkAlerts() {
    for (let i = STATE.alerts.length - 1; i >= 0; i--) {
        const a = STATE.alerts[i], d = STATE.marketData[a.symbol];
        if (!d) continue;
        let hit = false;
        if (a.condition === 'above' && d.price >= a.target) { showToast(`🚨 ${a.symbol} reached ${fmtPrice(a.target)}!`, 'success'); sendTg(`🚨 ${a.symbol} hit ${fmtPrice(a.target)}`); pushNotif('alert', `${a.symbol} above`, `Reached ${fmtPrice(a.target)}`); hit = true; }
        else if (a.condition === 'below' && d.price <= a.target) { showToast(`🚨 ${a.symbol} dropped to ${fmtPrice(a.target)}!`, 'success'); sendTg(`🚨 ${a.symbol} dropped to ${fmtPrice(a.target)}`); pushNotif('alert', `${a.symbol} below`, `Dropped to ${fmtPrice(a.target)}`); hit = true; }
        if (hit) { vib([300, 100, 300], true); speak(`${a.symbol} alert`, true); STATE.alerts.splice(i, 1); saveState(); }
    }

    let updated = false;
    STATE.trades.forEach(t => {
        if (t.status !== 'OPEN') return;
        const cur = STATE.marketData[t.symbol]?.price || t.entry;
        const profit = t.type === 'BUY' ? (cur - t.entry) : (t.entry - cur);
        const mult = getMultiplier(t.symbol);
        const riskDist = t.risk0 || Math.abs(t.entry - t.sl);
        t.pnl = (profit * t.lots * mult) + (t.partialPnl || 0);

        if (!t.partialClosed && profit >= riskDist) {
            t.partialClosed = true;
            const partialLots = Math.floor((t.lots / 2) * 100) / 100;
            if (partialLots > 0) {
                const partialPnl = profit * partialLots * mult;
                STATE.balance += partialPnl;
                t.lots -= partialLots;
                t.partialPnl = (t.partialPnl || 0) + partialPnl;
                saveState();
                showToast(`💰 Partial Close 50% on ${t.symbol}! +$${fmtPrice(partialPnl)}`, 'success');
                pushNotif('win', 'Partial Close', `Closed 50% of ${t.symbol} for +$${fmtPrice(partialPnl)}.`);
                sendTg(`💰 PARTIAL CLOSE: 50% of ${t.symbol} hit 1:1. +$${fmtPrice(partialPnl)}`);
            }
        }

        if (t.partialClosed) {
            const spark = STATE.marketData[t.symbol]?.sparkline || [cur, cur, cur];
            const atr = calcATR(spark, spark, spark);
            const trailDist = atr * 1.5;
            if (t.type === 'BUY') { const nsl = cur - trailDist; if (nsl > t.sl) { t.sl = nsl; saveState(); } }
            else { const nsl = cur + trailDist; if (nsl < t.sl) { t.sl = nsl; saveState(); } }
        }

        const hitTp = t.type === 'BUY' ? cur >= t.tp : cur <= t.tp;
        const hitSl = t.type === 'BUY' ? cur <= t.sl : cur >= t.sl;

        if (hitTp) {
            t.status = 'TP HIT';
            const realized = profit * t.lots * mult;
            STATE.balance += realized;
            updated = true;
            showToast(`🎯 TP HIT ${t.symbol}! +$${fmtPrice(realized)}`, 'success');
            vib([300, 100, 300], true); speak(`Take profit hit on ${t.symbol}`, true);
            sendTg(`🎯 WON: ${t.symbol} ${t.type} TP!`); pushNotif('win', `TP HIT ${t.symbol}`, `+$${fmtPrice(realized)}`);
        } else if (hitSl) {
            const realized = (t.type === 'BUY' ? t.sl - t.entry : t.entry - t.sl) * t.lots * mult;
            STATE.balance += realized;
            t.pnl = realized + (t.partialPnl || 0);
            t.status = t.pnl >= 0 ? 'CLOSED +' : 'SL HIT';
            updated = true;
            if (t.pnl >= 0) { showToast(`✅ Trailing SL closed ${t.symbol} in profit +$${fmtPrice(t.pnl)}`, 'success'); pushNotif('win', `Trailing SL ${t.symbol}`, `+$${fmtPrice(t.pnl)}`); sendTg(`✅ TRAIL WIN: ${t.symbol} closed +$${fmtPrice(t.pnl)}`); }
            else { showToast(`❌ SL HIT ${t.symbol}`, 'error'); vib([500], true); speak(`Stop loss on ${t.symbol}`, true); sendTg(`❌ LOST: ${t.symbol} ${t.type} SL.`); pushNotif('loss', `SL HIT ${t.symbol}`, `-$${fmtPrice(Math.abs(realized))}`); }
        }
    });
    if (updated) { saveState(); if (router.current === 'journal') renderJournal(document.getElementById('appContent')); }
}

async function fetchNews() {
    try {
        const r = await fetch('https://nfs.faireconomy.media/ff_calendar_thisweek.json');
        if (!r.ok) throw new Error();
        const d = await r.json();
        const now = Date.now();
        return d.filter(e => (e.impact === 'High') && new Date(e.date).getTime() > now)
            .map(e => ({
                title: e.title, currency: e.country, date: new Date(e.date), impact: e.impact,
                forecast: e.forecast || '—', previous: e.previous || '—', actual: e.actual || null,
                description: e.title.includes('CPI') ? 'Inflation data. Higher = Rate Hikes = Currency Up.' :
                    e.title.includes('NFP') ? 'Jobs data. Higher = Strong Economy = Currency Up.' :
                    e.title.includes('Interest Rate') ? 'Central Bank Rate Decision.' :
                    e.title.includes('PPI') ? 'Producer Inflation. Leads CPI.' :
                    e.title.includes('Retail Sales') ? 'Consumer Spending.' : 'High impact indicator.'
            })).sort((a, b) => a.date - b.date);
    } catch (e) { return null; }
}

function fallbackEvents() {
    const now = new Date();
    let nfpDate = new Date(now.getFullYear(), now.getMonth(), 1, 13, 30, 0);
    while (nfpDate.getDay() !== 5) { nfpDate.setDate(nfpDate.getDate() + 1); }
    if (nfpDate.getTime() < now.getTime()) {
        nfpDate = new Date(now.getFullYear(), now.getMonth() + 1, 1, 13, 30, 0);
        while (nfpDate.getDay() !== 5) { nfpDate.setDate(nfpDate.getDate() + 1); }
    }
    let cpiDate = new Date(now.getFullYear(), now.getMonth(), 12, 13, 30, 0);
    if (cpiDate.getTime() < now.getTime()) cpiDate = new Date(now.getFullYear(), now.getMonth() + 1, 12, 13, 30, 0);
    return [
        { title: 'US Non-Farm Payrolls (NFP)', currency: 'USD', date: nfpDate, impact: 'High', forecast: '180K', previous: '150K', description: 'Jobs data. Higher = Strong Economy = USD Up.' },
        { title: 'US CPI (Inflation)', currency: 'USD', date: cpiDate, impact: 'High', forecast: '3.1%', previous: '3.2%', description: 'Inflation data. Higher = Rate Hikes = USD Up.' }
    ];
}

function calcPrediction(ev) {
    const f = parseFloat(String(ev.forecast).replace(/[^0-9.\-]/g, ''));
    const p = parseFloat(String(ev.previous).replace(/[^0-9.\-]/g, ''));
    let sur = 0;
    if (!isNaN(f) && !isNaN(p) && p !== 0) sur = ((f - p) / Math.abs(p)) * 100;
    let bias = 'NEUTRAL';
    if (sur > 0.05) bias = 'BULLISH';
    if (sur < -0.05) bias = 'BEARISH';
    if (ev.title.includes('Unemployment')) { if (sur > 0.05) bias = 'BEARISH'; if (sur < -0.05) bias = 'BULLISH'; }
    return { surprise: sur, bias: bias };
}

function analyzeTF(symbol, tf) {
    const data = STATE.marketData[symbol];
    if (!data || !data.sparkline || data.sparkline.length < 5) return null;
    const spark = data.sparkline, price = data.price;
    const range = (Math.max(...spark) - Math.min(...spark)) / price;
    const tfWeight = { '5M': 1.0, '15M': 1.2, '1H': 1.5, '4H': 1.8, '1D': 2.0 }[tf];
    const ema50 = calcEMA(spark, Math.min(spark.length, 10)), rsi = calcRSI(spark);
    const trendScore = (price > ema50) ? 40 : 0;
    const volScore = Math.min(range * 8000, 30);
    const rsiScore = (rsi > 50 && rsi < 70) ? 20 : (rsi < 50 && rsi > 30) ? 20 : 0;
    const rawScore = (volScore + trendScore + rsiScore) * tfWeight;
    const direction = price > ema50 ? 'BUY' : 'SELL';
    const confidence = Math.min(99, Math.round(35 + Math.abs(rsi - 50) * 1.5 + (range * 1000)));
    return { score: rawScore, direction, volatility: range, trendStrength: trendScore / 40, confidence };
}

function slPipsForTf(tf, symbol) {
    const base = (symbol === 'BTC/USD') ? 100 : (symbol === 'US30' || symbol === 'NAS100') ? 50 : (symbol === 'GOLD') ? 5 : 1;
    const t = { '5M': 15, '15M': 30, '1H': 60, '4H': 120, '1D': 250 }[tf];
    return t * base;
}

function runAutoScan() {
    const tfs = ['5M', '15M', '1H', '4H', '1D'];
    const results = [];
    for (const pair of PAIRS) { for (const tf of tfs) { const a = analyzeTF(pair.symbol, tf); if (a && a.score > 0) results.push({ symbol: pair.symbol, pairName: pair.name, tf, ...a }); } }
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, 5);
}
