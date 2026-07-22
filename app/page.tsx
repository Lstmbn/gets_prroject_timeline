"use client";

import "@fontsource/libre-franklin/400.css";
import "@fontsource/libre-franklin/500.css";
import "@fontsource/libre-franklin/600.css";
import "@fontsource/libre-franklin/700.css";
import "./readability.css";
import "./gantt-fix.css";
import { useEffect, useMemo, useState } from "react";
import seed from "./data.json";

type Project = (typeof seed.projects)[number];
type Task = (typeof seed.tasks)[number];
type View = "dashboard" | "projects" | "tasks" | "timeline";

const nav: {id:View; label:string; icon:string}[] = [
  {id:"dashboard",label:"Overview",icon:"⌂"},{id:"projects",label:"Projects",icon:"□"},
  {id:"tasks",label:"Tasks",icon:"✓"},{id:"timeline",label:"Timeline",icon:"↔"},
];
const statusTone: Record<string,string>={"Done":"done","In Progress":"progress","On hold":"hold","Not started":"idle"};
const fmt=(d:string)=>d?new Intl.DateTimeFormat("en-GB",{day:"2-digit",month:"short",year:"numeric"}).format(new Date(d+"T00:00:00")):"—";
const daysBetween=(a:string,b:string)=>a&&b?Math.max(1,Math.round((+new Date(b)-+new Date(a))/86400000)+1):0;

export default function Home(){
  const [view,setView]=useState<View>("dashboard");
  const [projects,setProjects]=useState<Project[]>(seed.projects as Project[]);
  const [tasks,setTasks]=useState<Task[]>(seed.tasks as Task[]);
  const [query,setQuery]=useState("");
  const [status,setStatus]=useState("All status");
  const [selected,setSelected]=useState(seed.projects.find(p=>p.name==="KEYLA TOAPEKONG")?.name||seed.projects[0]?.name||"");
  const [modal,setModal]=useState<"project"|"task"|null>(null);
  const [notice,setNotice]=useState("");
  const [syncing,setSyncing]=useState(true);

  useEffect(()=>{(async()=>{try{const r=await fetch("/api/sheets",{cache:"no-store"});if(!r.ok)throw new Error();const d=await r.json();if(Array.isArray(d.projects)&&d.projects.length)setProjects(d.projects);if(Array.isArray(d.tasks)&&d.tasks.length)setTasks(d.tasks)}catch{setNotice("Google Sheets belum tersambung — menampilkan data awal")}finally{setSyncing(false);setTimeout(()=>setNotice(""),3500)}})()},[]);
  const persist=async(action:string,record:Project|Task)=>{try{const r=await fetch("/api/sheets",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,record})});if(!r.ok)throw new Error(await r.text());setNotice("Tersimpan ke Google Sheets")}catch{setNotice("Gagal tersimpan. Periksa konfigurasi koneksi.")}setTimeout(()=>setNotice(""),3000)};
  const uniqueNames=useMemo(()=>Array.from(new Set(projects.map(p=>p.name))),[projects]);
  const filtered=useMemo(()=>projects.filter(p=>(status==="All status"||p.status===status)&&(`${p.name} ${p.category} ${p.owner}`.toLowerCase().includes(query.toLowerCase()))),[projects,status,query]);
  const active=projects.filter(p=>p.status==="In Progress").length;
  const complete=projects.filter(p=>p.status==="Done").length;
  const overdue=tasks.filter(t=>!t.done&&t.due&&new Date(t.due)<new Date("2026-07-22")).length;
  const dueSoon=tasks.filter(t=>!t.done&&t.due&&new Date(t.due)>=new Date("2026-07-22")&&new Date(t.due)<=new Date("2026-07-29")).length;
  const title={dashboard:"Project overview",projects:"Project database",tasks:"Task control",timeline:"Project timeline"}[view];

  function addProject(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);const p={id:`p${Date.now()}`,name:String(f.get("name")||""),category:String(f.get("category")||"GENERAL"),status:String(f.get("status")||"Not started"),priority:String(f.get("priority")||"Medium"),start:String(f.get("start")||""),deadline:String(f.get("deadline")||""),progress:0,owner:String(f.get("owner")||""),team:"",pic:"",team1:"",team2:"",backup:"",notes:""} as Project;setProjects([p,...projects]);void persist("upsertProject",p);setModal(null)}
  function addTask(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);const t={id:`t${Date.now()}`,project:String(f.get("project")||""),name:String(f.get("name")||""),due:String(f.get("due")||""),done:false,completed:"",status:"Not started",priority:String(f.get("priority")||"Medium"),owner:String(f.get("owner")||""),notes:""} as Task;setTasks([t,...tasks]);void persist("upsertTask",t);setModal(null)}
  function toggleTask(id:string){let changed:Task|undefined;const n=tasks.map(t=>{if(t.id!==id)return t;changed={...t,done:!t.done,status:!t.done?"Done":"In Progress"} as Task;return changed}) as Task[];setTasks(n);if(changed)void persist("upsertTask",changed)}

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div><b>GeTs Architects</b><small>PROJECT CONTROL</small></div></div>
      <nav>{nav.map(n=><button key={n.id} className={view===n.id?"active":""} onClick={()=>setView(n.id)}><span>{n.icon}</span>{n.label}</button>)}</nav>
      <div className="side-bottom"><div className="source"><span>DATA SOURCE</span><b>2026 Project Timeline</b><small>55 project phases · 108 tasks</small></div><div className="profile"><span>LT</span><div><b>Lusi Tambunan</b><small>Director</small></div><i>•••</i></div></div>
    </aside>
    <main>
      <header><h1>{title}</h1><div className="header-actions"><button className="icon-btn" aria-label="Notifications">○</button><button className="primary" onClick={()=>setModal(view==="tasks"?"task":"project")}>＋ {view==="tasks"?"New task":"Add project"}</button></div></header>
      {(notice||syncing)&&<div className="toast">{syncing?"Menyinkronkan Google Sheets…":notice}</div>}
      {view==="dashboard"&&<Dashboard projects={projects} tasks={tasks} active={active} complete={complete} overdue={overdue} dueSoon={dueSoon} setView={setView}/>} 
      {view==="projects"&&<Projects projects={filtered} query={query} setQuery={setQuery} status={status} setStatus={setStatus}/>} 
      {view==="tasks"&&<Tasks tasks={tasks} query={query} setQuery={setQuery} toggle={toggleTask}/>} 
      {view==="timeline"&&<Timeline projects={projects} names={uniqueNames} selected={selected} setSelected={setSelected}/>} 
    </main>
    {modal&&<div className="modal-wrap" onMouseDown={()=>setModal(null)}><form className="modal" onSubmit={modal==="project"?addProject:addTask} onMouseDown={e=>e.stopPropagation()}><button type="button" className="close" onClick={()=>setModal(null)}>×</button><p>NEW RECORD</p><h2>{modal==="project"?"Add a project phase":"Add a task"}</h2>{modal==="project"?<>
      <label>Project name<input name="name" required placeholder="e.g. MAWATU FIVE-STAR HOTEL"/></label><label>Scope / category<input name="category" required placeholder="Architecture, Interior…"/></label><div className="form-grid"><label>Status<select name="status"><option>Not started</option><option>In Progress</option><option>On hold</option><option>Done</option></select></label><label>Priority<select name="priority"><option>High</option><option>Medium</option><option>Low</option></select></label><label>Start date<input type="date" name="start"/></label><label>Deadline<input type="date" name="deadline"/></label></div><label>Project owner<input name="owner" placeholder="Team member"/></label>
    </>:<><label>Project<select name="project">{uniqueNames.map(n=><option key={n}>{n}</option>)}</select></label><label>Task name<input name="name" required placeholder="Describe the deliverable or action"/></label><div className="form-grid"><label>Due date<input type="date" name="due"/></label><label>Priority<select name="priority"><option>Urgent</option><option>High</option><option>Medium</option><option>Low</option></select></label></div><label>Owner<input name="owner" placeholder="Team member"/></label></>}<button className="primary submit" type="submit">Save record</button></form></div>}
  </div>
}

function Dashboard({projects,tasks,active,complete,overdue,dueSoon,setView}:{projects:Project[],tasks:Task[],active:number,complete:number,overdue:number,dueSoon:number,setView:(v:View)=>void}){
 const recent=projects.filter(p=>p.status!=="Done").sort((a,b)=>(a.deadline||"9").localeCompare(b.deadline||"9")).slice(0,6);
 const owners=Object.entries(tasks.filter(t=>!t.done).reduce((a,t)=>{if(t.owner)a[t.owner]=(a[t.owner]||0)+1;return a},{} as Record<string,number>)).sort((a,b)=>b[1]-a[1]).slice(0,5);
 const total=projects.length; const pct=Math.round(complete/total*100);
 return <div className="content dashboard">
  <section className="metric-grid"><Metric label="ACTIVE PHASES" value={active} note={`${Math.round(active/total*100)}% of portfolio`} trend="↗ 3 this month"/><Metric label="COMPLETED" value={complete} note={`${pct}% completion rate`} trend="On target"/><Metric label="OVERDUE TASKS" value={overdue} note="Requires attention" trend="Across active projects" alert/><Metric label="DUE IN 7 DAYS" value={dueSoon} note="Upcoming deliverables" trend="22–29 Jul 2026"/></section>
  <section className="dash-grid"><div className="panel portfolio"><div className="panel-head"><div><h2>Project phase status</h2></div><button onClick={()=>setView("projects")}>View all →</button></div><div className="portfolio-body"><div className="donut" style={{background:`conic-gradient(#222 0 ${pct}%,#858585 ${pct}% ${pct+Math.round(active/total*100)}%,#d9d9d9 0)`}}><span><b>{total}</b><small>TOTAL PHASES</small></span></div><div className="legend">{["Done","In Progress","On hold","Not started"].map((s,i)=>{const n=projects.filter(p=>p.status===s).length;return <div key={s}><i className={`dot d${i}`}/><span>{s}<small>{n} phases</small></span><b>{Math.round(n/total*100)}%</b></div>})}</div></div></div>
  <div className="panel workload"><div className="panel-head"><div><h2>Active tasks by owner</h2></div><span>Current</span></div><div className="bars">{owners.map(([o,n])=><div key={o}><span>{o}</span><i><em style={{width:`${Math.min(n/Math.max(...owners.map(x=>x[1]))*100,100)}%`}}/></i><b>{n}</b></div>)}</div><div className="capacity-note"><span>○</span><p><b>Workload check</b><small>Review team members with more than 5 active tasks.</small></p></div></div></section>
  <section className="panel focus"><div className="panel-head"><div><p>PRIORITY FOCUS</p><h2>Upcoming project deadlines</h2></div><button onClick={()=>setView("timeline")}>Open timeline →</button></div><div className="focus-table"><div className="thead"><span>PROJECT / SCOPE</span><span>OWNER</span><span>STATUS</span><span>DEADLINE</span><span>PROGRESS</span></div>{recent.map(p=><div className="trow" key={p.id}><span><b>{p.name}</b><small>{p.category||"General"}</small></span><span>{p.owner||"—"}</span><span><i className={`pill ${statusTone[p.status]||"idle"}`}>{p.status}</i></span><span>{fmt(p.deadline)}</span><span className="progress-cell"><i><em style={{width:`${p.progress}%`}}/></i><b>{p.progress}%</b></span></div>)}</div></section>
 </div>
}
function Metric({label,value,note,trend,alert=false}:{label:string,value:number,note:string,trend:string,alert?:boolean}){return <div className={`metric ${alert?"alert":""}`}><div><p>{label}</p><span>↗</span></div><b>{value}</b><small>{note}</small><footer>{trend}</footer></div>}

function Projects({projects,query,setQuery,status,setStatus}:{projects:Project[],query:string,setQuery:(s:string)=>void,status:string,setStatus:(s:string)=>void}){return <div className="content"><Toolbar query={query} setQuery={setQuery}><select value={status} onChange={e=>setStatus(e.target.value)}><option>All status</option><option>In Progress</option><option>Not started</option><option>On hold</option><option>Done</option></select></Toolbar><div className="panel database"><div className="db-head"><span>{projects.length} PROJECT PHASES</span><button onClick={()=>window.print()}>Export / Print</button></div><div className="data-table"><div className="thead"><span>PROJECT / SCOPE</span><span>STATUS</span><span>PRIORITY</span><span>OWNER</span><span>DATES</span><span>PROGRESS</span></div>{projects.map(p=><div className="trow" key={p.id}><span><b>{p.name}</b><small>{p.category||"General"}</small></span><span><i className={`pill ${statusTone[p.status]||"idle"}`}>{p.status}</i></span><span>{p.priority}</span><span>{p.owner||"—"}</span><span><b>{fmt(p.start)}</b><small>to {fmt(p.deadline)}</small></span><span className="progress-cell"><i><em style={{width:`${p.progress}%`}}/></i><b>{p.progress}%</b></span></div>)}</div></div></div>}

function Tasks({tasks,query,setQuery,toggle}:{tasks:Task[],query:string,setQuery:(s:string)=>void,toggle:(id:string)=>void}){const shown=tasks.filter(t=>`${t.project} ${t.name} ${t.owner}`.toLowerCase().includes(query.toLowerCase()));return <div className="content"><Toolbar query={query} setQuery={setQuery}/><div className="panel database"><div className="db-head"><span>{shown.length} TASKS</span><span>{shown.filter(t=>t.done).length} completed</span></div><div className="task-list"><div className="task task-head"><span></span><span>OWNER</span><span>TASK / PROJECT</span><span>PRIORITY</span><span>DUE DATE</span><span>STATUS</span></div>{shown.map(t=><div className={`task ${t.done?"completed":""}`} key={t.id}><button onClick={()=>toggle(t.id)} aria-label="Toggle task completion">{t.done?"✓":""}</button><span className="task-owner">{t.owner||"Unassigned"}</span><span><b>{t.name}</b><small>{t.project}</small></span><em>{t.priority}</em><span>{fmt(t.due)}</span><i className={`pill ${statusTone[t.status]||"idle"}`}>{t.status}</i></div>)}</div></div></div>}

function Toolbar({query,setQuery,children}:{query:string,setQuery:(s:string)=>void,children?:React.ReactNode}){return <div className="toolbar"><label><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search project, scope, owner…"/></label>{children}</div>}

function Timeline({projects,names,selected,setSelected}:{projects:Project[],names:string[],selected:string,setSelected:(s:string)=>void}){const rows=projects.filter(p=>p.name===selected);const valid=rows.filter(r=>r.start&&r.deadline);let min=valid.map(r=>r.start).sort()[0]||"2026-07-01",max=valid.map(r=>r.deadline).sort().at(-1)||"2026-09-30";if(daysBetween(min,max)>180)max=new Date(+new Date(min)+179*86400000).toISOString().slice(0,10);const count=daysBetween(min,max);const dates=Array.from({length:count},(_,i)=>new Date(+new Date(min)+i*86400000));return <div className="content timeline-page"><div className="timeline-controls"><div><p>SELECT PROJECT</p><select value={selected} onChange={e=>setSelected(e.target.value)}>{names.map(n=><option key={n}>{n}</option>)}</select></div><div className="timeline-meta"><span><small>START</small>{fmt(min)}</span><span><small>END</small>{fmt(valid.map(r=>r.deadline).sort().at(-1)||max)}</span><span><small>PHASES</small>{rows.length}</span></div></div><div className="panel gantt"><div className="gantt-scroll"><div className="gantt-grid" style={{gridTemplateColumns:`270px repeat(${count},34px)`}}><div className="gantt-label head">SCOPE / RESPONSIBLE</div>{dates.map((d,i)=><div className={`day head ${[0,6].includes(d.getDay())?"weekend":""}`} key={i}><b>{d.toLocaleDateString("en",{weekday:"short"}).slice(0,1)}</b><span>{d.getDate()}</span></div>)}{rows.map(p=><GanttRow key={p.id} p={p} dates={dates}/>)}</div></div></div><p className="timeline-foot">Daily view · Scroll horizontally to review the complete schedule. Very long phases are capped at 180 days for readability.</p></div>}
function GanttRow({p,dates}:{p:Project,dates:Date[]}){const start=p.start?+new Date(p.start):0,end=p.deadline?+new Date(p.deadline):0;return <><div className="gantt-label"><b>{p.category||"General"}</b><small>{p.owner||"Unassigned"} · {p.progress}%</small></div>{dates.map((d,i)=>{const x=+d;const inside=Boolean(start&&end&&x>=start&&x<=end);return <div className={`day cell ${[0,6].includes(d.getDay())?"weekend":""}`} key={i}>{inside?<i className={`${x===start?"first":""} ${x===end?"last":""}`}><em style={{width:x<=start+(end-start)*(p.progress/100)?"100%":"0%"}}/></i>:null}</div>})}</>}
