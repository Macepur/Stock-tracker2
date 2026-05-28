import { useState, useEffect, useCallback, useRef } from "react";

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
];

const LONGTERM = [
  { ticker: "MSFT", name: "Microsoft",             color: "#60a5fa", sector: "Cloud + AI"     },
  { ticker: "NVTS", name: "Navitas Semiconductor", color: "#34d399", sector: "AI Power Chips" },
  { ticker: "PGY",  name: "Pagaya Technologies",   color: "#fb923c", sector: "AI Fintech"     },
  { ticker: "TSM",  name: "Taiwan Semiconductor",  color: "#f472b6", sector: "Chip Foundry"   },
];

const ETFS = [
  { ticker: "AGIX", name: "Roundhill Generative AI ETF", color: "#00e5ff", sector: "AI ETF"      },
  { ticker: "QTUM", name: "Defiance Quantum ETF",        color: "#ea80fc", sector: "Quantum ETF" },
  { ticker: "BAI",  name: "iShares Active AI & Tech",    color: "#60a5fa", sector: "AI ETF"      },
  { ticker: "XBI",  name: "SPDR S&P Biotech ETF",        color: "#34d399", sector: "Biotech ETF" },
  { ticker: "UFO",  name: "Procure Space ETF",            color: "#ffd740", sector: "Space ETF"   },
];

const FALLBACK = {
  RCAT:9.05, ACHR:6.78, ERAS:10.16, SMR:11.40, SOUN:8.40,
  RGTI:26.00, CAN:0.59, MU:116.0, IONQ:63.62,
  MSFT:416.03, NVTS:31.79, PGY:13.39, TSM:412.32,
  AGIX:28.50, QTUM:18.20, BAI:50.10, XBI:92.40, UFO:14.80,
};

async function fetchLivePrice(ticker) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=30d`;
    const res = await fetch(url);
    const json = await res.json();
    const closes = json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close;
    const price = json?.chart?.result?.[0]?.meta?.regularMarketPrice;
    const clean = (closes || []).filter(Boolean);
    if (price > 0 && clean.length > 0) return { price, closes: clean };
  } catch {}
  return null;
}

function calcRSI(closes) {
  if (closes.length < 16) return 50;
  let g = 0, l = 0;
  for (let i = closes.length - 14; i < closes.length; i++) {
    const d = closes[i] - closes[i-1];
    d > 0 ? g += d : l -= d;
  }
  const ag = g/14, al = l/14;
  return al === 0 ? 99 : Math.round(100 - 100/(1 + ag/al));
}

function calcFib(price, closes) {
  const hi = Math.max(...closes, price);
  const lo = Math.min(...closes, price);
  const r = hi - lo || price * 0.3;
  return { hi, lo, f382: hi-0.382*r, f500: hi-0.5*r, f618: hi-0.618*r, f786: hi-0.786*r };
}

function buildSignal(price, closes) {
  const RSI = calcRSI(closes);
  const fib = calcFib(price, closes);
  const rng = fib.hi - fib.lo;
  const ret = rng === 0 ? 0.5 : (fib.hi - price) / rng;
  const fibSig = ret>=0.60&&ret<=0.65?{lbl:"61.8% Golden ★",sc:3}:ret>=0.36&&ret<=0.41?{lbl:"38.2% Zone ★",sc:2}:ret>=0.47&&ret<=0.53?{lbl:"50% Midpoint",sc:1}:ret<0.12?{lbl:"Near High",sc:-1}:{lbl:"Between levels",sc:0};
  const rsiSig = RSI<=28?{lbl:`RSI ${RSI} Oversold ★`,sc:3}:RSI<=40?{lbl:`RSI ${RSI} Low`,sc:2}:RSI>=72?{lbl:`RSI ${RSI} Overbought`,sc:-2}:RSI>=62?{lbl:`RSI ${RSI} High`,sc:-1}:{lbl:`RSI ${RSI} Neutral`,sc:1};
  const total = fibSig.sc + rsiSig.sc;
  const action = total>=5?"🚀 KØB NU":total>=3?"✅ KØB SIGNAL":total>=1?"👀 HOLD ØJE":total>=0?"⏳ VENT":"❌ UNDGÅ";
  const actionColor = total>=5?"#00e676":total>=3?"#69f0ae":total>=1?"#ffd740":total>=0?"#ff9800":"#ff5252";
  return { RSI, fib, fibSig, rsiSig, total, action, actionColor };
}

const fmt = n => n < 1 ? n.toFixed(4) : n < 100 ? n.toFixed(2) : n.toFixed(1);

function genFallback(base) {
  const c = [base];
  for (let i = 1; i < 30; i++) c.push(Math.max(base*0.1, c[i-1]*(1+(Math.random()-0.5)*0.04)));
  return c;
}
export default function App() {
  const allStocks = [
    ...MOONSHOTS.map(s => ({...s, group:"moonshot"})),
    ...LONGTERM.map(s =>  ({...s, group:"longterm"})),
    ...ETFS.map(s =>      ({...s, group:"etf"})),
  ];

  const [stocks,   setStocks]   = useState(() => allStocks.map(s => ({...s, price:null, closes:[], signal:null, live:false})));
  const [openKey,  setOpenKey]  = useState(null);
  const [scanning, setScanning] = useState(false);
  const [autoOn,   setAutoOn]   = useState(false);
  const scoreRef = useRef({});
  const timerRef = useRef(null);

  const scanAll = useCallback(async () => {
    setScanning(true);
    const updated = await Promise.all(
      stocks.map(async s => {
        const live = await fetchLivePrice(s.ticker);
        const price  = live?.price  || FALLBACK[s.ticker] || 10;
        const closes = live?.closes?.length >= 5 ? live.closes : genFallback(price);
        const signal = buildSignal(price, closes);
        scoreRef.current[s.ticker+"_"+s.group] = signal.total;
        return {...s, price, closes, signal, live:!!live, error:!live, updatedAt:new Date()};
      })
    );
    setStocks(updated);
    setScanning(false);
  }, [stocks]);

  useEffect(() => { scanAll(); }, []); // eslint-disable-line
  useEffect(() => {
    if (autoOn) timerRef.current = setInterval(scanAll, 5*60*1000);
    else clearInterval(timerRef.current);
    return () => clearInterval(timerRef.current);
  }, [autoOn, scanAll]);

  const moonshots = stocks.filter(s => s.group === "moonshot");
  const longterm  = stocks.filter(s => s.group === "longterm");
  const etfList   = stocks.filter(s => s.group === "etf");

  const Section = ({emoji, label, color, list}) => (
    <>
      <div style={{display:"flex",alignItems:"center",gap:10,margin:"18px 0 10px",padding:"10px 14px",background:color+"18",border:`1px solid ${color}44`,borderRadius:12}}>
        <span style={{fontSize:22}}>{emoji}</span>
        <span style={{fontSize:14,fontWeight:900,color,letterSpacing:1}}>{label}</span>
        <span style={{fontSize:10,color:color+"88",marginLeft:"auto",fontFamily:"monospace"}}>{list.length} aktier</span>
      </div>
      {list.map(s => <StockRow key={s.ticker+"_"+s.group} s={s} />)}
    </>
  );

  const StockRow = ({s}) => {
    const key = s.ticker+"_"+s.group;
    const isOpen = openKey === key;
    const sig = s.signal;
    return (
      <div style={{marginBottom:6}}>
        <div onClick={() => setOpenKey(isOpen ? null : key)}
          style={{background:isOpen?`${s.color}0e`:"rgba(255,255,255,0.025)",border:`1px solid ${isOpen?s.color+"55":"rgba(255,255,255,0.07)"}`,borderRadius:isOpen?"10px 10px 0 0":10,padding:"12px 14px",cursor:"pointer",transition:"all 0.2s"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:9,height:9,borderRadius:"50%",background:s.color,flexShrink:0,boxShadow:`0 0 6px ${s.color}`}}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"baseline",gap:8,flexWrap:"wrap"}}>
                <span style={{fontSize:14,fontWeight:900,color:s.color,fontFamily:"monospace"}}>{s.ticker}</span>
                <span style={{fontSize:10,color:"#444"}}>{s.name}</span>
                {s.live && <span style={{fontSize:9,color:"#00e676",background:"#00e67615",border:"1px solid #00e67633",padding:"1px 5px",borderRadius:4,fontFamily:"monospace"}}>● LIVE</span>}
              </div>
              {sig && (
                <div style={{display:"flex",alignItems:"center",gap:6,marginTop:3}}>
                  <span style={{fontSize:11,fontWeight:700,color:sig.actionColor,background:sig.actionColor+"18",border:`1px solid ${sig.actionColor}33`,padding:"1px 8px",borderRadius:5}}>{sig.action}</span>
                  <span style={{fontSize:10,color:"#3a3a3a",fontFamily:"monospace"}}>RSI {sig.RSI}</span>
                </div>
              )}
              {!sig && <span style={{fontSize:11,color:"#333",fontStyle:"italic"}}>Henter...</span>}
            </div>
            {s.price && (
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontSize:15,fontWeight:900,color:"#fff",fontFamily:"monospace"}}>${fmt(s.price)}</div>
              </div>
            )}
            <div style={{color:"#333",fontSize:12}}>{isOpen ? "▲" : "▼"}</div>
          </div>
        </div>
        {isOpen && sig && s.price && (
          <div style={{background:`linear-gradient(180deg,${s.color}0a,rgba(0,0,0,0.5))`,border:`1px solid ${s.color}22`,borderTop:"none",borderRadius:"0 0 10px 10px",padding:14}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
              <div>
                <div style={{fontSize:9,color:s.color,fontFamily:"monospace",letterSpacing:2,marginBottom:8}}>SIGNALER</div>
                {[["📐",sig.fibSig],["📊",sig.rsiSig]].map(([ic,ss]) => (
                  <div key={ic} style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                    <span style={{fontSize:10,color:"#444",fontFamily:"monospace"}}>{ic}</span>
                    <span style={{fontSize:10,fontFamily:"monospace",color:ss.sc>=2?"#00e676":ss.sc<0?"#ff5252":"#ffd740"}}>{ss.lbl} ({ss.sc>0?"+":""}{ss.sc})</span>
                  </div>
                ))}
                <div style={{marginTop:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                    <span style={{fontSize:9,color:"#2a2a2a",fontFamily:"monospace"}}>SCORE</span>
                    <span style={{fontSize:12,fontWeight:800,color:sig.actionColor,fontFamily:"monospace"}}>{sig.total}/6</span>
                  </div>
                  <div style={{height:4,background:"rgba(255,255,255,0.05)",borderRadius:2}}>
                    <div style={{height:"100%",width:`${Math.max(0,Math.min(100,(sig.total/6)*100))}%`,background:sig.actionColor,borderRadius:2}}/>
                  </div>
                </div>
              </div>
              <div>
                <div style={{fontSize:9,color:s.color,fontFamily:"monospace",letterSpacing:2,marginBottom:8}}>FIBONACCI</div>
                {[["Top",sig.fib.hi,false],["38.2% ★",sig.fib.f382,true],["50%",sig.fib.f500,false],["61.8% ★",sig.fib.f618,true],["78.6%",sig.fib.f786,false],["Bund",sig.fib.lo,false]].map(([lbl,p,gold]) => {
                  const near = s.price > 0 && Math.abs(s.price-p)/s.price < 0.03;
                  return (
                    <div key={lbl} style={{display:"flex",justifyContent:"space-between",padding:"2px 5px",borderRadius:4,marginBottom:3,background:near?s.color+"22":gold?"#ffd74008":"transparent",border:near?`1px solid ${s.color}44`:"1px solid transparent"}}>
                      <span style={{fontSize:10,fontFamily:"monospace",color:near?s.color:gold?"#ffd740":"#3a3a3a"}}>{lbl}</span>
                      <span style={{fontSize:10,fontFamily:"monospace",color:near?"#fff":"#666",fontWeight:near?700:400}}>${fmt(p)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{background:sig.actionColor+"0d",border:`1px solid ${sig.actionColor}22`,borderRadius:8,padding:"10px 12px"}}>
              <div style={{fontSize:9,color:sig.actionColor,fontFamily:"monospace",letterSpacing:1,marginBottom:5}}>⚡ ENTRY ANBEFALING</div>
              <div style={{fontSize:12,color:"#999",lineHeight:1.75}}>
                {sig.total>=5&&`Køb nær $${fmt(sig.fib.f618)} (61.8%). Stop under $${fmt(sig.fib.f786)}.`}
                {sig.total>=3&&sig.total<5&&`Vent på bekræftelse ved $${fmt(sig.fib.f618)}–$${fmt(sig.fib.f382)}.`}
                {sig.total>=1&&sig.total<3&&`Vent på tilbagetræk til $${fmt(sig.fib.f618)}.`}
                {sig.total>=0&&sig.total<1&&`For tidligt. Vent på RSI under 45.`}
                {sig.total<0&&`Bearish. Undgå entry nu.`}
              </div>
            </div>
            <div style={{marginTop:5,fontSize:9,color:"#1a1a1a",textAlign:"right",fontFamily:"monospace"}}>
              {s.live ? "● LIVE" : "~ estimeret"} · {s.updatedAt?.toLocaleTimeString()}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{minHeight:"100vh",background:"#020408",color:"#ccc",fontFamily:"Georgia, serif",maxWidth:720,margin:"0 auto"}}>
      <div style={{background:"#080c14",borderBottom:"1px solid rgba(255,255,255,0.07)",padding:"12px 14px",position:"sticky",top:0,zIndex:10}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{flex:1}}>
            <div style={{fontSize:15,fontWeight:900,color:"#fff"}}>📡 Signal Tracker</div>
            <div style={{fontSize:9,color:"#2a2a2a",fontFamily:"monospace"}}>Live priser · Fibonacci · RSI</div>
          </div>
          <button onClick={() => setAutoOn(a => !a)} style={{background:autoOn?"#00e67615":"rgba(255,255,255,0.05)",color:autoOn?"#00e676":"#555",border:`1px solid ${autoOn?"#00e67633":"rgba(255,255,255,0.08)"}`,borderRadius:8,padding:"6px 10px",fontSize:11,cursor:"pointer"}}>
            {autoOn ? "⏱ Auto" : "⏱ Off"}
          </button>
          <button onClick={scanAll} disabled={scanning} style={{background:scanning?"#0a1a0a":"#00e676",color:scanning?"#3a6a3a":"#000",border:"none",borderRadius:8,padding:"6px 14px",fontSize:12,fontWeight:700,cursor:scanning?"default":"pointer"}}>
            {scanning ? "Henter…" : "⟳ Scan"}
          </button>
        </div>
      </div>
      <div style={{padding:"12px 14px 40px"}}>
        <Section emoji="🚀" label="MOONSHOT PICKS"          color="#ff6d00" list={moonshots}/>
        <Section emoji="📈" label="LONG TERM STOCKS"        color="#60a5fa" list={longterm}/>
        <Section emoji="💼" label="ETF FONDE — €2.000 PLAN" color="#ffd740" list={etfList}/>
      </div>
      <div style={{background:"#080c14",borderTop:"1px solid rgba(255,255,255,0.05)",padding:"10px 14px",textAlign:"center"}}>
        <div style={{fontSize:9,color:"#111",fontStyle:"italic"}}>Live priser via Yahoo Finance · Ikke finansiel rådgivning</div>
      </div>
    </div>
  );
}
