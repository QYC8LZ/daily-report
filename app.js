const state={index:[],current:null,sections:[]};
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
function esc(s=""){
  return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
}
function sourceLinks(sources=[]){
  if(!sources.length)return "";
  return '<details class="sources-details"><summary>来源与扩展阅读 · '+sources.length+'</summary><div class="sources">'
    +sources.map(s=>'<a href="'+esc(s.url)+'" target="_blank" rel="noopener noreferrer">'+esc(s.label||"来源")+'</a>').join("")
    +'</div></details>';
}
function renderHistory(){
  const box=$("#history");
  box.innerHTML=state.index.map(r=>
    '<a href="?date='+r.date+'" data-date="'+r.date+'" class="'+(r.date===state.current?"active":"")+'">'
    +'<span>'+fmtDate(r.date).replace(/星期.*/,"")+'</span><small>'+esc(r.label||"")+'</small></a>'
  ).join("");
}
function renderToc(sections=[]){
  state.sections=sections;
  const box=$("#toc");
  box.innerHTML=sections.map((s,i)=>
    '<a href="#'+esc(s.id||"section-"+i)+'" data-target="'+esc(s.id||"section-"+i)+'">'+esc(s.title)+'</a>'
  ).join("");
}
function navLink(item,label,side){
  if(!item)return '<a class="disabled">—</a>';
  return '<a href="?date='+item.date+'">'+(side==="prev"?"← ":"")+label+" · "+item.date+(side==="next"?" →":"")+'</a>';
}
function renderReport(data){
  document.title=(data.title||"每日简报")+" · Daily Brief";
  const summary=(data.summary||[]).map((x,i)=>
    '<div class="summary-card"><strong>0'+(i+1)+'</strong>'+esc(x)+'</div>'
  ).join("");

  let running=0;
  const sections=(data.sections||[]).map((s,i)=>{
    const items=(s.items||[]).map(item=>{
      running+=1;
      return '<article class="item">'
        +'<div class="item-number">'+String(running).padStart(2,"0")+'</div>'
        +'<h3>'+esc(item.title)+'</h3>'
        +'<p class="item-body">'+esc(item.body)+'</p>'
        +(item.commentary?'<div class="commentary"><strong>为什么重要：</strong>'+esc(item.commentary)+'</div>':"")
        +sourceLinks(item.sources)
        +'</article>';
    }).join("");
    return '<section class="section" id="'+esc(s.id||"section-"+i)+'">'
      +'<div class="section-head"><div class="section-title-wrap"><span class="section-index">0'+(i+1)+'</span><h2>'+esc(s.title)+'</h2></div><span class="count">'+(s.items||[]).length+' 条</span></div>'
      +items+'</section>';
  }).join("");

  const pos=state.index.findIndex(x=>x.date===state.current);
  const newer=pos>0?state.index[pos-1]:null;
  const older=pos>=0&&pos<state.index.length-1?state.index[pos+1]:null;
  const total=(data.sections||[]).reduce((n,s)=>n+(s.items||[]).length,0);

  $("#report").innerHTML=
    '<header class="hero">'
      +'<div class="hero-topline"><div><p class="eyebrow">Daily Brief · '+esc(data.edition||"Morning")+'</p>'
      +'<h1>'+esc(data.title||"每日简报")+'</h1></div></div>'
      +'<div class="hero-meta">'
      +'<span class="meta-pill">'+fmtDate(data.date)+'</span>'
      +'<span class="meta-pill">约 '+esc(data.readTime||"10")+' 分钟</span>'
      +'<span class="meta-pill">'+total+' 条正文</span>'
      +'</div><div class="hero-rule"></div></header>'
      +(summary?'<section class="summary"><div class="summary-head"><h2>30 秒摘要</h2><span class="hint">先看结论，再决定是否展开</span></div><div class="summary-grid">'+summary+'</div></section>':"")
      +sections
      +'<nav class="report-nav">'+navLink(older,"上一期","prev")+navLink(newer,"下一期","next")+'</nav>';

  renderToc(data.sections||[]);
  setupSectionObserver();
  updateProgress();
}
async function loadReport(date){
  try{
    const res=await fetch("./briefs/"+date+".json",{cache:"no-store"});
    if(!res.ok)throw new Error("report not found");
    state.current=date;
    const data=await res.json();
    renderHistory();
    renderReport(data);
    document.body.classList.remove("menu-open");
    window.scrollTo({top:0,behavior:"instant"});
  }catch(e){
    $("#report").innerHTML='<section class="empty"><p class="eyebrow">Daily Brief</p><h1>无法加载这期简报</h1><p>请稍后刷新，或从左侧选择其他日期。</p></section>';
  }
}
function updateProgress(){
  const doc=document.documentElement;
  const max=doc.scrollHeight-doc.clientHeight;
  const pct=max>0?(doc.scrollTop/max)*100:0;
  $("#progressBar").style.width=Math.min(100,Math.max(0,pct))+"%";
}
function setupSectionObserver(){
  if(!("IntersectionObserver" in window))return;
  const links=[...document.querySelectorAll("#toc a")];
  const observer=new IntersectionObserver(entries=>{
    const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
    if(!visible)return;
    links.forEach(a=>a.classList.toggle("active",a.dataset.target===visible.target.id));
  },{rootMargin:"-20% 0px -65% 0px",threshold:[0,.1,.3,.6]});
  document.querySelectorAll(".section").forEach(s=>observer.observe(s));
}
async function boot(){
  initTheme();
  const r=await fetch("./briefs/index.json",{cache:"no-store"});
  const payload=await r.json();
  state.index=(payload.reports||[]).slice().sort((a,b)=>b.date.localeCompare(a.date));
  if(!state.index.length){
    $("#report").innerHTML=$("#emptyTemplate").innerHTML;
    return;
  }
  const requested=new URLSearchParams(location.search).get("date");
  const date=state.index.some(x=>x.date===requested)?requested:state.index[0].date;
  await loadReport(date);
}

$("#themeToggle").addEventListener("click",toggleTheme);
$("#themeToggleMobile").addEventListener("click",toggleTheme);
$("#menuToggle").addEventListener("click",()=>document.body.classList.toggle("menu-open"));
document.addEventListener("click",e=>{
  if(innerWidth<=820&&!e.target.closest(".sidebar")&&!e.target.closest("#menuToggle")){
    document.body.classList.remove("menu-open");
  }
});
window.addEventListener("scroll",updateProgress,{passive:true});

boot().catch(()=>{
  $("#report").innerHTML='<section class="empty"><p class="eyebrow">Daily Brief</p><h1>站点初始化中</h1><p>稍后刷新即可。</p></section>';
});