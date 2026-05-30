var FINNHUB_KEY = "d8ck3q1r01qidic89rogd8ck3q1r01qidic89rp0";
var TWELVE_KEY  = "94c91c54b2c1488cb6288819bb03378a";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=60");

  var ticker = req.query.ticker;
  var range  = req.query.range || "month"; // day | week | month | year

  if (!ticker) return res.status(400).json({ error: "No ticker" });

  // Map range to Twelve Data interval + outputsize
  var interval, outputsize;
  if (range === "day")   { interval = "5min";  outputsize = 78;  }
  else if (range === "week")  { interval = "1h";    outputsize = 40;  }
  else if (range === "year")  { interval = "1week"; outputsize = 52;  }
  else                        { interval = "1day";  outputsize = 60;  }

  // Try Twelve Data
  try {
    var url = "https://api.twelvedata.com/time_series?symbol=" + ticker + "&interval=" + interval + "&outputsize=" + outputsize + "&apikey=" + TWELVE_KEY;
    var r = await fetch(url);
    var d = await r.json();
    if (d.status !== "error" && d.values && d.values.length > 0) {
      var closes = d.values.map(function(v) { return parseFloat(v.close); }).filter(Boolean).reverse();
      var times  = d.values.map(function(v) { return v.datetime; }).reverse();
      var price  = closes[closes.length - 1];
      if (price > 0) {
        var rsi = calcRSI(closes);
        var macd = calcMACD(closes);
        var prevClose = closes.length >= 2 ? closes[closes.length - 2] : null;
        var change    = prevClose ? price - prevClose : null;
        var changePct = (change && prevClose) ? (change / prevClose) * 100 : null;
        return res.status(200).json({ price:price, closes:closes, times:times, rsi:rsi, macd:macd.macd, macdSignal:macd.macdSignal, change:change, changePct:changePct, live:true, source:"twelve" });
      }
    }
  } catch(e) {}

  // Fallback: Finnhub
  try {
    var to   = Math.floor(Date.now() / 1000);
    var from = to - 60 * 60 * 24 * 120;
    var cr = await fetch("https://finnhub.io/api/v1/stock/candle?symbol=" + ticker + "&resolution=D&from=" + from + "&to=" + to + "&token=" + FINNHUB_KEY);
    var cd = await cr.json();
    var qr = await fetch("https://finnhub.io/api/v1/quote?symbol=" + ticker + "&token=" + FINNHUB_KEY);
    var qd = await qr.json();
    var livePrice = qd && qd.c ? qd.c : null;
    var fhCloses  = (cd && cd.s === "ok") ? cd.c.filter(Boolean) : [];
    var fhTimes   = (cd && cd.s === "ok" && cd.t) ? cd.t.map(function(t) { return new Date(t*1000).toISOString().slice(0,10); }) : [];
    var prevClose2 = qd && qd.pc ? qd.pc : null;
    var change2   = (livePrice && prevClose2) ? livePrice - prevClose2 : null;
    var changePct2 = (change2 && prevClose2) ? (change2 / prevClose2) * 100 : null;
    if (livePrice > 0 && fhCloses.length >= 5) {
      var allCloses = fhCloses.concat([livePrice]);
      return res.status(200).json({ price:livePrice, closes:allCloses, times:fhTimes, rsi:calcRSI(allCloses), macd:calcMACD(allCloses).macd, macdSignal:calcMACD(allCloses).macdSignal, change:change2, changePct:changePct2, live:true, source:"finnhub" });
    }
    if (livePrice > 0) {
      return res.status(200).json({ price:livePrice, closes:[livePrice], times:[], rsi:null, macd:null, macdSignal:null, change:change2, changePct:changePct2, live:true, source:"finnhub-quote" });
    }
  } catch(e) {}

  return res.status(404).json({ error: "No data for " + ticker });
}

function calcRSI(closes) {
  if (closes.length < 16) return null;
  var g = 0, l = 0;
  for (var i = closes.length - 14; i < closes.length; i++) {
    var d = closes[i] - closes[i-1];
    if (d > 0) { g += d; } else { l -= d; }
  }
  var ag = g/14, al = l/14;
  if (al === 0) return null;
  var rsi = Math.round(100 - 100/(1 + ag/al));
  return rsi >= 97 ? null : rsi;
}

function calcMACD(closes) {
  if (closes.length < 26) return { macd: null, macdSignal: null };
  var k12 = 2/13, k26 = 2/27;
  var e12 = closes.slice(-26).reduce(function(e,v){ return v*k12+e*(1-k12); });
  var e26 = closes.slice(-26).reduce(function(e,v){ return v*k26+e*(1-k26); });
  var macd = e12 - e26;
  return { macd: macd, macdSignal: macd * 0.85 };
}
