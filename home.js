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
function esc(s=""){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function fmtDate(d,withWeek=true){
  const x=new Date(d+"T00:00:00");
  return new Intl.DateTimeFormat("zh-CN",{
    year:"numeric",month:"long",day:"numeric",...(withWeek?{weekday:"short"}:{})
  }).format(x);
}
async function boot(){
  initTheme();
  const idxRes=await fetch("./briefs/index.json",{cache:"no-store"});
  const idx=await idxRes.json();
  const reports=(idx.reports||[]).slice().sort((a,b)=>b.date.localeCompare(a.date));
  if(!reports.length){
    $("#latest").innerHTML='<div class="loading">首期简报尚未发布。</div>';
    return;
  }

  const latest=reports[0];
  const repRes=await fetch("./briefs/"+latest.date+".json",{cache:"no-store"});
  const report=await repRes.json();
  const count=(report.sections||[]).reduce((n,s)=>n+(s.items||[]).length,0);
  const link="./reader.html?date="+encodeURIComponent(latest.date);
  $("#latestButton").href=link;

  const cards=(report.summary||[]).slice(0,4).map((x,i)=>
    '<div class="summary"><b>0'+(i+1)+'</b>'+esc(x)+'</div>'
  ).join("");

  $("#latest").innerHTML=
    '<div class="latest-head"><div><div class="latest-label">最新一期</div><h2 class="latest-date">'+fmtDate(report.date)+'</h2></div>'
    +'<div class="stats"><span class="stat">约 '+esc(report.readTime||"10")+' 分钟</span><span class="stat">'+count+' 条正文</span></div></div>'
    +'<div class="summary-grid">'+cards+'</div>'
    +'<div class="latest-foot"><a class="text-link" href="'+link+'">打开完整简报 →</a></div>';

  $("#archiveCount").textContent=reports.length+" 期";
  $("#archiveList").innerHTML=reports.slice(0,12).map((r,i)=>
    '<a class="archive-item" href="./reader.html?date='+encodeURIComponent(r.date)+'">'
      +'<span class="archive-date">'+fmtDate(r.date,false)+'</span>'
      +'<span class="archive-title">'+(i===0?"最新一期":"每日简报")+'</span>'
      +'<small>'+esc(r.label||"")+' →</small>'
    +'</a>'
  ).join("");
}
$("#themeToggle").addEventListener("click",toggleTheme);
boot().catch(()=>{
  $("#latest").innerHTML='<div class="loading">暂时无法加载最新一期，请稍后刷新。</div>';
});