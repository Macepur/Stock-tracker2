export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const { ticker } = req.query;
  if (!ticker) return res.status(400).json({ error: "No ticker" });
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=60d`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
      }
    });
    const data = await response.json();
    const result = data?.chart?.result?.[0];
    if (!result) return res.status(404).json({ error: "No data" });
    const closes = (result.indicators?.quote?.[0]?.close || []).filter(Boolean);
    const price = result.meta?.regularMarketPrice || closes[closes.length - 1];
    res.status(200).json({ price, closes });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
