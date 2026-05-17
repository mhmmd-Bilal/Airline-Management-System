// src/pages/admin/SupportPage.jsx
import { useState, useRef, useEffect } from "react";
import { useSelector } from "react-redux";
import {
  useGetAllTicketsQuery,
  useGetTicketByIdQuery,
  useReplyToTicketMutation,
  useUpdateTicketStatusMutation,
  useDeleteTicketMutation,
} from "../../slices/supportApiSlice";
import {
  getSocket,
  joinTicketRoom,
  leaveTicketRoom,
  joinAdminFeed,
  emitTyping,
} from "../../services/socketService";

/* ─────────────────────────────────────────────────────── constants ── */

const STATUS_CFG = {
  open:          { label: "Open",        cls: "bg-blue-100 text-blue-700",   dot: "bg-blue-500"   },
  "in-progress": { label: "In Progress", cls: "bg-amber-100 text-amber-700", dot: "bg-amber-500"  },
  resolved:      { label: "Resolved",    cls: "bg-green-100 text-green-700", dot: "bg-green-500"  },
  closed:        { label: "Closed",      cls: "bg-slate-100 text-slate-500", dot: "bg-slate-400"  },
};

const PRIORITY_CFG = {
  low:    { label: "Low",    cls: "bg-slate-100 text-slate-500",   icon: "ti-arrow-down"   },
  medium: { label: "Medium", cls: "bg-blue-50 text-blue-600",      icon: "ti-minus"        },
  high:   { label: "High",   cls: "bg-orange-50 text-orange-600",  icon: "ti-arrow-up"     },
  urgent: { label: "Urgent", cls: "bg-red-100 text-red-600",       icon: "ti-alert-circle" },
};

const CATEGORY_ICONS = {
  booking: "ti-ticket",        flight:  "ti-plane",
  payment: "ti-credit-card",   baggage: "ti-briefcase",
  refund:  "ti-receipt-refund",general: "ti-message-circle",
  other:   "ti-dots",
};

const CATEGORIES = ["all","general","booking","flight","payment","baggage","refund","other"];

const fmt = (dt) =>
  dt ? new Date(dt).toLocaleString("en-IN", {
    day:"2-digit", month:"short", year:"numeric",
    hour:"2-digit", minute:"2-digit", hour12:true,
  }) : "—";

const fmtShort = (dt) =>
  dt ? new Date(dt).toLocaleDateString("en-IN", { day:"2-digit", month:"short" }) : "—";

const inputCls = "w-full h-[42px] px-3 text-[13px] text-[#0D1B2A] bg-[#F0F7FF] border border-[#D0E6F7] rounded-[10px] outline-none focus:border-[#1565C0] focus:shadow-[0_0_0_3px_rgba(21,101,192,0.08)] transition placeholder:text-[#B0C4D8]";

/* ─────────────────────────────────────────────────── tiny primitives ── */

function Chip({ label, cls }) {
  return (
    <span className={`inline-flex items-center text-[11px] font-semibold px-2.5 py-[3px] rounded-full whitespace-nowrap ${cls}`}>
      {label}
    </span>
  );
}

function Avatar({ name = "", size = "sm" }) {
  const initials = name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const s = { sm: "w-7 h-7 text-[10px]", md: "w-9 h-9 text-[12px]", lg: "w-11 h-11 text-[14px]" };
  return (
    <div className={`${s[size]} rounded-full bg-[#EAF4FB] text-[#1565C0] flex items-center justify-center font-bold flex-shrink-0`}>
      {initials || "?"}
    </div>
  );
}

function StatCard({ label, value, icon, color, pulse }) {
  return (
    <div className="bg-white border border-[#D0E6F7] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-medium text-[#7A90A4] uppercase tracking-[0.6px]">{label}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center relative ${color}`}>
          <i className={`ti ${icon} text-[15px]`} />
          {pulse && !!value && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
          )}
        </div>
      </div>
      <p className="text-[26px] font-bold text-[#0D1B2A] leading-none">{value ?? "—"}</p>
    </div>
  );
}

/* ─────────────────────────────────────── ticket detail modal panel ── */

function TicketDetailPanel({ ticketId, onClose }) {
  const { userData } = useSelector((s) => s.auth);
  const { data, isLoading, refetch } = useGetTicketByIdQuery(ticketId);

  const [messages,    setMessages]   = useState([]);
  const [reply,       setReply]      = useState("");
  const [replyErr,    setReplyErr]   = useState("");
  const [typing,      setTyping]     = useState(null);
  const [online,      setOnline]     = useState(false);
  const [newMsgAlert, setNewMsgAlert]= useState(false);
  const [statusForm,  setStatusForm] = useState({ status:"", resolutionNote:"", priority:"" });

  const bottomRef   = useRef(null);
  const typingTimer = useRef(null);

  const [replyToTicket,     { isLoading: replying }] = useReplyToTicketMutation();
  const [updateTicketStatus,{ isLoading: updating }] = useUpdateTicketStatusMutation();

  const ticket   = data?.data;
  const isClosed = ["resolved","closed"].includes(ticket?.status);

  useEffect(() => { if (ticket?.messages) setMessages(ticket.messages); }, [ticket?.messages]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages.length]);

  /* socket */
  useEffect(() => {
    if (!ticketId) return;
    const socket = getSocket();
    joinTicketRoom(ticketId);
    setOnline(socket.connected);

    socket.on("new_message", ({ ticketId: tId, message }) => {
      if (tId !== ticketId) return;
      setMessages((prev) =>
        prev.some((m) => m._id && String(m._id) === String(message._id))
          ? prev : [...prev, message]
      );
      setNewMsgAlert(true);
      setTimeout(() => setNewMsgAlert(false), 3000);
    });
    socket.on("ticket_updated", ({ ticketId: tId }) => { if (tId === ticketId) refetch(); });
    socket.on("user_typing",    ({ userId, name, isTyping }) => {
      if (String(userId) === String(userData?._id)) return;
      setTyping(isTyping ? name : null);
    });
    socket.on("connect",    () => setOnline(true));
    socket.on("disconnect", () => setOnline(false));

    return () => {
      leaveTicketRoom(ticketId);
      ["new_message","ticket_updated","user_typing","connect","disconnect"].forEach((e) => socket.off(e));
    };
  }, [ticketId]);

  const handleReplyChange = (val) => {
    setReply(val);
    emitTyping(ticketId, true);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => emitTyping(ticketId, false), 1500);
  };

  const handleReply = async () => {
    if (!reply.trim()) return;
    setReplyErr("");
    emitTyping(ticketId, false);
    clearTimeout(typingTimer.current);

    const optimistic = {
      _id: `opt-${Date.now()}`,
      sender:     { _id: userData?._id, name: userData?.name },
      senderRole: "admin",
      message:    reply.trim(),
      createdAt:  new Date().toISOString(),
      _optimistic: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    setReply("");

    try {
      await replyToTicket({ id: ticketId, message: optimistic.message }).unwrap();
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m._id !== optimistic._id));
      setReply(optimistic.message);
      setReplyErr(err?.data?.message ?? "Failed to send");
    }
  };

  const handleStatusUpdate = async () => {
    if (!statusForm.status && !statusForm.priority) return;
    try {
      await updateTicketStatus({ id: ticketId, ...statusForm }).unwrap();
      setStatusForm({ status:"", resolutionNote:"", priority:"" });
      refetch();
    } catch (err) { console.error(err); }
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-[3px] border-[#EAF4FB] border-t-[#1565C0] rounded-full animate-spin" />
    </div>
  );
  if (!ticket) return null;

  const scfg = STATUS_CFG[ticket.status];
  const pcfg = PRIORITY_CFG[ticket.priority];

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Modal header ── */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[#EAF4FB] flex-shrink-0">
        <button onClick={onClose}
          className="w-8 h-8 rounded-lg border border-[#D0E6F7] bg-[#F0F7FF] flex items-center justify-center text-[#1565C0] hover:bg-[#E1EFFE] transition cursor-pointer flex-shrink-0"
        >
          <i className="ti ti-x text-[13px]" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="text-[11px] font-bold text-[#B0C4D8]">{ticket.ticketNumber}</span>
            <Chip label={scfg?.label} cls={scfg?.cls} />
            <Chip label={pcfg?.label} cls={pcfg?.cls} />
            <span className={`flex items-center gap-1 text-[10px] font-semibold ${online ? "text-green-600" : "text-[#B0C4D8]"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${online ? "bg-green-500 animate-pulse" : "bg-[#D0E6F7]"}`} />
              {online ? "Live" : "Offline"}
            </span>
            {newMsgAlert && (
              <span className="text-[10px] font-bold text-white bg-[#1565C0] px-2 py-0.5 rounded-full animate-pulse">
                New message
              </span>
            )}
          </div>
          <p className="text-[14px] font-bold text-[#0D1B2A] truncate">{ticket.subject}</p>
        </div>
      </div>

      {/* ── Two-column body ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Left — thread */}
        <div className="flex flex-col flex-1 min-w-0 border-r border-[#EAF4FB]">

          {/* Passenger info strip */}
          <div className="flex items-center gap-3 px-5 py-3 bg-[#FAFCFF] border-b border-[#EAF4FB] flex-shrink-0">
            <Avatar name={ticket.raisedBy?.name || ""} size="md" />
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-bold text-[#0D1B2A] truncate">{ticket.raisedBy?.name}</p>
              <p className="text-[11px] text-[#B0C4D8] truncate">{ticket.raisedBy?.email}</p>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              {ticket.bookingId && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-[#1565C0] bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                  <i className="ti ti-ticket text-[11px]" />{ticket.bookingId.bookingReference}
                </span>
              )}
              {ticket.flightId && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-[#1565C0] bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                  <i className="ti ti-plane text-[11px]" />{ticket.flightId.flightNumber}
                </span>
              )}
              <span className="text-[10px] text-[#B0C4D8] capitalize bg-[#F0F7FF] px-2 py-0.5 rounded-md">
                {ticket.category}
              </span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 flex flex-col gap-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-[#B0C4D8]">
                <i className="ti ti-messages text-[32px]" />
                <p className="text-[12px]">No messages yet</p>
              </div>
            ) : messages.map((msg, i) => {
              const isAdmin = msg.senderRole === "admin";
              const isOpt   = !!msg._optimistic;
              return (
                <div key={msg._id ?? i} className={`flex gap-2.5 ${isAdmin ? "flex-row-reverse" : "flex-row"}`}>
                  <Avatar name={msg.sender?.name || (isAdmin ? "Admin" : "User")} size="sm" />
                  <div className={`flex flex-col gap-1 max-w-[75%] ${isAdmin ? "items-end" : "items-start"}`}>
                    <span className={`text-[10px] font-semibold ${isAdmin ? "text-[#1565C0]" : "text-[#7A90A4]"}`}>
                      {isAdmin ? `${msg.sender?.name ?? "Support"}` : (msg.sender?.name ?? "User")}
                      {isAdmin && <span className="ml-1 text-[9px] bg-[#1565C0] text-white px-1.5 py-0.5 rounded-full font-bold">ADMIN</span>}
                    </span>
                    <div className={`px-4 py-2.5 text-[13px] leading-relaxed ${
                      isAdmin
                        ? `bg-[#1565C0] text-white rounded-2xl rounded-tr-md ${isOpt ? "opacity-60" : ""}`
                        : "bg-white text-[#0D1B2A] rounded-2xl rounded-tl-md border border-[#E8F2FA]"
                    }`}>
                      {msg.message}
                    </div>
                    <span className="text-[10px] text-[#B0C4D8]">{isOpt ? "Sending…" : fmt(msg.createdAt)}</span>
                  </div>
                </div>
              );
            })}

            {typing && (
              <div className="flex gap-2.5">
                <Avatar name={typing} size="sm" />
                <div className="bg-white border border-[#E8F2FA] rounded-2xl rounded-tl-md px-4 py-2.5 flex items-center gap-2">
                  <span className="text-[11px] text-[#7A90A4]">{typing} is typing</span>
                  <span className="flex gap-0.5">
                    {[0,1,2].map((j) => (
                      <span key={j} className="w-1.5 h-1.5 bg-[#B0C4D8] rounded-full animate-bounce" style={{ animationDelay:`${j*150}ms` }} />
                    ))}
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Reply / closed notice */}
          <div className="px-5 py-4 border-t border-[#EAF4FB] flex-shrink-0">
            {isClosed ? (
              <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <i className="ti ti-circle-check text-green-600 text-[16px] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[12px] font-bold text-green-700 capitalize">Ticket {ticket.status}</p>
                  {ticket.resolutionNote && <p className="text-[11px] text-green-600 mt-0.5">{ticket.resolutionNote}</p>}
                </div>
              </div>
            ) : (
              <>
                {replyErr && <p className="text-[11px] text-red-500 mb-2">{replyErr}</p>}
                <div className="flex gap-2">
                  <input
                    className={`${inputCls} flex-1`}
                    placeholder="Reply to passenger… (Enter to send)"
                    value={reply}
                    onChange={(e) => handleReplyChange(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleReply(); } }}
                  />
                  <button
                    onClick={handleReply}
                    disabled={replying || !reply.trim()}
                    className="w-[42px] h-[42px] bg-[#1565C0] hover:bg-[#1251A3] text-white rounded-[10px] flex items-center justify-center flex-shrink-0 transition border-none cursor-pointer disabled:opacity-50"
                  >
                    {replying
                      ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <i className="ti ti-send text-[14px]" />}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right — controls sidebar */}
        <div className="w-[220px] flex-shrink-0 flex flex-col overflow-y-auto bg-[#FAFCFF]">

          {/* Timeline summary */}
          <div className="px-4 py-4 border-b border-[#EAF4FB]">
            <p className="text-[10px] font-bold text-[#B0C4D8] uppercase tracking-wider mb-3">Timeline</p>
            <div className="flex flex-col gap-2.5">
              {[
                { label: "Created",   value: fmt(ticket.createdAt)   },
                { label: "Updated",   value: fmt(ticket.updatedAt)   },
                { label: "Messages",  value: `${ticket.messages?.length ?? 0} total` },
                ...(ticket.resolvedAt ? [{ label:"Resolved", value: fmt(ticket.resolvedAt) }] : []),
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[10px] text-[#B0C4D8] font-medium">{label}</p>
                  <p className="text-[11px] font-semibold text-[#0D1B2A]">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Update ticket */}
          <div className="px-4 py-4 flex-1">
            <p className="text-[10px] font-bold text-[#B0C4D8] uppercase tracking-wider mb-3">Update ticket</p>

            <div className="flex flex-col gap-2.5">
              <div>
                <label className="block text-[10px] font-semibold text-[#7A90A4] uppercase tracking-wider mb-1.5">Status</label>
                <select
                  className={`${inputCls} h-9 text-[12px] cursor-pointer`}
                  value={statusForm.status}
                  onChange={(e) => setStatusForm((p) => ({ ...p, status: e.target.value }))}
                >
                  <option value="">— No change —</option>
                  {["open","in-progress","resolved","closed"].map((s) => (
                    <option key={s} value={s}>{STATUS_CFG[s]?.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-[#7A90A4] uppercase tracking-wider mb-1.5">Priority</label>
                <select
                  className={`${inputCls} h-9 text-[12px] cursor-pointer`}
                  value={statusForm.priority}
                  onChange={(e) => setStatusForm((p) => ({ ...p, priority: e.target.value }))}
                >
                  <option value="">— No change —</option>
                  {["low","medium","high","urgent"].map((p) => (
                    <option key={p} value={p}>{PRIORITY_CFG[p]?.label}</option>
                  ))}
                </select>
              </div>

              {["resolved","closed"].includes(statusForm.status) && (
                <div>
                  <label className="block text-[10px] font-semibold text-[#7A90A4] uppercase tracking-wider mb-1.5">Resolution note</label>
                  <textarea
                    className="w-full px-3 py-2 text-[12px] text-[#0D1B2A] bg-[#F0F7FF] border border-[#D0E6F7] rounded-[10px] outline-none focus:border-[#1565C0] transition placeholder:text-[#B0C4D8] resize-none"
                    rows={3}
                    placeholder="Note shown to user…"
                    value={statusForm.resolutionNote}
                    onChange={(e) => setStatusForm((p) => ({ ...p, resolutionNote: e.target.value }))}
                  />
                </div>
              )}

              <button
                onClick={handleStatusUpdate}
                disabled={updating || (!statusForm.status && !statusForm.priority)}
                className="w-full h-9 bg-[#1565C0] hover:bg-[#1251A3] text-white text-[12px] font-bold rounded-[10px] border-none cursor-pointer disabled:opacity-50 transition"
              >
                {updating ? "Saving…" : "Apply changes"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────── main page ── */

export default function AdminSupportPage() {
  const { userData } = useSelector((s) => s.auth);

  const [filters, setFilters]           = useState({ status:"all", priority:"all", category:"all", search:"" });
  const [page,    setPage]              = useState(1);
  const [activeId, setActiveId]         = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [liveTickets,  setLiveTickets]  = useState([]);

  const { data, isLoading, refetch } = useGetAllTicketsQuery({ ...filters, page, limit: 15 });
  const [deleteTicket, { isLoading: deleting }] = useDeleteTicketMutation();

  const tickets    = data?.data       ?? [];
  const stats      = data?.stats      ?? {};
  const total      = data?.total      ?? 0;
  const totalPages = data?.totalPages ?? 1;

  /* admin feed socket */
  useEffect(() => {
    const socket = getSocket();
    joinAdminFeed();

    socket.on("new_ticket", ({ ticket }) => {
      setLiveTickets((prev) => [...prev, ticket._id]);
      refetch();
      setTimeout(() => setLiveTickets((prev) => prev.filter((id) => id !== ticket._id)), 5000);
    });
    socket.on("ticket_list_updated", () => refetch());

    return () => { socket.off("new_ticket"); socket.off("ticket_list_updated"); };
  }, []);

  const setFilter = (k, v) => { setFilters((p) => ({ ...p, [k]: v })); setPage(1); };

  const handleDelete = async () => {
    try {
      await deleteTicket(deleteTarget._id).unwrap();
      if (activeId === deleteTarget._id) setActiveId(null);
      setDeleteTarget(null);
      refetch();
    } catch (err) { console.error(err); }
  };

  const totalStat = (stats.open||0)+(stats.inProgress||0)+(stats.resolved||0)+(stats.closed||0);

  return (
    <>
      {/* ── Stat cards ── */}
      <div className="grid grid-cols-5 gap-3.5 mb-6">
        {[
          { label:"Total",       value: totalStat,       icon:"ti-ticket",         color:"bg-blue-50 text-blue-700",   pulse:false },
          { label:"Open",        value: stats.open,      icon:"ti-mail-opened",    color:"bg-sky-50 text-sky-700",     pulse:true  },
          { label:"In Progress", value: stats.inProgress,icon:"ti-loader",         color:"bg-amber-50 text-amber-700", pulse:false },
          { label:"Resolved",    value: stats.resolved,  icon:"ti-circle-check",   color:"bg-green-50 text-green-700", pulse:false },
          { label:"Urgent",      value: stats.urgent,    icon:"ti-alert-triangle", color:"bg-red-50 text-red-700",     pulse:true  },
        ].map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      {/* ── Filters ── */}
      <div className="bg-white border border-[#D0E6F7] rounded-2xl p-4 mb-4 flex flex-wrap gap-2.5 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <i className="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-[#B0C4D8] text-[13px]" />
          <input
            className="h-9 pl-8 pr-3 text-[12px] bg-[#F0F7FF] border border-[#D0E6F7] rounded-lg outline-none focus:border-[#1565C0] w-full placeholder:text-[#B0C4D8] text-[#0D1B2A] transition"
            placeholder="Search ticket # or subject…"
            value={filters.search}
            onChange={(e) => setFilter("search", e.target.value)}
          />
        </div>
        {[
          { key:"status",   opts:["all","open","in-progress","resolved","closed"],    label:(v) => v==="all"?"All status":STATUS_CFG[v]?.label    },
          { key:"priority", opts:["all","low","medium","high","urgent"],              label:(v) => v==="all"?"All priority":PRIORITY_CFG[v]?.label },
          { key:"category", opts:CATEGORIES,                                          label:(v) => v==="all"?"All categories":v.charAt(0).toUpperCase()+v.slice(1) },
        ].map(({ key, opts, label }) => (
          <select key={key}
            className="h-9 px-3 text-[12px] bg-[#F0F7FF] border border-[#D0E6F7] rounded-lg outline-none focus:border-[#1565C0] text-[#0D1B2A] cursor-pointer transition"
            value={filters[key]}
            onChange={(e) => setFilter(key, e.target.value)}
          >
            {opts.map((o) => <option key={o} value={o}>{label(o)}</option>)}
          </select>
        ))}
      </div>

      {/* ── Table ── */}
      <div className="bg-white border border-[#D0E6F7] rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#D0E6F7] flex items-center justify-between">
          <p className="text-[11px] font-semibold text-[#5A7089] uppercase tracking-[0.8px]">
            Support tickets <span className="ml-1 font-medium text-[#B0C4D8] normal-case">({total})</span>
          </p>
          {liveTickets.length > 0 && (
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#1565C0] bg-blue-50 px-2.5 py-1 rounded-full animate-pulse">
              <span className="w-1.5 h-1.5 bg-[#1565C0] rounded-full" />
              {liveTickets.length} new ticket{liveTickets.length > 1 ? "s" : ""}
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="border-b border-[#EAF4FB]">
                {["Ticket","User","Subject","Category","Priority","Status","Messages","Actions"].map((h) => (
                  <th key={h} className="text-[10px] font-semibold text-[#7A90A4] uppercase tracking-[0.5px] px-4 py-3 text-left whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [1,2,3,4,5].map((i) => (
                  <tr key={i} className="border-b border-[#F0F7FF]">
                    <td colSpan={8} className="px-4 py-3">
                      <div className="h-10 bg-[#F0F7FF] rounded-xl animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <i className="ti ti-ticket-off text-[36px] text-[#D0E6F7] block mb-2" />
                    <p className="text-[13px] text-[#7A90A4]">No tickets found</p>
                  </td>
                </tr>
              ) : tickets.map((t) => {
                const isActive = activeId === t._id;
                const isNew    = liveTickets.includes(t._id);
                const scfg = STATUS_CFG[t.status];
                const pcfg = PRIORITY_CFG[t.priority];
                const catIcon = CATEGORY_ICONS[t.category] || "ti-message";

                return (
                  <tr key={t._id}
                    onClick={() => setActiveId(isActive ? null : t._id)}
                    className={`border-b border-[#F0F7FF] cursor-pointer transition-all
                      ${isActive ? "bg-[#EAF4FB]" : isNew ? "bg-blue-50" : "hover:bg-[#FAFCFF]"}`}
                  >
                    {/* Ticket # */}
                    <td className="px-4 py-3 align-middle">
                      <p className="text-[12px] font-bold text-[#1565C0]">{t.ticketNumber}</p>
                      <p className="text-[10px] text-[#B0C4D8]">{fmtShort(t.createdAt)}</p>
                    </td>
                    {/* User */}
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center gap-2">
                        <Avatar name={t.raisedBy?.name || ""} />
                        <div className="min-w-0">
                          <p className="text-[12px] font-semibold text-[#0D1B2A] truncate max-w-[100px]">{t.raisedBy?.name ?? "—"}</p>
                          <p className="text-[10px] text-[#B0C4D8] truncate max-w-[100px]">{t.raisedBy?.email}</p>
                        </div>
                      </div>
                    </td>
                    {/* Subject */}
                    <td className="px-4 py-3 align-middle">
                      <p className="text-[12px] font-medium text-[#0D1B2A] max-w-[160px] truncate">{t.subject}</p>
                    </td>
                    {/* Category */}
                    <td className="px-4 py-3 align-middle">
                      <span className="flex items-center gap-1 text-[11px] text-[#7A90A4] capitalize">
                        <i className={`ti ${catIcon} text-[12px]`} />{t.category}
                      </span>
                    </td>
                    {/* Priority */}
                    <td className="px-4 py-3 align-middle">
                      <Chip label={pcfg?.label} cls={pcfg?.cls} />
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${scfg?.dot}`} />
                        <Chip label={scfg?.label} cls={scfg?.cls} />
                      </div>
                    </td>
                    {/* Messages */}
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[12px] font-semibold text-[#0D1B2A]">{t.messages?.length ?? 0}</span>
                        {t.unreadByAdmin > 0 && (
                          <span className="text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                            {t.unreadByAdmin}
                          </span>
                        )}
                      </div>
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3 align-middle" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setActiveId(isActive ? null : t._id)}
                          className={`w-7 h-7 rounded-md border flex items-center justify-center transition cursor-pointer
                            ${isActive ? "bg-[#1565C0] border-[#1565C0] text-white" : "border-[#D0E6F7] bg-[#F0F7FF] text-[#1565C0] hover:bg-[#E1EFFE]"}`}
                          title="Open thread"
                        >
                          <i className="ti ti-message-circle text-[12px]" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(t)}
                          className="w-7 h-7 rounded-md border border-red-100 bg-red-50 flex items-center justify-center text-red-500 hover:bg-red-100 transition cursor-pointer"
                          title="Delete"
                        >
                          <i className="ti ti-trash text-[12px]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-[#D0E6F7]">
            <p className="text-[11px] text-[#B0C4D8]">Showing {tickets.length} of {total} tickets</p>
            <div className="flex items-center gap-1.5">
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
                className="w-7 h-7 rounded-md border border-[#D0E6F7] bg-[#F0F7FF] flex items-center justify-center text-[#1565C0] hover:bg-[#E1EFFE] disabled:opacity-40 cursor-pointer transition">
                <i className="ti ti-chevron-left text-[13px]" />
              </button>
              <span className="text-[12px] text-[#7A90A4] px-1">{page} / {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}
                className="w-7 h-7 rounded-md border border-[#D0E6F7] bg-[#F0F7FF] flex items-center justify-center text-[#1565C0] hover:bg-[#E1EFFE] disabled:opacity-40 cursor-pointer transition">
                <i className="ti ti-chevron-right text-[13px]" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Ticket modal ── */}
      {activeId && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-5"
          style={{ background:"rgba(13,27,42,0.5)", backdropFilter:"blur(3px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setActiveId(null); }}
        >
          <div
            className="bg-white border border-[#D0E6F7] rounded-2xl shadow-2xl w-full overflow-hidden"
            style={{ maxWidth:"860px", height:"min(90vh, 760px)", display:"flex", flexDirection:"column" }}
          >
            <TicketDetailPanel ticketId={activeId} onClose={() => setActiveId(null)} />
          </div>
        </div>
      )}

      {/* ── Delete confirm modal ── */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center p-4"
          style={{ background:"rgba(0,0,0,0.45)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteTarget(null); }}
        >
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <i className="ti ti-trash text-red-500 text-[22px]" />
            </div>
            <p className="font-bold text-[#0D1B2A] mb-1">Delete {deleteTarget.ticketNumber}?</p>
            <p className="text-[12px] text-[#7A90A4] mb-5 leading-relaxed">
              This will permanently delete the ticket and all its messages. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 h-10 border border-[#D0E6F7] bg-[#F0F7FF] text-[#1565C0] text-[13px] font-medium rounded-[10px] cursor-pointer hover:bg-[#E1EFFE] transition">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 h-10 bg-red-500 hover:bg-red-600 text-white text-[13px] font-bold rounded-[10px] border-none cursor-pointer disabled:opacity-60 transition">
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}