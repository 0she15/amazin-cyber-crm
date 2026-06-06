import { useState, useEffect, useRef } from "react";

// ── Constants ──────────────────────────────────────────────────────────────
const STORAGE_KEY = "amazin_crm_leads";

const STATUSES = ["New", "Contacted", "Proposal Sent", "Won", "Lost", "Nurture"];

const STATUS_COLORS = {
  New:             { bg: "bg-blue-500/10",   text: "text-blue-400",   border: "border-blue-500/30"  },
  Contacted:       { bg: "bg-amber-500/10",  text: "text-amber-400",  border: "border-amber-500/30" },
  "Proposal Sent": { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30"},
  Won:             { bg: "bg-green-500/10",  text: "text-green-400",  border: "border-green-500/30" },
  Lost:            { bg: "bg-red-500/10",    text: "text-red-400",    border: "border-red-500/30"   },
  Nurture:         { bg: "bg-slate-500/10",  text: "text-slate-400",  border: "border-slate-500/30" },
};

const PACKAGES = [
  "— Not sure yet —",
  "Starter Snapshot — $250",
  "Business Snapshot — $500",
  "Remediation Support — $1,000+",
];

const SOURCES = ["LinkedIn", "Referral", "Website Form", "Direct Email", "Other"];

const EMPTY_LEAD = {
  id: "",
  name: "",
  company: "",
  email: "",
  phone: "",
  package: "",
  source: "",
  status: "New",
  notes: "",
  nextActionDate: "",
  createdAt: "",
};

// ── Helpers ────────────────────────────────────────────────────────────────
function uid() {
  // UUID so CRM-created leads match the Supabase leads.id (uuid) column
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function isOverdue(iso) {
  if (!iso) return false;
  return new Date(iso + "T00:00:00") < new Date(new Date().toDateString());
}

// ── Data layer (Supabase via /api/leads) ───────────────────────────────────
async function loadLeads() {
  try {
    const res = await fetch("/api/leads", { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.leads) ? data.leads : [];
  } catch {
    return [];
  }
}

async function createLead(lead) {
  const res = await fetch("/api/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(lead),
  });
  if (!res.ok) throw new Error("create failed");
  return (await res.json()).lead;
}

async function updateLead(lead) {
  const res = await fetch("/api/leads", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(lead),
  });
  if (!res.ok) throw new Error("update failed");
  return (await res.json()).lead;
}

async function deleteLead(id) {
  const res = await fetch(`/api/leads?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!res.ok) throw new Error("delete failed");
}

async function logout() {
  await fetch("/api/auth/logout", { method: "POST" });
  window.location.href = "/login";
}

// ── Sub-components ─────────────────────────────────────────────────────────
function StatusBadge({ status, small = false }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS["New"];
  return (
    <span className={`inline-flex items-center border rounded font-mono ${small ? "text-[10px] px-1.5 py-0.5" : "text-[11px] px-2 py-0.5"} ${c.bg} ${c.text} ${c.border}`}>
      {status}
    </span>
  );
}

function LeadCard({ lead, onClick, onStatusChange, highlight }) {
  const overdue = isOverdue(lead.nextActionDate);
  const ref = useRef(null);
  useEffect(() => {
    if (highlight && ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlight]);
  return (
    <div
      ref={ref}
      onClick={() => onClick(lead)}
      className={`rounded-lg p-3 mb-2 cursor-pointer transition-all group ${
        highlight
          ? "bg-[#111d2e] border-2 border-[#3b82f6] shadow-[0_0_22px_rgba(59,130,246,0.45)]"
          : "bg-[#0d1520] border border-[#1a2d45] hover:border-[#1e3a5f] hover:bg-[#111d2e]"
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-[#e8f0fe] truncate">{lead.name || "—"}</p>
          <p className="text-[11px] text-[#7a9abf] truncate">{lead.company || "No company"}</p>
        </div>
        <StatusBadge status={lead.status} small />
      </div>
      {lead.package && lead.package !== "— Not sure yet —" && (
        <p className="text-[11px] text-[#3d5a7a] truncate mb-1">{lead.package}</p>
      )}
      <div className="flex items-center justify-between mt-1.5">
        <p className="text-[10px] text-[#3d5a7a]">{lead.source || "—"}</p>
        {lead.nextActionDate && (
          <p className={`text-[10px] font-mono ${overdue ? "text-red-400" : "text-[#3d5a7a]"}`}>
            {overdue ? "⚠ " : ""}{formatDate(lead.nextActionDate)}
          </p>
        )}
      </div>
    </div>
  );
}

function KanbanColumn({ status, leads, onLeadClick, onStatusChange, highlightId }) {
  const c = STATUS_COLORS[status];
  return (
    <div className="flex flex-col min-w-[200px] flex-1">
      <div className={`flex items-center gap-2 mb-3 px-1`}>
        <span className={`text-[11px] font-mono font-medium uppercase tracking-wider ${c.text}`}>{status}</span>
        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${c.bg} ${c.text} ${c.border} border`}>{leads.length}</span>
      </div>
      <div className="flex-1 min-h-[80px]">
        {leads.map(l => (
          <LeadCard key={l.id} lead={l} onClick={onLeadClick} onStatusChange={onStatusChange} highlight={highlightId === l.id} />
        ))}
        {leads.length === 0 && (
          <div className="border border-dashed border-[#1a2d45] rounded-lg p-4 text-center">
            <p className="text-[11px] text-[#3d5a7a]">No leads</p>
          </div>
        )}
      </div>
    </div>
  );
}

function LeadForm({ lead, onSave, onClose, onDelete }) {
  const [form, setForm] = useState({ ...lead });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-4 px-2" style={{ background: "rgba(8,13,20,0.92)" }}>
      <div className="bg-[#0d1520] border border-[#1e3a5f] rounded-xl w-full max-w-lg shadow-2xl overflow-y-auto" style={{ maxHeight: "96vh" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1a2d45]">
          <div>
            <p className="text-[11px] font-mono text-[#60a5fa] uppercase tracking-wider mb-0.5">
              {form.id ? "Edit Lead" : "New Lead"}
            </p>
            <p className="text-[15px] font-semibold text-[#e8f0fe]">{form.name || "Unnamed"}</p>
          </div>
          <div className="flex items-center gap-2">
            {form.id && (
              <button
                onClick={() => { if (window.confirm("Delete this lead?")) onDelete(form.id); }}
                className="text-[11px] font-mono text-red-400 border border-red-500/30 bg-red-500/10 px-2.5 py-1 rounded hover:bg-red-500/20 transition-colors"
              >
                Delete
              </button>
            )}
            <button onClick={onClose} className="text-[#7a9abf] hover:text-[#e8f0fe] transition-colors text-lg leading-none px-1">×</button>
          </div>
        </div>

        {/* Form body */}
        <div className="p-5 space-y-4">
          {/* Row: Name + Company */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-[#7a9abf] mb-1 uppercase tracking-wider">Full Name *</label>
              <input
                value={form.name}
                onChange={e => set("name", e.target.value)}
                placeholder="Jane Smith"
                className="w-full bg-[#111d2e] border border-[#1a2d45] rounded-lg px-3 py-2 text-[13px] text-[#e8f0fe] placeholder-[#3d5a7a] focus:outline-none focus:border-[#3b82f6] transition-colors"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-[#7a9abf] mb-1 uppercase tracking-wider">Company *</label>
              <input
                value={form.company}
                onChange={e => set("company", e.target.value)}
                placeholder="Acme Dental"
                className="w-full bg-[#111d2e] border border-[#1a2d45] rounded-lg px-3 py-2 text-[13px] text-[#e8f0fe] placeholder-[#3d5a7a] focus:outline-none focus:border-[#3b82f6] transition-colors"
              />
            </div>
          </div>

          {/* Row: Email + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-[#7a9abf] mb-1 uppercase tracking-wider">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={e => set("email", e.target.value)}
                placeholder="jane@acmedental.com"
                className="w-full bg-[#111d2e] border border-[#1a2d45] rounded-lg px-3 py-2 text-[13px] text-[#e8f0fe] placeholder-[#3d5a7a] focus:outline-none focus:border-[#3b82f6] transition-colors"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-[#7a9abf] mb-1 uppercase tracking-wider">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => set("phone", e.target.value)}
                placeholder="(555) 000-0000"
                className="w-full bg-[#111d2e] border border-[#1a2d45] rounded-lg px-3 py-2 text-[13px] text-[#e8f0fe] placeholder-[#3d5a7a] focus:outline-none focus:border-[#3b82f6] transition-colors"
              />
            </div>
          </div>

          {/* Row: Status + Source */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-[#7a9abf] mb-1 uppercase tracking-wider">Status</label>
              <select
                value={form.status}
                onChange={e => set("status", e.target.value)}
                className="w-full bg-[#111d2e] border border-[#1a2d45] rounded-lg px-3 py-2 text-[13px] text-[#e8f0fe] focus:outline-none focus:border-[#3b82f6] transition-colors"
              >
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-mono text-[#7a9abf] mb-1 uppercase tracking-wider">Source</label>
              <select
                value={form.source}
                onChange={e => set("source", e.target.value)}
                className="w-full bg-[#111d2e] border border-[#1a2d45] rounded-lg px-3 py-2 text-[13px] text-[#e8f0fe] focus:outline-none focus:border-[#3b82f6] transition-colors"
              >
                <option value="">— Select source —</option>
                {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Package */}
          <div>
            <label className="block text-[11px] font-mono text-[#7a9abf] mb-1 uppercase tracking-wider">Package Interest</label>
            <select
              value={form.package}
              onChange={e => set("package", e.target.value)}
              className="w-full bg-[#111d2e] border border-[#1a2d45] rounded-lg px-3 py-2 text-[13px] text-[#e8f0fe] focus:outline-none focus:border-[#3b82f6] transition-colors"
            >
              {PACKAGES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* Next action date */}
          <div>
            <label className="block text-[11px] font-mono text-[#7a9abf] mb-1 uppercase tracking-wider">Next Action Date</label>
            <input
              type="date"
              value={form.nextActionDate}
              onChange={e => set("nextActionDate", e.target.value)}
              className="w-full bg-[#111d2e] border border-[#1a2d45] rounded-lg px-3 py-2 text-[13px] text-[#e8f0fe] focus:outline-none focus:border-[#3b82f6] transition-colors"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-mono text-[#7a9abf] mb-1 uppercase tracking-wider">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => set("notes", e.target.value)}
              rows={4}
              placeholder="How many users, specific concerns, context from discovery call..."
              className="w-full bg-[#111d2e] border border-[#1a2d45] rounded-lg px-3 py-2 text-[13px] text-[#e8f0fe] placeholder-[#3d5a7a] focus:outline-none focus:border-[#3b82f6] transition-colors resize-none"
            />
          </div>

          {/* Quick email links */}
          {form.email && (
            <div className="bg-[#111d2e] border border-[#1a2d45] rounded-lg p-3">
              <p className="text-[10px] font-mono text-[#3d5a7a] uppercase tracking-wider mb-2">Quick Actions</p>
              <div className="flex flex-wrap gap-2">
                {[
                  ["📅 Send Calendly", `mailto:${form.email}?subject=Amazin Cyber — Quick Security Conversation&body=Hi ${form.name?.split(" ")[0] || ""},\n\nThanks for your interest. Here's a link to grab 20 minutes:\n\n[YOUR CALENDLY LINK]\n\nLooking forward to connecting.\n\nOshé\nAmazin Cyber`],
                  ["📄 Send Proposal", `mailto:${form.email}?subject=Your Microsoft 365 Security Snapshot Proposal&body=Hi ${form.name?.split(" ")[0] || ""},\n\nPlease find your Security Snapshot proposal attached.\n\nHappy to answer any questions before you decide.\n\nOshé`],
                  ["🔄 90-Day Check-in", `mailto:${form.email}?subject=Checking in — Your M365 Security Snapshot&body=Hi ${form.name?.split(" ")[0] || ""},\n\nIt's been 90 days since your Microsoft 365 Security Snapshot. A lot can change — new users, new settings, new risks.\n\nWanted to check in and see how things are going.\n\nOshé\nAmazin Cyber`],
                ].map(([label, href]) => (
                  <a key={label} href={href} className="text-[11px] font-mono text-[#60a5fa] border border-[#1e3a5f] bg-blue-500/5 px-2.5 py-1 rounded hover:bg-blue-500/10 transition-colors">
                    {label}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[#1a2d45] flex justify-end gap-2">
          <button
            onClick={onClose}
            className="text-[13px] font-mono text-[#7a9abf] border border-[#1a2d45] px-4 py-1.5 rounded-lg hover:border-[#1e3a5f] hover:text-[#e8f0fe] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            className="text-[13px] font-mono text-white bg-[#3b82f6] px-5 py-1.5 rounded-lg hover:bg-[#2563eb] transition-colors"
          >
            Save Lead
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────
export default function App() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("kanban"); // kanban | list
  const [editLead, setEditLead] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [highlightId, setHighlightId] = useState(null);

  // Highlight + scroll to a specific lead from the ?lead= query param (opened from the OS hub)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = new URLSearchParams(window.location.search).get("lead");
    if (id) { setHighlightId(id); setFilterStatus("All"); }
  }, []);

  // Load from Supabase on mount
  useEffect(() => {
    loadLeads().then(l => { setLeads(l); setLoading(false); });
  }, []);

  // Activate a status filter from the ?status= query param (e.g. opened from the OS hub pipeline bar)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = new URLSearchParams(window.location.search).get("status");
    if (!raw) return;
    const map = {
      new: "New", contacted: "Contacted",
      proposal_sent: "Proposal Sent", "proposal-sent": "Proposal Sent", "proposal sent": "Proposal Sent",
      won: "Won", lost: "Lost", nurture: "Nurture",
    };
    const match = map[raw.toLowerCase()] || STATUSES.find(s => s.toLowerCase() === raw.toLowerCase());
    if (match) setFilterStatus(match);
  }, []);

  const handleSave = async (form) => {
    if (!form.name || !form.company || !form.email) {
      alert("Name, company, and email are required.");
      return;
    }
    try {
      if (form.id) {
        const saved = await updateLead(form);
        setLeads(ls => ls.map(l => l.id === form.id ? (saved || form) : l));
      } else {
        const newLead = { ...form, id: uid(), createdAt: new Date().toISOString() };
        const saved = await createLead(newLead);
        setLeads(ls => [...ls, saved || newLead]);
      }
      setEditLead(null);
    } catch {
      alert("Could not save the lead. Please try again.");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteLead(id);
      setLeads(ls => ls.filter(l => l.id !== id));
      setEditLead(null);
    } catch {
      alert("Could not delete the lead. Please try again.");
    }
  };

  const filtered = leads.filter(l => {
    const q = search.toLowerCase();
    const matchSearch = !q || l.name.toLowerCase().includes(q) || l.company.toLowerCase().includes(q) || l.email.toLowerCase().includes(q);
    const matchStatus = filterStatus === "All" || l.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // Stats
  const totalValue = leads.filter(l => l.status !== "Lost").reduce((sum, l) => {
    if (l.package?.includes("$250")) return sum + 250;
    if (l.package?.includes("$500")) return sum + 500;
    if (l.package?.includes("$1,000")) return sum + 1000;
    return sum;
  }, 0);

  const wonCount = leads.filter(l => l.status === "Won").length;
  const overdueCount = leads.filter(l => isOverdue(l.nextActionDate) && l.status !== "Won" && l.status !== "Lost").length;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080d14] flex items-center justify-center">
        <p className="text-[13px] font-mono text-[#3d5a7a] animate-pulse">Loading pipeline…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080d14] text-[#e8f0fe] font-sans" style={{ backgroundImage: "linear-gradient(rgba(59,130,246,.018) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,.018) 1px,transparent 1px)", backgroundSize: "32px 32px" }}>

      {/* Header */}
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

          {/* Stats strip */}
          <div className="flex items-center gap-5">
            <div className="text-center">
              <p className="text-[18px] font-semibold text-[#60a5fa]">{leads.length}</p>
              <p className="text-[10px] font-mono text-[#3d5a7a] uppercase">Total leads</p>
            </div>
            <div className="text-center">
              <p className="text-[18px] font-semibold text-green-400">{wonCount}</p>
              <p className="text-[10px] font-mono text-[#3d5a7a] uppercase">Won</p>
            </div>
            <div className="text-center">
              <p className="text-[18px] font-semibold text-[#e8f0fe]">${totalValue.toLocaleString()}</p>
              <p className="text-[10px] font-mono text-[#3d5a7a] uppercase">Pipeline</p>
            </div>
            {overdueCount > 0 && (
              <div className="text-center">
                <p className="text-[18px] font-semibold text-red-400">{overdueCount}</p>
                <p className="text-[10px] font-mono text-[#3d5a7a] uppercase">Overdue</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditLead({ ...EMPTY_LEAD })}
              className="text-[13px] font-mono text-white bg-[#3b82f6] px-4 py-2 rounded-lg hover:bg-[#2563eb] transition-colors flex items-center gap-1.5"
            >
              + Add Lead
            </button>
            <button
              onClick={logout}
              className="text-[13px] font-mono text-[#7a9abf] border border-[#1a2d45] px-4 py-2 rounded-lg hover:text-[#e8f0fe] hover:border-[#3d5a7a] transition-colors"
            >
              Log out
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="border-b border-[#1a2d45] px-5 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-3 flex-wrap">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search leads…"
            className="bg-[#0d1520] border border-[#1a2d45] rounded-lg px-3 py-1.5 text-[13px] text-[#e8f0fe] placeholder-[#3d5a7a] focus:outline-none focus:border-[#3b82f6] w-48 transition-colors"
          />

          <div className="flex items-center gap-1">
            {["All", ...STATUSES].map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`text-[11px] font-mono px-2.5 py-1 rounded transition-colors ${
                  filterStatus === s
                    ? "bg-[#1e3a5f] text-[#60a5fa] border border-[#3b82f6]/40"
                    : "text-[#3d5a7a] hover:text-[#7a9abf] border border-transparent"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-1 border border-[#1a2d45] rounded-lg p-0.5">
            {["kanban", "list"].map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`text-[11px] font-mono px-2.5 py-1 rounded transition-colors capitalize ${
                  view === v ? "bg-[#1e3a5f] text-[#60a5fa]" : "text-[#3d5a7a] hover:text-[#7a9abf]"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-5 py-5">

        {/* Kanban view */}
        {view === "kanban" && (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {STATUSES.map(s => (
              <KanbanColumn
                key={s}
                status={s}
                leads={filtered.filter(l => l.status === s)}
                onLeadClick={setEditLead}
                highlightId={highlightId}
              />
            ))}
          </div>
        )}

        {/* List view */}
        {view === "list" && (
          <div className="space-y-2">
            {filtered.length === 0 && (
              <div className="text-center py-12">
                <p className="text-[13px] text-[#3d5a7a]">No leads found.</p>
              </div>
            )}
            {filtered
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
              .map(l => (
                <div
                  key={l.id}
                  onClick={() => setEditLead(l)}
                  className="bg-[#0d1520] border border-[#1a2d45] rounded-lg px-4 py-3 flex items-center gap-4 cursor-pointer hover:border-[#1e3a5f] hover:bg-[#111d2e] transition-all"
                >
                  <div className="w-8 h-8 rounded-full bg-[#1e3a5f] flex items-center justify-center flex-shrink-0">
                    <span className="text-[11px] font-semibold text-[#60a5fa]">
                      {(l.name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[#e8f0fe]">{l.name}</p>
                    <p className="text-[11px] text-[#7a9abf]">{l.company} · {l.email}</p>
                  </div>
                  <div className="hidden sm:block flex-shrink-0">
                    <p className="text-[11px] text-[#3d5a7a]">{l.package?.replace("— ", "").replace(" —", "") || "No package"}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <StatusBadge status={l.status} small />
                    {l.nextActionDate && (
                      <p className={`text-[10px] font-mono hidden md:block ${isOverdue(l.nextActionDate) ? "text-red-400" : "text-[#3d5a7a]"}`}>
                        {formatDate(l.nextActionDate)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Empty state */}
        {leads.length === 0 && (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-xl bg-[#0d1520] border border-[#1a2d45] flex items-center justify-center mx-auto mb-4">
              <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7">
                <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z" fill="#1e3a5f" stroke="#3b82f6" strokeWidth="1.5"/>
                <path d="M9 12l2 2 4-4" stroke="#60a5fa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="text-[15px] font-semibold text-[#e8f0fe] mb-1">Your pipeline is empty</p>
            <p className="text-[13px] text-[#7a9abf] mb-5">Add your first lead to get started.</p>
            <button
              onClick={() => setEditLead({ ...EMPTY_LEAD })}
              className="text-[13px] font-mono text-white bg-[#3b82f6] px-5 py-2 rounded-lg hover:bg-[#2563eb] transition-colors"
            >
              + Add Your First Lead
            </button>
          </div>
        )}
      </div>

      {/* Lead form modal */}
      {editLead && (
        <LeadForm
          lead={editLead}
          onSave={handleSave}
          onClose={() => setEditLead(null)}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
