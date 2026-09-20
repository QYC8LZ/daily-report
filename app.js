const state={index:[],current:null};
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));

function setTheme(theme){document.documentElement.dataset.theme=theme;localStorage.setItem("brief-theme",theme)}
function initTheme(){const saved=localStorage.getItem("brief-theme");setTheme(saved||(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"))}
function toggleTheme(){setTheme(document.documentElement.dataset.theme==="dark"?"light":"dark")}
function fmtDate(d){return new Intl.DateTimeFormat("zh-CN",{year:"numeric",month:"long",day:"numeric",weekday:"short"}).format(new Date(d+"T00:00:00"))}

function sourceLinks(sources=[]){
  if(!sources.length)return "";
  return '<details class="sources-details"><summary>来源与扩展阅读 · '+sources.length+'</summary><div class="sources">'
    +sources.map(s=>'<a href="'+esc(s.url)+'" target="_blank" rel="noopener noreferrer">'+esc(s.label||"来源")+'</a>').join("")
    +'</div></details>';
}
function deepBlock(details){
  if(!details)return "";
  const parts=Array.isArray(details)?details:[details];
  if(!parts.length)return "";
  return '<details class="deep-details"><summary>展开深读</summary><div class="deep-content">'
    +parts.map(p=>'<p>'+esc(p)+'</p>').join("")+'</div></details>';
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
function allItems(data){
  const out=[];
  (data.sections||[]).forEach((s,si)=>(s.items||[]).forEach((item,ii)=>out.push({s,si,item,ii,id:(s.id||"section-"+si)+"-item-"+ii})));
  return out
}
function renderMustRead(data){
  const items=allItems(data);
  let picks=items.filter(x=>x.item.featured).slice(0,3);
  if(picks.length<3)picks=[...picks,...items.filter(x=>!picks.includes(x)).slice(0,3-picks.length)];
  if(!picks.length)return "";
  return '<section class="mustread"><div class="mustread-head"><h2>只有 3 分钟，就读这三条</h2><span class="hint">跳到正文</span></div>'
    +picks.map(x=>'<a href="#'+esc(x.id)+'"><span class="tag">'+esc(x.s.title)+'</span><span class="mtitle">'+esc(x.item.title)+'</span><span class="arrow">→</span></a>').join("")
    +'</section>';
}
function renderReport(data){
  document.title=(data.title||"每日简报")+" · Daily Brief";
  const summary=(data.summary||[]).map((x,i)=>'<div class="summary-row"><span class="num">'+String(i+1).padStart(2,"0")+'</span><span>'+esc(x)+'</span></div>').join("");
  let running=0;
  const sections=(data.sections||[]).map((s,si)=>{
    const items=(s.items||[]).map((item,ii)=>{
      running++;
      const id=(s.id||"section-"+si)+"-item-"+ii;
      const watch=item.watch||"";
      return '<article class="item '+(item.featured?"featured":"")+'" id="'+esc(id)+'">'
        +'<div class="item-index">'+String(running).padStart(2,"0")+'</div>'
        +'<h3>'+esc(item.title)+'</h3>'
        +'<p class="fact"><span class="label">发生了什么</span>'+esc(item.body||item.fact||"")+'</p>'
        +(item.commentary?'<div class="analysis-grid"><div class="analysis"><span class="label">为什么重要</span>'+esc(item.commentary)+'</div></div>':"")
        +(watch?'<p class="watch"><strong>接下来看：</strong>'+esc(watch)+'</p>':"")
        +deepBlock(item.details||item.deepDive)
        +sourceLinks(item.sources)
        +'</article>'
    }).join("");
    return '<section class="section" id="'+esc(s.id||"section-"+si)+'"><div class="section-head"><div class="section-title-wrap"><span class="section-index">0'+(si+1)+'</span><h2>'+esc(s.title)+'</h2></div><span class="count">'+(s.items||[]).length+' 条</span></div>'+items+'</section>'
  }).join("");

  const pos=state.index.findIndex(x=>x.date===state.current);
  const newer=pos>0?state.index[pos-1]:null;
  const older=pos>=0&&pos<state.index.length-1?state.index[pos+1]:null;
  const total=allItems(data).length;

  $("#report").innerHTML=
    '<header class="hero"><p class="eyebrow">Daily Brief · '+esc(data.edition||"Morning")+'</p><h1>'+esc(data.title||"每日简报")+'</h1>'
    +'<p class="hero-deck">'+esc(data.deck||"先看结论，再决定哪些内容值得深入。事实、判断和后续变量分开呈现。")+'</p>'
    +'<div class="hero-meta"><span class="meta-pill">'+fmtDate(data.date)+'</span><span class="meta-pill">约 '+esc(data.readTime||"10")+' 分钟</span><span class="meta-pill">'+total+' 条正文</span></div><div class="hero-rule"></div></header>'
    +(summary?'<section class="summary"><div class="summary-title"><h2>30 秒摘要</h2><span class="hint">只看这里也能知道昨天发生了什么</span></div><div class="summary-list">'+summary+'</div></section>':"")
    +renderMustRead(data)+sections
    +'<nav class="report-nav">'+navLink(older,"上一期","prev")+navLink(newer,"下一期","next")+'</nav>';

  renderToc(data.sections||[]);
  setupSectionObserver();
  updateProgress();
}
async function loadReport(date){
  try{
    const res=await fetch("./briefs/"+date+".json",{cache:"no-store"});if(!res.ok)throw new Error("not found");
    state.current=date;const data=await res.json();renderHistory();renderReport(data);document.body.classList.remove("menu-open");scrollTo({top:0,behavior:"instant"})
  }catch(e){$("#report").innerHTML='<section class="empty"><p class="eyebrow">Daily Brief</p><h1>无法加载这期简报</h1><p>请稍后刷新，或从左侧选择其他日期。</p></section>'}
}
function updateProgress(){const d=document.documentElement,max=d.scrollHeight-d.clientHeight;$("#progressBar").style.width=(max>0?Math.min(100,d.scrollTop/max*100):0)+"%"}
function setupSectionObserver(){
  if(!("IntersectionObserver" in window))return;
  const links=[...document.querySelectorAll("#toc a")];
  const ob=new IntersectionObserver(entries=>{const v=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];if(!v)return;links.forEach(a=>a.classList.toggle("active",a.dataset.target===v.target.id))},{rootMargin:"-20% 0px -65% 0px",threshold:[0,.1,.3,.6]});
  document.querySelectorAll(".section").forEach(s=>ob.observe(s))
}
async function boot(){
  initTheme();const r=await fetch("./briefs/index.json",{cache:"no-store"});const p=await r.json();
  state.index=(p.reports||[]).slice().sort((a,b)=>b.date.localeCompare(a.date));
  if(!state.index.length){$("#report").innerHTML=$("#emptyTemplate").innerHTML;return}
  const q=new URLSearchParams(location.search).get("date");await loadReport(state.index.some(x=>x.date===q)?q:state.index[0].date)
}
$("#themeToggle").addEventListener("click",toggleTheme);
$("#themeToggleMobile").addEventListener("click",toggleTheme);
$("#menuToggle").addEventListener("click",()=>document.body.classList.toggle("menu-open"));
document.addEventListener("click",e=>{if(innerWidth<=820&&!e.target.closest(".sidebar")&&!e.target.closest("#menuToggle"))document.body.classList.remove("menu-open")});
window.addEventListener("scroll",updateProgress,{passive:true});
boot().catch(()=>{$("#report").innerHTML='<section class="empty"><p class="eyebrow">Daily Brief</p><h1>站点初始化中</h1><p>稍后刷新即可。</p></section>'});