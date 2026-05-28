"use client"

import { useState, useEffect } from "react"

const STORAGE_KEY = "amazin_crm_leads"
const STATUSES = ["New", "Contacted", "Proposal Sent", "Won", "Lost", "Nurture"]
const STATUS_COLORS = {
  New:             { bg: "bg-blue-500/10",   text: "text-blue-400",   border: "border-blue-500/30"  },
  Contacted:       { bg: "bg-amber-500/10",  text: "text-amber-400",  border: "border-amber-500/30" },
  "Proposal Sent": { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30"},
  Won:             { bg: "bg-green-500/10",  text: "text-green-400",  border: "border-green-500/30" },
  Lost:            { bg: "bg-red-500/10",    text: "text-red-400",    border: "border-red-500/30"   },
  Nurture:         { bg: "bg-slate-500/10",  text: "text-slate-400",  border: "border-slate-500/30" },
}
const PACKAGES = ["— Not sure yet —","Starter Snapshot — $250","Business Snapshot — $500","Remediation Support — $1,000+"]
const SOURCES = ["LinkedIn","Referral","Website Form","Direct Email","Other"]
const EMPTY_LEAD = { id:"",name:"",company:"",email:"",phone:"",package:"",source:"",status:"New",notes:"",nextActionDate:"",createdAt:"" }

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,6) }
function formatDate(iso) {
  if (!iso) return ""
  return new Date(iso+"T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})
}
function isOverdue(iso) {
  if (!iso) return false
  return new Date(iso+"T00:00:00") < new Date(new Date().toDateString())
}

function StatusBadge({ status, small=false }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS["New"]
  return <span className={`inline-flex items-center border rounded font-mono ${small?"text-[10px] px-1.5 py-0.5":"text-[11px] px-2 py-0.5"} ${c.bg} ${c.text} ${c.border}`}>{status}</span>
}

function LeadCard({ lead, onClick }) {
  const overdue = isOverdue(lead.nextActionDate)
  return (
    <div onClick={()=>onClick(lead)} className="bg-[#0d1520] border border-[#1a2d45] rounded-lg p-3 mb-2 cursor-pointer hover:border-[#1e3a5f] hover:bg-[#111d2e] transition-all">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-[#e8f0fe] truncate">{lead.name||"—"}</p>
          <p className="text-[11px] text-[#7a9abf] truncate">{lead.company||"No company"}</p>
        </div>
        <StatusBadge status={lead.status} small />
      </div>
      {lead.package&&lead.package!=="— Not sure yet —"&&<p className="text-[11px] text-[#3d5a7a] truncate mb-1">{lead.package}</p>}
      <div className="flex items-center justify-between mt-1.5">
        <p className="text-[10px] text-[#3d5a7a]">{lead.source||"—"}</p>
        {lead.nextActionDate&&<p className={`text-[10px] font-mono ${overdue?"text-red-400":"text-[#3d5a7a]"}`}>{overdue?"⚠ ":""}{formatDate(lead.nextActionDate)}</p>}
      </div>
    </div>
  )
}

function KanbanColumn({ status, leads, onLeadClick }) {
  const c = STATUS_COLORS[status]
  return (
    <div className="flex flex-col min-w-[200px] flex-1">
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className={`text-[11px] font-mono font-medium uppercase tracking-wider ${c.text}`}>{status}</span>
        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${c.bg} ${c.text} ${c.border} border`}>{leads.length}</span>
      </div>
      <div className="flex-1 min-h-[80px]">
        {leads.map(l=><LeadCard key={l.id} lead={l} onClick={onLeadClick}/>)}
        {leads.length===0&&<div className="border border-dashed border-[#1a2d45] rounded-lg p-4 text-center"><p className="text-[11px] text-[#3d5a7a]">No leads</p></div>}
      </div>
    </div>
  )
}

function LeadForm({ lead, onSave, onClose, onDelete }) {
  const [form,setForm] = useState({...lead})
  const set = (k,v) => setForm(f=>({...f,[k]:v}))
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-4 px-2" style={{background:"rgba(8,13,20,0.92)"}}>
      <div className="bg-[#0d1520] border border-[#1e3a5f] rounded-xl w-full max-w-lg shadow-2xl overflow-y-auto" style={{maxHeight:"96vh"}}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1a2d45]">
          <div>
            <p className="text-[11px] font-mono text-[#60a5fa] uppercase tracking-wider mb-0.5">{form.id?"Edit Lead":"New Lead"}</p>
            <p className="text-[15px] font-semibold text-[#e8f0fe]">{form.name||"Unnamed"}</p>
          </div>
          <div className="flex items-center gap-2">
            {form.id&&<button onClick={()=>{if(window.confirm("Delete this lead?"))onDelete(form.id)}} className="text-[11px] font-mono text-red-400 border border-red-500/30 bg-red-500/10 px-2.5 py-1 rounded hover:bg-red-500/20 transition-colors">Delete</button>}
            <button onClick={onClose} className="text-[#7a9abf] hover:text-[#e8f0fe] transition-colors text-lg leading-none px-1">×</button>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-[#7a9abf] mb-1 uppercase tracking-wider">Full Name *</label>
              <input value={form.name} onChange={e=>set("name",e.target.value)} placeholder="Jane Smith" className="w-full bg-[#111d2e] border border-[#1a2d45] rounded-lg px-3 py-2 text-[13px] text-[#e8f0fe] placeholder-[#3d5a7a] focus:outline-none focus:border-[#3b82f6] transition-colors"/>
            </div>
            <div>
              <label className="block text-[11px] font-mono text-[#7a9abf] mb-1 uppercase tracking-wider">Company *</label>
              <input value={form.company} onChange={e=>set("company",e.target.value)} placeholder="Acme Dental" className="w-full bg-[#111d2e] border border-[#1a2d45] rounded-lg px-3 py-2 text-[13px] text-[#e8f0fe] placeholder-[#3d5a7a] focus:outline-none focus:border-[#3b82f6] transition-colors"/>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-[#7a9abf] mb-1 uppercase tracking-wider">Email *</label>
              <input type="email" value={form.email} onChange={e=>set("email",e.target.value)} placeholder="jane@acmedental.com" className="w-full bg-[#111d2e] border border-[#1a2d45] rounded-lg px-3 py-2 text-[13px] text-[#e8f0fe] placeholder-[#3d5a7a] focus:outline-none focus:border-[#3b82f6] transition-colors"/>
            </div>
            <div>
              <label className="block text-[11px] font-mono text-[#7a9abf] mb-1 uppercase tracking-wider">Phone</label>
              <input type="tel" value={form.phone} onChange={e=>set("phone",e.target.value)} placeholder="(555) 000-0000" className="w-full bg-[#111d2e] border border-[#1a2d45] rounded-lg px-3 py-2 text-[13px] text-[#e8f0fe] placeholder-[#3d5a7a] focus:outline-none focus:border-[#3b82f6] transition-colors"/>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-[#7a9abf] mb-1 uppercase tracking-wider">Status</label>
              <select value={form.status} onChange={e=>set("status",e.target.value)} className="w-full bg-[#111d2e] border border-[#1a2d45] rounded-lg px-3 py-2 text-[13px] text-[#e8f0fe] focus:outline-none focus:border-[#3b82f6] transition-colors">
                {STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-mono text-[#7a9abf] mb-1 uppercase tracking-wider">Source</label>
              <select value={form.source} onChange={e=>set("source",e.target.value)} className="w-full bg-[#111d2e] border border-[#1a2d45] rounded-lg px-3 py-2 text-[13px] text-[#e8f0fe] focus:outline-none focus:border-[#3b82f6] transition-colors">
                <option value="">— Select source —</option>
                {SOURCES.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-mono text-[#7a9abf] mb-1 uppercase tracking-wider">Package Interest</label>
            <select value={form.package} onChange={e=>set("package",e.target.value)} className="w-full bg-[#111d2e] border border-[#1a2d45] rounded-lg px-3 py-2 text-[13px] text-[#e8f0fe] focus:outline-none focus:border-[#3b82f6] transition-colors">
              {PACKAGES.map(p=><option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-mono text-[#7a9abf] mb-1 uppercase tracking-wider">Next Action Date</label>
            <input type="date" value={form.nextActionDate} onChange={e=>set("nextActionDate",e.target.value)} className="w-full bg-[#111d2e] border border-[#1a2d45] rounded-lg px-3 py-2 text-[13px] text-[#e8f0fe] focus:outline-none focus:border-[#3b82f6] transition-colors"/>
          </div>
          <div>
            <label className="block text-[11px] font-mono text-[#7a9abf] mb-1 uppercase tracking-wider">Notes</label>
            <textarea value={form.notes} onChange={e=>set("notes",e.target.value)} rows={4} placeholder="How many users, specific concerns, context from discovery call..." className="w-full bg-[#111d2e] border border-[#1a2d45] rounded-lg px-3 py-2 text-[13px] text-[#e8f0fe] placeholder-[#3d5a7a] focus:outline-none focus:border-[#3b82f6] transition-colors resize-none"/>
          </div>
          {form.email&&(
            <div className="bg-[#111d2e] border border-[#1a2d45] rounded-lg p-3">
              <p className="text-[10px] font-mono text-[#3d5a7a] uppercase tracking-wider mb-2">Quick Actions</p>
              <div className="flex flex-wrap gap-2">
                {[
                  ["📅 Send Calendly",`mailto:${form.email}?subject=Amazin Cyber — Quick Security Conversation&body=Hi ${form.name?.split(" ")[0]||""},\n\nHere's a link to grab 20 minutes:\n\n[YOUR CALENDLY LINK]\n\nOshé\nAmazin Cyber`],
                  ["📄 Send Proposal",`mailto:${form.email}?subject=Your Microsoft 365 Security Snapshot Proposal&body=Hi ${form.name?.split(" ")[0]||""},\n\nPlease find your proposal attached.\n\nOshé`],
                  ["🔄 90-Day Check-in",`mailto:${form.email}?subject=Checking in — Your M365 Security Snapshot&body=Hi ${form.name?.split(" ")[0]||""},\n\nIt's been 90 days since your Security Snapshot. Wanted to check in.\n\nOshé\nAmazin Cyber`],
                ].map(([label,href])=>(
                  <a key={label} href={href} className="text-[11px] font-mono text-[#60a5fa] border border-[#1e3a5f] bg-blue-500/5 px-2.5 py-1 rounded hover:bg-blue-500/10 transition-colors">{label}</a>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="px-5 py-4 border-t border-[#1a2d45] flex justify-end gap-2">
          <button onClick={onClose} className="text-[13px] font-mono text-[#7a9abf] border border-[#1a2d45] px-4 py-1.5 rounded-lg hover:border-[#1e3a5f] hover:text-[#e8f0fe] transition-colors">Cancel</button>
          <button onClick={()=>onSave(form)} className="text-[13px] font-mono text-white bg-[#3b82f6] px-5 py-1.5 rounded-lg hover:bg-[#2563eb] transition-colors">Save Lead</button>
        </div>
      </div>
    </div>
  )
}

export default function CRM() {
  const [leads,setLeads] = useState([])
  const [loaded,setLoaded] = useState(false)
  const [view,setView] = useState("kanban")
  const [editLead,setEditLead] = useState(null)
  const [search,setSearch] = useState("")
  const [filterStatus,setFilterStatus] = useState("All")

  useEffect(()=>{
    try { const s=localStorage.getItem(STORAGE_KEY); if(s) setLeads(JSON.parse(s)) } catch{}
    setLoaded(true)
  },[])

  useEffect(()=>{
    if(loaded) try { localStorage.setItem(STORAGE_KEY,JSON.stringify(leads)) } catch{}
  },[leads,loaded])

  const handleSave = (form) => {
    if(!form.name||!form.company||!form.email){ alert("Name, company, and email are required."); return }
    if(form.id) setLeads(ls=>ls.map(l=>l.id===form.id?form:l))
    else setLeads(ls=>[...ls,{...form,id:uid(),createdAt:new Date().toISOString()}])
    setEditLead(null)
  }
  const handleDelete = (id) => { setLeads(ls=>ls.filter(l=>l.id!==id)); setEditLead(null) }

  const filtered = leads.filter(l=>{
    const q=search.toLowerCase()
    return (!q||l.name.toLowerCase().includes(q)||l.company.toLowerCase().includes(q)||l.email.toLowerCase().includes(q))&&(filterStatus==="All"||l.status===filterStatus)
  })

  const totalValue = leads.filter(l=>l.status!=="Lost").reduce((sum,l)=>{
    if(l.package?.includes("$250")) return sum+250
    if(l.package?.includes("$500")) return sum+500
    if(l.package?.includes("$1,000")) return sum+1000
    return sum
  },0)

  const wonCount = leads.filter(l=>l.status==="Won").length
  const overdueCount = leads.filter(l=>isOverdue(l.nextActionDate)&&l.status!=="Won"&&l.status!=="Lost").length

  if(!loaded) return <div className="min-h-screen bg-[#080d14] flex items-center justify-center"><p className="text-[13px] font-mono text-[#3d5a7a] animate-pulse">Loading pipeline…</p></div>

  return (
    <div className="min-h-screen bg-[#080d14] text-[#e8f0fe]" style={{backgroundImage:"linear-gradient(rgba(59,130,246,.018) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,.018) 1px,transparent 1px)",backgroundSize:"32px 32px"}}>
      <div className="border-b border-[#1a2d45] px-5 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-[#1e3a5f] flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
                <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z" fill="#3b82f6"/>
                <path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <p className="text-[11px] font-mono text-[#60a5fa] uppercase tracking-widest">Amazin Cyber</p>
              <p className="text-[15px] font-semibold leading-tight">Lead Pipeline</p>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <div className="text-center"><p className="text-[18px] font-semibold text-[#60a5fa]">{leads.length}</p><p className="text-[10px] font-mono text-[#3d5a7a] uppercase">Total</p></div>
            <div className="text-center"><p className="text-[18px] font-semibold text-green-400">{wonCount}</p><p className="text-[10px] font-mono text-[#3d5a7a] uppercase">Won</p></div>
            <div className="text-center"><p className="text-[18px] font-semibold text-[#e8f0fe]">${totalValue.toLocaleString()}</p><p className="text-[10px] font-mono text-[#3d5a7a] uppercase">Pipeline</p></div>
            {overdueCount>0&&<div className="text-center"><p className="text-[18px] font-semibold text-red-400">{overdueCount}</p><p className="text-[10px] font-mono text-[#3d5a7a] uppercase">Overdue</p></div>}
          </div>
          <button onClick={()=>setEditLead({...EMPTY_LEAD})} className="text-[13px] font-mono text-white bg-[#3b82f6] px-4 py-2 rounded-lg hover:bg-[#2563eb] transition-colors">+ Add Lead</button>
        </div>
      </div>
      <div className="border-b border-[#1a2d45] px-5 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-3 flex-wrap">
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search leads…" className="bg-[#0d1520] border border-[#1a2d45] rounded-lg px-3 py-1.5 text-[13px] text-[#e8f0fe] placeholder-[#3d5a7a] focus:outline-none focus:border-[#3b82f6] w-48 transition-colors"/>
          <div className="flex items-center gap-1">
            {["All",...STATUSES].map(s=>(
              <button key={s} onClick={()=>setFilterStatus(s)} className={`text-[11px] font-mono px-2.5 py-1 rounded transition-colors ${filterStatus===s?"bg-[#1e3a5f] text-[#60a5fa] border border-[#3b82f6]/40":"text-[#3d5a7a] hover:text-[#7a9abf] border border-transparent"}`}>{s}</button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-1 border border-[#1a2d45] rounded-lg p-0.5">
            {["kanban","list"].map(v=>(
              <button key={v} onClick={()=>setView(v)} className={`text-[11px] font-mono px-2.5 py-1 rounded transition-colors capitalize ${view===v?"bg-[#1e3a5f] text-[#60a5fa]":"text-[#3d5a7a] hover:text-[#7a9abf]"}`}>{v}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-5 py-5">
        {view==="kanban"&&(
          <div className="flex gap-4 overflow-x-auto pb-4">
            {STATUSES.map(s=><KanbanColumn key={s} status={s} leads={filtered.filter(l=>l.status===s)} onLeadClick={setEditLead}/>)}
          </div>
        )}
        {view==="list"&&(
          <div className="space-y-2">
            {filtered.length===0&&<div className="text-center py-12"><p className="text-[13px] text-[#3d5a7a]">No leads found.</p></div>}
            {filtered.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).map(l=>(
              <div key={l.id} onClick={()=>setEditLead(l)} className="bg-[#0d1520] border border-[#1a2d45] rounded-lg px-4 py-3 flex items-center gap-4 cursor-pointer hover:border-[#1e3a5f] hover:bg-[#111d2e] transition-all">
                <div className="w-8 h-8 rounded-full bg-[#1e3a5f] flex items-center justify-center flex-shrink-0">
                  <span className="text-[11px] font-semibold text-[#60a5fa]">{(l.name||"?").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-[#e8f0fe]">{l.name}</p>
                  <p className="text-[11px] text-[#7a9abf]">{l.company} · {l.email}</p>
                </div>
                <div className="hidden sm:block flex-shrink-0"><p className="text-[11px] text-[#3d5a7a]">{l.package?.replace("— ","") ||"No package"}</p></div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <StatusBadge status={l.status} small/>
                  {l.nextActionDate&&<p className={`text-[10px] font-mono hidden md:block ${isOverdue(l.nextActionDate)?"text-red-400":"text-[#3d5a7a]"}`}>{formatDate(l.nextActionDate)}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
        {leads.length===0&&(
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-xl bg-[#0d1520] border border-[#1a2d45] flex items-center justify-center mx-auto mb-4">
              <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7">
                <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z" fill="#1e3a5f" stroke="#3b82f6" strokeWidth="1.5"/>
                <path d="M9 12l2 2 4-4" stroke="#60a5fa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="text-[15px] font-semibold text-[#e8f0fe] mb-1">Your pipeline is empty</p>
            <p className="text-[13px] text-[#7a9abf] mb-5">Add your first lead to get started.</p>
            <button onClick={()=>setEditLead({...EMPTY_LEAD})} className="text-[13px] font-mono text-white bg-[#3b82f6] px-5 py-2 rounded-lg hover:bg-[#2563eb] transition-colors">+ Add Your First Lead</button>
          </div>
        )}
      </div>
      {editLead&&<LeadForm lead={editLead} onSave={handleSave} onClose={()=>setEditLead(null)} onDelete={handleDelete}/>}
    </div>
  )
}
