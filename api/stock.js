const FINNHUB_KEY = "d8ck3q1r01qidic89rogd8ck3q1r01qidic89rp0";
const TWELVE_KEY  = "94c91c54b2c1488cb6288819bb03378a";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=120");

  const { ticker } = req.query;
  if (!ticker) return res.status(400).json({ error: "No ticker" });

  // ── Try Twelve Data first ──────────────────────────────────────────────────
  try {
    const url = `https://api.twelvedata.com/time_series?symbol=${ticker}&interval=1day&outputsize=60&apikey=${TWELVE_KEY}`;
    const r = await fetch(url);
    const d = await r.json();
    if (d.status !== "error" && d.values?.length > 0) {
      const closes = d.values.map(v => parseFloat(v.close)).filter(Boolean).reverse();
      const price  = closes[closes.length - 1];
      if (price > 0) {
        const rsi  = calcRSI(closes);
        const macd = calcMACD(closes);
        return res.status(200).json({ price, closes, rsi, ...macd, live: true, source: "twelve" });
      }
    }
  } catch {}

  // ── Fallback: Finnhub quote + candles ─────────────────────────────────────
  try {
    const to   = Math.floor(Date.now() / 1000);
    const from = to - 60 * 60 * 24 * 90;

    // Get candles for RSI/Fib
    const cr = await fetch(
      `https://finnhub.io/api/v1/stock/candle?symbol=${ticker}&resolution=D&from=${from}&to=${to}&token=${FINNHUB_KEY}`
    );
    const cd = await cr.json();

    // Get real-time quote
    const qr = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${FINNHUB_KEY}`
    );
    const qd = await qr.json();

    const livePrice = qd?.c;
    const closes    = cd?.s === "ok" ? cd.c.filter(Boolean) : [];

    if (livePrice > 0 && closes.length >= 5) {
      const allCloses = [...closes, livePrice];
      const rsi  = calcRSI(allCloses);
      const macd = calcMACD(allCloses);
      return res.status(200).json({ price: livePrice, closes: allCloses, rsi, ...macd, live: true, source: "finnhub" });
    }

    if (livePrice > 0) {
      return res.status(200).json({ price: livePrice, closes: [livePrice], rsi: null, macd: null, macdSignal: null, live: true, source: "finnhub-quote" });
    }
  } catch {}

  return res.status(404).json({ error: "No data for " + ticker });
}

// ── Technical indicators ───────────────────────────────────────────────────
function calcRSI(closes) {
  if (closes.length < 16) return null;
  let g = 0, l = 0;
  for (let i = closes.length - 14; i < closes.length; i++) {
    const d = closes[i] - closes[i-1];
    d > 0 ? g += d : l -= d;
  }
  const ag = g/14, al = l/14;
  return al === 0 ? 99 : Math.round(100 - 100/(1 + ag/al));
}

function calcMACD(closes) {
  if (closes.length < 26) return { macd: null, macdSignal: null };
  const ema = (arr, p) => { const k=2/(p+1); return arr.reduce((e,v)=>v*k+e*(1-k)); };
  const e12 = ema(closes.slice(-26), 12);
  const e26 = ema(closes.slice(-26), 26);
  const macd = e12 - e26;
  const macdSignal = macd * 0.85;
  return { macd, macdSignal };
}
