import { useState, useRef, useEffect } from "react";
import { useSelector } from "react-redux";
import UserNavbar from "../../components/UserNavbar";
import {
  useCreateTicketMutation,
  useGetMyTicketsQuery,
  useGetTicketByIdQuery,
  useReplyToTicketMutation,
} from "../../slices/supportApiSlice";

// ── Constants ──────────────────────────────────────────
const CATEGORIES = [
  "general", "booking", "flight", "payment", "baggage", "refund", "other",
];

const STATUS_CFG = {
  open:          { label: "Open",        cls: "bg-blue-100 text-blue-700",   dot: "bg-blue-500"   },
  "in-progress": { label: "In Progress", cls: "bg-amber-100 text-amber-700", dot: "bg-amber-500"  },
  resolved:      { label: "Resolved",    cls: "bg-green-100 text-green-700", dot: "bg-green-500"  },
  closed:        { label: "Closed",      cls: "bg-slate-100 text-slate-500", dot: "bg-slate-400"  },
};

const PRIORITY_CFG = {
  low:    { label: "Low",    cls: "bg-slate-100 text-slate-500",   icon: "▽" },
  medium: { label: "Medium", cls: "bg-blue-100 text-blue-600",     icon: "◈" },
  high:   { label: "High",   cls: "bg-orange-100 text-orange-600", icon: "▲" },
  urgent: { label: "Urgent", cls: "bg-red-100 text-red-600",       icon: "⚡" },
};

const CATEGORY_ICONS = {
  booking:  "🎫",
  flight:   "✈️",
  payment:  "💳",
  baggage:  "🧳",
  refund:   "↩️",
  general:  "💬",
  other:    "📋",
};

const fmt = (dt) =>
  dt ? new Date(dt).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  }) : "—";

const fmtShort = (dt) =>
  dt ? new Date(dt).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  }) : "—";

const inputCls =
  "w-full h-11 px-3 text-[13px] text-[#0C3060] bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#0C3060] focus:ring-2 focus:ring-blue-50 transition placeholder:text-slate-300";

// ── Shared UI ──────────────────────────────────────────
function Badge({ label, cls }) {
  return (
    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${cls}`}>
      {label}
    </span>
  );
}

function Spinner({ size = "md" }) {
  const s = size === "sm" ? "w-4 h-4 border-2" : "w-8 h-8 border-4";
  return (
    <div className={`${s} border-[#0C3060] border-t-transparent rounded-full animate-spin`} />
  );
}

// ── Message bubble ─────────────────────────────────────
function MessageBubble({ msg, currentUserId }) {
  const isMe = String(msg.sender?._id ?? msg.sender) === String(currentUserId);
  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"} mb-3`}>
      <div className={`max-w-[80%] flex flex-col gap-1 ${isMe ? "items-end" : "items-start"}`}>
        {/* Sender label */}
        <div className="flex items-center gap-1.5">
          <p className={`text-[10px] font-semibold ${isMe ? "text-[#0C3060]" : "text-slate-400"}`}>
            {isMe ? "You" : (msg.sender?.name ?? "Support Team")}
          </p>
          {!isMe && msg.senderRole === "admin" && (
            <span className="bg-[#0C3060] text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">
              SUPPORT
            </span>
          )}
        </div>

        {/* Bubble */}
        <div className={`px-4 py-3 rounded-2xl text-[13px] leading-relaxed shadow-sm
          ${isMe
            ? "bg-[#0C3060] text-white rounded-tr-sm"
            : "bg-white border border-slate-200 text-slate-700 rounded-tl-sm"
          }`}>
          {msg.message}
        </div>

        <p className="text-[10px] text-slate-300">{fmt(msg.createdAt)}</p>
      </div>
    </div>
  );
}

// ── Ticket thread view ─────────────────────────────────
function TicketThread({ ticketId, onBack }) {
  const { userData }  = useSelector((s) => s.auth);
  const { data, isLoading, refetch } = useGetTicketByIdQuery(ticketId, {
    pollingInterval: 15000, // auto-refresh every 15s
  });
  const [reply,    setReply]    = useState("");
  const [replyErr, setReplyErr] = useState("");
  const [replyToTicket, { isLoading: replying }] = useReplyToTicketMutation();
  const bottomRef = useRef(null);

  const ticket = data?.data;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ticket?.messages?.length]);

  const handleReply = async () => {
    if (!reply.trim()) return;
    setReplyErr("");
    try {
      await replyToTicket({ id: ticketId, message: reply.trim() }).unwrap();
      setReply("");
      refetch();
    } catch (err) {
      setReplyErr(err?.data?.message ?? "Failed to send reply");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (!ticket) return (
    <div className="text-center py-10 text-slate-400">
      <p className="text-[14px] font-semibold">Ticket not found</p>
      <button onClick={onBack} className="mt-3 text-[13px] text-[#0C3060] font-semibold hover:underline bg-transparent border-none cursor-pointer">
        ← Back
      </button>
    </div>
  );

  const isClosed = ["resolved", "closed"].includes(ticket.status);
  const scfg     = STATUS_CFG[ticket.status];
  const pcfg     = PRIORITY_CFG[ticket.priority];

  return (
    <div>
      {/* Thread header */}
      <div className="flex items-start gap-3 mb-5 pb-5 border-b border-slate-100">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-slate-50 transition cursor-pointer flex-shrink-0 mt-0.5"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className="text-[11px] font-bold text-slate-400">{ticket.ticketNumber}</span>
            <Badge label={scfg?.label || ticket.status} cls={scfg?.cls || "bg-gray-100 text-gray-600"} />
            <Badge label={`${pcfg?.icon} ${pcfg?.label}`} cls={pcfg?.cls || "bg-gray-100 text-gray-600"} />
            {ticket.category && (
              <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full capitalize">
                {CATEGORY_ICONS[ticket.category]} {ticket.category}
              </span>
            )}
          </div>
          <h2 className="text-[16px] font-bold text-[#0C3060] leading-tight">{ticket.subject}</h2>
          <p className="text-[11px] text-slate-400 mt-1">Opened {fmt(ticket.createdAt)}</p>
        </div>
      </div>

      {/* Linked booking */}
      {ticket.bookingId && (
        <div className="mb-4 px-4 py-3 bg-[#EAF2FB] rounded-xl flex items-center gap-2.5">
          <span className="text-[16px]">🎫</span>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-bold text-[#0C3060]">
              Booking: {ticket.bookingId.bookingReference}
            </p>
            <p className="text-[11px] text-slate-500 capitalize">
              Status: {ticket.bookingId.status} · ₹{ticket.bookingId.totalAmount?.toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Linked flight */}
      {ticket.flightId && (
        <div className="mb-4 px-4 py-3 bg-[#EAF2FB] rounded-xl flex items-center gap-2.5">
          <span className="text-[16px]">✈️</span>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-bold text-[#0C3060]">
              {ticket.flightId.flightNumber} — {ticket.flightId.source} → {ticket.flightId.destination}
            </p>
            <p className="text-[11px] text-slate-500">
              {fmt(ticket.flightId.departureTime)}
            </p>
          </div>
        </div>
      )}

      {/* Messages thread */}
      <div
        className="flex flex-col mb-4 overflow-y-auto pr-1"
        style={{ minHeight: "200px", maxHeight: "420px" }}
      >
        {ticket.messages.length === 0 ? (
          <div className="text-center py-8 text-slate-300">
            <p className="text-[13px]">No messages yet</p>
          </div>
        ) : (
          ticket.messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} currentUserId={userData?._id} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Resolved / closed notice */}
      {isClosed && (
        <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-xl flex items-start gap-2.5">
          <svg className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <div>
            <p className="text-[12px] font-bold text-green-700">
              This ticket has been {ticket.status}
              {ticket.resolvedAt ? ` on ${fmtShort(ticket.resolvedAt)}` : ""}
            </p>
            {ticket.resolutionNote && (
              <p className="text-[12px] text-green-600 mt-0.5">{ticket.resolutionNote}</p>
            )}
          </div>
        </div>
      )}

      {/* Unread from admin notice */}
      {!isClosed && ticket.unreadByUser > 0 && (
        <div className="mb-3 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-xl text-[12px] text-blue-700 font-semibold">
          📬 {ticket.unreadByUser} new message{ticket.unreadByUser > 1 ? "s" : ""} from support team
        </div>
      )}

      {/* Reply box */}
      {!isClosed ? (
        <div className="flex flex-col gap-2">
          {replyErr && (
            <p className="text-[11px] text-red-500 px-1">{replyErr}</p>
          )}
          <div className="flex gap-2">
            <input
              className={`${inputCls} flex-1`}
              placeholder="Type your reply… (Enter to send)"
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleReply(); } }}
            />
            <button
              onClick={handleReply}
              disabled={replying || !reply.trim()}
              className="h-11 px-5 bg-[#0C3060] hover:bg-[#0a2550] text-white rounded-xl text-[13px] font-bold border-none cursor-pointer disabled:opacity-50 transition flex items-center gap-2"
            >
              {replying ? <Spinner size="sm" /> : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              )}
              <span className="hidden sm:block">Send</span>
            </button>
          </div>
          <p className="text-[10px] text-slate-300 px-1">Support team typically responds within 2–4 hours</p>
        </div>
      ) : (
        <button
          onClick={onBack}
          className="w-full h-11 border border-slate-200 bg-white text-slate-600 text-[13px] font-semibold rounded-xl hover:bg-slate-50 transition cursor-pointer"
        >
          ← Back to all tickets
        </button>
      )}
    </div>
  );
}

// ── New ticket form ────────────────────────────────────
function NewTicketForm({ onSuccess, onCancel }) {
  const [form,   setForm]   = useState({
    subject: "", description: "", category: "general", priority: "medium",
  });
  const [errors, setErrors] = useState({});
  const [createTicket, { isLoading }] = useCreateTicketMutation();

  const set = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!form.subject.trim())     e.subject     = "Subject is required";
    if (!form.description.trim()) e.description = "Description is required";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      await createTicket({
        subject:     form.subject.trim(),
        description: form.description.trim(),
        category:    form.category,
        priority:    form.priority,
      }).unwrap();
      onSuccess();
    } catch (err) {
      setErrors({ api: err?.data?.message ?? "Failed to create ticket" });
    }
  };

  return (
    <div>
      {/* Form header */}
      <div className="flex items-center gap-3 mb-6 pb-5 border-b border-slate-100">
        <button
          onClick={onCancel}
          className="w-9 h-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-slate-50 transition cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h2 className="text-[17px] font-bold text-[#0C3060]">New support ticket</h2>
          <p className="text-[12px] text-slate-400 mt-0.5">We typically respond within 2–4 hours</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Category */}
        <div>
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Category</label>
          <select
            className={inputCls + " cursor-pointer"}
            value={form.category}
            onChange={(e) => set("category", e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_ICONS[c]} {c.charAt(0).toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Priority */}
        <div>
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Priority</label>
          <select
            className={inputCls + " cursor-pointer"}
            value={form.priority}
            onChange={(e) => set("priority", e.target.value)}
          >
            {Object.entries(PRIORITY_CFG).map(([k, v]) => (
              <option key={k} value={k}>{v.icon} {v.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Subject */}
      <div className="mb-4">
        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Subject</label>
        <input
          className={inputCls}
          placeholder="Brief summary of your issue"
          value={form.subject}
          onChange={(e) => set("subject", e.target.value)}
        />
        {errors.subject && <p className="text-[11px] text-red-500 mt-1">{errors.subject}</p>}
      </div>

      {/* Description */}
      <div className="mb-5">
        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Description</label>
        <textarea
          className="w-full px-3 py-3 text-[13px] text-[#0C3060] bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#0C3060] focus:ring-2 focus:ring-blue-50 transition placeholder:text-slate-300 resize-none"
          rows={5}
          placeholder="Please describe your issue in detail. Include relevant booking references, flight numbers, dates, etc."
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
        />
        {errors.description && <p className="text-[11px] text-red-500 mt-1">{errors.description}</p>}
        <p className="text-[10px] text-slate-300 mt-1">{form.description.length} / 2000 characters</p>
      </div>

      {/* Tips */}
      <div className="mb-5 bg-[#EAF2FB] rounded-xl p-4">
        <p className="text-[11px] font-bold text-[#0C3060] mb-2">💡 Tips for faster resolution</p>
        <ul className="flex flex-col gap-1">
          {[
            "Include your booking reference number if applicable",
            "Describe what happened and what you expected",
            "Attach any relevant screenshots or details",
          ].map((tip) => (
            <li key={tip} className="flex items-start gap-2 text-[11px] text-slate-500">
              <span className="text-[#0C3060] mt-0.5">•</span>
              {tip}
            </li>
          ))}
        </ul>
      </div>

      {errors.api && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-[12px] text-red-600">
          {errors.api}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 h-11 border border-slate-200 bg-white text-slate-600 rounded-xl text-[13px] font-semibold cursor-pointer hover:bg-slate-50 transition"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className="flex-1 h-11 bg-[#0C3060] hover:bg-[#0a2550] text-white rounded-xl text-[13px] font-bold border-none cursor-pointer disabled:opacity-60 transition flex items-center justify-center gap-2"
        >
          {isLoading ? <><Spinner size="sm" /> Submitting...</> : "Submit ticket"}
        </button>
      </div>
    </div>
  );
}

// ── Ticket list item ───────────────────────────────────
function TicketCard({ ticket, onClick }) {
  const scfg = STATUS_CFG[ticket.status] || STATUS_CFG.open;
  const pcfg = PRIORITY_CFG[ticket.priority] || PRIORITY_CFG.medium;
  const lastMsg = ticket.messages?.[ticket.messages.length - 1];

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl border border-slate-100 hover:border-[#0C3060]/25 hover:shadow-md transition-all cursor-pointer p-5 group"
    >
      <div className="flex items-start gap-4">
        {/* Category icon */}
        <div className="w-10 h-10 bg-[#EAF2FB] rounded-xl flex items-center justify-center flex-shrink-0 text-[18px]">
          {CATEGORY_ICONS[ticket.category] || "💬"}
        </div>

        <div className="flex-1 min-w-0">
          {/* Badges row */}
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-[10px] font-bold text-slate-400">{ticket.ticketNumber}</span>
            <Badge label={scfg.label} cls={scfg.cls} />
            <Badge label={`${pcfg.icon} ${pcfg.label}`} cls={pcfg.cls} />
            {ticket.unreadByUser > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500 text-white animate-pulse">
                {ticket.unreadByUser} new
              </span>
            )}
          </div>

          {/* Subject */}
          <p className="text-[14px] font-bold text-[#0C3060] truncate group-hover:text-blue-700 transition">
            {ticket.subject}
          </p>

          {/* Last message preview */}
          {lastMsg && (
            <p className="text-[12px] text-slate-400 mt-0.5 truncate">
              {String(lastMsg.sender?._id ?? lastMsg.sender) !== String(ticket.raisedBy?._id ?? ticket.raisedBy)
                ? "Support: "
                : "You: "}
              {lastMsg.message}
            </p>
          )}

          {/* Meta row */}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="text-[10px] text-slate-400 capitalize">
              {CATEGORY_ICONS[ticket.category]} {ticket.category}
            </span>
            <span className="text-[10px] text-slate-300">·</span>
            <span className="text-[10px] text-slate-400">{fmtShort(ticket.createdAt)}</span>
            <span className="text-[10px] text-slate-300">·</span>
            <span className="text-[10px] text-slate-400">
              {ticket.messages?.length ?? 0} message{(ticket.messages?.length ?? 0) !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Chevron */}
        <svg className="w-4 h-4 text-slate-300 group-hover:text-[#0C3060] transition flex-shrink-0 mt-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
        </svg>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────
export default function SupportPage() {
  const [view,          setView]          = useState("list");
  const [activeTicket,  setActiveTicket]  = useState(null);
  const [statusFilter,  setStatusFilter]  = useState("all");
  const [page,          setPage]          = useState(1);

  const { data, isLoading, isFetching } = useGetMyTicketsQuery({
    status: statusFilter,
    page,
    limit: 10,
  });

  const tickets    = data?.data       ?? [];
  const total      = data?.total      ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const openTickets = tickets.filter((t) => t.status === "open").length;
  const unreadTotal = tickets.reduce((sum, t) => sum + (t.unreadByUser || 0), 0);

  const openThread = (ticketId) => {
    setActiveTicket(ticketId);
    setView("thread");
  };

  const backToList = () => {
    setActiveTicket(null);
    setView("list");
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <UserNavbar />

      {/* ── Page header ── */}
      <div className="bg-[#0C3060] px-6 py-10 relative overflow-hidden">
        <div className="absolute w-64 h-64 rounded-full bg-white/[0.04] -top-16 -right-16" />
        <div className="absolute w-40 h-40 rounded-full bg-white/[0.03] bottom-0 left-20" />
        <div className="w-11/12 mx-auto relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-blue-300 text-[11px] font-semibold uppercase tracking-[0.18em] mb-2">Help & Support</p>
            <h1 className="text-white text-3xl font-bold mb-1">Support tickets</h1>
            <p className="text-blue-200/70 text-[14px]">
              {total} ticket{total !== 1 ? "s" : ""}
              {openTickets > 0 && ` · ${openTickets} open`}
              {unreadTotal > 0 && ` · ${unreadTotal} unread`}
            </p>
          </div>
          {view === "list" && (
            <button
              onClick={() => setView("new")}
              className="h-11 px-6 bg-white text-[#0C3060] font-bold text-[13px] rounded-xl hover:bg-blue-50 active:scale-95 transition border-none cursor-pointer flex items-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New ticket
            </button>
          )}
        </div>
      </div>

      <div className="w-11/12 mx-auto px-4 py-7">

        {/* ── NEW TICKET VIEW ── */}
        {view === "new" && (
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
            <NewTicketForm
              onSuccess={() => { setView("list"); setPage(1); }}
              onCancel={backToList}
            />
          </div>
        )}

        {/* ── THREAD VIEW ── */}
        {view === "thread" && activeTicket && (
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
            <TicketThread ticketId={activeTicket} onBack={backToList} />
          </div>
        )}

        {/* ── LIST VIEW ── */}
        {view === "list" && (
          <>
            {/* Quick stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                { label: "Total",       value: total,                                                             color: "bg-white border-slate-200",      text: "text-[#0C3060]" },
                { label: "Open",        value: tickets.filter((t) => t.status === "open").length,                 color: "bg-blue-50 border-blue-100",     text: "text-blue-700"  },
                { label: "In Progress", value: tickets.filter((t) => t.status === "in-progress").length,          color: "bg-amber-50 border-amber-100",   text: "text-amber-700" },
                { label: "Resolved",    value: tickets.filter((t) => ["resolved","closed"].includes(t.status)).length, color: "bg-green-50 border-green-100", text: "text-green-700" },
              ].map(({ label, value, color, text }) => (
                <div key={label} className={`${color} border rounded-2xl p-4 text-center`}>
                  <p className={`text-[24px] font-black ${text} leading-none`}>{value}</p>
                  <p className="text-[11px] font-medium text-slate-400 mt-1">{label}</p>
                </div>
              ))}
            </div>

            {/* Filter tabs */}
            <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 mb-5 overflow-x-auto">
              {["all", "open", "in-progress", "resolved", "closed"].map((f) => (
                <button
                  key={f}
                  onClick={() => { setStatusFilter(f); setPage(1); }}
                  className={`px-3 py-2 rounded-lg text-[11px] font-semibold whitespace-nowrap transition border-none cursor-pointer flex-1
                    ${statusFilter === f
                      ? "bg-[#0C3060] text-white"
                      : "text-slate-500 hover:text-[#0C3060] hover:bg-slate-50 bg-transparent"
                    }`}
                >
                  {f === "in-progress" ? "In Progress" : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            {/* Ticket list */}
            {isLoading ? (
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse">
                    <div className="flex gap-4">
                      <div className="w-10 h-10 bg-slate-100 rounded-xl flex-shrink-0" />
                      <div className="flex-1">
                        <div className="h-3 bg-slate-100 rounded w-32 mb-2" />
                        <div className="h-4 bg-slate-100 rounded w-56 mb-2" />
                        <div className="h-3 bg-slate-100 rounded w-40" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
                <div className="text-[48px] mb-4">🎫</div>
                <p className="text-[16px] font-bold text-[#0C3060] mb-1">No tickets yet</p>
                <p className="text-slate-400 text-[13px] mb-6">
                  {statusFilter !== "all"
                    ? `No ${statusFilter} tickets found`
                    : "Raise a ticket and our support team will get back to you"}
                </p>
                <button
                  onClick={() => setView("new")}
                  className="h-11 px-6 bg-[#0C3060] text-white text-[13px] font-bold rounded-xl border-none cursor-pointer hover:bg-[#0a2550] transition"
                >
                  Raise a ticket
                </button>
              </div>
            ) : (
              <>
                <div className={`flex flex-col gap-3 mb-5 transition-opacity ${isFetching ? "opacity-60" : "opacity-100"}`}>
                  {tickets.map((t) => (
                    <TicketCard key={t._id} ticket={t} onClick={() => openThread(t._id)} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between">
                    <p className="text-[12px] text-slate-400">
                      Showing {tickets.length} of {total} tickets
                    </p>
                    <div className="flex items-center gap-1.5">
                      <button
                        disabled={page === 1}
                        onClick={() => setPage((p) => p - 1)}
                        className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:border-blue-300 hover:text-[#0C3060] transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <span className="text-[12px] text-slate-500 px-1">{page} / {totalPages}</span>
                      <button
                        disabled={page === totalPages}
                        onClick={() => setPage((p) => p + 1)}
                        className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:border-blue-300 hover:text-[#0C3060] transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* FAQ section */}
            <div className="mt-8 bg-white border border-slate-100 rounded-2xl p-5">
              <p className="text-[13px] font-bold text-[#0C3060] mb-4">💡 Common questions</p>
              <div className="flex flex-col gap-3">
                {[
                  { q: "How do I cancel my booking?",          a: "Go to My Bookings, select the booking and click Cancel. Refunds are processed within 5–7 business days." },
                  { q: "Can I change my flight?",              a: "Flight changes depend on fare type. Raise a ticket with your booking reference and we'll check your options." },
                  { q: "Where is my refund?",                  a: "Refunds typically take 5–7 business days. If it's been longer, raise a ticket with category set to Refund." },
                  { q: "How do I get my boarding pass?",       a: "Boarding passes are sent to your email 24 hours before departure. Check your spam folder if you don't see it." },
                ].map(({ q, a }, i) => (
                  <details key={i} className="group border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
                    <summary className="text-[13px] font-semibold text-[#0C3060] cursor-pointer list-none flex items-center justify-between">
                      {q}
                      <svg className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </summary>
                    <p className="text-[12px] text-slate-400 mt-2 leading-relaxed">{a}</p>
                  </details>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-[#0C3060] text-blue-100 px-6 py-8 mt-10">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-[12px] text-blue-300">
            Average response time: 2–4 hours · Support available 24/7
          </p>
          <p className="text-[11px] text-blue-400 mt-2">© 2026 AirlineMS · All rights reserved</p>
        </div>
      </footer>
    </div>
  );
}