// DAGBO · Charting
function openChart(sym, initialTf = '15M') {
    let currentTf = initialTf;
    function renderChartModal() {
        openModal(`<div class="space-y-4"><div class="flex justify-between items-center"><h3 class="font-heading font-bold text-sm text-white">${esc(sym)} · ${esc(currentTf)}</h3><button onclick="closeModal()" class="text-xs text-slate-400">✕</button></div><div class="flex space-x-1 bg-darkBg p-1 rounded-xl border border-darkBorder">${['5M','15M','1H','4H','1D'].map(t => `<button onclick="window._changeChartTf('${t}')" class="flex-1 py-1.5 rounded-lg text-[10px] font-bold ${currentTf === t ? 'bg-accentBlue text-white' : 'text-slate-400 hover:text-white'}">${t}</button>`).join('')}</div><div id="chartBox" class="w-full h-72 rounded-2xl bg-darkBg border border-darkBorder flex items-center justify-center text-xs text-slate-400">Loading ${currentTf} Data...</div><div class="flex justify-between text-[9px] text-slate-500 px-1"><span>🔴 SL</span><span>🔵 Entry</span><span>🟢 TP</span><span>🟠 FVG</span></div></div>`);
        drawRealChart();
    }
    window._changeChartTf = (newTf) => { currentTf = newTf; renderChartModal(); };

    async function drawRealChart() {
        const box = document.getElementById('chartBox');
        if (!box || !window.LightweightCharts) return;
        box.innerHTML = '';
        let data = [];
        const intervalMap = { '5M': '5min', '15M': '15min', '1H': '1h', '4H': '4h', '1D': '1day' };
        const binanceMap = { '5M': '5m', '15M': '15m', '1H': '1h', '4H': '4h', '1D': '1d' };
        const pair = PAIRS.find(p => p.symbol === sym);

        try {
            if (sym === 'GOLD' || sym === 'BTC/USD') {
                const bSym = sym === 'GOLD' ? 'PAXGUSDT' : 'BTCUSDT';
                const d = await fetch(`https://api.binance.com/api/v3/klines?symbol=${bSym}&interval=${binanceMap[currentTf] || '15m'}&limit=50`).then(r => r.json());
                data = d.map(k => ({ time: k[0] / 1000, open: +k[1], high: +k[2], low: +k[3], close: +k[4] }));
            } else {
                const r = await fetch(`https://api.twelvedata.com/time_series?symbol=${pair.td}&interval=${intervalMap[currentTf] || '15min'}&outputsize=50&apikey=${STATE.twelveKey}`);
                const json = await r.json();
                if (json.status === "error" || !json.values) throw new Error("API Error");
                data = json.values.map(v => ({ time: new Date(v.datetime).getTime() / 1000, open: parseFloat(v.open), high: parseFloat(v.high), low: parseFloat(v.low), close: parseFloat(v.close) })).reverse();
            }
        } catch (e) {
            const base = STATE.marketData[sym]?.price || 100;
            let p = base;
            const tfSecs = { '5M': 300, '15M': 900, '1H': 3600, '4H': 14400, '1D': 86400 }[currentTf] || 900;
            let time = Math.floor(Date.now() / 1000) - (tfSecs * 50);
            for (let i = 0; i < 50; i++) {
                const o = p + (Math.random() - 0.5) * base * 0.005;
                const c = o + (Math.random() - 0.48) * base * 0.006;
                data.push({ time, open: o, high: Math.max(o, c) + Math.random() * base * 0.002, low: Math.min(o, c) - Math.random() * base * 0.002, close: c });
                p = c; time += tfSecs;
            }
        }

        try { if (window._dagboActiveChart) { window._dagboActiveChart.remove(); window._dagboActiveChart = null; } } catch (_e) {}
        const chart = LightweightCharts.createChart(box, { layout: { background: { type: 'solid', color: '#0A0E17' }, textColor: '#94A3B8' }, grid: { vertLines: { color: '#1E293B' }, horzLines: { color: '#1E293B' } }, rightPriceScale: { borderColor: '#1E293B' }, timeScale: { borderColor: '#1E293B', timeVisible: true } });
        window._dagboActiveChart = chart;
        const s = chart.addCandlestickSeries({ upColor: '#10B981', downColor: '#EF4444', borderVisible: false, wickUpColor: '#10B981', wickDownColor: '#EF4444' });
        s.setData(data);
        chart.timeScale().fitContent();

        const openTrade = STATE.trades.find(t => t.status === 'OPEN' && t.symbol === sym);
        if (openTrade) {
            s.createPriceLine({ price: openTrade.entry, color: '#3B82F6', lineWidth: 2, lineStyle: 0, axisLabelVisible: true, title: 'ENTRY' });
            s.createPriceLine({ price: openTrade.sl, color: '#EF4444', lineWidth: 2, lineStyle: 2, axisLabelVisible: true, title: 'SL' });
            s.createPriceLine({ price: openTrade.tp, color: '#10B981', lineWidth: 2, lineStyle: 2, axisLabelVisible: true, title: 'TP' });
        }

        for (let i = 1; i < data.length - 1; i++) {
            const prev = data[i - 1], next = data[i + 1];
            if (prev.high < next.low) {
                s.createPriceLine({ price: prev.high, color: 'rgba(16, 185, 129, 0.4)', lineWidth: 1, lineStyle: 3, axisLabelVisible: false, title: 'FVG' });
                s.createPriceLine({ price: next.low, color: 'rgba(16, 185, 129, 0.4)', lineWidth: 1, lineStyle: 3, axisLabelVisible: false, title: 'FVG' });
            }
            if (prev.low > next.high) {
                s.createPriceLine({ price: prev.low, color: 'rgba(239, 68, 68, 0.4)', lineWidth: 1, lineStyle: 3, axisLabelVisible: false, title: 'FVG' });
                s.createPriceLine({ price: next.high, color: 'rgba(239, 68, 68, 0.4)', lineWidth: 1, lineStyle: 3, axisLabelVisible: false, title: 'FVG' });
            }
        }
    }
    renderChartModal();
}
