// DAGBO · Constants
const DEFAULT_TWELVE = '9b213c4f75d2427bbcd832d592b3a1f0';
const TRADING_EXPERT_PROMPT = `You are DAGBO, an elite trading mentor. Answer ANY question about trading, ICT, SMC, risk management and market history. Be direct, accurate, and actionable.`;

const PAIRS = [
    { symbol:'DXY', name:'Dollar Index', base:104.50, td:'DXY' },
    { symbol:'GOLD', name:'XAU/USD', base:4061.52, td:'XAU/USD' },
    { symbol:'SILVER', name:'XAG/USD', base:31.85, td:'XAG/USD' },
    { symbol:'BTC/USD', name:'Bitcoin', base:96400, td:'BTC/USD' },
    { symbol:'US30', name:'Dow Jones', base:43800, td:'DJI' },
    { symbol:'NAS100', name:'Nasdaq 100', base:20500, td:'NDX' },
    { symbol:'USOIL', name:'WTI Crude', base:71.40, td:'WTI' },
    { symbol:'EUR/USD', name:'Euro / Dollar', base:1.0420, td:'EUR/USD' },
    { symbol:'GBP/USD', name:'Pound / Dollar', base:1.2530, td:'GBP/USD' },
    { symbol:'USD/JPY', name:'Dollar / Yen', base:153.10, td:'USD/JPY' },
    { symbol:'GBP/JPY', name:'Pound / Yen', base:192.40, td:'GBP/JPY' },
    { symbol:'AUD/USD', name:'Aussie / Dollar', base:0.6420, td:'AUD/USD' }
];

const CONTRACT_SIZES = { 'DXY': 1000, 'GOLD': 100, 'SILVER': 5000, 'BTC/USD': 1, 'US30': 1, 'NAS100': 1, 'USOIL': 1000, 'EUR/USD': 100000, 'GBP/USD': 100000, 'USD/JPY': 100000, 'GBP/JPY': 100000, 'AUD/USD': 100000 };
const PIP_SIZES = { 'DXY': 0.01, 'GOLD': 0.10, 'SILVER': 0.01, 'BTC/USD': 1, 'US30': 1, 'NAS100': 1, 'USOIL': 0.01, 'EUR/USD': 0.0001, 'GBP/USD': 0.0001, 'USD/JPY': 0.01, 'GBP/JPY': 0.01, 'AUD/USD': 0.0001 };
