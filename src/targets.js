var FINNHUB_KEY = "d8ck3q1r01qidic89rogd8ck3q1r01qidic89rp0";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=3600"); // cache 1 hour

  var { ticker } = req.query;
  if (!ticker) return res.status(400).json({ error: "No ticker" });

  try {
    var r = await fetch(
      "https://finnhub.io/api/v1/stock/price-target?symbol=" + ticker + "&token=" + FINNHUB_KEY
    );
    var d = await r.json();

    if (d && d.targetMean && d.targetMean > 0) {
      return res.status(200).json({
        mean:   Math.round(d.targetMean * 100) / 100,
        high:   Math.round((d.targetHigh || 0) * 100) / 100,
        low:    Math.round((d.targetLow  || 0) * 100) / 100,
        count:  d.numberOfAnalysts || 0,
        updated: new Date().toISOString().slice(0, 10),
      });
    }
    return res.status(404).json({ error: "No target for " + ticker });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
