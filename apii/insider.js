var FINNHUB_KEY = "d8ck3q1r01qidic89rogd8ck3q1r01qidic89rp0";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=3600"); // cache 1 hour
  var ticker = req.query.ticker;
  if (!ticker) return res.status(400).json({ error: "No ticker" });
  try {
    var r = await fetch("https://finnhub.io/api/v1/stock/insider-transactions?symbol=" + ticker + "&token=" + FINNHUB_KEY);
    var d = await r.json();
    var transactions = (d && d.data) ? d.data : [];
    // Last 90 days
    var cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
    var recent = transactions.filter(function(t) {
      return t.transactionDate && new Date(t.transactionDate).getTime() > cutoff;
    });
    var buys  = recent.filter(function(t){ return t.transactionCode === "P"; });
    var sells = recent.filter(function(t){ return t.transactionCode === "S"; });
    var totalBuyValue  = buys.reduce(function(s,t){ return s + (t.share * t.price || 0); }, 0);
    var totalSellValue = sells.reduce(function(s,t){ return s + (t.share * t.price || 0); }, 0);
    return res.status(200).json({
      buys:  buys.length,
      sells: sells.length,
      buyValue:  totalBuyValue,
      sellValue: totalSellValue,
      latest: recent.slice(0,3).map(function(t){ return { name: t.name, code: t.transactionCode, shares: t.share, price: t.price, date: t.transactionDate }; })
    });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
