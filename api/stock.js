export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const { ticker } = req.query;
  if (!ticker) return res.status(400).json({ error: "No ticker" });

  // Try multiple data sources
  const sources = [
    // Source 1: Yahoo Finance v7 (different endpoint)
    async () => {
      const r = await fetch(
        `https://query2.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=60d`,
        { headers: { "User-Agent": "Mozilla/5.0", "Accept": "*/*" } }
      );
      const d = await r.json();
      const result = d?.chart?.result?.[0];
      const closes = (result?.indicators?.quote?.[0]?.close || []).filter(Boolean);
      const price = result?.meta?.regularMarketPrice || closes[closes.length-1];
      if (price > 0 && closes.length >= 5) return { price, closes };
      return null;
    },
    // Source 2: Yahoo Finance v10
    async () => {
      const r = await fetch(
        `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=price`,
        { headers: { "User-Agent": "Mozilla/5.0" } }
      );
      const d = await r.json();
      const price = d?.quoteSummary?.result?.[0]?.price?.regularMarketPrice?.raw;
      if (price > 0) return { price, closes: [price] };
      return null;
    },
  ];

  for (const source of sources) {
    try {
      const result = await source();
      if (result) return res.status(200).json(result);
    } catch {}
  }

  return res.status(404).json({ error: "All sources failed" });
}
