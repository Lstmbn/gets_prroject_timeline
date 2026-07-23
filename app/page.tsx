"use client";

import "@fontsource/libre-franklin/400.css";
import "@fontsource/libre-franklin/500.css";
import "@fontsource/libre-franklin/600.css";
import "@fontsource/libre-franklin/700.css";
import "./readability.css";
import "./gantt-fix.css";
import "./task-access.css";
import { useEffect, useMemo, useState } from "react";
import seed from "./data.json";

type Project = (typeof seed.projects)[number];
type TaskStatus = "Not Started" | "In Progress" | "Owner/Client Review" | "Subconsultant Review" | "VO" | "On Hold" | "Completed";
type Task = {
  id: string; project: string; name: string; due: string; done: boolean; completed: string;
  status: TaskStatus | string; priority: string; owner: string; owners?: string; notes: string;
};
type User = { name: string; role: "admin" | "member" };
type View = "dashboard" | "projects" | "tasks" | "timeline";

const nav: {id:View; label:string; icon:string}[] = [
  {id:"dashboard",label:"Overview",icon:"⌂"},{id:"projects",label:"Projects",icon:"□"},
  {id:"tasks",label:"Tasks",icon:"✓"},{id:"timeline",label:"Timeline",icon:"↔"},
];
const statusTone: Record<string,string>={"Done":"done","In Progress":"progress","On hold":"hold","Not started":"idle"};
const taskStatuses: TaskStatus[]=["Not Started","In Progress","Owner/Client Review","Subconsultant Review","VO","On Hold","Completed"];
const fmt=(d:string)=>d?new Intl.DateTimeFormat("en-GB",{day:"2-digit",month:"short",year:"numeric"}).format(new Date(d+"T00:00:00")):"—";
const daysBetween=(a:string,b:string)=>a&&b?Math.max(1,Math.round((+new Date(b)-+new Date(a))/86400000)+1):0;
const projectProgress=(p:Project)=>p.status==="Done"?100:p.progress;
const isoDate=(value:string)=>new Date(`${value}T00:00:00`);
const localDayKey=(value:Date)=>`${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,"0")}-${String(value.getDate()).padStart(2,"0")}`;

export default function Home(){
  const [view,setView]=useState<View>("dashboard");
  const [projects,setProjects]=useState<Project[]>(seed.projects as Project[]);
  const [tasks,setTasks]=useState<Task[]>(seed.tasks as unknown as Task[]);
  const [query,setQuery]=useState("");
  const [status,setStatus]=useState("All status");
  const [selected,setSelected]=useState(seed.projects.find(p=>p.name==="KEYLA TOAPEKONG")?.name||seed.projects[0]?.name||"");
  const [modal,setModal]=useState<"project"|"task"|"edit-task"|"access"|null>(null);
  const [editingTask,setEditingTask]=useState<Task|null>(null);
  const [user,setUser]=useState<User|null>(null);
  const [userToken,setUserToken]=useState("");
  const [notice,setNotice]=useState("");

  useEffect(()=>{(async()=>{try{const r=await fetch("/api/data",{cache:"no-store"}),d=await r.json();if(r.ok&&d.ok){if(d.projects?.length)setProjects(d.projects);if(d.tasks?.length)setTasks(d.tasks)}}catch{}})()},[]);
  const save=async(payload:unknown)=>{if(!userToken)throw new Error("Masukkan user token untuk mengubah data.");const r=await fetch("/api/data",{method:"POST",headers:{"Content-Type":"application/json","x-user-token":userToken},body:JSON.stringify(payload)}),d=await r.json();if(!r.ok||!d.ok)throw new Error(d.error||"Unable to save")};
  const flash=(message:string)=>{setNotice(message);setTimeout(()=>setNotice(""),2600)};
  const uniqueNames=useMemo(()=>Array.from(new Set(projects.map(p=>p.name))),[projects]);
  const filtered=useMemo(()=>projects.filter(p=>(status==="All status"||p.status===status)&&(`${p.name} ${p.category} ${p.owner}`.toLowerCase().includes(query.toLowerCase()))),[projects,status,query]);
  const active=projects.filter(p=>p.status==="In Progress").length;
  const complete=projects.filter(p=>p.status==="Done").length;
  const today=new Date();today.setHours(0,0,0,0);const nextWeek=new Date(today);nextWeek.setDate(today.getDate()+7);
  const overdue=tasks.filter(t=>!t.done&&t.due&&new Date(`${t.due}T00:00:00`)<today).length;
  const dueSoon=tasks.filter(t=>!t.done&&t.due&&new Date(`${t.due}T00:00:00`)>=today&&new Date(`${t.due}T00:00:00`)<=nextWeek).length;
  const title={dashboard:"Project overview",projects:"Project database",tasks:"Task control",timeline:"Project timeline"}[view];

  async function addProject(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);const p={id:`p${Date.now()}`,name:String(f.get("name")||""),category:String(f.get("category")||"GENERAL"),status:String(f.get("status")||"Not started"),priority:String(f.get("priority")||"Medium"),start:String(f.get("start")||""),deadline:String(f.get("deadline")||""),progress:0,owner:String(f.get("owner")||""),team:"",pic:"",team1:"",team2:"",backup:"",notes:""} as Project;if(p.start&&p.deadline&&p.deadline<p.start){flash("Deadline cannot be earlier than start date");return}try{await save({action:"create",type:"project",record:p});setProjects([p,...projects]);setModal(null);flash("Project saved to Google Sheets")}catch(x){flash(x instanceof Error?x.message:"Unable to save project")}}
  const splitOwners=(task:Task)=>String(task.owners||task.owner||"").split(/[,;|]/).map(x=>x.trim()).filter(Boolean);
  const canonical=(name:string)=>({"GRI":"GRISELDA","JOSH":"JOSHUA","LUS":"LUSIANA"}[name.trim().toUpperCase()]||name.trim().toUpperCase());
  const canEditTask=(task:Task)=>Boolean(user&&(user.role==="admin"||splitOwners(task).some(x=>canonical(x)===canonical(user.name))));
  const canAddTask=Boolean(user&&(user.role==="admin"||tasks.some(canEditTask)));
  async function addTask(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);const owner=String(f.get("owners")||user?.name||"");const t={id:`t${Date.now()}`,project:String(f.get("project")||""),name:String(f.get("name")||""),due:String(f.get("due")||""),done:false,completed:"",status:String(f.get("status")||"Not Started"),priority:String(f.get("priority")||"Medium"),owner,owners:owner,notes:""} as Task;try{await save({action:"create",type:"task",record:t});setTasks([t,...tasks]);setModal(null);flash("Task tersimpan ke Google Sheets")}catch(x){flash(x instanceof Error?x.message:"Unable to save task")}}
  async function updateTask(e:React.FormEvent<HTMLFormElement>){e.preventDefault();if(!editingTask)return;const f=new FormData(e.currentTarget);const completed=String(f.get("completed")||"");const updated={...editingTask,name:String(f.get("name")||""),owners:String(f.get("owners")||""),owner:String(f.get("owners")||"").split(",")[0]?.trim()||"",due:String(f.get("due")||""),completed,status:completed?"Completed":String(f.get("status")||"In Progress"),done:Boolean(completed),priority:String(f.get("priority")||"Medium")} as Task;try{await save({action:"update",type:"task",record:updated});setTasks(tasks.map(t=>t.id===updated.id?updated:t));setModal(null);setEditingTask(null);flash("Perubahan task tersimpan")}catch(x){flash(x instanceof Error?x.message:"Unable to update task")}}
  async function authenticate(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget),token=String(f.get("token")||"").trim();try{const r=await fetch("/api/auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token})}),d=await r.json();if(!r.ok)throw new Error(d.error);setUser(d.user);setUserToken(token);setModal(null);flash(`Akses aktif: ${d.user.name}`)}catch(x){flash(x instanceof Error?x.message:"Token tidak dikenali")}}
  function openEdit(task:Task){setEditingTask(task);setModal("edit-task")}

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div><b>GeTs Architects</b><small>PROJECT CONTROL</small></div></div>
      <nav>{nav.map(n=><button key={n.id} className={view===n.id?"active":""} onClick={()=>setView(n.id)}><span>{n.icon}</span>{n.label}</button>)}</nav>
      <div className="side-bottom"><div className="source"><span>DATA SOURCE</span><b>2026 Project Timeline</b><small>{projects.length} project phases · {tasks.length} tasks</small></div><button className="profile profile-button" onClick={()=>setModal("access")}><span>{user?user.name.slice(0,2).toUpperCase():"VI"}</span><div><b>{user?.name||"Viewer"}</b><small>{user?.role==="admin"?"Administrator":user?"Task owner":"View only"}</small></div><i>•••</i></button></div>
    </aside>
    <main>
      <header><h1>{title}</h1><div className="header-actions"><button className="access-btn" onClick={()=>setModal("access")}>{user?`${user.name} · ${user.role==="admin"?"Admin":"Task owner"}`:"View only · Enter token"}</button><button className="primary" disabled={view==="tasks"?!canAddTask:user?.role!=="admin"} onClick={()=>setModal(view==="tasks"?"task":"project")}>＋ {view==="tasks"?"New task":"Add project"}</button></div></header>
      {notice&&<div className="toast">✓ {notice}</div>}
      {view==="dashboard"&&<Dashboard projects={projects} tasks={tasks} active={active} complete={complete} overdue={overdue} dueSoon={dueSoon} setView={setView}/>} 
      {view==="projects"&&<Projects projects={filtered} query={query} setQuery={setQuery} status={status} setStatus={setStatus}/>} 
      {view==="tasks"&&<Tasks tasks={tasks} query={query} setQuery={setQuery} canEdit={canEditTask} openEdit={openEdit}/>} 
      {view==="timeline"&&<Timeline projects={projects} names={uniqueNames} selected={selected} setSelected={setSelected}/>} 
    </main>
    {modal&&<div className="modal-wrap" onMouseDown={()=>setModal(null)}><form className="modal" onSubmit={modal==="access"?authenticate:modal==="edit-task"?updateTask:modal==="project"?addProject:addTask} onMouseDown={e=>e.stopPropagation()}><button type="button" className="close" onClick={()=>setModal(null)}>×</button>{modal==="access"?<><p>USER ACCESS</p><h2>Enter your access token</h2><label>Private token<input name="token" type="password" autoComplete="off" required placeholder="Paste your personal token"/></label><div className="access-help">Without a valid token, the application remains view only. Each token identifies one team member.</div><button className="primary submit" type="submit">Continue</button></>:modal==="edit-task"&&editingTask?<><p>EDIT TASK</p><h2>{editingTask.name}</h2>
      <label>Task name<input name="name" defaultValue={editingTask.name} required/></label><label>Owner / PIC <small>Separate multiple names with commas</small><input name="owners" defaultValue={splitOwners(editingTask).join(", ")} required/></label><div className="form-grid"><label>Status<select name="status" value={editingTask.completed?"Completed":editingTask.status==="Completed"?"In Progress":editingTask.status} disabled={Boolean(editingTask.completed)} onChange={e=>setEditingTask({...editingTask,status:e.target.value})}>{taskStatuses.map(s=><option key={s}>{s}</option>)}</select></label><label>Priority<select name="priority" defaultValue={editingTask.priority}><option>Urgent</option><option>High</option><option>Medium</option><option>Low</option></select></label><label>Due date<input type="date" name="due" defaultValue={editingTask.due}/></label><label>Completed Date<input type="date" name="completed" value={editingTask.completed||""} onChange={e=>setEditingTask({...editingTask,completed:e.target.value,done:Boolean(e.target.value),status:e.target.value?"Completed":editingTask.status==="Completed"?"In Progress":editingTask.status})}/></label></div><div className={`completion-rule ${editingTask.completed?"checked":""}`}><span>{editingTask.completed?"✓":"○"}</span><div><b>Completed</b><small>Automatically checked when Completed Date is filled.</small></div></div><button className="primary submit" type="submit">Save changes</button>
    </>:<><p>NEW RECORD</p><h2>{modal==="project"?"Add a project phase":"Add a task"}</h2>{modal==="project"?<>
      <label>Project name<input name="name" required placeholder="e.g. MAWATU FIVE-STAR HOTEL"/></label><label>Scope / category<input name="category" required placeholder="Architecture, Interior…"/></label><div className="form-grid"><label>Status<select name="status"><option>Not started</option><option>In Progress</option><option>On hold</option><option>Done</option></select></label><label>Priority<select name="priority"><option>High</option><option>Medium</option><option>Low</option></select></label><label>Start date<input type="date" name="start"/></label><label>Deadline<input type="date" name="deadline"/></label></div><label>Project owner<input name="owner" placeholder="Team member"/></label>
    </>:<><label>Project<select name="project">{uniqueNames.map(n=><option key={n}>{n}</option>)}</select></label><label>Task name<input name="name" required placeholder="Describe the deliverable or action"/></label><label>Owner / PIC <small>Multiple names separated by commas</small><input name="owners" defaultValue={user?.name||""} required/></label><div className="form-grid"><label>Status<select name="status">{taskStatuses.filter(s=>s!=="Completed").map(s=><option key={s}>{s}</option>)}</select></label><label>Priority<select name="priority"><option>Urgent</option><option>High</option><option>Medium</option><option>Low</option></select></label><label>Due date<input type="date" name="due"/></label></div></>}<button className="primary submit" type="submit">Save record</button></>}</form></div>}
  </div>
}

function Dashboard({projects,tasks,active,complete,overdue,dueSoon,setView}:{projects:Project[],tasks:Task[],active:number,complete:number,overdue:number,dueSoon:number,setView:(v:View)=>void}){
 const today=new Date().toISOString().slice(0,10);const recent=projects.filter(p=>p.status!=="Done"&&p.deadline&&p.deadline>=today).sort((a,b)=>a.deadline.localeCompare(b.deadline)).slice(0,6);
 const owners=Object.entries(tasks.filter(t=>!t.done).reduce((a,t)=>{if(t.owner)a[t.owner]=(a[t.owner]||0)+1;return a},{} as Record<string,number>)).sort((a,b)=>b[1]-a[1]).slice(0,5);
 const total=projects.length; const pct=Math.round(complete/total*100);
 return <div className="content dashboard">
  <section className="metric-grid"><Metric label="ACTIVE PHASES" value={active} note={`${Math.round(active/total*100)}% of portfolio`} trend="↗ 3 this month"/><Metric label="COMPLETED" value={complete} note={`${pct}% completion rate`} trend="On target"/><Metric label="OVERDUE TASKS" value={overdue} note="Requires attention" trend="Across active projects" alert/><Metric label="DUE IN 7 DAYS" value={dueSoon} note="Upcoming deliverables" trend="22–29 Jul 2026"/></section>
  <section className="dash-grid"><div className="panel portfolio"><div className="panel-head"><div><h2>Project phase status</h2></div><button onClick={()=>setView("projects")}>View all →</button></div><div className="portfolio-body"><div className="donut" style={{background:`conic-gradient(#222 0 ${pct}%,#858585 ${pct}% ${pct+Math.round(active/total*100)}%,#d9d9d9 0)`}}><span><b>{total}</b><small>TOTAL PHASES</small></span></div><div className="legend">{["Done","In Progress","On hold","Not started"].map((s,i)=>{const n=projects.filter(p=>p.status===s).length;return <div key={s}><i className={`dot d${i}`}/><span>{s}<small>{n} phases</small></span><b>{Math.round(n/total*100)}%</b></div>})}</div></div></div>
  <div className="panel workload"><div className="panel-head"><div><h2>Active tasks by owner</h2></div><span>Current</span></div><div className="bars">{owners.map(([o,n])=><div key={o}><span>{o}</span><i><em style={{width:`${Math.min(n/Math.max(...owners.map(x=>x[1]))*100,100)}%`}}/></i><b>{n}</b></div>)}</div><div className="capacity-note"><span>○</span><p><b>Workload check</b><small>Review team members with more than 5 active tasks.</small></p></div></div></section>
  <section className="panel focus"><div className="panel-head"><div><p>PRIORITY FOCUS</p><h2>Upcoming project deadlines</h2></div><button onClick={()=>setView("timeline")}>Open timeline →</button></div><div className="focus-table"><div className="thead"><span>PROJECT / SCOPE</span><span>OWNER</span><span>STATUS</span><span>DEADLINE</span><span>PROGRESS</span></div>{recent.map(p=><div className="trow" key={p.id}><span><b>{p.name}</b><small>{p.category||"General"}</small></span><span>{p.owner||"—"}</span><span><i className={`pill ${statusTone[p.status]||"idle"}`}>{p.status}</i></span><span>{fmt(p.deadline)}</span><span className="progress-cell"><i><em style={{width:`${projectProgress(p)}%`}}/></i><b>{projectProgress(p)}%</b></span></div>)}</div></section>
 </div>
}
function Metric({label,value,note,trend,alert=false}:{label:string,value:number,note:string,trend:string,alert?:boolean}){return <div className={`metric ${alert?"alert":""}`}><div><p>{label}</p><span>↗</span></div><b>{value}</b><small>{note}</small><footer>{trend}</footer></div>}

function Projects({projects,query,setQuery,status,setStatus}:{projects:Project[],query:string,setQuery:(s:string)=>void,status:string,setStatus:(s:string)=>void}){return <div className="content"><Toolbar query={query} setQuery={setQuery}><select value={status} onChange={e=>setStatus(e.target.value)}><option>All status</option><option>In Progress</option><option>Not started</option><option>On hold</option><option>Done</option></select></Toolbar><div className="panel database"><div className="db-head"><span>{projects.length} PROJECT PHASES</span><button onClick={()=>window.print()}>Export / Print</button></div><div className="data-table"><div className="thead"><span>PROJECT / SCOPE</span><span>STATUS</span><span>PRIORITY</span><span>OWNER</span><span>DATES</span><span>PROGRESS</span></div>{projects.map(p=><div className="trow" key={p.id}><span><b>{p.name}</b><small>{p.category||"General"}</small></span><span><i className={`pill ${statusTone[p.status]||"idle"}`}>{p.status}</i></span><span>{p.priority}</span><span>{p.owner||"—"}</span><span><b>{fmt(p.start)}</b><small>to {fmt(p.deadline)}</small></span><span className="progress-cell"><i><em style={{width:`${projectProgress(p)}%`}}/></i><b>{projectProgress(p)}%</b></span></div>)}</div></div></div>}

function Tasks({tasks,query,setQuery,canEdit,openEdit}:{tasks:Task[],query:string,setQuery:(s:string)=>void,canEdit:(t:Task)=>boolean,openEdit:(t:Task)=>void}){
 const [filter,setFilter]=useState("All Status");
 const ownerText=(t:Task)=>t.owners||t.owner||"Unassigned";
 const normalized=(s:string)=>s==="Done"?"Completed":s==="Not started"?"Not Started":s==="On hold"?"On Hold":s;
 const shown=tasks.filter(t=>(filter==="All Status"||normalized(t.status)===filter)&&`${t.project} ${t.name} ${ownerText(t)}`.toLowerCase().includes(query.toLowerCase()));
 const cards=["All Status",...taskStatuses];
 return <div className="content task-page">
  <section className="task-summary">{cards.map(s=><button key={s} className={filter===s?"active":""} onClick={()=>setFilter(s)}><span>{s==="All Status"?"Total Tasks":s}</span><b>{s==="All Status"?tasks.length:tasks.filter(t=>normalized(t.status)===s).length}</b></button>)}</section>
  <Toolbar query={query} setQuery={setQuery}><select value={filter} onChange={e=>setFilter(e.target.value)}>{cards.map(s=><option key={s}>{s}</option>)}</select></Toolbar>
  <div className="panel database"><div className="db-head"><span>{shown.length} TASKS</span><span>{shown.filter(t=>Boolean(t.completed)).length} completed</span></div><div className="task-table-wrap"><table className="task-table"><thead><tr><th>Done</th><th>Task / Project</th><th>Owner / PIC</th><th>Status</th><th>Due Date</th><th>Completed Date</th><th>Priority</th><th></th></tr></thead><tbody>{shown.map(t=><tr className={t.done||t.completed?"completed":""} key={t.id}><td><span className="done-box">{t.completed?"✓":""}</span></td><td><b>{t.name}</b><small>{t.project}</small></td><td>{ownerText(t)}</td><td><i className={`pill task-${normalized(t.status).toLowerCase().replaceAll(" ","-").replaceAll("/","-")}`}>{normalized(t.status)}</i></td><td>{fmt(t.due)}</td><td>{fmt(t.completed)}</td><td>{t.priority}</td><td><button className="row-action" disabled={!canEdit(t)} onClick={()=>openEdit(t)}>{canEdit(t)?"Edit":"View"}</button></td></tr>)}</tbody></table></div>{shown.length===0&&<div className="empty">No tasks match this filter.</div>}</div>
 </div>
}

function Toolbar({query,setQuery,children}:{query:string,setQuery:(s:string)=>void,children?:React.ReactNode}){return <div className="toolbar"><label><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search project, scope, owner…"/></label>{children}</div>}

function Timeline({projects,names,selected,setSelected}:{projects:Project[],names:string[],selected:string,setSelected:(s:string)=>void}){
 const all=selected==="__ALL__";
 const rows=projects.filter(p=>all||p.name===selected);
 const valid=rows.filter(r=>r.start&&r.deadline);
 let min=valid.map(r=>r.start).sort()[0]||localDayKey(new Date());
 const actualMax=valid.map(r=>r.deadline).sort().at(-1)||min;
 let max=actualMax;
 if(daysBetween(min,max)>180){const capped=isoDate(min);capped.setDate(capped.getDate()+179);max=localDayKey(capped)}
 const count=daysBetween(min,max);
 const first=isoDate(min);
 const dates=Array.from({length:count},(_,i)=>{const d=new Date(first);d.setDate(first.getDate()+i);return d});
 const todayKey=localDayKey(new Date());
 const bands=(kind:"year"|"month")=>dates.reduce<{label:string;count:number;key:string}[]>((groups,d)=>{
   const label=kind==="year"?String(d.getFullYear()):d.toLocaleDateString("en",{month:"long"});
   const key=kind==="year"?label:`${d.getFullYear()}-${d.getMonth()}`;
   const last=groups.at(-1);if(last?.key===key)last.count+=1;else groups.push({label,count:1,key});return groups;
 },[]);
 return <div className="content timeline-page"><div className="timeline-controls"><div><p>SELECT PROJECT</p><select value={selected} onChange={e=>setSelected(e.target.value)}><option value="__ALL__">All Projects</option>{names.map(n=><option key={n} value={n}>{n}</option>)}</select></div><div className="timeline-meta"><span><small>START</small>{fmt(min)}</span><span><small>END</small>{fmt(actualMax)}</span>{all&&<span><small>PROJECTS</small>{new Set(rows.map(r=>r.name)).size}</span>}<span><small>PHASES</small>{rows.length}</span></div></div><div className="panel gantt"><div className="gantt-scroll"><div className="gantt-grid" style={{gridTemplateColumns:`270px repeat(${count},34px)`}}><div className="gantt-label head timeline-corner">PROJECT / SCOPE / RESPONSIBLE</div><div className="date-band year-band">{bands("year").map(b=><div key={b.key} style={{gridColumn:`span ${b.count}`}}>{b.label}</div>)}</div><div className="date-band month-band">{bands("month").map(b=><div key={b.key} style={{gridColumn:`span ${b.count}`}}>{b.label}</div>)}</div><div className="date-band day-band">{dates.map(d=>{const today=localDayKey(d)===todayKey;return <div className={`day head ${[0,6].includes(d.getDay())?"weekend":""} ${today?"today":""}`} key={localDayKey(d)}><b>{d.toLocaleDateString("en",{weekday:"short"})}</b><span>{d.getDate()}</span></div>})}</div>{rows.map(p=><GanttRow key={p.id} p={p} dates={dates} showProject={all} todayKey={todayKey}/>)}</div></div></div><p className="timeline-foot">Daily view · Today is highlighted · Scroll horizontally to review the complete schedule. Views longer than 180 days are capped for readability.</p></div>
}
function GanttRow({p,dates,showProject,todayKey}:{p:Project,dates:Date[],showProject:boolean,todayKey:string}){const start=p.start?+isoDate(p.start):0,end=p.deadline?+isoDate(p.deadline):0;return <><div className="gantt-label">{showProject&&<strong>{p.name}</strong>}<b>{p.category||"General"}</b><small>{p.owner||"Unassigned"} · {projectProgress(p)}%</small></div>{dates.map(d=>{const x=+d;const inside=Boolean(start&&end&&x>=start&&x<=end);const today=localDayKey(d)===todayKey;return <div className={`day cell ${[0,6].includes(d.getDay())?"weekend":""} ${today?"today":""}`} key={localDayKey(d)}>{inside?<i className={`${x===start?"first":""} ${x===end?"last":""}`}><em style={{width:x<=start+(end-start)*(projectProgress(p)/100)?"100%":"0%"}}/></i>:null}</div>})}</>}
