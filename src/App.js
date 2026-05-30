import { useState, useRef, useEffect } from "react";

const MOONSHOTS = [
  { ticker: "RCAT", name: "Red Cat Holdings",  color: "#ff3d00", sector: "Defense Drones"  },
  { ticker: "ACHR", name: "Archer Aviation",   color: "#00e5ff", sector: "Air Taxis"        },
  { ticker: "ERAS", name: "Erasca Inc.",        color: "#e040fb", sector: "Oncology"         },
  { ticker: "SMR",  name: "NuScale Power",      color: "#ffea00", sector: "Nuclear Energy"   },
  { ticker: "SOUN", name: "SoundHound AI",      color: "#ff6090", sector: "Voice AI"         },
  { ticker: "RGTI", name: "Rigetti Computing",  color: "#b9f6ca", sector: "Quantum"          },
  { ticker: "CAN",  name: "Canaan Inc.",        color: "#ffd740", sector: "Bitcoin Mining"   },
  { ticker: "MU",   name: "Micron Technology",  color: "#00d4ff", sector: "AI Memory"        },
  { ticker: "IONQ", name: "IonQ",               color: "#ea80fc", sector: "Quantum"          },
  { ticker: "RZLV", name: "Rezolve AI",         color: "#f0abfc", sector: "AI Commerce"      },
  { ticker: "EONR", name: "EON Resources",      color: "#86efac", sector: "Oil and Gas"      },
];

const LONGTERM = [
  { ticker: "MSFT", name: "Microsoft",             color: "#60a5fa", sector: "Cloud + AI"     },
  { ticker: "NVTS", name: "Navitas Semiconductor", color: "#34d399", sector: "AI Power Chips" },
  { ticker: "PGY",  name: "Pagaya Technologies",   color: "#fb923c", sector: "AI Fintech"     },
  { ticker: "TSM",  name: "Taiwan Semiconductor",  color: "#f472b6", sector: "Chip Foundry"   },
  { ticker: "PLTR", name: "Palantir Technologies", color: "#818cf8", sector: "AI / Defense"   },
  { ticker: "SOFI", name: "SoFi Technologies",     color: "#38bdf8", sector: "Digital Banking"},
];

const ETFS = [
  { ticker: "AGIX", name: "Roundhill Generative AI ETF", color: "#00e5ff", sector: "AI ETF"      },
  { ticker: "QTUM", name: "Defiance Quantum ETF",        color: "#ea80fc", sector: "Quantum ETF" },
  { ticker: "BAI",  name: "iShares Active AI & Tech",    color: "#60a5fa", sector: "AI ETF"      },
  { ticker: "XBI",  name: "SPDR S&P Biotech ETF",        color: "#34d399", sector: "Biotech ETF" },
  { ticker: "UFO",  name: "Procure Space ETF",            color: "#ffd740", sector: "Space ETF"   },
];

const ALL_STOCKS = [
  ...MOONSHOTS.map(s => ({ ...s, group: "moonshot" })),
  ...LONGTERM.map(s =>  ({ ...s, group: "longterm"  })),
  ...ETFS.map(s =>      ({ ...s, group: "etf"       })),
];

const FALLBACK = {
  RCAT:12.70, ACHR:6.78, ERAS:12.20, SMR:11.75, SOUN:8.42,
  RGTI:18.42, CAN:0.41, MU:116.0, IONQ:63.62, RZLV:2.39, EONR:0.40,
  MSFT:427.78, NVTS:28.51, PGY:13.96, TSM:424.90, PLTR:143.34, SOFI:15.62,
  AGIX:47.24, QTUM:159.10, BAI:50.16, XBI:136.0, UFO:67.81,
};

const ANALYST_TARGETS = {
  RCAT:21.75, ACHR:13.20, ERAS:20.30, SMR:21.00, SOUN:13.30,
  RGTI:18.00, CAN:2.85, MU:165.00, IONQ:50.00, RZLV:12.25, EONR:4.50,
  MSFT:561.00, NVTS:14.46, PGY:34.50, TSM:468.00, PLTR:194.00, SOFI:21.10,
  AGIX:45.00, QTUM:180.00, BAI:60.00, XBI:160.00, UFO:75.00,
};

async function fetchStock(ticker) {
  try {
    const res = await fetch("/api/stock?ticker=" + ticker);
    if (!res.ok) return null;
    return await res.json();
  } catch(e) {
    return null;
  }
}

function calcFib(price, closes) {
  const hi = Math.max(...closes, price);
  const lo = Math.min(...closes, price);
  const r = hi - lo || price * 0.3;
  return { hi: hi, lo: lo, f382: hi-0.382*r, f500: hi-0.5*r, f618: hi-0.618*r, f786: hi-0.786*r };
}

function calcRSILocal(closes) {
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

function buildSignal(price, closes, apiRsi, apiMacd, apiMacdSignal) {
  var fib = calcFib(price, closes);
  var rng = fib.hi - fib.lo;
  var ret = rng === 0 ? 0.5 : (fib.hi - price) / rng;
  var RSI = (apiRsi && apiRsi < 97) ? Math.round(apiRsi) : calcRSILocal(closes);
  var macdBullish = (apiMacd != null && apiMacdSignal != null) ? apiMacd > apiMacdSignal : null;

  var fibSig;
  if (ret >= 0.60 && ret <= 0.65) { fibSig = { lbl: "61.8% Golden", sc: 3 }; }
  else if (ret >= 0.36 && ret <= 0.41) { fibSig = { lbl: "38.2% Zone", sc: 2 }; }
  else if (ret >= 0.47 && ret <= 0.53) { fibSig = { lbl: "50% Midpoint", sc: 1 }; }
  else if (ret >= 0.74 && ret <= 0.82) { fibSig = { lbl: "78.6% Deep", sc: 1 }; }
  else if (ret < 0.12) { fibSig = { lbl: "Near High", sc: -1 }; }
  else { fibSig = { lbl: "Between levels", sc: 0 }; }

  var rsiSig;
  if (!RSI) { rsiSig = { lbl: "RSI -", sc: 0 }; }
  else if (RSI <= 28) { rsiSig = { lbl: "RSI " + RSI + " Oversold", sc: 3 }; }
  else if (RSI <= 40) { rsiSig = { lbl: "RSI " + RSI + " Low", sc: 2 }; }
  else if (RSI >= 72) { rsiSig = { lbl: "RSI " + RSI + " Overbought", sc: -2 }; }
  else if (RSI >= 62) { rsiSig = { lbl: "RSI " + RSI + " High", sc: -1 }; }
  else { rsiSig = { lbl: "RSI " + RSI + " Neutral", sc: 1 }; }

  var macdSig;
  if (macdBullish === null) { macdSig = { lbl: "MACD -", sc: 0 }; }
  else if (macdBullish) { macdSig = { lbl: "MACD Bullish", sc: 2 }; }
  else { macdSig = { lbl: "MACD Bearish", sc: -1 }; }

  var total = fibSig.sc + rsiSig.sc + macdSig.sc;
  var action, actionColor;
  if (total >= 6) { action = "KOB NU"; actionColor = "#00e676"; }
  else if (total >= 4) { action = "KOB SIGNAL"; actionColor = "#69f0ae"; }
  else if (total >= 2) { action = "HOLD OJE"; actionColor = "#ffd740"; }
  else if (total >= 0) { action = "VENT"; actionColor = "#ff9800"; }
  else { action = "UNDGA"; actionColor = "#ff5252"; }

  return { RSI: RSI, fib: fib, fibSig: fibSig, rsiSig: rsiSig, macdSig: macdSig, total: total, action: action, actionColor: actionColor };
}

function fmt(n) {
  if (n == null) return "-";
  if (n < 1) return n.toFixed(4);
  if (n < 100) return n.toFixed(2);
  return n.toFixed(1);
}

function getExitSignal(price, buyPrice, rsi, fib, target) {
  if (!price || !buyPrice) return null;
  var pnl = ((price - buyPrice) / buyPrice) * 100;
  var nearHigh = fib && (Math.abs(price - fib.hi) / fib.hi < 0.03);

  var exitAction, exitColor, recommendation;

  if (pnl <= -15) {
    exitAction = "STOP-LOSS"; exitColor = "#ff5252";
    recommendation = "Aktien er faldet " + Math.abs(pnl).toFixed(1) + "% under din indkobspris. Overvej stop-loss.";
  } else if (rsi && rsi >= 72 && pnl > 10) {
    exitAction = "SAELG NU"; exitColor = "#ff5252";
    recommendation = "RSI " + rsi + " er overkoebt og du er +" + pnl.toFixed(1) + "%. Godt tidspunkt at tage gevinst.";
  } else if (nearHigh && pnl > 20) {
    exitAction = "SAELG NU"; exitColor = "#ff5252";
    recommendation = "Aktien er naer 60-dages top. Du er +" + pnl.toFixed(1) + "%. Tag profit.";
  } else if (target && price >= target * 0.95) {
    exitAction = "MAL NAET"; exitColor = "#00e676";
    recommendation = "Analyst kursmaal $" + fmt(target) + " er naesten naaet. Du er +" + pnl.toFixed(1) + "%. Overvej at saelge halvdelen.";
  } else if (pnl >= 50) {
    exitAction = "TAG PROFIT"; exitColor = "#ffd740";
    recommendation = "Du er +" + pnl.toFixed(1) + "%. Overvej at saelge 50% og lad resten loebe.";
  } else if (pnl >= 25) {
    exitAction = "SAET STOP"; exitColor = "#ffd740";
    recommendation = "Du er +" + pnl.toFixed(1) + "%. Saet trailing stop-loss paa +10-15%.";
  } else if (pnl > 0) {
    exitAction = "HOLD"; exitColor = "#69f0ae";
    recommendation = "Du er +" + pnl.toFixed(1) + "%. Hold og vent paa maalet $" + fmt(target) + ".";
  } else {
    exitAction = "VENT"; exitColor = "#ff9800";
    recommendation = "Du er " + pnl.toFixed(1) + "%. Vent paa signalet vender.";
  }

  return { pnl: pnl, exitAction: exitAction, exitColor: exitColor, recommendation: recommendation, target: target };
}

export default function App() {
  var [stocks,    setStocks]    = useState(function() { return ALL_STOCKS.map(function(s) { return Object.assign({}, s, { price: null, signal: null, live: false }); }); });
  var [openKey,   setOpenKey]   = useState(null);
  var [scanning,  setScanning]  = useState(false);
  var [autoOn,    setAutoOn]    = useState(false);
  var [lastScan,  setLastScan]  = useState(null);
  var [activeTab, setActiveTab] = useState("signals");
  var [positions, setPositions] = useState({});
  var [editKey,   setEditKey]   = useState(null);
  var [editPrice, setEditPrice] = useState("");
  var timerRef = useRef(null);

  async function scanAll() {
    setScanning(true);
    var results = await Promise.all(
      ALL_STOCKS.map(async function(s) {
        var data   = await fetchStock(s.ticker);
        var price  = (data && data.price) ? data.price : (FALLBACK[s.ticker] || 10);
        var closes = (data && data.closes && data.closes.length >= 5) ? data.closes : new Array(20).fill(price);
        var signal = buildSignal(price, closes, data ? data.rsi : null, data ? data.macd : null, data ? data.macdSignal : null);
        return Object.assign({}, s, {
          price: price,
          change: data ? data.change : null,
          changePct: data ? data.changePct : null,
          signal: signal,
          live: !!(data && data.live),
          updatedAt: new Date()
        });
      })
    );
    setStocks(results);
    setLastScan(new Date());
    setScanning(false);
  }

  function toggleAuto() {
    if (!autoOn) {
      setAutoOn(true);
    } else {
      setAutoOn(false);
      clearInterval(timerRef.current);
    }
  }

  useEffect(function() {
    if (autoOn) {
      timerRef.current = setInterval(scanAll, 10*60*1000);
    }
    return function() { clearInterval(timerRef.current); };
  }, [autoOn]); // eslint-disable-line

  function savePosition(key, price) {
    var p = parseFloat(price);
    if (!isNaN(p) && p > 0) {
      setPositions(function(prev) { return Object.assign({}, prev, { [key]: p }); });
    }
    setEditKey(null);
    setEditPrice("");
  }

  function removePosition(key) {
    setPositions(function(prev) {
      var n = Object.assign({}, prev);
      delete n[key];
      return n;
    });
  }

  var moonshots = stocks.filter(function(s) { return s.group === "moonshot"; });
  var longterm  = stocks.filter(function(s) { return s.group === "longterm"; });
  var etfList   = stocks.filter(function(s) { return s.group === "etf"; });

  function SectionHeader(props) {
    return (
      <div style={{ display:"flex", alignItems:"center", gap:10, margin:"18px 0 10px", padding:"10px 14px", background:props.color+"18", border:"1px solid "+props.color+"44", borderRadius:12 }}>
        <span style={{ fontSize:22 }}>{props.emoji}</span>
        <span style={{ fontSize:14, fontWeight:900, color:props.color, letterSpacing:1 }}>{props.label}</span>
        <span style={{ fontSize:10, color:props.color+"88", marginLeft:"auto", fontFamily:"monospace" }}>{props.count} aktier</span>
      </div>
    );
  }

  function StockRow(props) {
    var s = props.s;
    var key    = s.ticker + "_" + s.group;
    var isOpen = openKey === key;
    var sig    = s.signal;
    return (
      <div style={{ marginBottom:6 }}>
        <div onClick={function() { setOpenKey(isOpen ? null : key); }}
          style={{ background:isOpen?(s.color+"0e"):"rgba(255,255,255,0.025)", border:"1px solid "+(isOpen?(s.color+"55"):"rgba(255,255,255,0.07)"), borderRadius:isOpen?"10px 10px 0 0":"10px", padding:"12px 14px", cursor:"pointer" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:9, height:9, borderRadius:"50%", background:s.color, flexShrink:0 }}/>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:"flex", alignItems:"baseline", gap:8, flexWrap:"wrap" }}>
                <span style={{ fontSize:14, fontWeight:900, color:s.color, fontFamily:"monospace" }}>{s.ticker}</span>
                <span style={{ fontSize:10, color:"#444" }}>{s.name}</span>
                {s.live ? <span style={{ fontSize:9, color:"#00e676", background:"#00e67615", border:"1px solid #00e67633", padding:"1px 5px", borderRadius:4 }}>LIVE</span>
                        : (s.price ? <span style={{ fontSize:9, color:"#ff9800" }}>est</span> : null)}
              </div>
              {sig ? (
                <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:3 }}>
                  <span style={{ fontSize:11, fontWeight:700, color:sig.actionColor, background:sig.actionColor+"18", border:"1px solid "+sig.actionColor+"33", padding:"1px 8px", borderRadius:5 }}>{sig.action}</span>
                  {sig.RSI ? <span style={{ fontSize:10, color:"#3a3a3a", fontFamily:"monospace" }}>RSI {sig.RSI}</span> : null}
                </div>
              ) : <span style={{ fontSize:11, color:"#333", fontStyle:"italic" }}>Tryk Scan...</span>}
            </div>
            {s.price ? (
              <div style={{ textAlign:"right", flexShrink:0 }}>
                <div style={{ fontSize:15, fontWeight:900, color:(s.changePct == null ? "#fff" : (s.changePct >= 0 ? "#00e676" : "#ff5252")), fontFamily:"monospace" }}>${fmt(s.price)}</div>
                {s.changePct != null ? <div style={{ fontSize:11, fontWeight:700, color:(s.changePct >= 0 ? "#00e676" : "#ff5252"), fontFamily:"monospace" }}>{s.changePct >= 0 ? "+" : ""}{s.changePct.toFixed(2)}%</div> : null}
              </div>
            ) : null}
            <div style={{ color:"#333", fontSize:12 }}>{isOpen ? "^" : "v"}</div>
          </div>
        </div>
        {isOpen && sig && s.price ? (
          <div style={{ background:"rgba(0,0,0,0.5)", border:"1px solid "+s.color+"22", borderTop:"none", borderRadius:"0 0 10px 10px", padding:14 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
              <div>
                <div style={{ fontSize:9, color:s.color, fontFamily:"monospace", letterSpacing:2, marginBottom:8 }}>SIGNALER</div>
                {[[sig.fibSig],[sig.rsiSig],[sig.macdSig]].map(function(arr, i) {
                  var ss = arr[0];
                  return (
                    <div key={i} style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                      <span style={{ fontSize:10, color:"#444", fontFamily:"monospace" }}>{["Fib","RSI","MACD"][i]}</span>
                      <span style={{ fontSize:10, fontFamily:"monospace", color:(ss.sc >= 2 ? "#00e676" : (ss.sc < 0 ? "#ff5252" : "#ffd740")) }}>{ss.lbl} ({ss.sc > 0 ? "+" : ""}{ss.sc})</span>
                    </div>
                  );
                })}
                <div style={{ marginTop:10 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                    <span style={{ fontSize:9, color:"#2a2a2a", fontFamily:"monospace" }}>SCORE</span>
                    <span style={{ fontSize:12, fontWeight:800, color:sig.actionColor, fontFamily:"monospace" }}>{sig.total}/8</span>
                  </div>
                  <div style={{ height:4, background:"rgba(255,255,255,0.05)", borderRadius:2 }}>
                    <div style={{ height:"100%", width:Math.max(0,Math.min(100,(sig.total/8)*100))+"%", background:sig.actionColor, borderRadius:2 }}/>
                  </div>
                </div>
              </div>
              <div>
                <div style={{ fontSize:9, color:s.color, fontFamily:"monospace", letterSpacing:2, marginBottom:8 }}>FIBONACCI</div>
                {[["Top",sig.fib.hi,false],["38.2%",sig.fib.f382,true],["50%",sig.fib.f500,false],["61.8%",sig.fib.f618,true],["78.6%",sig.fib.f786,false],["Bund",sig.fib.lo,false]].map(function(row) {
                  var lbl=row[0], p=row[1], gold=row[2];
                  var near = s.price > 0 && Math.abs(s.price-p)/s.price < 0.03;
                  return (
                    <div key={lbl} style={{ display:"flex", justifyContent:"space-between", padding:"2px 5px", borderRadius:4, marginBottom:3, background:(near ? s.color+"22" : (gold ? "#ffd74008" : "transparent")), border:(near ? "1px solid "+s.color+"44" : "1px solid transparent") }}>
                      <span style={{ fontSize:10, fontFamily:"monospace", color:(near ? s.color : (gold ? "#ffd740" : "#3a3a3a")) }}>{lbl}</span>
                      <span style={{ fontSize:10, fontFamily:"monospace", color:(near ? "#fff" : "#666"), fontWeight:(near ? 700 : 400) }}>${fmt(p)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ background:sig.actionColor+"0d", border:"1px solid "+sig.actionColor+"22", borderRadius:8, padding:"10px 12px" }}>
              <div style={{ fontSize:9, color:sig.actionColor, fontFamily:"monospace", marginBottom:5 }}>ENTRY ANBEFALING</div>
              <div style={{ fontSize:12, color:"#999", lineHeight:1.75 }}>
                {sig.total >= 6 ? "Staerk signal. Kob naer $"+fmt(sig.fib.f618)+" (61.8%). Stop under $"+fmt(sig.fib.f786)+"." : null}
                {sig.total >= 4 && sig.total < 6 ? "Godt setup. Vent paa bekraeftelse ved $"+fmt(sig.fib.f618)+"-$"+fmt(sig.fib.f382)+"." : null}
                {sig.total >= 2 && sig.total < 4 ? "Vent paa tilbagetrak til $"+fmt(sig.fib.f618)+"." : null}
                {sig.total >= 0 && sig.total < 2 ? "For tidligt. Vent paa RSI under 45." : null}
                {sig.total < 0 ? "Bearish. Undgaa entry nu." : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  function ExitRow(props) {
    var s = props.s;
    var key      = s.ticker + "_" + s.group;
    var buyPrice = positions[key];
    var sig      = s.signal;
    var rsi      = sig ? sig.RSI : null;
    var fib      = sig ? sig.fib : null;
    var target   = ANALYST_TARGETS[s.ticker];
    var exit     = (s.price && buyPrice) ? getExitSignal(s.price, buyPrice, rsi, fib, target) : null;
    var isEditing = editKey === key;

    return (
      <div style={{ marginBottom:8 }}>
        <div style={{ background:(exit ? exit.exitColor+"0d" : "rgba(255,255,255,0.025)"), border:"1px solid "+(exit ? exit.exitColor+"44" : "rgba(255,255,255,0.07)"), borderRadius:12, padding:"13px 14px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:9, height:9, borderRadius:"50%", background:s.color, flexShrink:0 }}/>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:"flex", alignItems:"baseline", gap:8 }}>
                <span style={{ fontSize:14, fontWeight:900, color:s.color, fontFamily:"monospace" }}>{s.ticker}</span>
                <span style={{ fontSize:10, color:"#444" }}>{s.name}</span>
              </div>
              {exit ? (
                <div style={{ marginTop:3 }}>
                  <span style={{ fontSize:11, fontWeight:700, color:exit.exitColor, background:exit.exitColor+"18", border:"1px solid "+exit.exitColor+"33", padding:"1px 8px", borderRadius:5 }}>{exit.exitAction}</span>
                  <span style={{ fontSize:11, fontWeight:700, color:(exit.pnl >= 0 ? "#00e676" : "#ff5252"), marginLeft:8, fontFamily:"monospace" }}>{exit.pnl >= 0 ? "+" : ""}{exit.pnl.toFixed(1)}%</span>
                </div>
              ) : (
                <div style={{ fontSize:11, color:"#555", fontStyle:"italic", marginTop:2 }}>
                  {buyPrice ? "Scanner..." : "Ingen indkobspris sat"}
                </div>
              )}
            </div>
            <div style={{ textAlign:"right", flexShrink:0, marginRight:4 }}>
              {s.price ? <div style={{ fontSize:13, fontWeight:800, color:"#fff", fontFamily:"monospace" }}>${fmt(s.price)}</div> : null}
              {buyPrice ? <div style={{ fontSize:10, color:"#555", fontFamily:"monospace" }}>Kobt: ${fmt(buyPrice)}</div> : null}
            </div>
            <button onClick={function() { setEdi
