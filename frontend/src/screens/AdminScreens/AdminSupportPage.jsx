// src/pages/admin/SupportPage.jsx
import { useState } from "react";
import { Th, Td } from "../../components/admin/shared/AdminTable";
import Badge from "../../components/admin/shared/Badge";
import {
  useGetAllTicketsQuery,
  useGetTicketByIdQuery,
  useReplyToTicketMutation,
  useUpdateTicketStatusMutation,
  useDeleteTicketMutation,
} from "../../slices/supportApiSlice";
import { useSelector } from "react-redux";

/* -------------------------------------------------------------------------- */
/*                               CONSTANTS                                    */
/* -------------------------------------------------------------------------- */

const STATUS_CFG = {
  open:          { label: "Open",        cls: "bg-blue-50 text-blue-700 border border-blue-200"    },
  "in-progress": { label: "In Progress", cls: "bg-amber-50 text-amber-700 border border-amber-200" },
  resolved:      { label: "Resolved",    cls: "bg-green-50 text-green-700 border border-green-200" },
  closed:        { label: "Closed",      cls: "bg-slate-100 text-slate-500 border border-slate-200"},
};
const PRIORITY_CFG = {
  low:    { label: "Low",    cls: "bg-slate-100 text-slate-500"   },
  medium: { label: "Medium", cls: "bg-blue-50 text-blue-600"      },
  high:   { label: "High",   cls: "bg-orange-50 text-orange-600"  },
  urgent: { label: "Urgent", cls: "bg-red-50 text-red-600 font-bold" },
};
const CATEGORIES = ["all","general","booking","flight","payment","baggage","refund","other"];

const fmt = (dt) =>
  dt ? new Date(dt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true }) : "—";

const inputCls = "w-full h-[42px] px-3 text-[13px] text-[#0D1B2A] bg-[#F0F7FF] border border-[#D0E6F7] rounded-[10px] outline-none focus:border-[#1565C0] transition placeholder:text-[#B0C4D8]";

/* -------------------------------------------------------------------------- */
/*                           STAT CARD                                        */
/* -------------------------------------------------------------------------- */

function StatCard({ label, value, icon, color }) {
  return (
    <div className="bg-white border border-[#D0E6F7] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-medium text-[#7A90A4] uppercase tracking-[0.6px]">{label}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <i className={`ti ${icon} text-[15px]`} />
        </div>
      </div>
      <p className="text-[26px] font-semibold text-[#0D1B2A] leading-none">{value ?? "—"}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                        TICKET DETAIL PANEL                                 */
/* -------------------------------------------------------------------------- */

function TicketDetailPanel({ ticketId, onClose }) {
  const { userData }   = useSelector((s) => s.auth);
  const { data, isLoading, refetch } = useGetTicketByIdQuery(ticketId);
  const [reply, setReply]   = useState("");
  const [statusForm, setStatusForm] = useState({ status: "", resolutionNote: "", priority: "" });
  const [replyToTicket,      { isLoading: replying  }] = useReplyToTicketMutation();
  const [updateTicketStatus, { isLoading: updating  }] = useUpdateTicketStatusMutation();

  const ticket = data?.data;

  const handleReply = async () => {
    if (!reply.trim()) return;
    try {
      await replyToTicket({ id: ticketId, message: reply.trim() }).unwrap();
      setReply("");
      refetch();
    } catch (err) { console.error(err); }
  };

  const handleStatusUpdate = async () => {
    if (!statusForm.status && !statusForm.priority) return;
    try {
      await updateTicketStatus({ id: ticketId, ...statusForm }).unwrap();
      setStatusForm({ status: "", resolutionNote: "", priority: "" });
      refetch();
    } catch (err) { console.error(err); }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <div className="w-8 h-8 border-4 border-[#1565C0] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!ticket) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="flex items-center justify-between mb-5 flex-shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-[11px] font-bold text-[#7A90A4]">{ticket.ticketNumber}</p>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_CFG[ticket.status]?.cls}`}>
              {STATUS_CFG[ticket.status]?.label}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PRIORITY_CFG[ticket.priority]?.cls}`}>
              {PRIORITY_CFG[ticket.priority]?.label}
            </span>
          </div>
          <p className="text-[15px] font-bold text-[#0D1B2A]">{ticket.subject}</p>
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-lg border border-[#D0E6F7] bg-[#F0F7FF] flex items-center justify-center text-[#1565C0] hover:bg-[#E1EFFE] transition cursor-pointer">
          <i className="ti ti-x text-[14px]" />
        </button>
      </div>

      {/* User info */}
      <div className="bg-[#F0F7FF] rounded-xl p-3 mb-4 flex-shrink-0">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[12px]">
          {[
            ["Raised by",  ticket.raisedBy?.name],
            ["Email",      ticket.raisedBy?.email],
            ["Category",   ticket.category],
            ["Created",    fmt(ticket.createdAt)],
            ...(ticket.bookingId ? [["Booking", ticket.bookingId.bookingReference]] : []),
            ...(ticket.flightId  ? [["Flight",  ticket.flightId.flightNumber]] : []),
          ].map(([label, value]) => (
            <div key={label} className="flex gap-1">
              <span className="text-[#7A90A4]">{label}:</span>
              <span className="font-semibold text-[#0D1B2A] truncate">{value ?? "—"}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Message thread */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-3 mb-4 pr-1" style={{ minHeight: 0 }}>
        {ticket.messages.map((msg, i) => {
          const isAdmin = msg.senderRole === "admin";
          return (
            <div key={i} className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] flex flex-col gap-0.5 ${isAdmin ? "items-end" : "items-start"}`}>
                <p className={`text-[10px] font-semibold ${isAdmin ? "text-[#1565C0]" : "text-[#7A90A4]"}`}>
                  {isAdmin ? `${msg.sender?.name ?? "Admin"} (Support)` : msg.sender?.name ?? "User"}
                </p>
                <div className={`px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed ${
                  isAdmin
                    ? "bg-[#1565C0] text-white rounded-tr-md"
                    : "bg-white border border-[#D0E6F7] text-[#0D1B2A] rounded-tl-md"
                }`}>
                  {msg.message}
                </div>
                <p className="text-[10px] text-[#B0C4D8]">{fmt(msg.createdAt)}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reply box */}
      {!["resolved","closed"].includes(ticket.status) && (
        <div className="flex gap-2 mb-4 flex-shrink-0">
          <input
            className={`${inputCls} flex-1`}
            placeholder="Reply to passenger..."
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleReply()}
          />
          <button
            onClick={handleReply}
            disabled={replying || !reply.trim()}
            className="h-[42px] px-4 bg-[#1565C0] hover:bg-[#1251A3] text-white rounded-[10px] text-[13px] font-bold border-none cursor-pointer disabled:opacity-50 transition flex items-center gap-1.5"
          >
            {replying
              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <i className="ti ti-send text-[14px]" />}
          </button>
        </div>
      )}

      {/* Status / priority update */}
      <div className="bg-[#F0F7FF] rounded-xl p-3 border border-[#D0E6F7] flex-shrink-0">
        <p className="text-[11px] font-bold text-[#7A90A4] uppercase tracking-wider mb-2">Update ticket</p>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <select
            className={inputCls}
            value={statusForm.status}
            onChange={(e) => setStatusForm((p) => ({ ...p, status: e.target.value }))}
          >
            <option value="">— Change status —</option>
            {["open","in-progress","resolved","closed"].map((s) => (
              <option key={s} value={s}>{STATUS_CFG[s]?.label}</option>
            ))}
          </select>
          <select
            className={inputCls}
            value={statusForm.priority}
            onChange={(e) => setStatusForm((p) => ({ ...p, priority: e.target.value }))}
          >
            <option value="">— Change priority —</option>
            {["low","medium","high","urgent"].map((p) => (
              <option key={p} value={p}>{PRIORITY_CFG[p]?.label}</option>
            ))}
          </select>
        </div>
        {(statusForm.status === "resolved" || statusForm.status === "closed") && (
          <input
            className={`${inputCls} mb-2`}
            placeholder="Resolution note (shown to user)..."
            value={statusForm.resolutionNote}
            onChange={(e) => setStatusForm((p) => ({ ...p, resolutionNote: e.target.value }))}
          />
        )}
        <button
          onClick={handleStatusUpdate}
          disabled={updating || (!statusForm.status && !statusForm.priority)}
          className="w-full h-9 bg-[#1565C0] hover:bg-[#1251A3] text-white text-[12px] font-bold rounded-[10px] border-none cursor-pointer disabled:opacity-50 transition"
        >
          {updating ? "Updating..." : "Apply changes"}
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                           ADMIN MAIN PAGE                                  */
/* -------------------------------------------------------------------------- */

export default function AdminSupportPage() {
  const [filters, setFilters] = useState({ status: "all", priority: "all", category: "all", search: "" });
  const [page,    setPage]    = useState(1);
  const [activeId, setActiveId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data, isLoading } = useGetAllTicketsQuery({ ...filters, page, limit: 15 });
  const [deleteTicket, { isLoading: deleting }] = useDeleteTicketMutation();

  const tickets    = data?.data   ?? [];
  const stats      = data?.stats  ?? {};
  const total      = data?.total  ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const setFilter = (k, v) => { setFilters((p) => ({ ...p, [k]: v })); setPage(1); };

  const handleDelete = async () => {
    try {
      await deleteTicket(deleteTarget._id).unwrap();
      setDeleteTarget(null);
      if (activeId === deleteTarget._id) setActiveId(null);
    } catch (err) { console.error(err); }
  };

  const statCards = [
    { label: "Total",       value: stats.open + stats.inProgress + stats.resolved + stats.closed, icon: "ti-ticket",         color: "bg-blue-50 text-blue-700"   },
    { label: "Open",        value: stats.open,        icon: "ti-mail-opened",    color: "bg-sky-50 text-sky-700"    },
    { label: "In Progress", value: stats.inProgress,  icon: "ti-loader",         color: "bg-amber-50 text-amber-700"},
    { label: "Resolved",    value: stats.resolved,    icon: "ti-circle-check",   color: "bg-green-50 text-green-700"},
    { label: "Urgent",      value: stats.urgent,      icon: "ti-alert-triangle", color: "bg-red-50 text-red-700"   },
  ];

  return (
    <div className="flex gap-5 h-full">

      {/* ── Left: list ── */}
      <div className={`flex flex-col ${activeId ? "w-[55%]" : "w-full"} transition-all duration-300`}>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-3 mb-5">
          {statCards.map((s) => <StatCard key={s.label} {...s} />)}
        </div>

        {/* Filters */}
        <div className="bg-white border border-[#D0E6F7] rounded-2xl p-4 mb-4">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-[180px]">
              <i className="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-[#B0C4D8] text-[14px]" />
              <input
                className="h-9 pl-8 pr-3 text-[12px] bg-[#F0F7FF] border border-[#D0E6F7] rounded-lg outline-none focus:border-[#1565C0] transition w-full placeholder:text-[#B0C4D8] text-[#0D1B2A]"
                placeholder="Search ticket # or subject..."
                value={filters.search}
                onChange={(e) => setFilter("search", e.target.value)}
              />
            </div>
            {/* Status */}
            <select className="h-9 px-3 text-[12px] bg-[#F0F7FF] border border-[#D0E6F7] rounded-lg outline-none focus:border-[#1565C0] text-[#0D1B2A]"
              value={filters.status} onChange={(e) => setFilter("status", e.target.value)}>
              {["all","open","in-progress","resolved","closed"].map((s) => (
                <option key={s} value={s}>{s === "all" ? "All status" : STATUS_CFG[s]?.label}</option>
              ))}
            </select>
            {/* Priority */}
            <select className="h-9 px-3 text-[12px] bg-[#F0F7FF] border border-[#D0E6F7] rounded-lg outline-none focus:border-[#1565C0] text-[#0D1B2A]"
              value={filters.priority} onChange={(e) => setFilter("priority", e.target.value)}>
              {["all","low","medium","high","urgent"].map((p) => (
                <option key={p} value={p}>{p === "all" ? "All priority" : PRIORITY_CFG[p]?.label}</option>
              ))}
            </select>
            {/* Category */}
            <select className="h-9 px-3 text-[12px] bg-[#F0F7FF] border border-[#D0E6F7] rounded-lg outline-none focus:border-[#1565C0] text-[#0D1B2A]"
              value={filters.category} onChange={(e) => setFilter("category", e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c === "all" ? "All categories" : c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-[#D0E6F7] rounded-2xl overflow-hidden flex-1">
          <div className="px-5 py-3 border-b border-[#D0E6F7] flex items-center justify-between">
            <p className="text-[11px] font-semibold text-[#5A7089] uppercase tracking-[0.8px]">
              Support tickets ({total})
            </p>
            {total > 0 && (
              <p className="text-[11px] text-[#B0C4D8]">
                Page {page} of {totalPages}
              </p>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <Th>Ticket</Th>
                  <Th>User</Th>
                  <Th>Subject</Th>
                  <Th>Category</Th>
                  <Th>Priority</Th>
                  <Th>Status</Th>
                  <Th>Messages</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-[13px] text-[#7A90A4]">Loading...</td>
                  </tr>
                ) : tickets.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-[13px] text-[#7A90A4]">No tickets found</td>
                  </tr>
                ) : tickets.map((t) => (
                  <tr
                    key={t._id}
                    onClick={() => setActiveId(activeId === t._id ? null : t._id)}
                    className={`cursor-pointer transition ${activeId === t._id ? "bg-[#EAF4FB]" : "hover:bg-[#F8FBFF]"}`}
                  >
                    <Td>
                      <div>
                        <p className="font-bold text-[#1565C0] text-[12px]">{t.ticketNumber}</p>
                        <p className="text-[10px] text-[#B0C4D8]">{fmt(t.createdAt)}</p>
                      </div>
                    </Td>
                    <Td>
                      <div>
                        <p className="font-semibold text-[#0D1B2A] text-[12px]">{t.raisedBy?.name ?? "—"}</p>
                        <p className="text-[10px] text-[#B0C4D8]">{t.raisedBy?.email}</p>
                      </div>
                    </Td>
                    <Td>
                      <p className="text-[12px] text-[#0D1B2A] font-medium max-w-[160px] truncate">{t.subject}</p>
                    </Td>
                    <Td>
                      <span className="text-[11px] capitalize text-[#7A90A4]">{t.category}</span>
                    </Td>
                    <Td>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${PRIORITY_CFG[t.priority]?.cls}`}>
                        {PRIORITY_CFG[t.priority]?.label}
                      </span>
                    </Td>
                    <Td>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_CFG[t.status]?.cls}`}>
                        {STATUS_CFG[t.status]?.label}
                      </span>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[12px] text-[#0D1B2A]">{t.messages?.length ?? 0}</span>
                        {t.unreadByAdmin > 0 && (
                          <span className="text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full">
                            {t.unreadByAdmin}
                          </span>
                        )}
                      </div>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setActiveId(activeId === t._id ? null : t._id)}
                          className="w-7 h-7 rounded-md border border-[#D0E6F7] bg-[#F0F7FF] flex items-center justify-center text-[#1565C0] hover:bg-[#E1EFFE] transition cursor-pointer"
                          title="View thread"
                        >
                          <i className="ti ti-message text-[13px]" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(t)}
                          className="w-7 h-7 rounded-md border border-red-100 bg-red-50 flex items-center justify-center text-red-500 hover:bg-red-100 transition cursor-pointer"
                          title="Delete"
                        >
                          <i className="ti ti-trash text-[13px]" />
                        </button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-[#D0E6F7]">
              <p className="text-[11px] text-[#B0C4D8]">Showing {tickets.length} of {total}</p>
              <div className="flex items-center gap-1.5">
                <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
                  className="w-7 h-7 rounded-md border border-[#D0E6F7] bg-[#F0F7FF] flex items-center justify-center text-[#1565C0] hover:bg-[#E1EFFE] transition disabled:opacity-40 cursor-pointer">
                  <i className="ti ti-chevron-left text-[13px]" />
                </button>
                <span className="text-[12px] text-[#7A90A4] px-1">{page} / {totalPages}</span>
                <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}
                  className="w-7 h-7 rounded-md border border-[#D0E6F7] bg-[#F0F7FF] flex items-center justify-center text-[#1565C0] hover:bg-[#E1EFFE] transition disabled:opacity-40 cursor-pointer">
                  <i className="ti ti-chevron-right text-[13px]" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Right: thread panel ── */}
      {activeId && (
        <div className="w-[45%] bg-white border border-[#D0E6F7] rounded-2xl p-5 flex flex-col" style={{ height: "calc(100vh - 120px)", position: "sticky", top: "80px" }}>
          <TicketDetailPanel ticketId={activeId} onClose={() => setActiveId(null)} />
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <i className="ti ti-trash text-red-500 text-[22px]" />
            </div>
            <p className="font-bold text-[#0D1B2A] mb-1">Delete {deleteTarget.ticketNumber}?</p>
            <p className="text-[12px] text-[#7A90A4] mb-5">This will permanently delete the ticket and all its messages.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 h-10 border border-[#D0E6F7] bg-[#F0F7FF] text-[#1565C0] text-[13px] font-medium rounded-[10px] cursor-pointer hover:bg-[#E1EFFE] transition">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 h-10 bg-red-500 hover:bg-red-600 text-white text-[13px] font-bold rounded-[10px] border-none cursor-pointer disabled:opacity-60 transition">
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}