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
  { ticker: "EONR", name: "EON Resources",      color: "#86efac", sector: "Oil & Gas"        },
];

const LONGTERM = [
  { ticker: "MSFT", name: "Microsoft",             color: "#60a5fa", sector: "Cloud + AI"     },
  { ticker: "NVTS", name: "Navitas Semiconductor", color: "#34d399", sector: "AI Power Chips" },
  { ticker: "PGY",  name: "Pagaya Technologies",   color: "#fb923c", sector: "AI Fintech"     },
  { ticker: "TSM",  name: "Taiwan Semiconductor",  color: "#f472b6", sector: "Chip Foundry"   },
  { ticker: "PLTR", name: "Palantir Technologies", color: "#818cf8", sector: "AI / Defense"   },
  { ticker: "SOFI", name: "SoFi Technologies",     color: "#38bdf8", sector: "Digital Banking" },
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

// Analyst targets for exit guidance
const ANALYST_TARGETS = {
  RCAT:21.75, ACHR:13.20, ERAS:20.30, SMR:21.00, SOUN:13.30,
  RGTI:18.00, CAN:2.85, MU:165.00, IONQ:50.00, RZLV:12.25, EONR:4.50,
  MSFT:561.00, NVTS:14.46, PGY:34.50, TSM:468.00, PLTR:194.00, SOFI:21.10,
  AGIX:45.00, QTUM:180.00, BAI:60.00, XBI:160.00, UFO:75.00,
};

async function fetchStock(ticker) {
  try {
    const res = await fetch(`/api/stock?ticker=${ticker}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {}
  return null;
}

function calcFib(price, closes) {
  const hi = Math.max(...closes, price);
  const lo = Math.min(...closes, price);
  const r = hi - lo || price * 0.3;
  return { hi, lo, f382: hi-0.382*r, f500: hi-0.5*r, f618: hi-0.618*r, f786: hi-0.786*r };
}

function calcRSILocal(closes) {
  if (closes.length < 16) return null;
  let g = 0, l = 0;
  for (let i = closes.length - 14; i < closes.length; i++) {
    const d = closes[i] - closes[i-1];
    d > 0 ? g += d : l -= d;
  }
  const ag = g/14, al = l/14;
  if (al === 0) return null;
  const rsi = Math.round(100 - 100/(1 + ag/al));
  return rsi >= 97 ? null : rsi;
}

function buildSignal(price, closes, apiRsi, apiMacd, apiMacdSignal) {
  const fib = calcFib(price, closes);
  const rng = fib.hi - fib.lo;
  const ret = rng === 0 ? 0.5 : (fib.hi - price) / rng;
  const RSI = (apiRsi && apiRsi < 97) ? Math.round(apiRsi) : calcRSILocal(closes);
  const macdBullish = apiMacd != null && apiMacdSignal != null ? apiMacd > apiMacdSignal : null;

  const fibSig =
    ret >= 0.60 && ret <= 0.65 ? { lbl: "61.8% Golden ★", sc: 3 } :
    ret >= 0.36 && ret <= 0.41 ? { lbl: "38.2% Zone ★",   sc: 2 } :
    ret >= 0.47 && ret <= 0.53 ? { lbl: "50% Midpoint",    sc: 1 } :
    ret >= 0.74 && ret <= 0.82 ? { lbl: "78.6% Deep",      sc: 1 } :
    ret < 0.12                 ? { lbl: "Near High",        sc: -1 } :
                                 { lbl: "Between levels",   sc: 0 };

  const rsiSig = !RSI ? { lbl: "RSI —", sc: 0 } :
    RSI <= 28 ? { lbl: `RSI ${RSI} Oversold ★`, sc: 3 } :
    RSI <= 40 ? { lbl: `RSI ${RSI} Low`,         sc: 2 } :
    RSI >= 72 ? { lbl: `RSI ${RSI} Overbought`,  sc: -2 } :
    RSI >= 62 ? { lbl: `RSI ${RSI} High`,        sc: -1 } :
                { lbl: `RSI ${RSI} Neutral`,      sc: 1 };

  const macdSig = macdBullish === null ? { lbl: "MACD —", sc: 0 } :
    macdBullish ? { lbl: "MACD Bullish ↑", sc: 2 } :
                  { lbl: "MACD Bearish ↓", sc: -1 };

  const total = fibSig.sc + rsiSig.sc + macdSig.sc;
  const action =
    total >= 6 ? "🚀 KØB NU" : total >= 4 ? "✅ KØB SIGNAL" :
    total >= 2 ? "👀 HOLD ØJE" : total >= 0 ? "⏳ VENT" : "❌ UNDGÅ";
  const actionColor =
    total >= 6 ? "#00e676" : total >= 4 ? "#69f0ae" :
    total >= 2 ? "#ffd740" : total >= 0 ? "#ff9800" : "#ff5252";

  return { RSI, fib, fibSig, rsiSig, macdSig, total, action, actionColor };
}

const fmt = n => n == null ? "—" : n < 1 ? n.toFixed(4) : n < 100 ? n.toFixed(2) : n.toFixed(1);

export default function App() {
  const [stocks,    setStocks]    = useState(() => ALL_STOCKS.map(s => ({ ...s, price: null, signal: null, live: false })));
  const [openKey,   setOpenKey]   = useState(null);
  const [scanning,  setScanning]  = useState(false);
  const [autoOn,    setAutoOn]    = useState(false);
  const [lastScan,  setLastScan]  = useState(null);
  const [activeTab, setActiveTab] = useState("signals");
  const [positions, setPositions] = useState({});
  const [editKey,   setEditKey]   = useState(null);
  const [editPrice, setEditPrice] = useState("");
  const timerRef = useRef(null);

  const scanAll = async () => {
    setScanning(true);
    const results = await Promise.all(
      ALL_STOCKS.map(async s => {
        const data   = await fetchStock(s.ticker);
        const price  = data?.price  || FALLBACK[s.ticker] || 10;
        const closes = data?.closes?.length >= 5 ? data.closes : Array(20).fill(price);
        const signal = buildSignal(price, closes, data?.rsi, data?.macd, data?.macdSignal);
        return { ...s, price, change: data?.change||null, changePct: data?.changePct||null, signal, live:!!data?.live, updatedAt: new Date() };
      })
    );
    setStocks(results);
    setLastScan(new Date());
    setScanning(false);
  };

  const toggleAuto = () => {
    if (!autoOn) {
      setAutoOn(true);
    } else {
      setAutoOn(false);
      clearInterval(timerRef.current);
    }
  };

  useEffect(() => {
    if (autoOn) {
      timerRef.current = setInterval(scanAll, 10*60*1000); // eslint-disable-line
    }
    return () => clearInterval(timerRef.current);
  }, [autoOn]); // eslint-disable-line

  const savePosition = (key, price) => {
    const p = parseFloat(price);
    if (!isNaN(p) && p > 0) setPositions(prev => ({ ...prev, [key]: p }));
    setEditKey(null); setEditPrice("");
  };

  const removePosition = (key) => setPositions(prev => { const n={...prev}; delete n[key]; return n; });

  const moonshots = stocks.filter(s => s.group === "moonshot");
  const longterm  = stocks.filter(s => s.group === "longterm");
  const etfList   = stocks.filter(s => s.group === "etf");

  // ── EXIT SIGNAL for a stock ──────────────────────────────────────────────
  function getExitSignal(s, buyPrice) {
    const price = s.price;
    if (!price || !buyPrice) return null;
    const target = ANALYST_TARGETS[s.ticker];
    const pnl = ((price - buyPrice) / buyPrice) * 100;
    const rsi = s.signal?.RSI;

    // Fibonacci exit levels (resistance = sell zones)
    const fib = s.signal?.fib;
    const nearHigh = fib && Math.abs(price - fib.hi) / fib.hi < 0.03;
    const nearF236 = fib && Math.abs(price - (fib.hi - 0.236*(fib.hi-fib.lo))) / price < 0.03;

    let recommendation = "";
    let exitColor = "#ffd740";
    let exitAction = "👀 HOLD";

    if (pnl <= -15) {
      exitAction = "🛑 STOP-LOSS"; exitColor = "#ff5252";
      recommendation = `Aktien er faldet ${Math.abs(pnl).toFixed(1)}% under din indkøbspris. Overvej at sætte stop-loss for at beskytte kapital.`;
    } else if (rsi && rsi >= 72 && pnl > 10) {
      exitAction = "🔴 SÆLG NU"; exitColor = "#ff5252";
      recommendation = `RSI ${rsi} er overkøbt og du er +${pnl.toFixed(1)}%. Godt tidspunkt at tage gevinst eller sætte trailing stop.`;
    } else if (nearHigh && pnl > 20) {
      exitAction = "🔴 SÆLG NU"; exitColor = "#ff5252";
      recommendation = `Aktien er tæt på 60-dages top. Du er +${pnl.toFixed(1)}%. Tag profit eller sæt stop-loss tæt på nuværende kurs.`;
    } else if (target && price >= target * 0.95) {
      exitAction = "🎯 MÅL NÅT"; exitColor = "#00e676";
      recommendation = `Analyst kursmål $${fmt(target)} er næsten nået. Du er +${pnl.toFixed(1)}%. Overvej at sælge halvdelen og lad resten køre.`;
    } else if (pnl >= 50) {
      exitAction = "💰 TAG PROFIT"; exitColor = "#ffd740";
      recommendation = `Du er +${pnl.toFixed(1)}%. Overvej at sælge 50% og lad resten løbe mod målet $${fmt(target)}.`;
    } else if (pnl >= 25) {
      exitAction = "📈 SÆTTE STOP"; exitColor = "#ffd740";
      recommendation = `Du er +${pnl.toFixed(1)}%. Sæt trailing stop-loss på +10-15% for at beskytte gevinsten.`;
    } else if (pnl > 0) {
      exitAction = "✅ HOLD"; exitColor = "#69f0ae";
      recommendation = `Du er +${pnl.toFixed(1)}%. Trend er positiv — hold og vent på målet $${fmt(target)}.`;
    } else {
      exitAction = "⏳ VENT"; exitColor = "#ff9800";
      recommendation = `Du er ${pnl.toFixed(1)}%. Ingen grund til at sælge endnu — vent på signalet vender.`;
    }

    return { pnl, exitAction, exitColor, recommendation, target };
  }

  // ── SECTION HEADER ──────────────────────────────────────────────────────
  const Section = ({ emoji, label, color, list }) => (
    <>
      <div style={{ display:"flex", alignItems:"center", gap:10, margin:"18px 0 10px", padding:"10px 14px", background:color+"18", border:`1px solid ${color}44`, borderRadius:12 }}>
        <span style={{ fontSize:22 }}>{emoji}</span>
        <span style={{ fontSize:14, fontWeight:900, color, letterSpacing:1 }}>{label}</span>
        <span style={{ fontSize:10, color:color+"88", marginLeft:"auto", fontFamily:"monospace" }}>{list.length} aktier</span>
      </div>
      {list.map(s => <StockRow key={s.ticker+"_"+s.group} s={s} />)}
    </>
  );

  // ── SIGNAL STOCK ROW ─────────────────────────────────────────────────────
  const StockRow = ({ s }) => {
    const key    = s.ticker+"_"+s.group;
    const isOpen = openKey === key;
    const sig    = s.signal;
    return (
      <div style={{ marginBottom:6 }}>
        <div onClick={() => setOpenKey(isOpen ? null : key)}
          style={{ background:isOpen?`${s.color}0e`:"rgba(255,255,255,0.025)", border:`1px solid ${isOpen?s.color+"55":"rgba(255,255,255,0.07)"}`, borderRadius:isOpen?"10px 10px 0 0":10, padding:"12px 14px", cursor:"pointer", transition:"all 0.2s" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:9, height:9, borderRadius:"50%", background:s.color, flexShrink:0, boxShadow:`0 0 6px ${s.color}` }}/>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:"flex", alignItems:"baseline", gap:8, flexWrap:"wrap" }}>
                <span style={{ fontSize:14, fontWeight:900, color:s.color, fontFamily:"monospace" }}>{s.ticker}</span>
                <span style={{ fontSize:10, color:"#444" }}>{s.name}</span>
                {s.live ? <span style={{ fontSize:9, color:"#00e676", background:"#00e67615", border:"1px solid #00e67633", padding:"1px 5px", borderRadius:4, fontFamily:"monospace" }}>● LIVE</span>
                        : s.price && <span style={{ fontSize:9, color:"#ff9800", fontFamily:"monospace" }}>~ est</span>}
              </div>
              {sig ? (
                <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:3 }}>
                  <span style={{ fontSize:11, fontWeight:700, color:sig.actionColor, background:sig.actionColor+"18", border:`1px solid ${sig.actionColor}33`, padding:"1px 8px", borderRadius:5 }}>{sig.action}</span>
                  {sig.RSI && <span style={{ fontSize:10, color:"#3a3a3a", fontFamily:"monospace" }}>RSI {sig.RSI}</span>}
                </div>
              ) : <span style={{ fontSize:11, color:"#333", fontStyle:"italic" }}>Tryk Scan...</span>}
            </div>
            {s.price && (
              <div style={{ textAlign:"right", flexShrink:0 }}>
                <div style={{ fontSize:15, fontWeight:900, color:s.changePct==null?"#fff":s.changePct>=0?"#00e676":"#ff5252", fontFamily:"monospace" }}>${fmt(s.price)}</div>
                {s.changePct != null && <div style={{ fontSize:11, fontWeight:700, color:s.changePct>=0?"#00e676":"#ff5252", fontFamily:"monospace" }}>{s.changePct>=0?"▲":"▼"} {Math.abs(s.changePct).toFixed(2)}%</div>}
              </div>
            )}
            <div style={{ color:"#333", fontSize:12 }}>{isOpen?"▲":"▼"}</div>
          </div>
        </div>
        {isOpen && sig && s.price && (
          <div style={{ background:`linear-gradient(180deg,${s.color}0a,rgba(0,0,0,0.5))`, border:`1px solid ${s.color}22`, borderTop:"none", borderRadius:"0 0 10px 10px", padding:14 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
              <div>
                <div style={{ fontSize:9, color:s.color, fontFamily:"monospace", letterSpacing:2, marginBottom:8 }}>SIGNALER</div>
                {[["📐",sig.fibSig],["📊",sig.rsiSig],["📈",sig.macdSig]].map(([ic,ss]) => (
                  <div key={ic} style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                    <span style={{ fontSize:10, color:"#444", fontFamily:"monospace" }}>{ic}</span>
                    <span style={{ fontSize:10, fontFamily:"monospace", color:ss.sc>=2?"#00e676":ss.sc<0?"#ff5252":"#ffd740" }}>{ss.lbl} ({ss.sc>0?"+":""}{ss.sc})</span>
                  </div>
                ))}
                <div style={{ marginTop:10 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                    <span style={{ fontSize:9, color:"#2a2a2a", fontFamily:"monospace" }}>SCORE</span>
                    <span style={{ fontSize:12, fontWeight:800, color:sig.actionColor, fontFamily:"monospace" }}>{sig.total}/8</span>
                  </div>
                  <div style={{ height:4, background:"rgba(255,255,255,0.05)", borderRadius:2 }}>
                    <div style={{ height:"100%", width:`${Math.max(0,Math.min(100,(sig.total/8)*100))}%`, background:sig.actionColor, borderRadius:2 }}/>
                  </div>
                </div>
              </div>
              <div>
                <div style={{ fontSize:9, color:s.color, fontFamily:"monospace", letterSpacing:2, marginBottom:8 }}>FIBONACCI</div>
                {[["Top",sig.fib.hi,false],["38.2% ★",sig.fib.f382,true],["50%",sig.fib.f500,false],["61.8% ★",sig.fib.f618,true],["78.6%",sig.fib.f786,false],["Bund",sig.fib.lo,false]].map(([lbl,p,gold]) => {
                  const near = s.price > 0 && Math.abs(s.price-p)/s.price < 0.03;
                  return <div key={lbl} style={{ display:"flex", justifyContent:"space-between", padding:"2px 5px", borderRadius:4, marginBottom:3, background:near?s.color+"22":gold?"#ffd74008":"transparent", border:near?`1px solid ${s.color}44`:"1px solid transparent" }}>
                    <span style={{ fontSize:10, fontFamily:"monospace", color:near?s.color:gold?"#ffd740":"#3a3a3a" }}>{lbl}</span>
                    <span style={{ fontSize:10, fontFamily:"monospace", color:near?"#fff":"#666", fontWeight:near?700:400 }}>${fmt(p)}</span>
                  </div>;
                })}
              </div>
            </div>
            <div style={{ background:sig.actionColor+"0d", border:`1px solid ${sig.actionColor}22`, borderRadius:8, padding:"10px 12px" }}>
              <div style={{ fontSize:9, color:sig.actionColor, fontFamily:"monospace", letterSpacing:1, marginBottom:5 }}>⚡ ENTRY ANBEFALING</div>
              <div style={{ fontSize:12, color:"#999", lineHeight:1.75 }}>
                {sig.total>=6&&`Stærk signal. Køb nær $${fmt(sig.fib.f618)} (61.8%). Stop under $${fmt(sig.fib.f786)}.`}
                {sig.total>=4&&sig.total<6&&`Godt setup. Vent på bekræftelse ved $${fmt(sig.fib.f618)}–$${fmt(sig.fib.f382)}.`}
                {sig.total>=2&&sig.total<4&&`Vent på tilbagetræk til $${fmt(sig.fib.f618)}.`}
                {sig.total>=0&&sig.total<2&&`For tidligt. Vent på RSI under 45.`}
                {sig.total<0&&`Bearish. Undgå entry nu.`}
              </div>
            </div>
            <div style={{ marginTop:5, fontSize:9, color:"#1a1a1a", textAlign:"right", fontFamily:"monospace" }}>
              {s.live?"● LIVE":"~ est"} · {s.updatedAt?.toLocaleTimeString("da-DK")}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── EXIT ROW ──────────────────────────────────────────────────────────────
  const ExitRow = ({ s }) => {
    const key      = s.ticker+"_"+s.group;
    const buyPrice = positions[key];
    const exit     = s.price && buyPrice ? getExitSignal(s, buyPrice) : null;
    const isEditing = editKey === key;

    return (
      <div style={{ marginBottom:8 }}>
        <div style={{ background: exit ? exit.exitColor+"0d" : "rgba(255,255,255,0.025)", border:`1px solid ${exit ? exit.exitColor+"44" : "rgba(255,255,255,0.07)"}`, borderRadius:12, padding:"13px 14px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:9, height:9, borderRadius:"50%", background:s.color, flexShrink:0, boxShadow:`0 0 5px ${s.color}` }}/>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:"flex", alignItems:"baseline", gap:8 }}>
                <span style={{ fontSize:14, fontWeight:900, color:s.color, fontFamily:"monospace" }}>{s.ticker}</span>
                <span style={{ fontSize:10, color:"#444" }}>{s.name}</span>
              </div>
              {exit ? (
                <div style={{ marginTop:3 }}>
                  <span style={{ fontSize:11, fontWeight:700, color:exit.exitColor, background:exit.exitColor+"18", border:`1px solid ${exit.exitColor}33`, padding:"1px 8px", borderRadius:5 }}>{exit.exitAction}</span>
                  <span style={{ fontSize:11, fontWeight:700, color:exit.pnl>=0?"#00e676":"#ff5252", marginLeft:8, fontFamily:"monospace" }}>{exit.pnl>=0?"+":""}{exit.pnl.toFixed(1)}%</span>
                </div>
              ) : (
                <div style={{ fontSize:11, color:"#555", fontStyle:"italic", marginTop:2 }}>
                  {buyPrice ? "Ingen pris data endnu — scan først" : "Ingen indkøbspris sat"}
                </div>
              )}
            </div>
            {/* Price info */}
            <div style={{ textAlign:"right", flexShrink:0, marginRight:4 }}>
              {s.price && <div style={{ fontSize:13, fontWeight:800, color:"#fff", fontFamily:"monospace" }}>${fmt(s.price)}</div>}
              {buyPrice && <div style={{ fontSize:10, color:"#555", fontFamily:"monospace" }}>Købt: ${fmt(buyPrice)}</div>}
            </div>
            {/* Edit button */}
            <butt
