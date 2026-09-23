const state={index:[],current:null};
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
function setTheme(theme){document.documentElement.dataset.theme=theme;localStorage.setItem("brief-theme",theme)}
function initTheme(){const saved=localStorage.getItem("brief-theme");setTheme(saved||(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"))}
function toggleTheme(){setTheme(document.documentElement.dataset.theme==="dark"?"light":"dark")}
function fmt(v){return v==null?"—":esc(v)}
function renderTag(t){return '<span class="trade-tag '+esc(t?.tone||"")+'">'+esc(t?.label||"—")+'</span>'}
function renderRows(rows, cols){return rows.map(r=>'<tr>'+cols.map(c=>'<td data-label="'+esc(c.label)+'">'+(c.render?c.render(r):fmt(r[c.key]))+'</td>').join("")+'</tr>').join("")}
function renderHistory(){
  $("#tradeHistory").innerHTML=state.index.map(r=>'<a href="?date='+esc(r.date)+'" class="'+(r.date===state.current?"active":"")+'"><span>'+esc(r.date)+'</span><small>'+esc(r.label||"")+'</small></a>').join("")
}
function navLink(item,label,side){
  if(!item)return '<a class="disabled">—</a>';
  return '<a href="?date='+esc(item.date)+'">'+(side==="prev"?"← ":"")+label+" · "+esc(item.date)+(side==="next"?" →":"")+'</a>'
}
function renderReport(d){
  document.title=(d.date||"交易计划")+" · Trading Desk";
  const posCols=[
    {label:"标的",render:r=>'<strong>'+esc(r.symbol)+'</strong><span class="sub">'+esc(r.name)+'</span>'},
    {label:"收盘",key:"close"},{label:"成本",key:"cost"},{label:"浮盈亏",key:"pnl"},
    {label:"状态",render:r=>renderTag(r.status)},{label:"点评",key:"comment"},
    {label:"关键结构",key:"structure"},{label:"明日关注",key:"watch"}
  ];
  const stopCols=[
    {label:"标的",render:r=>'<strong>'+esc(r.symbol)+'</strong><span class="sub">'+esc(r.name)+'</span>'},
    {label:"条件单",render:r=>renderTag(r.type)},{label:"触发条件",key:"trigger"},
    {label:"保护逻辑",key:"logic"},{label:"状态",render:r=>renderTag(r.state)}
  ];
  const orderCols=[
    {label:"标的",render:r=>'<strong>'+esc(r.symbol)+'</strong><span class="sub">'+esc(r.name)+'</span>'},
    {label:"订单",render:r=>renderTag(r.type)},{label:"触发 / 买价",key:"trigger"},
    {label:"Limit",key:"limit"},{label:"失效条件",key:"invalid"},{label:"有效期",key:"valid"}
  ];
  const obs=(d.observations||[]).map(x=>'<li>'+esc(x)+'</li>').join("");
  const pos=state.index.findIndex(x=>x.date===state.current);
  const newer=pos>0?state.index[pos-1]:null;
  const older=pos>=0&&pos<state.index.length-1?state.index[pos+1]:null;
  $("#tradingReport").innerHTML=
    '<header class="hero trade-hero"><p class="kicker">A/H Trading Desk</p><h1>'+esc(d.title)+'</h1>'
    +'<p class="hero-deck">'+esc(d.deck)+'</p>'
    +'<div class="hero-meta"><span>'+esc(d.date)+'</span><span>'+esc(d.market)+'</span><span>'+esc(d.note)+'</span></div></header>'
    +'<section class="trade-summary">'+(d.summary||[]).map(x=>'<div><span>'+esc(x.label)+'</span><strong>'+esc(x.value)+'</strong><small>'+esc(x.note||"")+'</small></div>').join("")+'</section>'
    +((d.orders||[]).length?'<a class="action-alert action-alert-trade" href="#orders"><span class="action-alert-badge">待执行</span><span><strong>下一交易日有 '+(d.orders||[]).length+' 笔待挂买单</strong><small>'+esc((d.orders||[]).map(x=>x.name||x.symbol).join("、"))+'</small></span><span class="action-alert-arrow">↓</span></a>':"")
    +'<section class="section" id="orders"><div class="section-head"><h2>待挂买单</h2><span>'+(d.orders||[]).length+' 项</span></div><div class="table-wrap"><table class="trade-table"><thead><tr>'+orderCols.map(c=>'<th>'+esc(c.label)+'</th>').join("")+'</tr></thead><tbody>'+renderRows(d.orders||[],orderCols)+'</tbody></table></div>'
    +(obs?'<div class="commentary-note"><span class="commentary-label">其他观察</span><ul>'+obs+'</ul></div>':"")+'</section>'
    +'<section class="section" id="positions"><div class="section-head"><h2>持仓点评</h2><span>'+(d.positions||[]).length+' 项</span></div><div class="table-wrap"><table class="trade-table"><thead><tr>'+posCols.map(c=>'<th>'+esc(c.label)+'</th>').join("")+'</tr></thead><tbody>'+renderRows(d.positions||[],posCols)+'</tbody></table></div></section>'
    +'<section class="section" id="stops"><div class="section-head"><h2>持仓条件单</h2><span>'+(d.stops||[]).length+' 项</span></div><div class="table-wrap"><table class="trade-table"><thead><tr>'+stopCols.map(c=>'<th>'+esc(c.label)+'</th>').join("")+'</tr></thead><tbody>'+renderRows(d.stops||[],stopCols)+'</tbody></table></div></section>'
    +'<nav class="report-nav">'+navLink(older,"上一期","prev")+navLink(newer,"下一期","next")+'</nav>';
}
async function loadReport(date){
  const res=await fetch("./trading/"+date+".json",{cache:"no-store"});
  if(!res.ok)throw new Error("not found");
  state.current=date;renderHistory();renderReport(await res.json());
  document.body.classList.remove("menu-open");scrollTo({top:0,behavior:"instant"})
}
async function boot(){
  initTheme();
  const r=await fetch("./trading/index.json",{cache:"no-store"});
  const p=await r.json();
  state.index=(p.reports||[]).slice().sort((a,b)=>b.date.localeCompare(a.date));
  if(!state.index.length)throw new Error("empty");
  const q=new URLSearchParams(location.search).get("date");
  await loadReport(state.index.some(x=>x.date===q)?q:state.index[0].date)
}
$("#themeToggle").addEventListener("click",toggleTheme);
$("#themeToggleMobile").addEventListener("click",toggleTheme);
$("#menuToggle").addEventListener("click",()=>document.body.classList.toggle("menu-open"));
document.addEventListener("click",e=>{if(innerWidth<=820&&!e.target.closest(".sidebar")&&!e.target.closest("#menuToggle"))document.body.classList.remove("menu-open")});
boot().catch(()=>{$("#tradingReport").innerHTML='<section class="empty"><h1>无法加载交易计划</h1><p>请稍后刷新。</p></section>'});