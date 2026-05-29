const TWELVE_KEY = "94c91c54b2c1488cb6288819bb03378a";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=60"); // cache 60 seconds

  const { ticker } = req.query;
  if (!ticker) return res.status(400).json({ error: "No ticker" });

  try {
    // Fetch time series with technical indicators in one call
    const url = `https://api.twelvedata.com/time_series?symbol=${ticker}&interval=1day&outputsize=60&indicator=rsi,macd&apikey=${TWELVE_KEY}`;
    const r = await fetch(url);
    const d = await r.json();

    if (d.status === "error" || !d.values) {
      // Fallback: just get quote
      const qr = await fetch(`https://api.twelvedata.com/quote?symbol=${ticker}&apikey=${TWELVE_KEY}`);
      const q = await qr.json();
      if (q.close) {
        return res.status(200).json({
          price: parseFloat(q.close),
          closes: [parseFloat(q.close)],
          rsi: null,
          macd: null,
          live: true,
        });
      }
      return res.status(404).json({ error: "No data for " + ticker });
    }

    const values = d.values;
    const closes = values.map(v => parseFloat(v.close)).reverse();
    const price = closes[closes.length - 1];

    // Get latest RSI
    const rsiVal = values[0]?.rsi ? parseFloat(values[0].rsi) : null;

    // Get latest MACD
    const macdVal = values[0]?.macd ? parseFloat(values[0].macd) : null;
    const macdSignal = values[0]?.macd_signal ? parseFloat(values[0].macd_signal) : null;

    return res.status(200).json({
      price,
      closes,
      rsi: rsiVal,
      macd: macdVal,
      macdSignal,
      live: true,
    });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

