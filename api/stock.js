const TWELVE_KEY = "94c91c54b2c1488cb6288819bb03378a";

// Some tickers need exchange specified for Twelve Data
const TICKER_MAP = {
  "ACHR": "ACHR:NASDAQ",
  "SOUN": "SOUN:NASDAQ",
  "CAN":  "CAN:NASDAQ",
  "MU":   "MU:NASDAQ",
  "NVTS": "NVTS:NASDAQ",
  "BAI":  "BAI:NYSE",
  "QTUM": "QTUM:NYSE",
  "UFO":  "UFO:NASDAQ",
  "TSM":  "TSM:NYSE",
  "PGY":  "PGY:NASDAQ",
  "RGTI": "RGTI:NASDAQ",
  "RCAT": "RCAT:NASDAQ",
  "ERAS": "ERAS:NASDAQ",
  "SMR":  "SMR:NYSE",
  "AGIX": "AGIX:NASDAQ",
  "XBI":  "XBI:NYSE",
  "IONQ": "IONQ:NYSE",
  "MSFT": "MSFT:NASDAQ",
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=60");

  const { ticker } = req.query;
  if (!ticker) return res.status(400).json({ error: "No ticker" });

  const symbol = TICKER_MAP[ticker] || ticker;

  // Try with exchange-qualified symbol first, then plain ticker
  const symbols = symbol !== ticker ? [symbol, ticker] : [ticker];

  for (const sym of symbols) {
    try {
      const url = `https://api.twelvedata.com/time_series?symbol=${sym}&interval=1day&outputsize=60&type=stock&apikey=${TWELVE_KEY}`;
      const r = await fetch(url);
      const d = await r.json();

      if (d.status === "error" || !d.values || d.values.length === 0) continue;

      const values = d.values;
      const closes = values.map(v => parseFloat(v.close)).filter(Boolean).reverse();
      const price = closes[closes.length - 1];
      if (!price || price <= 0) continue;

      // Calculate RSI from closes
      let rsi = null;
      if (closes.length >= 15) {
        let g = 0, l = 0;
        for (let i = closes.length - 14; i < closes.length; i++) {
          const diff = closes[i] - closes[i-1];
          diff > 0 ? g += diff : l -= diff;
        }
        const ag = g/14, al = l/14;
        rsi = al === 0 ? 99 : Math.round(100 - 100/(1 + ag/al));
      }

      // Calculate MACD
      const ema = (arr, p) => {
        const k = 2/(p+1);
        return arr.reduce((e, v) => v*k + e*(1-k));
      };
      let macd = null, macdSignal = null;
      if (closes.length >= 26) {
        const e12 = ema(closes.slice(-26), 12);
        const e26 = ema(closes.slice(-26), 26);
        macd = e12 - e26;
        macdSignal = macd * 0.9; // simplified signal
      }

      return res.status(200).json({ price, closes, rsi, macd, macdSignal, live: true });
    } catch {}
  }

  // Final fallback: just get quote price
  try {
    const qr = await fetch(`https://api.twelvedata.com/price?symbol=${ticker}&apikey=${TWELVE_KEY}`);
    const q = await qr.json();
    if (q.price && parseFloat(q.price) > 0) {
      const price = parseFloat(q.price);
      return res.status(200).json({ price, closes: [price], rsi: null, macd: null, macdSignal: null, live: true });
    }
  } catch {}

  return res.status(404).json({ error: "No data for " + ticker });
}
