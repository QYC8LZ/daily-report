const state={index:[],current:null};
const $=s=>document.querySelector(s);

function setTheme(theme){
  document.documentElement.dataset.theme=theme;
  localStorage.setItem("brief-theme",theme);
}
function initTheme(){
  const saved=localStorage.getItem("brief-theme");
  const auto=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";
  setTheme(saved||auto);
}
function toggleTheme(){setTheme(document.documentElement.dataset.theme==="dark"?"light":"dark")}
function fmtDate(d){
  const x=new Date(d+"T00:00:00");
  return new Intl.DateTimeFormat("zh-CN",{year:"numeric",month:"long",day:"numeric",weekday:"short"}).format(x);
}
function esc(s=""){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function sourceLinks(sources=[]){
  if(!sources.length)return "";
  return '<div class="sources">'+sources.map(s=>'<a href="'+esc(s.url)+'" target="_blank" rel="noopener">'+esc(s.label||"来源")+'</a>').join("")+'</div>';
}
function renderHistory(){
  const box=$("#history");
  box.innerHTML=state.index.map(r=>'<a href="?date='+r.date+'" data-date="'+r.date+'" class="'+(r.date===state.current?"active":"")+'"><span>'+fmtDate(r.date).replace(/星期.*/,"")+'</span><small>'+esc(r.label||"")+'</small></a>').join("");
}
function navLink(item,label,side){
  if(!item)return '<a class="disabled">—</a>';
  return '<a href="?date='+item.date+'">'+(side==="prev"?"← ":"")+label+" · "+item.date+(side==="next"?" →":"")+'</a>';
}
function renderReport(data){
  document.title=(data.title||"每日简报")+" · Daily Brief";
  const summary=(data.summary||[]).map(x=>"<li>"+esc(x)+"</li>").join("");
  const sections=(data.sections||[]).map((s,i)=>`
    <section class="section" id="${esc(s.id||"section-"+i)}">
      <div class="section-head"><h2>${esc(s.title)}</h2><span>${(s.items||[]).length} 条</span></div>
      ${(s.items||[]).map(item=>`
        <article class="item">
          <h3>${esc(item.title)}</h3>
          <p>${esc(item.body)}</p>
          ${item.commentary?'<div class="commentary"><strong>点评：</strong>'+esc(item.commentary)+'</div>':""}
          ${sourceLinks(item.sources)}
        </article>`).join("")}
    </section>`).join("");
  const pos=state.index.findIndex(x=>x.date===state.current);
  const newer=pos>0?state.index[pos-1]:null;
  const older=pos>=0&&pos<state.index.length-1?state.index[pos+1]:null;
  $("#report").innerHTML=`
    <header class="hero">
      <div class="kicker">Daily Brief · ${esc(data.edition||"Morning")}</div>
      <h1>${esc(data.title||"每日简报")}</h1>
      <div class="hero-meta"><span>${fmtDate(data.date)}</span><span>约 ${esc(data.readTime||"10")} 分钟</span><span>${(data.sections||[]).reduce((n,s)=>n+(s.items||[]).length,0)} 条正文</span></div>
      <div class="hero-rule"></div>
    </header>
    ${summary?'<section class="summary"><h2>30 秒摘要</h2><ul>'+summary+'</ul></section>':""}
    ${sections}
    <nav class="report-nav">${navLink(older,"上一期","prev")}${navLink(newer,"下一期","next")}</nav>`;
}
async function loadReport(date){
  try{
    const res=await fetch("./briefs/"+date+".json",{cache:"no-store"});
    if(!res.ok)throw new Error("report not found");
    state.current=date;
    const data=await res.json();
    renderHistory();renderReport(data);
    document.body.classList.remove("menu-open");
  }catch(e){
    $("#report").innerHTML='<section class="empty"><h1>无法加载这期简报</h1><p>请稍后刷新，或从左侧选择其他日期。</p></section>';
  }
}
async function boot(){
  initTheme();
  const r=await fetch("./briefs/index.json",{cache:"no-store"});
  const payload=await r.json();
  state.index=(payload.reports||[]).slice().sort((a,b)=>b.date.localeCompare(a.date));
  if(!state.index.length){$("#report").innerHTML=$("#emptyTemplate").innerHTML;return}
  const requested=new URLSearchParams(location.search).get("date");
  const date=state.index.some(x=>x.date===requested)?requested:state.index[0].date;
  await loadReport(date);
}
$("#themeToggle").addEventListener("click",toggleTheme);
$("#themeToggleMobile").addEventListener("click",toggleTheme);
$("#menuToggle").addEventListener("click",()=>document.body.classList.toggle("menu-open"));
document.addEventListener("click",e=>{if(innerWidth<=820&&!e.target.closest(".sidebar")&&!e.target.closest("#menuToggle"))document.body.classList.remove("menu-open")});
boot().catch(()=>{$("#report").innerHTML='<section class="empty"><h1>站点初始化中</h1><p>稍后刷新即可。</p></section>'});