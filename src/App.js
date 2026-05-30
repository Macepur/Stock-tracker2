import { useState, useRef, useEffect } from "react";

var MOONSHOTS = [
  { ticker:"RCAT", name:"Red Cat Holdings",  color:"#ff3d00", sector:"Defense Drones" },
  { ticker:"ACHR", name:"Archer Aviation",   color:"#00e5ff", sector:"Air Taxis"       },
  { ticker:"ERAS", name:"Erasca Inc.",        color:"#e040fb", sector:"Oncology"        },
  { ticker:"SMR",  name:"NuScale Power",      color:"#ffea00", sector:"Nuclear Energy"  },
  { ticker:"SOUN", name:"SoundHound AI",      color:"#ff6090", sector:"Voice AI"        },
  { ticker:"RGTI", name:"Rigetti Computing",  color:"#b9f6ca", sector:"Quantum"         },
  { ticker:"CAN",  name:"Canaan Inc.",        color:"#ffd740", sector:"Bitcoin Mining"  },
  { ticker:"MU",   name:"Micron Technology",  color:"#00d4ff", sector:"AI Memory"       },
  { ticker:"IONQ", name:"IonQ",               color:"#ea80fc", sector:"Quantum"         },
  { ticker:"RZLV", name:"Rezolve AI",         color:"#f0abfc", sector:"AI Commerce"     },
  { ticker:"EONR", name:"EON Resources",      color:"#86efac", sector:"Oil and Gas"     },
  { ticker:"POET", name:"POET Technologies",  color:"#7dd3fc", sector:"AI Photonics"    },
];
var LONGTERM = [
  { ticker:"MSFT", name:"Microsoft",             color:"#60a5fa", sector:"Cloud + AI"     },
  { ticker:"NVTS", name:"Navitas Semiconductor", color:"#34d399", sector:"AI Power Chips" },
  { ticker:"PGY",  name:"Pagaya Technologies",   color:"#fb923c", sector:"AI Fintech"     },
  { ticker:"TSM",  name:"Taiwan Semiconductor",  color:"#f472b6", sector:"Chip Foundry"   },
  { ticker:"PLTR", name:"Palantir Technologies", color:"#818cf8", sector:"AI / Defense"   },
  { ticker:"SOFI", name:"SoFi Technologies",     color:"#38bdf8", sector:"Digital Banking"},
  { ticker:"COHR", name:"Coherent Corp.",         color:"#67e8f9", sector:"AI Photonics"  },
  { ticker:"LASR", name:"nLIGHT Inc.",            color:"#fda4af", sector:"Defense Laser" },
];
var UNDERVALUED = [
  { ticker:"BWMX", name:"Betterware de Mexico", color:"#fb7185", sector:"Consumer Goods" },
  { ticker:"UNH",  name:"UnitedHealth Group",   color:"#4ade80", sector:"Healthcare"      },
  { ticker:"LULU", name:"Lululemon",             color:"#a78bfa", sector:"Athleisure"     },
];
var ETFS = [
  { ticker:"AGIX", name:"Roundhill Generative AI ETF", color:"#00e5ff", sector:"AI ETF"      },
  { ticker:"QTUM", name:"Defiance Quantum ETF",        color:"#ea80fc", sector:"Quantum ETF" },
  { ticker:"BAI",  name:"iShares Active AI & Tech",    color:"#60a5fa", sector:"AI ETF"      },
  { ticker:"XBI",  name:"SPDR S&P Biotech ETF",        color:"#34d399", sector:"Biotech ETF" },
  { ticker:"UFO",  name:"Procure Space ETF",            color:"#ffd740", sector:"Space ETF"   },
];

var ALL_STOCKS = [
  ...MOONSHOTS.map(function(s){ return Object.assign({},s,{group:"moonshot"}); }),
  ...LONGTERM.map(function(s) { return Object.assign({},s,{group:"longterm"}); }),
  ...UNDERVALUED.map(function(s){ return Object.assign({},s,{group:"undervalued"}); }),
  ...ETFS.map(function(s)     { return Object.assign({},s,{group:"etf"}); }),
];

var FALLBACK = { RCAT:12.70,ACHR:6.78,ERAS:12.20,SMR:11.75,SOUN:8.42,RGTI:18.42,CAN:0.41,MU:116.0,IONQ:63.62,RZLV:2.39,EONR:0.40,MSFT:427.78,NVTS:28.51,PGY:13.96,TSM:424.90,PLTR:143.34,SOFI:15.62,BWMX:17.09,UNH:286.00,LULU:285.00,COHR:48.00,LASR:67.00,POET:13.50,AGIX:47.24,QTUM:159.10,BAI:50.16,XBI:136.0,UFO:67.81 };
var TARGETS   = { RCAT:21.75,ACHR:13.20,ERAS:20.30,SMR:21.00,SOUN:13.30,RGTI:18.00,CAN:2.85,MU:165.00,IONQ:50.00,RZLV:12.25,EONR:4.50,MSFT:561.00,NVTS:14.46,PGY:34.50,TSM:468.00,PLTR:194.00,SOFI:21.10,BWMX:29.83,UNH:373.00,LULU:380.00,COHR:65.00,LASR:85.00,POET:8.20,AGIX:45.00,QTUM:180.00,BAI:60.00,XBI:160.00,UFO:75.00 };
var EARNINGS  = { RCAT:"Aug 26",ACHR:"Aug 26",ERAS:"Aug 26",SMR:"Aug 26",SOUN:"Aug 26",RGTI:"Aug 26",CAN:"Aug 26",MU:"Jun 26",IONQ:"Aug 26",RZLV:"Aug 26",EONR:"Aug 26",MSFT:"Jul 26",NVTS:"Aug 26",PGY:"Aug 26",TSM:"Jul 26",PLTR:"Aug 26",SOFI:"Jul 26",BWMX:"Aug 26",UNH:"Jul 26",LULU:"Sep 26",COHR:"Aug 26",LASR:"Aug 26",POET:"Aug 26" };

async function fetchStock(ticker, range) {
  try {
    var r = range ? "?ticker="+ticker+"&range="+range : "?ticker="+ticker;
    var res = await fetch("/api/stock"+r);
    if (!res.ok) return null;
    return await res.json();
  } catch(e) { return null; }
}

function calcFib(price, closes) {
  var hi=Math.max.apply(null,closes.concat([price])), lo=Math.min.apply(null,closes.concat([price])), r=hi-lo||price*0.3;
  return {hi:hi,lo:lo,f382:hi-0.382*r,f500:hi-0.5*r,f618:hi-0.618*r,f786:hi-0.786*r};
}
function calcRSI(closes) {
  if (closes.length<16) return null;
  var g=0,l=0;
  for (var i=closes.length-14;i<closes.length;i++){var d=closes[i]-closes[i-1];if(d>0){g+=d;}else{l-=d;}}
  var ag=g/14,al=l/14; if(al===0)return null;
  var rsi=Math.round(100-100/(1+ag/al)); return rsi>=97?null:rsi;
}
function calcMACDLocal(closes){
  if(closes.length<26)return null;
  var k12=2/13,k26=2/27;
  var e12=closes.slice(-26).reduce(function(e,v){return v*k12+e*(1-k12);});
  var e26=closes.slice(-26).reduce(function(e,v){return v*k26+e*(1-k26);});
  return e12-e26;
}
function calcMA(closes,period){
  if(closes.length<period)return null;
  var sum=0;
  for(var i=closes.length-period;i<closes.length;i++)sum+=closes[i];
  return sum/period;
}
function calcBollingerBands(closes,period){
  period=period||20;
  if(closes.length<period)return null;
  var slice=closes.slice(-period);
  var ma=slice.reduce(function(a,b){return a+b;})/period;
  var variance=slice.reduce(function(s,v){return s+Math.pow(v-ma,2);},0)/period;
  var std=Math.sqrt(variance);
  return{upper:ma+2*std,lower:ma-2*std,mid:ma,std:std};
}
function calcMomentum(closes,period){
  period=period||10;
  if(closes.length<period+1)return null;
  var now=closes[closes.length-1];
  var prev=closes[closes.length-1-period];
  return prev>0?((now-prev)/prev)*100:null;
}
function buildSignal(price,closes,apiRsi,apiMacd,apiMacdSignal){
  var fib=calcFib(price,closes), rng=fib.hi-fib.lo, ret=rng===0?0.5:(fib.hi-price)/rng;
  var RSI=(apiRsi&&apiRsi<97)?Math.round(apiRsi):calcRSI(closes);
  var macdVal=(apiMacd!=null)?apiMacd:calcMACDLocal(closes);
  var macdSigVal=(apiMacdSignal!=null)?apiMacdSignal:(macdVal!=null?macdVal*0.85:null);
  var macdBull=(macdVal!=null&&macdSigVal!=null)?macdVal>macdSigVal:null;

  // Bollinger Bands
  var bb=calcBollingerBands(closes,20);
  var bbSc=0,bbLbl="BB -";
  if(bb){
    if(price<=bb.lower){bbSc=3;bbLbl="BB Undersolgt";}
    else if(price>=bb.upper){bbSc=-2;bbLbl="BB Oversolgt";}
    else if(price<bb.mid){bbSc=1;bbLbl="BB Under midten";}
    else{bbSc=0;bbLbl="BB Over midten";}
  }

  // MA Cross (20 vs 50)
  var ma20=calcMA(closes,20), ma50=calcMA(closes,50);
  var maSc=0,maLbl="MA -";
  if(ma20&&ma50){
    var cross=(ma20-ma50)/ma50*100;
    if(cross>2){maSc=2;maLbl="Golden Cross";}
    else if(cross>0){maSc=1;maLbl="MA20 > MA50";}
    else if(cross<-2){maSc=-2;maLbl="Death Cross";}
    else{maSc=-1;maLbl="MA20 < MA50";}
  } else if(ma20){
    maSc=price>ma20?1:-1;
    maLbl=price>ma20?"Over MA20":"Under MA20";
  }

  // Momentum (10 dage)
  var mom=calcMomentum(closes,10);
  var momSc=0,momLbl="Mom -";
  if(mom!=null){
    if(mom>10){momSc=-1;momLbl="Mom +"+mom.toFixed(1)+"% (hoj)";}
    else if(mom>3){momSc=1;momLbl="Mom +"+mom.toFixed(1)+"% (pos)";}
    else if(mom>0){momSc=1;momLbl="Mom +"+mom.toFixed(1)+"%";}
    else if(mom>-5){momSc=1;momLbl="Mom "+mom.toFixed(1)+"% (svag)";}
    else{momSc=2;momLbl="Mom "+mom.toFixed(1)+"% (dip)";}
  }

  // Fibonacci
  var fibSc,fibLbl;
  if(ret>=0.60&&ret<=0.65){fibSc=3;fibLbl="61.8% Golden";}
  else if(ret>=0.36&&ret<=0.41){fibSc=2;fibLbl="38.2% Zone";}
  else if(ret>=0.47&&ret<=0.53){fibSc=1;fibLbl="50% Midpoint";}
  else if(ret>=0.74&&ret<=0.82){fibSc=1;fibLbl="78.6% Deep";}
  else if(ret<0.12){fibSc=-1;fibLbl="Near High";}
  else{fibSc=0;fibLbl="Between levels";}

  // RSI
  var rsiSc,rsiLbl;
  if(!RSI){
    var pricePos=rng===0?0.5:(price-fib.lo)/rng;
    if(pricePos<=0.25){rsiSc=2;rsiLbl="Pris lav i range";}
    else if(pricePos>=0.85){rsiSc=-1;rsiLbl="Pris hoj i range";}
    else{rsiSc=1;rsiLbl="Pris midterste";}
  }
  else if(RSI<=28){rsiSc=3;rsiLbl="RSI "+RSI+" Oversold";}
  else if(RSI<=40){rsiSc=2;rsiLbl="RSI "+RSI+" Low";}
  else if(RSI>=72){rsiSc=-2;rsiLbl="RSI "+RSI+" Overbought";}
  else if(RSI>=62){rsiSc=-1;rsiLbl="RSI "+RSI+" High";}
  else{rsiSc=1;rsiLbl="RSI "+RSI+" Neutral";}

  // MACD
  var macdSc,macdLbl;
  if(macdBull===null){macdSc=0;macdLbl="MACD -";}
  else if(macdBull){macdSc=2;macdLbl="MACD Bullish";}
  else{macdSc=-1;macdLbl="MACD Bearish";}

  var total=fibSc+rsiSc+macdSc+bbSc+maSc+momSc;
  var action,ac;
  if(total>=10){action="KOB NU";ac="#00e676";}
  else if(total>=6){action="KOB SIGNAL";ac="#69f0ae";}
  else if(total>=3){action="HOLD OJE";ac="#ffd740";}
  else if(total>=0){action="VENT";ac="#ff9800";}
  else{action="UNDGA";ac="#ff5252";}
  return{RSI:RSI,fib:fib,fibSc:fibSc,fibLbl:fibLbl,rsiSc:rsiSc,rsiLbl:rsiLbl,macdSc:macdSc,macdLbl:macdLbl,bbSc:bbSc,bbLbl:bbLbl,maSc:maSc,maLbl:maLbl,momSc:momSc,momLbl:momLbl,total:total,action:action,ac:ac,bb:bb,ma20:ma20,ma50:ma50};
}
function fmt(n){if(n==null)return"-";if(n<1)return n.toFixed(4);if(n<100)return n.toFixed(2);return n.toFixed(1);}

function BigChart(props) {
  var ticker=props.ticker, color=props.color, onClose=props.onClose;
  var [range,setRange]=useState("month");
  var [data,setData]=useState(null);
  var [loading,setLoading]=useState(true);

  useEffect(function(){
    setLoading(true);
    fetchStock(ticker, range).then(function(d){
      setData(d);
      setLoading(false);
    });
  },[ticker,range]);

  var closes = data && data.closes ? data.closes : [];
  var price  = data && data.price  ? data.price  : null;
  var changePct = data && data.changePct ? data.changePct : null;

  function drawChart(){
    if (closes.length < 2) return null;
    var W=300, H=140;
    var mn=Math.min.apply(null,closes), mx=Math.max.apply(null,closes), rng2=mx-mn||1;
    var pts=closes.map(function(v,i){
      var x=(i/(closes.length-1))*W;
      var y=H-((v-mn)/rng2)*(H-10)-5;
      return x.toFixed(1)+","+y.toFixed(1);
    }).join(" ");
    var fillPts="0,"+(H+2)+" "+pts+" "+W+","+(H+2);
    var trend=(closes[closes.length-1]>=closes[0])?"#00e676":"#ff5252";
    var c=color||trend;
    return (
      <svg width="100%" viewBox={"0 0 "+W+" "+H} style={{display:"block",marginTop:8}}>
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={c} stopOpacity="0.3"/>
            <stop offset="100%" stopColor={c} stopOpacity="0"/>
          </linearGradient>
        </defs>
        <polygon points={fillPts} fill="url(#grad)"/>
        <polyline points={pts} fill="none" stroke={c} strokeWidth="2" strokeLinejoin="round"/>
        {[0,0.25,0.5,0.75,1].map(function(p,i){
          var y=H-p*(H-10)-5;
          var val=mn+p*rng2;
          return (
            <g key={i}>
              <line x1="0" y1={y} x2={W} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
              <text x="2" y={y-2} fill="#444" fontSize="9" fontFamily="monospace">${fmt(val)}</text>
            </g>
          );
        })}
      </svg>
    );
  }

  return (
    <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.85)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"#0a0e18",border:"1px solid rgba(255,255,255,0.12)",borderRadius:16,padding:20,width:"100%",maxWidth:380}}>
        <div style={{display:"flex",alignItems:"center",marginBottom:16}}>
          <div style={{flex:1}}>
            <div style={{fontSize:18,fontWeight:900,color:color,fontFamily:"monospace"}}>{ticker}</div>
            {price ? <div style={{fontSize:22,fontWeight:900,color:(changePct==null?"#fff":(changePct>=0?"#00e676":"#ff5252")),fontFamily:"monospace"}}>${fmt(price)}{changePct!=null?" "+(changePct>=0?"+":"")+changePct.toFixed(2)+"%":""}</div> : null}
          </div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"6px 12px",color:"#aaa",fontSize:14,cursor:"pointer"}}>X</button>
        </div>

        <div style={{display:"flex",gap:6,marginBottom:8}}>
          {[["day","1D"],["week","1W"],["month","1M"],["year","1Y"]].map(function(t){
            return (
              <button key={t[0]} onClick={function(){setRange(t[0]);}}
                style={{flex:1,background:(range===t[0]?color+"22":"rgba(255,255,255,0.04)"),color:(range===t[0]?color:"#555"),border:"1px solid "+(range===t[0]?color+"55":"rgba(255,255,255,0.08)"),borderRadius:8,padding:"6px 0",fontSize:12,fontWeight:(range===t[0]?700:400),cursor:"pointer"}}>
                {t[1]}
              </button>
            );
          })}
        </div>

        <div style={{minHeight:148}}>
          {loading ? <div style={{textAlign:"center",padding:40,color:"#333",fontStyle:"italic"}}>Henter chart...</div> : drawChart()}
        </div>

        <div style={{display:"flex",gap:8,marginTop:12}}>
          <a href={"https://finance.yahoo.com/chart/"+ticker} target="_blank" rel="noreferrer"
            style={{flex:1,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"8px",color:"#aaa",fontSize:11,textDecoration:"none",textAlign:"center"}}>
            Aaben fuld graf
          </a>
          <a href={"https://finance.yahoo.com/quote/"+ticker+"/news/"} target="_blank" rel="noreferrer"
            style={{flex:1,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"8px",color:"#aaa",fontSize:11,textDecoration:"none",textAlign:"center"}}>
            Nyheder
          </a>
        </div>
      </div>
    </div>
  );
}

function Sparkline(props) {
  var closes=props.closes, color=props.color, onClick=props.onClick;
  if (!closes||closes.length<3) return null;
  var W=60,H=24,mn=Math.min.apply(null,closes),mx=Math.max.apply(null,closes),rng=mx-mn||1;
  var pts=closes.map(function(v,i){return ((i/(closes.length-1))*W).toFixed(1)+","+((H-((v-mn)/rng)*H)).toFixed(1);}).join(" ");
  var trend=(closes[closes.length-1]>=closes[0])?"#00e676":"#ff5252";
  return (
    <svg width={W} height={H} style={{display:"block",cursor:"pointer"}} onClick={onClick}>
      <polyline points={pts} fill="none" stroke={color||trend} strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  );
}

function getExitSignal(price,buyPrice,rsi,fib,target){
  if(!price||!buyPrice)return null;
  var pnl=((price-buyPrice)/buyPrice)*100, nearHigh=fib&&(Math.abs(price-fib.hi)/fib.hi<0.03);
  var exitAction,exitColor,rec;
  if(pnl<=-15){exitAction="STOP-LOSS";exitColor="#ff5252";rec="Ned "+Math.abs(pnl).toFixed(1)+"% under indkobspris.";}
  else if(rsi&&rsi>=72&&pnl>10){exitAction="SAELG NU";exitColor="#ff5252";rec="RSI "+rsi+" overkoebt og du er +"+pnl.toFixed(1)+"%.";}
  else if(nearHigh&&pnl>20){exitAction="SAELG NU";exitColor="#ff5252";rec="Naer 60-dages top. +"+pnl.toFixed(1)+"%.";}
  else if(target&&price>=target*0.95){exitAction="MAL NAET";exitColor="#00e676";rec="Analyst maal $"+fmt(target)+" naesten naaet. +"+pnl.toFixed(1)+"%.";}
  else if(pnl>=50){exitAction="TAG PROFIT";exitColor="#ffd740";rec="+"+pnl.toFixed(1)+"%. Overvej at saelge 50%.";}
  else if(pnl>=25){exitAction="SAET STOP";exitColor="#ffd740";rec="+"+pnl.toFixed(1)+"%. Saet trailing stop paa +10-15%.";}
  else if(pnl>0){exitAction="HOLD";exitColor="#69f0ae";rec="+"+pnl.toFixed(1)+"%. Hold mod maal $"+fmt(target)+".";}
  else{exitAction="VENT";exitColor="#ff9800";rec=pnl.toFixed(1)+"%. Vent paa signal vender.";}
  return{pnl:pnl,exitAction:exitAction,exitColor:exitColor,rec:rec,target:target};
}

export default function App() {
  var [stocks,    setStocks]    = useState(function(){ return ALL_STOCKS.map(function(s){ return Object.assign({},s,{price:null,closes:[],signal:null,live:false,change:null,changePct:null}); }); });
  var [openKey,   setOpenKey]   = useState(null);
  var [scanning,  setScanning]  = useState(false);
  var [autoOn,    setAutoOn]    = useState(false);
  var [lastScan,  setLastScan]  = useState(null);
  var [activeTab, setActiveTab] = useState("signals");
  var [positions, setPositions] = useState({});
  var [shares,    setShares]    = useState({});
  var [editKey,   setEditKey]   = useState(null);
  var [editPrice, setEditPrice] = useState("");
  var [editShares,setEditShares]= useState("");
  var [chartStock,setChartStock]= useState(null);
  var timerRef = useRef(null);

  async function scanAll(){
    setScanning(true);
    var results=await Promise.all(ALL_STOCKS.map(async function(s){
      var data=await fetchStock(s.ticker,null);
      var price=(data&&data.price)?data.price:(FALLBACK[s.ticker]||10);
      var closes=(data&&data.closes&&data.closes.length>=5)?data.closes:new Array(20).fill(price);
      var signal=buildSignal(price,closes,data?data.rsi:null,data?data.macd:null,data?data.macdSignal:null);
      return Object.assign({},s,{price:price,closes:closes,signal:signal,change:data?data.change:null,changePct:data?data.changePct:null,live:!!(data&&data.live),updatedAt:new Date()});
    }));
    setStocks(results);
    setLastScan(new Date());
    setScanning(false);
  }

  function toggleAuto(){ if(!autoOn){setAutoOn(true);}else{setAutoOn(false);clearInterval(timerRef.current);} }
  useEffect(function(){if(autoOn){timerRef.current=setInterval(scanAll,10*60*1000);}return function(){clearInterval(timerRef.current);};},[autoOn]); // eslint-disable-line

  function savePosition(key,bp,sh){
    var p=parseFloat(bp),s2=parseFloat(sh);
    if(!isNaN(p)&&p>0)setPositions(function(prev){return Object.assign({},prev,{[key]:p});});
    if(!isNaN(s2)&&s2>0)setShares(function(prev){return Object.assign({},prev,{[key]:s2});});
    setEditKey(null);setEditPrice("");setEditShares("");
  }
  function removePosition(key){
    setPositions(function(prev){var n=Object.assign({},prev);delete n[key];return n;});
    setShares(function(prev){var n=Object.assign({},prev);delete n[key];return n;});
  }

  var moonshots   = stocks.filter(function(s){return s.group==="moonshot";});
  var longterm    = stocks.filter(function(s){return s.group==="longterm";});
  var undervalued = stocks.filter(function(s){return s.group==="undervalued";});
  var etfList     = stocks.filter(function(s){return s.group==="etf";});

  var portfolioValue=0, portfolioDayChange=0;
  stocks.forEach(function(s){var key=s.ticker+"_"+s.group;var sh=shares[key];if(sh&&s.price){portfolioValue+=sh*s.price;if(s.change)portfolioDayChange+=sh*s.change;}});

  function SH(props){ return (
    <div style={{display:"flex",alignItems:"center",gap:10,margin:"18px 0 10px",padding:"10px 14px",background:props.color+"18",border:"1px solid "+props.color+"44",borderRadius:12}}>
      <span style={{fontSize:22}}>{props.emoji}</span>
      <span style={{fontSize:14,fontWeight:900,color:props.color,letterSpacing:1}}>{props.label}</span>
      <span style={{fontSize:10,color:props.color+"88",marginLeft:"auto",fontFamily:"monospace"}}>{props.count} aktier</span>
    </div>
  ); }

  function StockRow(props){
    var s=props.s, key=s.ticker+"_"+s.group, isOpen=openKey===key, sig=s.signal;
    return (
      <div style={{marginBottom:6}}>
        <div style={{background:isOpen?(s.color+"0e"):"rgba(255,255,255,0.025)",border:"1px solid "+(isOpen?(s.color+"55"):"rgba(255,255,255,0.07)"),borderRadius:isOpen?"10px 10px 0 0":"10px",padding:"12px 14px"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:9,height:9,borderRadius:"50%",background:s.color,flexShrink:0}}/>
            <div style={{flex:1,minWidth:0,cursor:"pointer"}} onClick={function(){setOpenKey(isOpen?null:key);}}>
              <div style={{display:"flex",alignItems:"baseline",gap:6,flexWrap:"wrap"}}>
                <span style={{fontSize:14,fontWeight:900,color:s.color,fontFamily:"monospace"}}>{s.ticker}</span>
                <span style={{fontSize:10,color:"#444"}}>{s.name}</span>
                {s.live?<span style={{fontSize:9,color:"#00e676",background:"#00e67615",border:"1px solid #00e67633",padding:"1px 5px",borderRadius:4}}>LIVE</span>:(s.price?<span style={{fontSize:9,color:"#ff9800"}}>est</span>:null)}
                {EARNINGS[s.ticker]?<span style={{fontSize:9,color:"#fbbf24",background:"#fbbf2415",border:"1px solid #fbbf2433",padding:"1px 5px",borderRadius:4}}>E:{EARNINGS[s.ticker]}</span>:null}
              </div>
              {sig?(<div style={{display:"flex",alignItems:"center",gap:6,marginTop:3}}>
                <span style={{fontSize:11,fontWeight:700,color:sig.ac,background:sig.ac+"18",border:"1px solid "+sig.ac+"33",padding:"1px 8px",borderRadius:5}}>{sig.action}</span>
                {sig.RSI?<span style={{fontSize:10,color:"#3a3a3a",fontFamily:"monospace"}}>RSI {sig.RSI}</span>:null}
              </div>):<span style={{fontSize:11,color:"#333",fontStyle:"italic"}}>Tryk Scan...</span>}
            </div>
            {s.closes&&s.closes.length>3?(
              <Sparkline closes={s.closes.slice(-20)} color={s.changePct!=null?(s.changePct>=0?"#00e676":"#ff5252"):s.color}
                onClick={function(){setChartStock(s);}}/>
            ):null}
            {s.price?(
              <div style={{textAlign:"right",flexShrink:0,minWidth:52,cursor:"pointer"}} onClick={function(){setOpenKey(isOpen?null:key);}}>
                <div style={{fontSize:14,fontWeight:900,color:(s.changePct==null?"#fff":(s.changePct>=0?"#00e676":"#ff5252")),fontFamily:"monospace"}}>${fmt(s.price)}</div>
                {s.changePct!=null?<div style={{fontSize:10,fontWeight:700,color:(s.changePct>=0?"#00e676":"#ff5252"),fontFamily:"monospace"}}>{s.changePct>=0?"+":""}{s.changePct.toFixed(2)}%</div>:null}
              </div>
            ):null}
          </div>
        </div>
        {isOpen&&sig&&s.price?(
          <div style={{background:"rgba(0,0,0,0.5)",border:"1px solid "+s.color+"22",borderTop:"none",borderRadius:"0 0 10px 10px",padding:14}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
              <div>
                <div style={{fontSize:9,color:s.color,fontFamily:"monospace",letterSpacing:2,marginBottom:8}}>SIGNALER</div>
                {[[sig.fibLbl,sig.fibSc,"Fib"],[sig.rsiLbl,sig.rsiSc,"RSI"],[sig.macdLbl,sig.macdSc,"MACD"],[sig.bbLbl,sig.bbSc,"BB"],[sig.maLbl,sig.maSc,"MA Cross"],[sig.momLbl,sig.momSc,"Momentum"]].map(function(row,i){
                  return(<div key={i} style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                    <span style={{fontSize:9,color:"#444",fontFamily:"monospace"}}>{row[2]}</span>
                    <span style={{fontSize:9,fontFamily:"monospace",color:(row[1]>=2?"#00e676":(row[1]<0?"#ff5252":"#ffd740"))}}>{row[0]} ({row[1]>0?"+":""}{row[1]})</span>
                  </div>);
                })}
                <div style={{marginTop:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                    <span style={{fontSize:9,color:"#2a2a2a",fontFamily:"monospace"}}>SCORE</span>
                    <span style={{fontSize:12,fontWeight:800,color:sig.ac,fontFamily:"monospace"}}>{sig.total}/14</span>
                  </div>
                  <div style={{height:4,background:"rgba(255,255,255,0.05)",borderRadius:2}}>
                    <div style={{height:"100%",width:Math.max(0,Math.min(100,(sig.total/14)*100))+"%",background:sig.ac,borderRadius:2}}/>
                  </div>
                </div>
                {TARGETS[s.ticker]?(<div style={{marginTop:8,fontSize:10,color:"#ffd740",fontFamily:"monospace"}}>Maal: ${fmt(TARGETS[s.ticker])} <span style={{color:"#555"}}>({((TARGETS[s.ticker]-s.price)/s.price*100).toFixed(1)}% up)</span></div>):null}
                {sig.bb?(<div style={{marginTop:4,fontSize:9,color:"#555",fontFamily:"monospace"}}>BB: ${fmt(sig.bb.lower)} - ${fmt(sig.bb.upper)}</div>):null}
                {sig.ma20?(<div style={{marginTop:2,fontSize:9,color:"#555",fontFamily:"monospace"}}>MA20: ${fmt(sig.ma20)}{sig.ma50?" | MA50: $"+fmt(sig.ma50):""}</div>):null}
              </div>
              <div>
                <div style={{fontSize:9,color:s.color,fontFamily:"monospace",letterSpacing:2,marginBottom:8}}>FIBONACCI</div>
                {[["Top",sig.fib.hi,false],["38.2%",sig.fib.f382,true],["50%",sig.fib.f500,false],["61.8%",sig.fib.f618,true],["78.6%",sig.fib.f786,false],["Bund",sig.fib.lo,false]].map(function(row){
                  var near=s.price>0&&Math.abs(s.price-row[1])/s.price<0.03;
                  return(<div key={row[0]} style={{display:"flex",justifyContent:"space-between",padding:"2px 5px",borderRadius:4,marginBottom:3,background:(near?s.color+"22":(row[2]?"#ffd74008":"transparent")),border:(near?"1px solid "+s.color+"44":"1px solid transparent")}}>
                    <span style={{fontSize:10,fontFamily:"monospace",color:(near?s.color:(row[2]?"#ffd740":"#3a3a3a"))}}>{row[0]}</span>
                    <span style={{fontSize:10,fontFamily:"monospace",color:(near?"#fff":"#666"),fontWeight:(near?700:400)}}>${fmt(row[1])}</span>
                  </div>);
                })}
              </div>
            </div>
            <div style={{background:sig.ac+"0d",border:"1px solid "+sig.ac+"22",borderRadius:8,padding:"10px 12px",marginBottom:8}}>
              <div style={{fontSize:9,color:sig.ac,fontFamily:"monospace",marginBottom:5}}>ENTRY ANBEFALING</div>
              <div style={{fontSize:12,color:"#999",lineHeight:1.75}}>
                {sig.total>=10?"Staerk confluence. Kob naer $"+fmt(sig.fib.f618)+" (61.8%). Stop under $"+fmt(sig.fib.f786)+".":null}
                {(sig.total>=6&&sig.total<10)?"Godt setup. Vent paa bekraeftelse ved $"+fmt(sig.fib.f618)+"-$"+fmt(sig.fib.f382)+".":null}
                {(sig.total>=3&&sig.total<6)?"Neutral. Hold oje - kob ved tilbagetrak til $"+fmt(sig.fib.f618)+".":null}
                {(sig.total>=0&&sig.total<3)?"For tidligt. Vent paa flere bullish signaler.":null}
                {sig.total<0?"Bearish confluence. Undgaa entry nu.":null}
              </div>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={function(){setChartStock(s);}} style={{flex:1,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:7,padding:"7px",color:"#aaa",fontSize:11,cursor:"pointer"}}>Graf</button>
              <a href={"https://finance.yahoo.com/quote/"+s.ticker+"/news/"} target="_blank" rel="noreferrer" style={{flex:1,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:7,padding:"7px",color:"#aaa",fontSize:11,textDecoration:"none",textAlign:"center"}}>Nyheder</a>
              <a href={"https://finance.yahoo.com/calendar/earnings?symbol="+s.ticker} target="_blank" rel="noreferrer" style={{flex:1,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:7,padding:"7px",color:"#aaa",fontSize:11,textDecoration:"none",textAlign:"center"}}>Earnings</a>
            </div>
          </div>
        ):null}
      </div>
    );
  }

  function ExitRow(props){
    var s=props.s, key=s.ticker+"_"+s.group, bp=positions[key], sh=shares[key];
    var sig=s.signal, rsi=sig?sig.RSI:null, fib=sig?sig.fib:null;
    var exit=(s.price&&bp)?getExitSignal(s.price,bp,rsi,fib,TARGETS[s.ticker]):null;
    var isEditing=editKey===key;
    var totalVal=(sh&&s.price)?sh*s.price:null, dayChg=(sh&&s.change)?sh*s.change:null;
    return(
      <div style={{marginBottom:8}}>
        <div style={{background:(exit?exit.exitColor+"0d":"rgba(255,255,255,0.025)"),border:"1px solid "+(exit?exit.exitColor+"44":"rgba(255,255,255,0.07)"),borderRadius:12,padding:"13px 14px"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:9,height:9,borderRadius:"50%",background:s.color,flexShrink:0}}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"baseline",gap:8}}>
                <span style={{fontSize:14,fontWeight:900,color:s.color,fontFamily:"monospace"}}>{s.ticker}</span>
                <span style={{fontSize:10,color:"#444"}}>{s.name}</span>
              </div>
              {exit?(<div style={{marginTop:3}}>
                <span style={{fontSize:11,fontWeight:700,color:exit.exitColor,background:exit.exitColor+"18",border:"1px solid "+exit.exitColor+"33",padding:"1px 8px",borderRadius:5}}>{exit.exitAction}</span>
                <span style={{fontSize:11,fontWeight:700,color:(exit.pnl>=0?"#00e676":"#ff5252"),marginLeft:8,fontFamily:"monospace"}}>{exit.pnl>=0?"+":""}{exit.pnl.toFixed(1)}%</span>
                {totalVal?<span style={{fontSize:11,color:"#555",marginLeft:8,fontFamily:"monospace"}}>${fmt(totalVal)}</span>:null}
                {dayChg?<span style={{fontSize:10,color:(dayChg>=0?"#00e676":"#ff5252"),marginLeft:6,fontFamily:"monospace"}}>{dayChg>=0?"+":""}{fmt(dayChg)}/dag</span>:null}
              </div>):(<div style={{fontSize:11,color:"#555",fontStyle:"italic",marginTop:2}}>{bp?"Scanner...":"Ingen indkobspris sat"}</div>)}
            </div>
            <div style={{textAlign:"right",flexShrink:0,marginRight:4}}>
              {s.price?<div style={{fontSize:13,fontWeight:800,color:"#fff",fontFamily:"monospace"}}>${fmt(s.price)}</div>:null}
              {bp?<div style={{fontSize:10,color:"#555",fontFamily:"monospace"}}>Kobt: ${fmt(bp)}</div>:null}
              {sh?<div style={{fontSize:10,color:"#666",fontFamily:"monospace"}}>{sh} stk</div>:null}
            </div>
            <button onClick={function(){setEditKey(isEditing?null:key);setEditPrice(bp?bp.toString():"");setEditShares(sh?sh.toString():"");}}
              style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:7,padding:"5px 9px",color:"#888",fontSize:11,cursor:"pointer"}}>
              {isEditing?"X":(bp?"Ret":"+ Kob")}
            </button>
          </div>
          {isEditing?(<div style={{marginTop:10,display:"flex",flexDirection:"column",gap:6}}>
            <input value={editPrice} onChange={function(e){setEditPrice(e.target.value);}} placeholder="Indkobspris f.eks. 6.50" type="number" min="0.001" step="any"
              style={{background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:7,padding:"8px 10px",color:"#fff",fontSize:13,fontFamily:"monospace",outline:"none"}}/>
            <input value={editShares} onChange={function(e){setEditShares(e.target.value);}} placeholder="Antal aktier f.eks. 100" type="number" min="1" step="1"
              style={{background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:7,padding:"8px 10px",color:"#fff",fontSize:13,fontFamily:"monospace",outline:"none"}}/>
            <div style={{display:"flex",gap:6}}>
              <button onClick={function(){savePosition(key,editPrice,editShares);}} style={{flex:1,background:"#00e676",color:"#000",border:"none",borderRadius:7,padding:"8px",fontSize:12,fontWeight:700,cursor:"pointer"}}>Gem</button>
              {bp?<button onClick={function(){removePosition(key);setEditKey(null);}} style={{background:"rgba(255,82,82,0.15)",color:"#ff5252",border:"1px solid rgba(255,82,82,0.2)",borderRadius:7,padding:"8px 12px",fontSize:12,cursor:"pointer"}}>Slet</button>:null}
            </div>
          </div>):null}
          {(exit&&!isEditing)?(<div style={{marginTop:10,fontSize:12,color:"#888",lineHeight:1.7,borderTop:"1px solid rgba(255,255,255,0.05)",paddingTop:8}}>
            {exit.rec}{exit.target?<span style={{color:"#ffd740",marginLeft:4}}>Maal: ${fmt(exit.target)}</span>:null}
          </div>):null}
        </div>
      </div>
    );
  }

  return (
    <div style={{minHeight:"100vh",background:"#020408",color:"#ccc",fontFamily:"Georgia, serif",maxWidth:720,margin:"0 auto"}}>
      {chartStock?<BigChart ticker={chartStock.ticker} color={chartStock.color} onClose={function(){setChartStock(null);}}/>:null}

      <div style={{background:"#080c14",borderBottom:"1px solid rgba(255,255,255,0.07)",padding:"12px 14px",position:"sticky",top:0,zIndex:10}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
          <div style={{flex:1}}>
            <div style={{fontSize:15,fontWeight:900,color:"#fff"}}>Signal Tracker</div>
            <div style={{fontSize:9,color:"#2a2a2a",fontFamily:"monospace"}}>{lastScan?"Opdateret: "+lastScan.toLocaleTimeString("da-DK"):"Tryk Scan for live priser"}</div>
          </div>
          <button onClick={toggleAuto} style={{background:(autoOn?"#00e67615":"rgba(255,255,255,0.05)"),color:(autoOn?"#00e676":"#555"),border:"1px solid "+(autoOn?"#00e67633":"rgba(255,255,255,0.08)"),borderRadius:8,padding:"6px 10px",fontSize:11,cursor:"pointer"}}>{autoOn?"Auto":"Off"}</button>
          <button onClick={scanAll} disabled={scanning} style={{background:(scanning?"#0a1a0a":"#00e676"),color:(scanning?"#3a6a3a":"#000"),border:"none",borderRadius:8,padding:"6px 14px",fontSize:12,fontWeight:700,cursor:(scanning?"default":"pointer")}}>{scanning?"Henter...":"Scan"}</button>
        </div>
        <div style={{display:"flex",gap:6}}>
          {[["signals","Entry"],["exit","Exit"],["portfolio","Portfolio"]].map(function(t){
            return(<button key={t[0]} onClick={function(){setActiveTab(t[0]);}} style={{background:(activeTab===t[0]?"rgba(255,255,255,0.08)":"transparent"),color:(activeTab===t[0]?"#fff":"#555"),border:"1px solid "+(activeTab===t[0]?"rgba(255,255,255,0.15)":"rgba(255,255,255,0.06)"),borderRadius:20,padding:"5px 14px",fontSize:11,cursor:"pointer",fontWeight:(activeTab===t[0]?700:400)}}>{t[1]}</button>);
          })}
        </div>
      </div>

      {activeTab==="signals"?(
        <div style={{padding:"12px 14px 40px"}}>
          <SH emoji="🚀" label="MOONSHOTS"   color="#ff6d00" count={moonshots.length}/>
          {moonshots.map(function(s){return <StockRow key={s.ticker+"_"+s.group} s={s}/>;}) }
          <SH emoji="📈" label="LONG TERM"   color="#60a5fa" count={longterm.length}/>
          {longterm.map(function(s){return <StockRow key={s.ticker+"_"+s.group} s={s}/>;}) }
          <SH emoji="💎" label="UNDERVALUED" color="#fb7185" count={undervalued.length}/>
          {undervalued.map(function(s){return <StockRow key={s.ticker+"_"+s.group} s={s}/>;}) }
          <SH emoji="💼" label="ETF FONDE"   color="#ffd740" count={etfList.length}/>
          {etfList.map(function(s){return <StockRow key={s.ticker+"_"+s.group} s={s}/>;}) }
        </div>
      ):null}

      {activeTab==="exit"?(
        <div style={{padding:"12px 14px 40px"}}>
          <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:10,padding:"12px 14px",marginBottom:16}}>
            <div style={{fontSize:11,color:"#ffd740",fontFamily:"monospace",marginBottom:5}}>SAADAN BRUGER DU EXIT TRACKER</div>
            <div style={{fontSize:12,color:"#555",lineHeight:1.7}}>Tryk + Kob, indtast indkobspris og antal aktier. Appen beregner gevinst/tab og anbefaler hvornaar du boer saelge.</div>
          </div>
          <SH emoji="🚀" label="MOONSHOTS"   color="#ff6d00" count={moonshots.length}/>
          {moonshots.map(function(s){return <ExitRow key={s.ticker+"_"+s.group} s={s}/>;}) }
          <SH emoji="📈" label="LONG TERM"   color="#60a5fa" count={longterm.length}/>
          {longterm.map(function(s){return <ExitRow key={s.ticker+"_"+s.group} s={s}/>;}) }
          <SH emoji="💎" label="UNDERVALUED" color="#fb7185" count={undervalued.length}/>
          {undervalued.map(function(s){return <ExitRow key={s.ticker+"_"+s.group} s={s}/>;}) }
          <SH emoji="💼" label="ETF FONDE"   color="#ffd740" count={etfList.length}/>
          {etfList.map(function(s){return <ExitRow key={s.ticker+"_"+s.group} s={s}/>;}) }
        </div>
      ):null}

      {activeTab==="portfolio"?(
        <div style={{padding:"12px 14px 40px"}}>
          <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:12,padding:16,marginBottom:16}}>
            <div style={{fontSize:9,color:"#555",fontFamily:"monospace",letterSpacing:2,marginBottom:10}}>DIN PORTEFOLJE</div>
            <div style={{fontSize:32,fontWeight:900,color:"#fff",fontFamily:"monospace"}}>${fmt(portfolioValue)}</div>
            <div style={{fontSize:14,fontWeight:700,color:(portfolioDayChange>=0?"#00e676":"#ff5252"),fontFamily:"monospace",marginTop:4}}>{portfolioDayChange>=0?"+":""}{fmt(portfolioDayChange)} i dag</div>
            {portfolioValue===0?<div style={{fontSize:12,color:"#444",marginTop:8}}>Gaa til Exit fanen og tilfoej dine aktier og antal for at se vaerdien her.</div>:null}
          </div>
          {stocks.filter(function(s){return shares[s.ticker+"_"+s.group];}).map(function(s){
            var key=s.ticker+"_"+s.group, sh=shares[key], bp=positions[key];
            var val=sh&&s.price?sh*s.price:null, pnl=(val&&bp&&sh)?((s.price-bp)/bp*100):null;
            var dayChg=sh&&s.change?sh*s.change:null;
            return(<div key={key} style={{background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:10,padding:"12px 14px",marginBottom:6}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:9,height:9,borderRadius:"50%",background:s.color,flexShrink:0}}/>
                <div style={{flex:1}}>
                  <span style={{fontSize:13,fontWeight:900,color:s.color,fontFamily:"monospace"}}>{s.ticker}</span>
                  <span style={{fontSize:10,color:"#444",marginLeft:8}}>{sh} stk</span>
                </div>
                <div style={{textAlign:"right"}}>
                  {val?<div style={{fontSize:14,fontWeight:800,color:"#fff",fontFamily:"monospace"}}>${fmt(val)}</div>:null}
                  {pnl!=null?<div style={{fontSize:11,color:(pnl>=0?"#00e676":"#ff5252"),fontFamily:"monospace"}}>{pnl>=0?"+":""}{pnl.toFixed(1)}%</div>:null}
                  {dayChg?<div style={{fontSize:10,color:(dayChg>=0?"#00e676":"#ff5252"),fontFamily:"monospace"}}>{dayChg>=0?"+":""}{fmt(dayChg)}/dag</div>:null}
                </div>
              </div>
            </div>);
          })}
        </div>
      ):null}

      <div style={{background:"#080c14",borderTop:"1px solid rgba(255,255,255,0.05)",padding:"10px 14px",textAlign:"center"}}>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center",marginBottom:6}}>
          {[["🚀 KOB NU","#00e676","10+"],["✅ KOB SIGNAL","#69f0ae","6-9"],["👀 HOLD OJE","#ffd740","3-5"],["⏳ VENT","#ff9800","0-2"],["❌ UNDGA","#ff5252","<0"]].map(function(t){
            return(<div key={t[0]} style={{display:"flex",alignItems:"center",gap:4}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:t[1]}}/>
              <span style={{fontSize:9,color:"#333",fontFamily:"monospace"}}>{t[0]} ({t[2]})</span>
            </div>);
          })}
        </div>
        <div style={{fontSize:9,color:"#111",fontStyle:"italic"}}>Live priser - Ikke finansiel raadgivning</div>
      </div>
    </div>
  );
}
