// DAGBO · AI
function buildAIContext() {
    const lines = [`=== DAGBO LIVE STATE ===`, `UTC: ${new Date().toUTCString()}`, `Balance: $${fmtPrice(STATE.balance)}`];
    lines.push(`\n=== LIVE PRICES ===`);
    for (const p of PAIRS) { const d = STATE.marketData[p.symbol]; if (d) lines.push(`${p.symbol}: $${fmtPrice(d.price, getDecimals(p.symbol))} (${d.change}%)`); }
    const open = STATE.trades.filter(t => t.status === 'OPEN');
    lines.push(`\n=== OPEN TRADES ===`);
    if (open.length === 0) lines.push('None');
    else for (const t of open) lines.push(`${t.type} ${t.symbol} | Entry ${t.entry} | SL ${t.sl} | TP ${t.tp}`);
    return lines.join('\n');
}

async function aiCall(systemPrompt, userMessage, useSearch = true, history = []) {
    const context = buildAIContext();
    const recent = (history || []).filter(m => m && m.text && m.role !== 'system').slice(-8);
    const historyStr = recent.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`).join('\n');
    const finalPrompt = `${TRADING_EXPERT_PROMPT}\n\n${systemPrompt}\n\nLIVE DATA:\n${context}${historyStr ? '\n\nCONVERSATION:\n' + historyStr : ''}\n\nUser Question: ${userMessage}`;

    try {
        if (STATE.workerUrl && !STATE.workerUrl.includes('YOUR-NAME')) {
            const _msgs = [...recent.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text })), { role: 'user', content: userMessage }];
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);
            const r = await fetch(STATE.workerUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ system: systemPrompt, messages: _msgs, search: useSearch }), signal: controller.signal });
            clearTimeout(timeoutId);
            if (r.ok) { const j = await r.json(); if (j.text) return j.text; }
        }
    } catch (e) { console.log('Worker failed, trying free AI...'); }

    try {
        const r = await fetch(`https://text.pollinations.ai/${encodeURIComponent(finalPrompt)}`);
        if (r.ok) { const text = await r.text(); if (text && text.length > 5) return text; }
    } catch (e) { console.log('Free AI failed, using local brain.'); }

    return getLocalFallback(userMessage);
}

function getLocalFallback(prompt) {
    const p = (prompt || '').toLowerCase();
    const gold = STATE.marketData['GOLD']?.price || 4061.52, dxy = STATE.marketData['DXY']?.price || 104.50, btc = STATE.marketData['BTC/USD']?.price || 96400;
    if (p.includes('smc') || p.includes('smart money') || p.includes('ict') || p.includes('concept') || p.includes('strategy') || p.includes('order block') || p.includes('fvg'))
        return `Smart Money Concepts (SMC) focus on tracking institutional order flow. Key concepts include:\n\n1. **Order Blocks (OB):** The last opposing candle before a strong move. It acts as a strong support/resistance zone.\n2. **Fair Value Gaps (FVG):** A 3-candle pattern where there is a gap between the wick of candle 1 and candle 3. Price usually returns to fill this gap.\n3. **Liquidity Sweeps:** When price pushes past a recent high/low to trigger stop losses, then aggressively reverses.\n\nSource: Local App Data`;
    if (p.includes('dxy') || p.includes('dollar index')) return `DXY is currently at $${fmtPrice(dxy)}. It is ${STATE.marketData['DXY']?.change > 0 ? 'up' : 'down'} today.\n\nSource: Local App Data`;
    if (p.includes('gold') || p.includes('xau')) return `GOLD now $${fmtPrice(gold)}. Retest Rule: Wait 5-15 mins after spike, enter on 15M close, SL beyond wick, TP 1:${STATE.defaultRr}.\n\nSource: Local App Data`;
    if (p.includes('signal') || p.includes('buy') || p.includes('sell')) { const t = runAutoScan()[0]; return t ? `Best Local Signal: ${t.direction} ${t.symbol} ${t.tf} - ${t.confidence}% confidence.\n\nSource: Local App Data` : 'No setup now. Wait for confluence.'; }
    if (p.includes('risk') || p.includes('rr') || p.includes('lot') || p.includes('size')) { const risk = STATE.balance * STATE.riskPct / 100; return `Risk: ${STATE.riskPct}% = $${fmtPrice(risk)} per trade. RR 1:${STATE.defaultRr} = Win $${fmtPrice(risk * STATE.defaultRr)} if TP hit.\n\nSource: Local App Data`; }
    if (p.includes('news') || p.includes('cpi') || p.includes('nfp') || p.includes('event')) return `News Rule: Do NOT chase spike. Wait 5-15 mins for pullback to broken level, enter on 15M confirmation. Check Spike tab.\n\nSource: Local App Data`;
    if (p.includes('psychology') || p.includes('lose') || p.includes('revenge') || p.includes('emotional') || p.includes('fear')) return `Trading psychology is 80% of the game. If you are losing, stop trading. The app has a built-in "Kill Switch" that locks you out if you lose 2 trades in a row on the same day. This prevents revenge trading.\n\nSource: Local App Data`;
    if (p.includes('account') || p.includes('health') || p.includes('balance')) { const open = STATE.trades.filter(t => t.status === 'OPEN').length; return `Your account is at $${fmtPrice(STATE.balance)}. You have ${open} open trades. Risk per trade is ${STATE.riskPct}%. Keep your open risk below 3% to protect the account.\n\nSource: Local App Data`; }
    if (p.includes('question') || p.includes('ask')) return `You can ask me things like:\n- "Explain Fair Value Gaps"\n- "How do I size my lot?"\n- "What is the DXY doing?"\n- "Give me a trade signal"\n- "Why am I losing money?"\nWhat would you like to learn?\n\nSource: Local App Data`;
    return `Worker offline (Settings > Worker URL). Live Data: GOLD $${fmtPrice(gold)} | DXY $${fmtPrice(dxy)} | BTC $${fmtPrice(btc)}. Ask "gold", "dxy", "smc", "signal", or "risk".\n\nSource: Local App Data`;
}

async function sendChat() {
    const inp = document.getElementById('chatIn');
    if (!inp) return;
    const text = inp.value.trim();
    if (!text) return;
    STATE.activeChat.push({ role: 'user', text });
    inp.value = '';
    STATE.activeChat.push({ role: 'assistant', text: '⏳ Thinking...' });
    renderAI(document.getElementById('appContent'));
    let reply = '';
    const _hist = STATE.activeChat.slice(0, -2);
    try { reply = await aiCall('Answer the question fully and accurately.', text, true, _hist); } catch (e) { reply = getLocalFallback(text); }
    STATE.activeChat.pop();
    STATE.activeChat.push({ role: 'assistant', text: reply });
    saveState();
    renderAI(document.getElementById('appContent'));
    try { speak(reply.split(' ').slice(0, 15).join(' '), false); } catch (e) {}
}

function renderAI(c) {
    c.innerHTML = `<div class="flex flex-col h-[calc(100vh-120px)] p-4"><div class="flex items-center justify-between pb-3 border-b border-darkBorder mb-3"><div class="flex items-center space-x-2"><div class="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-xs">AI</div><div><h3 class="font-heading font-bold text-sm text-white">Claude Expert</h3><span class="text-[10px] text-accentGreen">● Web Search Active</span></div></div><button onclick="clearChat()" class="text-[10px] text-slate-400 px-2 py-1 rounded-xl bg-darkSurface border border-darkBorder">Clear</button></div><div class="grid grid-cols-2 gap-2 mb-3"><button onclick="generateSignal()" class="p-2.5 rounded-xl bg-gradient-to-br from-accentGreen/20 to-darkSurface border border-accentGreen/40 text-left"><div class="text-[10px] font-bold text-accentGreen">🎯 SIGNAL</div><div class="text-[9px] text-slate-400">Best trade now</div></button></div><div id="chatBox" class="flex-1 overflow-y-auto space-y-3 pr-1 pb-4">${STATE.activeChat.map(m => `<div class="flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}"><div class="max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed whitespace-pre-wrap ${m.role === 'user' ? 'bg-accentBlue text-white rounded-br-none' : 'bg-darkSurface border border-darkBorder text-slate-200 rounded-bl-none'}">${esc(m.text).replace(/\n/g, '<br>')}</div></div>`).join('')}</div><div class="pt-2 flex items-center space-x-2"><button onclick="startVoice()" class="p-3 rounded-2xl bg-darkSurface border border-darkBorder text-slate-300">🎤</button><input id="chatIn" onkeydown="if(event.key==='Enter')sendChat()" placeholder="Ask anything..." class="flex-1 bg-darkSurface border border-darkBorder rounded-2xl px-4 py-3 text-xs text-white outline-none focus:border-accentBlue"><button onclick="sendChat()" class="p-3 rounded-2xl bg-accentBlue text-white"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg></button></div></div>`;
    const b = document.getElementById('chatBox');
    if (b) b.scrollTop = b.scrollHeight;
}

function startVoice() {
    if (!('webkitSpeechRecognition' in window)) { showToast('Voice not supported', 'error'); return; }
    const rec = new webkitSpeechRecognition();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onstart = () => { showToast('🎤 Listening...', 'info'); };
    rec.onresult = (e) => { document.getElementById('chatIn').value = e.results[0][0].transcript; sendChat(); };
    rec.onerror = () => showToast('Voice error', 'error');
    rec.start();
}

function clearChat() {
    confirmAction('Clear Chat?', 'Delete messages?', () => {
        backupState('Clear Chat');
        STATE.activeChat = [{ role: 'assistant', text: 'Cleared.' }];
        saveState();
        renderAI(document.getElementById('appContent'));
    }, false);
}

async function generateSignal() {
    showToast('🧠 AI analyzing all pairs…', 'info');
    const sys = `Analyze LIVE DATA and pick the SINGLE best trade setup. If no clear setup, output ONLY {"signal":"NO TRADE","reasoning":"Why no trade"}. Otherwise output ONLY valid JSON: {"signal":"BUY","symbol":"GOLD","timeframe":"15M","confidence":85,"reasoning":"2 sentences","entry":4061,"stopLoss":4051,"takeProfit":4081,"strategy":"SMC","pattern":"FVG","indicators":"RSI"}`;
    try {
        const reply = await aiCall(sys, 'Generate signal.', false);
        const sig = JSON.parse(reply.match(/\{[\s\S]*\}/)[0]);
        if (STATE.autoPilot && sig.confidence >= 85 && sig.signal !== 'NO TRADE') {
            const slPips = Math.abs(sig.entry - sig.stopLoss) / getPipSize(sig.symbol);
            executeTrade(sig.symbol, sig.signal, sig.entry, sig.stopLoss, sig.takeProfit, finalLot(sig.symbol, slPips || 30), sig.timeframe || '15M');
            showToast('🤖 Auto-Pilot Executed Trade', 'success');
        } else { renderSignalCard(sig, false); }
    } catch (e) {
        const t = runAutoScan()[0];
        if (!t) { renderSignalCard({ signal: 'NO TRADE', reasoning: 'Scanner found no confluence. Wait.' }, false); return; }
        const pr = STATE.marketData[t.symbol]?.price || 4061;
        const sl = t.direction === 'BUY' ? pr - 5 : pr + 5;
        const tp = t.direction === 'BUY' ? pr + 5 * STATE.defaultRr : pr - 5 * STATE.defaultRr;
        if (STATE.autoPilot && t.confidence >= 85) {
            executeTrade(t.symbol, t.direction, pr, sl, tp, finalLot(t.symbol, 30), t.tf);
            showToast('🤖 Auto-Pilot Executed Local Signal', 'success');
        } else {
            renderSignalCard({ signal: t.direction, symbol: t.symbol, timeframe: t.tf, confidence: t.confidence, reasoning: 'Local fallback: Worker offline, using Scanner.', entry: pr, stopLoss: sl, takeProfit: tp, strategy: 'Local Scanner', pattern: 'Momentum', indicators: 'EMA+RSI' }, false);
        }
    }
}

function renderSignalCard(sig, isSpike = false, isPostSpike = false) {
    if (!sig || sig.signal === 'NO TRADE' || sig.signal === 'NO_TRADE') {
        openModal(`<div class="space-y-4"><div class="flex justify-between"><h3 class="font-bold text-sm">⏸️ NO TRADE</h3><button onclick="closeModal()" class="text-xs text-slate-400">✕</button></div><p class="text-xs text-slate-300 leading-relaxed">${esc(sig?.reasoning || 'No clear confluence. Waiting is a trade. No setup, no entry.')}</p><button onclick="closeModal()" class="w-full py-3 rounded-2xl bg-darkBg border border-darkBorder text-xs font-bold">Close</button></div>`);
        return;
    }
    if (!PAIRS.some(p => p.symbol === sig.symbol)) { showToast('Invalid symbol from AI, ignored.', 'error'); return; }
    const isBuy = sig.signal === 'BUY';
    const entry = Number(sig.entry ?? STATE.marketData[sig.symbol]?.price);
    const sl = Number(sig.stopLoss ?? sig.sl);
    const tp = Number(sig.takeProfit ?? sig.tp);
    if (!entry || !sl || !tp) { showToast('AI signal missing Entry/SL/TP', 'error'); return; }
    if (isBuy && !(sl < entry && tp > entry)) { showToast('AI SL/TP on wrong side, ignored.', 'error'); return; }
    if (!isBuy && !(sl > entry && tp < entry)) { showToast('AI SL/TP on wrong side, ignored.', 'error'); return; }
    const title = isSpike ? '⚡ PRE-NEWS SPIKE SIGNAL' : isPostSpike ? '🌊 POST-NEWS RETEST SIGNAL' : '🎯 AI TRADE SIGNAL';
    const slPips = Math.abs(entry - sl) / getPipSize(sig.symbol);
    const lot = finalLot(sig.symbol, slPips || 30);
    const dec = getDecimals(sig.symbol);
    openModal(`<div class="space-y-4"><div class="flex justify-between items-center"><h3 class="font-heading font-bold text-sm text-white">${title}</h3><button onclick="closeModal()" class="text-xs text-slate-400">✕</button></div><div class="rounded-2xl bg-darkBg border border-darkBorder p-4 space-y-2"><div class="flex justify-between"><span class="text-lg font-extrabold text-white">${esc(sig.signal)} ${esc(sig.symbol)}</span><span class="text-[10px] px-2 py-1 rounded-full bg-accentGreen/20 text-accentGreen font-bold">${esc(String(sig.confidence || 75))}%</span></div><p class="text-[11px] text-slate-300">${esc(sig.reasoning || '')}</p></div><div class="rounded-2xl bg-darkSurface border border-accentBlue/30 p-3 space-y-1"><div class="text-[9px] font-bold text-accentBlue uppercase tracking-wider mb-1 text-center">Signal Source</div><div class="grid grid-cols-3 gap-1 text-[10px] text-slate-300 text-center"><div><span class="text-slate-500 block">Strategy</span><b class="text-white">${esc(sig.strategy || 'SMC / Price Action')}</b></div><div><span class="text-slate-500 block">Pattern</span><b class="text-white">${esc(sig.pattern || 'Liquidity Sweep')}</b></div><div><span class="text-slate-500 block">Indicators</span><b class="text-white">${esc(sig.indicators || 'EMA + RSI')}</b></div></div></div><div class="grid grid-cols-3 gap-2 text-center text-[11px]"><div class="p-2.5 rounded-xl bg-darkBg border border-darkBorder"><div class="text-slate-400 text-[9px]">Entry</div><div class="font-bold text-white">$${fmtPrice(entry, dec)}</div></div><div class="p-2.5 rounded-xl bg-darkBg border border-darkBorder"><div class="text-slate-400 text-[9px]">SL</div><div class="font-bold text-accentRed">$${fmtPrice(sl, dec)}</div></div><div class="p-2.5 rounded-xl bg-darkBg border border-darkBorder"><div class="text-slate-400 text-[9px]">TP</div><div class="font-bold text-accentGreen">$${fmtPrice(tp, dec)}</div></div></div><button onclick="openChecklist('${esc(sig.symbol)}','${esc(sig.signal)}',${entry},${sl},${tp},${lot},'${esc(sig.timeframe || '15M')}')" class="w-full py-3.5 rounded-2xl bg-gradient-to-r from-accentGreen to-emerald-600 text-white font-extrabold text-sm shadow-lg">🚀 EXECUTE (${lot.toFixed(2)} lot)</button></div>`);
}
