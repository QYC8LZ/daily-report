const state={index:[],current:null};
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));

function setTheme(theme){document.documentElement.dataset.theme=theme;localStorage.setItem("brief-theme",theme)}
function initTheme(){const saved=localStorage.getItem("brief-theme");setTheme(saved||(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"))}
function toggleTheme(){setTheme(document.documentElement.dataset.theme==="dark"?"light":"dark")}
function fmtDate(d){return new Intl.DateTimeFormat("zh-CN",{year:"numeric",month:"long",day:"numeric",weekday:"short"}).format(new Date(d+"T00:00:00"))}

function renderSources(sources=[]){
  if(!sources.length)return "";
  return '<div class="sources"><span class="sources-label">来源</span>'
    +sources.map((s,i)=>(i?'<span class="sep">·</span>':'')+'<a href="'+esc(s.url)+'" target="_blank" rel="noopener noreferrer">'+esc(s.label||"原文")+'</a>').join("")
    +'</div>';
}
function renderHistory(){
  $("#history").innerHTML=state.index.map(r=>'<a href="?date='+r.date+'" class="'+(r.date===state.current?"active":"")+'"><span>'+fmtDate(r.date).replace(/星期.*/,"")+'</span><small>'+esc(r.label||"")+'</small></a>').join("")
}
function renderToc(sections=[]){
  $("#toc").innerHTML=sections.map((s,i)=>'<a href="#'+esc(s.id||"section-"+i)+'" data-target="'+esc(s.id||"section-"+i)+'">'+esc(s.title)+'</a>').join("")
}
function navLink(item,label,side){
  if(!item)return '<a class="disabled">—</a>';
  return '<a href="?date='+item.date+'">'+(side==="prev"?"← ":"")+label+" · "+item.date+(side==="next"?" →":"")+'</a>'
}
function renderParagraphs(value){
  if(!value)return "";
  const list=Array.isArray(value)?value:String(value).split(/\n\s*\n/);
  return list.filter(Boolean).map(p=>'<p>'+esc(p)+'</p>').join("");
}
function renderCommentary(item){
  const parts=[];
  if(item.commentary)parts.push(item.commentary);
  if(item.watch)parts.push("后续可观察："+item.watch);
  const details=item.details||item.deepDive;
  if(details){
    const list=Array.isArray(details)?details:[details];
    parts.push(...list);
  }
  if(!parts.length)return "";
  return '<aside class="commentary-note"><span class="commentary-label">简评</span>'
    +parts.map(p=>'<p>'+esc(p)+'</p>').join("")
    +'</aside>';
}
function renderReport(data){
  document.title=(data.title||"每日简报")+" · Daily Brief";
  const summary=(data.summary||[]).map(x=>'<div class="headline"><span class="headline-mark">•</span><span>'+esc(x)+'</span></div>').join("");
  const sections=(data.sections||[]).map((s,si)=>{
    const items=(s.items||[]).map((item,ii)=>
      '<article class="item" id="'+esc((s.id||"section-"+si)+"-item-"+ii)+'">'
      +'<h3>'+esc(item.title)+'</h3>'
      +'<div class="article-copy">'+renderParagraphs(item.body||item.fact)+'</div>'
      +renderCommentary(item)
      +renderSources(item.sources)
      +'</article>'
    ).join("");
    return '<section class="section" id="'+esc(s.id||"section-"+si)+'">'
      +'<div class="section-head"><h2>'+esc(s.title)+'</h2><span>'+(s.items||[]).length+' 篇</span></div>'
      +items+'</section>'
  }).join("");

  const pos=state.index.findIndex(x=>x.date===state.current);
  const newer=pos>0?state.index[pos-1]:null;
  const older=pos>=0&&pos<state.index.length-1?state.index[pos+1]:null;
  const total=(data.sections||[]).reduce((n,s)=>n+(s.items||[]).length,0);

  $("#report").innerHTML=
    '<header class="hero"><p class="kicker">Daily Brief</p><h1>'+esc(data.title||"每日简报")+'</h1>'
    +(data.deck?'<p class="hero-deck">'+esc(data.deck)+'</p>':'')
    +'<div class="hero-meta"><span>'+fmtDate(data.date)+'</span><span>约 '+esc(data.readTime||"10")+' 分钟</span><span>'+total+' 篇</span></div></header>'
    +(summary?'<section class="headlines"><h2>今日要闻</h2>'+summary+'</section>':"")
    +sections
    +'<nav class="report-nav">'+navLink(older,"上一期","prev")+navLink(newer,"下一期","next")+'</nav>';

  renderToc(data.sections||[]);
  setupSectionObserver();
  updateProgress();
}
async function loadReport(date){
  try{
    const res=await fetch("./briefs/"+date+".json",{cache:"no-store"});
    if(!res.ok)throw new Error("not found");
    state.current=date;
    const data=await res.json();
    renderHistory();renderReport(data);
    document.body.classList.remove("menu-open");
    scrollTo({top:0,behavior:"instant"});
  }catch(e){
    $("#report").innerHTML='<section class="empty"><p class="kicker">Daily Brief</p><h1>无法加载这期简报</h1><p>请稍后刷新。</p></section>'
  }
}
function updateProgress(){
  const d=document.documentElement,max=d.scrollHeight-d.clientHeight;
  $("#progressBar").style.width=(max>0?Math.min(100,d.scrollTop/max*100):0)+"%";
}
function setupSectionObserver(){
  if(!("IntersectionObserver" in window))return;
  const links=[...document.querySelectorAll("#toc a")];
  const ob=new IntersectionObserver(entries=>{
    const v=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
    if(!v)return;
    links.forEach(a=>a.classList.toggle("active",a.dataset.target===v.target.id))
  },{rootMargin:"-20% 0px -65% 0px",threshold:[0,.1,.3,.6]});
  document.querySelectorAll(".section").forEach(s=>ob.observe(s))
}
async function boot(){
  initTheme();
  const r=await fetch("./briefs/index.json",{cache:"no-store"});
  const p=await r.json();
  state.index=(p.reports||[]).slice().sort((a,b)=>b.date.localeCompare(a.date));
  if(!state.index.length){$("#report").innerHTML=$("#emptyTemplate").innerHTML;return}
  const q=new URLSearchParams(location.search).get("date");
  await loadReport(state.index.some(x=>x.date===q)?q:state.index[0].date)
}
$("#themeToggle").addEventListener("click",toggleTheme);
$("#themeToggleMobile").addEventListener("click",toggleTheme);
$("#menuToggle").addEventListener("click",()=>document.body.classList.toggle("menu-open"));
document.addEventListener("click",e=>{if(innerWidth<=820&&!e.target.closest(".sidebar")&&!e.target.closest("#menuToggle"))document.body.classList.remove("menu-open")});
window.addEventListener("scroll",updateProgress,{passive:true});
boot().catch(()=>{$("#report").innerHTML='<section class="empty"><p class="kicker">Daily Brief</p><h1>站点初始化中</h1></section>'});