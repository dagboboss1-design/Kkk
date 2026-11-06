// DAGBO · Trading engine
function calcAutoLot(symbol, slPips, balance, riskPct) {
    const risk = balance * (riskPct / 100);
    const lots = risk / (slPips * getPipValue(symbol));
    return Math.max(0.01, Math.round(lots * 100) / 100);
}

function finalLot(symbol, slPips) {
    const auto = calcAutoLot(symbol, slPips, STATE.balance, STATE.riskPct);
    if (STATE.manualLot <= 0) return auto;
    const pv = getPipValue(symbol);
    if (!pv || slPips <= 0) return STATE.manualLot;
    const maxBy3pct = (STATE.balance * 0.03) / (slPips * pv);
    const capped = Math.min(STATE.manualLot, Math.max(0.01, Math.round(maxBy3pct * 100) / 100));
    if (capped < STATE.manualLot) showToast(`⚠ Manual lot capped from ${STATE.manualLot} → ${capped} (3% risk)`, 'error');
    return capped;
}

function executeTrade(sym, type, entry, sl, tp, lots, tf = '15M') {
    const todayLosses = STATE.trades.filter(t => { try { return new Date(t.time).toDateString() === new Date().toDateString() && (t.status === 'SL HIT' || t.status === 'CLOSED -'); } catch (e) { return false; } });
    const last2Loss = STATE.trades.slice(0, 2).length >= 2 && STATE.trades.slice(0, 2).every(t => (t.status === 'SL HIT' || t.status === 'CLOSED -') && new Date(t.time).toDateString() === new Date().toDateString());
    if (last2Loss && todayLosses.length >= 2) { showToast('🛑 KILL SWITCH: 2 losses in a row. Take a break. No revenge trade.', 'error'); return; }

    const openRisk = STATE.trades.filter(t => t.status === 'OPEN').reduce((a, t) => a + (Math.abs(t.entry - t.sl) * t.lots * getMultiplier(t.symbol)), 0);
    const newRisk = Math.abs(entry - sl) * lots * getMultiplier(sym);
    if (openRisk + newRisk > STATE.balance * 0.03) { showToast('🛑 Max 3% open risk exceeded!', 'error'); return; }

    let todayPnL = STATE.balance - STATE.propFirm.todayStartBalance;
    let dailyLimit = STATE.propFirm.accountSize * (STATE.propFirm.dailyLimitPct / 100);
    if (todayPnL <= -dailyLimit) { showToast('🛑 Prop Firm Daily Loss Limit hit. Cannot trade.', 'error'); return; }

    const spreadCost = 2 * getPipValue(sym) * lots, commission = 5 * lots;
    STATE.balance -= (spreadCost + commission);

    let safeTf = (tf && tf !== 'undefined' && tf !== 'null') ? tf : '15M';
    let note = esc(document.getElementById('tradeNote')?.value || 'No notes.');
    let emotion = document.getElementById('tradeEmotion').value;

    STATE.trades.unshift({ id: Date.now(), symbol: sym, type, entry: Number(entry), sl: Number(sl), tp: Number(tp), lots, tf: safeTf, rrRatio: `1:${STATE.defaultRr}`, pnl: 0, status: 'OPEN', time: new Date().toISOString(), beAlerted: false, partialClosed: false, partialPnl: 0, note, emotion, risk0: Math.abs(entry - sl) });
    saveState();
    closeModal();
    showToast(`🚀 ${type} ${sym} opened`, 'success');
    vib([150, 50, 150]);
    sendTg(`🚀 ${type} ${sym} (${safeTf})\nEntry $${fmtPrice(entry)}\nSL $${fmtPrice(sl)}\nTP $${fmtPrice(tp)}\nLot ${lots.toFixed(2)}`);
    pushNotif('trade', `Opened ${type} ${sym}`, `${lots.toFixed(2)} lots · ${safeTf}`);
    router.navigate('journal');
}

function closeEarly(id) {
    const t = STATE.trades.find(x => x.id === id);
    if (!t || t.status !== 'OPEN') return;
    confirmAction('Close Trade?', `Close ${t.symbol}?`, () => {
        backupState('Closed Trade');
        const cur = STATE.marketData[t.symbol]?.price || t.entry;
        const pnl = (t.type === 'BUY' ? (cur - t.entry) : (t.entry - cur)) * t.lots * getMultiplier(t.symbol);
        t.pnl = pnl;
        t.status = pnl >= 0 ? 'CLOSED +' : 'CLOSED -';
        STATE.balance += pnl;
        saveState();
        showToast(`Closed: ${pnl >= 0 ? '+' : ''}$${fmtPrice(pnl)}`, pnl >= 0 ? 'success' : 'error');
        renderJournal(document.getElementById('appContent'));
    });
}

function panicCloseAll() {
    confirmAction('PANIC CLOSE ALL?', 'Close ALL open trades at current market price?', () => {
        backupState('Panic Close All');
        let count = 0;
        STATE.trades.forEach(t => {
            if (t.status === 'OPEN') {
                const cur = STATE.marketData[t.symbol]?.price || t.entry;
                const pnl = (t.type === 'BUY' ? (cur - t.entry) : (t.entry - cur)) * t.lots * getMultiplier(t.symbol);
                t.pnl = pnl;
                t.status = pnl >= 0 ? 'CLOSED +' : 'CLOSED -';
                STATE.balance += pnl;
                count++;
            }
        });
        saveState();
        showToast(`🚨 Closed ${count} trades!`, 'error');
        renderJournal(document.getElementById('appContent'));
    });
}

function savePendingOrder(sym, sl, tp, lot) {
    const type = document.getElementById('pType').value;
    const orderPrice = parseFloat(document.getElementById('pPrice').value);
    if (!orderPrice) { showToast('Enter a valid price', 'error'); return; }
    STATE.pendingOrders.push({ id: Date.now(), symbol: sym, type, orderPrice, sl, tp, lots: lot, status: 'PENDING' });
    saveState();
    closeModal();
    showToast(`Pending Order Set: ${type} at $${orderPrice}`, 'success');
}

function cancelPendingOrder(id) {
    const o = STATE.pendingOrders.find(x => x.id === id);
    if (!o) return;
    STATE.pendingOrders = STATE.pendingOrders.filter(x => x.id !== id);
    saveState();
    showToast(`Cancelled ${o.type} ${o.symbol}`, 'success');
    if (router.current === 'journal') renderJournal(document.getElementById('appContent'));
    else if (router.current === 'home') renderHome(document.getElementById('appContent'));
}

function clearJ() {
    confirmAction('Clear Trades?', 'Delete journal?', () => {
        backupState('Clear Journal');
        STATE.trades = [];
        saveState();
        renderJournal(document.getElementById('appContent'));
    });
}
