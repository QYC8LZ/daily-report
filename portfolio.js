const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
function setTheme(theme){document.documentElement.dataset.theme=theme;localStorage.setItem("brief-theme",theme)}
function initTheme(){const saved=localStorage.getItem("brief-theme");setTheme(saved||(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"))}
function toggleTheme(){setTheme(document.documentElement.dataset.theme==="dark"?"light":"dark")}
function fmt(v){return v==null?"—":esc(v)}
function renderTag(t){return '<span class="trade-tag '+esc(t.tone||"")+'">'+esc(t.label)+'</span>'}
function renderRows(rows, cols){
  return rows.map(r=>'<tr>'+cols.map(c=>'<td data-label="'+esc(c.label)+'">'+(c.render?c.render(r):fmt(r[c.key]))+'</td>').join("")+'</tr>').join("")
}
async function boot(){
  initTheme();
  const res=await fetch("./trading/demo.json",{cache:"no-store"});
  const d=await res.json();
  const posCols=[
    {label:"标的",render:r=>'<strong>'+esc(r.symbol)+'</strong><span class="sub">'+esc(r.name)+'</span>'},
    {label:"状态",render:r=>renderTag(r.status)},
    {label:"点评",key:"comment"},
    {label:"关键结构",key:"structure"},
    {label:"明日关注",key:"watch"}
  ];
  const stopCols=[
    {label:"标的",render:r=>'<strong>'+esc(r.symbol)+'</strong><span class="sub">'+esc(r.name)+'</span>'},
    {label:"条件单",render:r=>renderTag(r.type)},
    {label:"触发条件",key:"trigger"},
    {label:"保护逻辑",key:"logic"},
    {label:"状态",render:r=>renderTag(r.state)}
  ];
  const orderCols=[
    {label:"标的",render:r=>'<strong>'+esc(r.symbol)+'</strong><span class="sub">'+esc(r.name)+'</span>'},
    {label:"订单",render:r=>renderTag(r.type)},
    {label:"触发 / 买价",key:"trigger"},
    {label:"Limit",key:"limit"},
    {label:"失效条件",key:"invalid"},
    {label:"有效期",key:"valid"}
  ];
  $("#tradingReport").innerHTML=
    '<header class="hero trade-hero"><p class="kicker">A/H Trading Desk</p><h1>'+esc(d.title)+'</h1>'
    +'<p class="hero-deck">'+esc(d.deck)+'</p>'
    +'<div class="hero-meta"><span>'+esc(d.date)+'</span><span>'+esc(d.market)+'</span><span>'+esc(d.note)+'</span></div></header>'
    +'<section class="trade-summary">'+d.summary.map(x=>'<div><span>'+esc(x.label)+'</span><strong>'+esc(x.value)+'</strong><small>'+esc(x.note||"")+'</small></div>').join("")+'</section>'
    +'<section class="section" id="positions"><div class="section-head"><h2>持仓点评</h2><span>'+d.positions.length+' 项</span></div><div class="table-wrap"><table class="trade-table"><thead><tr>'+posCols.map(c=>'<th>'+esc(c.label)+'</th>').join("")+'</tr></thead><tbody>'+renderRows(d.positions,posCols)+'</tbody></table></div></section>'
    +'<section class="section" id="stops"><div class="section-head"><h2>持仓条件单</h2><span>'+d.stops.length+' 项</span></div><div class="table-wrap"><table class="trade-table"><thead><tr>'+stopCols.map(c=>'<th>'+esc(c.label)+'</th>').join("")+'</tr></thead><tbody>'+renderRows(d.stops,stopCols)+'</tbody></table></div></section>'
    +'<section class="section" id="orders"><div class="section-head"><h2>待挂买单</h2><span>'+d.orders.length+' 项</span></div><div class="table-wrap"><table class="trade-table"><thead><tr>'+orderCols.map(c=>'<th>'+esc(c.label)+'</th>').join("")+'</tr></thead><tbody>'+renderRows(d.orders,orderCols)+'</tbody></table></div></section>'
    +'<p class="demo-warning">这是版式预览。公开仓库中不写入真实持仓、成本、成交、券商条件单或实际待挂订单。</p>';
}
$("#themeToggle").addEventListener("click",toggleTheme);
$("#themeToggleMobile").addEventListener("click",toggleTheme);
$("#menuToggle").addEventListener("click",()=>document.body.classList.toggle("menu-open"));
document.addEventListener("click",e=>{if(innerWidth<=820&&!e.target.closest(".sidebar")&&!e.target.closest("#menuToggle"))document.body.classList.remove("menu-open")});
boot().catch(()=>{$("#tradingReport").innerHTML='<section class="empty"><h1>无法加载交易计划</h1></section>'});