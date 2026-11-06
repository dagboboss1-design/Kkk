// DAGBO · Pure utilities
let cdIv = null; // Shared candle-countdown interval

function esc(s) { return String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function fmtPrice(v, d = 2) { if (isNaN(v)) return '0.00'; return Number(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); }
function getDecimals(s) { if (s.includes('JPY')) return 2; if (s.includes('EUR') || s.includes('GBP') || s.includes('AUD') || s.includes('USD/CHF')) return 4; return 2; }

function getMultiplier(s) { let m = CONTRACT_SIZES[s] || 100000; if (s && s.endsWith('/JPY')) m /= (STATE.marketData['USD/JPY']?.price || 153.1); return m; }
function getPipSize(s) { return PIP_SIZES[s] || 0.0001; }
function getPipValue(s) { return getMultiplier(s) * getPipSize(s); }

function calcEMA(prices, period) { if(!prices || prices.length < period) return prices[0]; const k = 2/(period+1); let ema = prices[0]; for(let i=1; i<prices.length; i++) ema = prices[i]*k + ema*(1-k); return ema; }
function calcRSI(closes, period=14) { if(closes.length < period+1) return 50; let gains=0, losses=0; for(let i=closes.length-period; i<closes.length; i++){ const diff = closes[i]-closes[i-1]; if(diff>=0) gains+=diff; else losses-=diff; } return 100 - (100 / (1 + (losses===0?100:gains/losses))); }
function calcATR(highs, lows, closes, period=14) { if(highs.length < period+1) return (Math.max(...highs)-Math.min(...lows))/10; let trs=[]; for(let i=1; i<highs.length; i++) trs.push(Math.max(highs[i]-lows[i], Math.abs(highs[i]-closes[i-1]), Math.abs(lows[i]-closes[i-1]))); return trs.slice(-period).reduce((a,b)=>a+b,0)/period; }

function sparkSvg(pts, color) {
    if (!pts || pts.length < 2) return '';
    const min = Math.min(...pts), max = Math.max(...pts), range = max - min || 1, w = 64, h = 24;
    const coords = pts.map((v, i) => `${((i/(pts.length-1))*w).toFixed(1)},${(h - ((v-min)/range)*h).toFixed(1)}`).join(' ');
    return `<svg class="w-16 h-6 overflow-visible" viewBox="0 0 ${w} ${h}"><polyline fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" points="${coords}"/></svg>`;
}
