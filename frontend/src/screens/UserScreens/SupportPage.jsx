// src/pages/user/SupportPage.jsx
import { useState, useRef, useEffect } from "react";
import { useSelector } from "react-redux";
import UserNavbar from "../../components/UserNavbar";
import {
  useCreateTicketMutation,
  useGetMyTicketsQuery,
  useGetTicketByIdQuery,
  useReplyToTicketMutation,
} from "../../slices/supportApiSlice";
import {
  getSocket,
  joinTicketRoom,
  leaveTicketRoom,
  emitTyping,
} from "../../services/socketService";

// ── Constants ──────────────────────────────────────────
const CATEGORIES = [
  "general",
  "booking",
  "flight",
  "payment",
  "baggage",
  "refund",
  "other",
];

const STATUS_CFG = {
  open: {
    label: "Open",
    cls: "bg-blue-100 text-blue-700",
    dot: "bg-blue-500",
    icon: "ti-mail-opened",
  },
  "in-progress": {
    label: "In Progress",
    cls: "bg-amber-100 text-amber-700",
    dot: "bg-amber-500",
    icon: "ti-loader",
  },
  resolved: {
    label: "Resolved",
    cls: "bg-green-100 text-green-700",
    dot: "bg-green-500",
    icon: "ti-circle-check",
  },
  closed: {
    label: "Closed",
    cls: "bg-slate-100 text-slate-500",
    dot: "bg-slate-400",
    icon: "ti-lock",
  },
};

const PRIORITY_CFG = {
  low: {
    label: "Low",
    cls: "bg-slate-100 text-slate-500",
    icon: "ti-arrow-down-circle",
  },
  medium: {
    label: "Medium",
    cls: "bg-blue-100 text-blue-600",
    icon: "ti-circle-dot",
  },
  high: {
    label: "High",
    cls: "bg-orange-100 text-orange-600",
    icon: "ti-arrow-up-circle",
  },
  urgent: {
    label: "Urgent",
    cls: "bg-red-100 text-red-600",
    icon: "ti-alert-circle",
  },
};

const CATEGORY_META = {
  general: { icon: "ti-message-circle", label: "General" },
  booking: { icon: "ti-ticket", label: "Booking" },
  flight: { icon: "ti-plane", label: "Flight" },
  payment: { icon: "ti-credit-card", label: "Payment" },
  baggage: { icon: "ti-briefcase", label: "Baggage" },
  refund: { icon: "ti-receipt-refund", label: "Refund" },
  other: { icon: "ti-dots-circle-horizontal", label: "Other" },
};

const fmt = (dt) =>
  dt
    ? new Date(dt).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : "—";

const fmtShort = (dt) =>
  dt
    ? new Date(dt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const inputCls =
  "w-full h-11 px-3 text-[13px] text-[#0C3060] bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#0C3060] focus:ring-2 focus:ring-blue-50 transition placeholder:text-slate-300";

// ── Shared primitives ──────────────────────────────────
function Badge({ label, cls }) {
  return (
    <span
      className={`text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${cls}`}
    >
      {label}
    </span>
  );
}

function Spinner({ size = "md", color = "border-[#0C3060]" }) {
  const s = {
    sm: "w-4 h-4 border-2",
    md: "w-7 h-7 border-3",
    lg: "w-10 h-10 border-4",
  };
  return (
    <div
      className={`${s[size]} ${color} border-t-transparent rounded-full animate-spin`}
    />
  );
}

// ── Ticket thread ──────────────────────────────────────
function TicketThread({ ticketId, onBack }) {
  const { userData } = useSelector((s) => s.auth);
  const { data, isLoading, refetch } = useGetTicketByIdQuery(ticketId, {
    pollingInterval: 20000,
  });
  const [replyToTicket, { isLoading: replying }] = useReplyToTicketMutation();
  const [reply, setReply] = useState("");
  const [replyErr, setReplyErr] = useState("");
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(null);
  const [online, setOnline] = useState(false);
  const [newFlash, setNewFlash] = useState(false);
  const bottomRef = useRef(null);
  const typingTimer = useRef(null);
  const ticket = data?.data;

  useEffect(() => {
    if (ticket?.messages) setMessages(ticket.messages);
  }, [ticket?.messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // ── Socket ────────────────────────────────────────────
  useEffect(() => {
    if (!ticketId) return;
    const socket = getSocket();
    joinTicketRoom(ticketId);
    setOnline(socket.connected);

    socket.on("new_message", ({ ticketId: tId, message }) => {
      if (tId !== ticketId) return;
      setMessages((prev) => {
        const exists = prev.some(
          (m) => m._id && String(m._id) === String(message._id),
        );
        return exists ? prev : [...prev, message];
      });
      setNewFlash(true);
      setTimeout(() => setNewFlash(false), 2000);
    });
    socket.on("ticket_updated", ({ ticketId: tId }) => {
      if (tId === ticketId) refetch();
    });
    socket.on("user_typing", ({ userId, name, isTyping }) => {
      if (String(userId) === String(userData?._id)) return;
      setTyping(isTyping ? name : null);
    });
    socket.on("connect", () => setOnline(true));
    socket.on("disconnect", () => setOnline(false));

    return () => {
      leaveTicketRoom(ticketId);
      socket.off("new_message");
      socket.off("ticket_updated");
      socket.off("user_typing");
      socket.off("connect");
      socket.off("disconnect");
    };
  }, [ticketId, userData?._id]);

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
      sender: { _id: userData?._id, name: userData?.name },
      senderRole: "passenger",
      message: reply.trim(),
      createdAt: new Date().toISOString(),
      _opt: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    setReply("");

    try {
      await replyToTicket({
        id: ticketId,
        message: optimistic.message,
      }).unwrap();
      refetch();
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m._id !== optimistic._id));
      setReply(optimistic.message);
      setReplyErr(err?.data?.message ?? "Failed to send reply");
    }
  };

  if (isLoading)
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  if (!ticket) return null;

  const isClosed = ["resolved", "closed"].includes(ticket.status);
  const scfg = STATUS_CFG[ticket.status];
  const pcfg = PRIORITY_CFG[ticket.priority];
  const catMeta = CATEGORY_META[ticket.category] || CATEGORY_META.general;

  return (
    <div className="flex flex-col h-full">
      {/* ── Thread header ── */}
      <div className="flex items-start gap-3 pb-5 mb-5 border-b border-slate-100 flex-shrink-0">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-[#0C3060] transition cursor-pointer flex-shrink-0 mt-0.5"
        >
          <i className="ti ti-arrow-left text-[15px]" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="text-[11px] font-bold text-slate-400">
              {ticket.ticketNumber}
            </span>
            <span
              className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${scfg?.cls}`}
            >
              <i className={`ti ${scfg?.icon} text-[10px]`} />
              {scfg?.label}
            </span>
            <span
              className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${pcfg?.cls}`}
            >
              <i className={`ti ${pcfg?.icon} text-[10px]`} />
              {pcfg?.label}
            </span>
            <span
              className={`flex items-center gap-1 text-[10px] font-semibold ${online ? "text-green-600" : "text-slate-400"}`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${online ? "bg-green-500 animate-pulse" : "bg-slate-300"}`}
              />
              {online ? "Live" : "Offline"}
            </span>
            {newFlash && (
              <span className="text-[10px] font-bold text-[#0C3060] bg-blue-100 px-2 py-0.5 rounded-full animate-pulse">
                New reply!
              </span>
            )}
          </div>
          <h2 className="text-[16px] font-bold text-[#0C3060] leading-tight">
            {ticket.subject}
          </h2>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="flex items-center gap-1 text-[11px] text-slate-400">
              <i className={`ti ${catMeta.icon} text-[12px]`} />
              {catMeta.label}
            </span>
            <span className="text-[10px] text-slate-300">·</span>
            <span className="text-[11px] text-slate-400">
              {fmtShort(ticket.createdAt)}
            </span>
            <span className="text-[10px] text-slate-300">·</span>
            <span className="text-[11px] text-slate-400">
              {messages.length} message{messages.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>

      {/* ── Linked context ── */}
      {(ticket.bookingId || ticket.flightId) && (
        <div className="flex flex-wrap gap-2 mb-4 flex-shrink-0">
          {ticket.bookingId && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
              <i className="ti ti-ticket text-[#0C3060] text-[13px]" />
              <div>
                <p className="text-[11px] font-bold text-[#0C3060]">
                  {ticket.bookingId.bookingReference}
                </p>
                <p className="text-[10px] text-slate-400 capitalize">
                  {ticket.bookingId.status}
                </p>
              </div>
            </div>
          )}
          {ticket.flightId && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
              <i className="ti ti-plane text-[#0C3060] text-[13px]" />
              <div>
                <p className="text-[11px] font-bold text-[#0C3060]">
                  {ticket.flightId.flightNumber}
                </p>
                <p className="text-[10px] text-slate-400">
                  {ticket.flightId.source} → {ticket.flightId.destination}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Messages ── */}
      <div
        className="flex-1 overflow-y-auto flex flex-col gap-4 mb-4 pr-1"
        style={{ minHeight: "200px", maxHeight: "440px" }}
      >
        {messages.length === 0 ? (
          <div className="text-center py-10 text-slate-300">
            <i className="ti ti-message-off text-[32px] block mb-2" />
            <p className="text-[12px]">No messages yet</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMe =
              String(msg.sender?._id ?? msg.sender) === String(userData?._id);
            const isOpt = !!msg._opt;
            const isAdmin = msg.senderRole === "admin";

            return (
              <div
                key={msg._id ?? i}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                {/* Admin avatar */}
                {!isMe && (
                  <div className="w-7 h-7 rounded-full bg-[#0C3060] flex items-center justify-center flex-shrink-0 mr-2 mt-auto mb-5">
                    <i className="ti ti-headset text-white text-[11px]" />
                  </div>
                )}
                <div
                  className={`max-w-[78%] flex flex-col gap-1 ${isMe ? "items-end" : "items-start"}`}
                >
                  <p
                    className={`text-[10px] font-semibold ${isMe ? "text-[#0C3060]" : "text-slate-400"}`}
                  >
                    {isMe ? "You" : (msg.sender?.name ?? "Support Team")}
                    {!isMe && isAdmin && (
                      <span className="ml-1.5 bg-[#0C3060] text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">
                        SUPPORT
                      </span>
                    )}
                  </p>
                  <div
                    className={`px-4 py-3 rounded-2xl text-[13px] leading-relaxed shadow-sm
                    ${
                      isMe
                        ? `bg-[#0C3060] text-white rounded-tr-sm ${isOpt ? "opacity-60" : ""}`
                        : "bg-white border border-slate-200 text-slate-700 rounded-tl-sm"
                    }`}
                  >
                    {msg.message}
                  </div>
                  <p className="text-[10px] text-slate-300 px-1">
                    {isOpt ? "Sending…" : fmt(msg.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}

        {/* Typing indicator */}
        {typing && (
          <div className="flex justify-start items-end gap-2">
            <div className="w-7 h-7 rounded-full bg-[#0C3060] flex items-center justify-center flex-shrink-0">
              <i className="ti ti-headset text-white text-[11px]" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
              <span className="text-[11px] text-slate-400">
                {typing} is typing
              </span>
              <span className="flex gap-0.5">
                {[0, 1, 2].map((j) => (
                  <span
                    key={j}
                    className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"
                    style={{ animationDelay: `${j * 150}ms` }}
                  />
                ))}
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Resolved notice ── */}
      {isClosed && (
        <div className="mb-4 px-4 py-3.5 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3 flex-shrink-0">
          <i className="ti ti-circle-check text-green-600 text-[18px] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[12px] font-bold text-green-700">
              Ticket {ticket.status}
              {ticket.resolvedAt ? ` · ${fmtShort(ticket.resolvedAt)}` : ""}
            </p>
            {ticket.resolutionNote && (
              <p className="text-[12px] text-green-600 mt-0.5 leading-relaxed">
                {ticket.resolutionNote}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Reply box ── */}
      {!isClosed ? (
        <div className="flex-shrink-0">
          {replyErr && (
            <p className="text-[11px] text-red-500 mb-1.5 px-1">{replyErr}</p>
          )}
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <textarea
                className="w-full px-4 py-3 text-[13px] text-[#0C3060] bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-[#0C3060] focus:ring-2 focus:ring-blue-50 transition placeholder:text-slate-300 resize-none leading-relaxed"
                placeholder="Type your reply… (Enter to send, Shift+Enter for new line)"
                rows={2}
                value={reply}
                onChange={(e) => handleReplyChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleReply();
                  }
                }}
              />
            </div>
            <button
              onClick={handleReply}
              disabled={replying || !reply.trim()}
              className="h-11 w-11 bg-[#0C3060] hover:bg-[#0a2550] text-white rounded-xl border-none cursor-pointer disabled:opacity-50 transition flex items-center justify-center flex-shrink-0"
            >
              {replying ? (
                <Spinner size="sm" color="border-white" />
              ) : (
                <i className="ti ti-send text-[16px]" />
              )}
            </button>
          </div>
          <p className="text-[10px] text-slate-300 mt-1.5 px-1">
            Support team typically responds within 2–4 hours
          </p>
        </div>
      ) : (
        <button
          onClick={onBack}
          className="w-full h-11 border border-slate-200 bg-white text-slate-600 text-[13px] font-semibold rounded-xl hover:bg-slate-50 transition cursor-pointer flex-shrink-0"
        >
          ← Back to all tickets
        </button>
      )}
    </div>
  );
}

// ── New ticket form ────────────────────────────────────
function NewTicketForm({ onSuccess, onCancel }) {
  const [form, setForm] = useState({
    subject: "",
    description: "",
    category: "general",
    priority: "medium",
  });
  const [errors, setErrors] = useState({});
  const [createTicket, { isLoading }] = useCreateTicketMutation();

  const set = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!form.subject.trim()) e.subject = "Subject is required";
    if (!form.description.trim()) e.description = "Description is required";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      await createTicket({
        subject: form.subject.trim(),
        description: form.description.trim(),
        category: form.category,
        priority: form.priority,
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
          className="w-9 h-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-[#0C3060] transition cursor-pointer"
        >
          <i className="ti ti-arrow-left text-[15px]" />
        </button>
        <div>
          <h2 className="text-[17px] font-bold text-[#0C3060]">
            New support ticket
          </h2>
          <p className="text-[12px] text-slate-400 mt-0.5">
            We typically respond within 2–4 hours
          </p>
        </div>
      </div>

      {/* Category + priority */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
            Category
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {CATEGORIES.slice(0, 6).map((c) => {
              const meta = CATEGORY_META[c];
              return (
                <button
                  key={c}
                  onClick={() => set("category", c)}
                  className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-[11px] font-semibold border transition cursor-pointer
                    ${
                      form.category === c
                        ? "bg-[#0C3060] text-white border-[#0C3060]"
                        : "bg-slate-50 text-slate-500 border-slate-200 hover:border-[#0C3060] hover:text-[#0C3060]"
                    }`}
                >
                  <i className={`ti ${meta.icon} text-[12px]`} />
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
            Priority
          </label>
          <div className="flex flex-col gap-1.5">
            {Object.entries(PRIORITY_CFG).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => set("priority", key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-semibold border transition cursor-pointer
                  ${
                    form.priority === key
                      ? `${cfg.cls} border-current`
                      : "bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300"
                  }`}
              >
                <i className={`ti ${cfg.icon} text-[13px]`} />
                {cfg.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Subject */}
      <div className="mb-4">
        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
          Subject
        </label>
        <input
          className={inputCls}
          placeholder="Brief summary of your issue"
          value={form.subject}
          onChange={(e) => set("subject", e.target.value)}
        />
        {errors.subject && (
          <p className="text-[11px] text-red-500 mt-1">{errors.subject}</p>
        )}
      </div>

      {/* Description */}
      <div className="mb-5">
        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
          Description
        </label>
        <textarea
          className="w-full px-3 py-3 text-[13px] text-[#0C3060] bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#0C3060] focus:ring-2 focus:ring-blue-50 transition placeholder:text-slate-300 resize-none leading-relaxed"
          rows={4}
          placeholder="Describe your issue in detail. Include relevant booking references, flight numbers, dates, and what you expected to happen."
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
        />
        {errors.description && (
          <p className="text-[11px] text-red-500 mt-1">{errors.description}</p>
        )}
        <p className="text-[10px] text-slate-300 mt-1">
          {form.description.length} / 2000 characters
        </p>
      </div>

      {/* Tips */}
      <div className="mb-5 bg-[#EAF2FB] rounded-xl p-4 flex items-start gap-3">
        <i className="ti ti-bulb text-[#0C3060] text-[16px] flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-[12px] font-bold text-[#0C3060] mb-1.5">
            Tips for faster resolution
          </p>
          <ul className="flex flex-col gap-1">
            {[
              "Include your booking or flight reference number",
              "Describe what happened and what you expected",
              "Mention the date and route if flight-related",
            ].map((tip) => (
              <li
                key={tip}
                className="flex items-start gap-1.5 text-[11px] text-slate-500"
              >
                <span className="text-[#0C3060] font-bold mt-0.5 flex-shrink-0">
                  •
                </span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {errors.api && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-[12px] text-red-600 flex items-center gap-2">
          <i className="ti ti-alert-circle text-[14px] flex-shrink-0" />
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
          {isLoading ? (
            <>
              <Spinner size="sm" color="border-white" /> Submitting…
            </>
          ) : (
            "Submit ticket"
          )}
        </button>
      </div>
    </div>
  );
}

// ── Ticket card ────────────────────────────────────────
function TicketCard({ ticket, onClick }) {
  const scfg = STATUS_CFG[ticket.status] || STATUS_CFG.open;
  const pcfg = PRIORITY_CFG[ticket.priority] || PRIORITY_CFG.medium;
  const catMeta = CATEGORY_META[ticket.category] || CATEGORY_META.general;
  const lastMsg = ticket.messages?.[ticket.messages.length - 1];

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl border border-slate-100 hover:border-[#0C3060]/20 hover:shadow-md transition-all cursor-pointer group overflow-hidden"
    >
      {/* Priority accent strip */}
      <div
        className={`h-0.5 w-full ${
          ticket.priority === "urgent"
            ? "bg-red-400"
            : ticket.priority === "high"
              ? "bg-orange-400"
              : ticket.priority === "medium"
                ? "bg-blue-400"
                : "bg-slate-200"
        }`}
      />

      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Category icon */}
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors
            ${
              ticket.status === "open"
                ? "bg-blue-50 text-blue-600"
                : ticket.status === "in-progress"
                  ? "bg-amber-50 text-amber-600"
                  : ticket.status === "resolved"
                    ? "bg-green-50 text-green-600"
                    : "bg-slate-100 text-slate-400"
            }`}
          >
            <i className={`ti ${catMeta.icon} text-[18px]`} />
          </div>

          <div className="flex-1 min-w-0">
            {/* Badges */}
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-[10px] font-bold text-slate-400">
                {ticket.ticketNumber}
              </span>
              <span
                className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${scfg.cls}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${scfg.dot}`} />
                {scfg.label}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pcfg.cls}`}
              >
                {pcfg.label}
              </span>
              {ticket.unreadByUser > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500 text-white flex items-center gap-1 animate-pulse">
                  <span className="w-1 h-1 bg-white rounded-full" />
                  {ticket.unreadByUser} new
                </span>
              )}
            </div>

            {/* Subject */}
            <p className="text-[14px] font-bold text-[#0C3060] truncate group-hover:text-blue-800 transition-colors">
              {ticket.subject}
            </p>

            {/* Last message preview */}
            {lastMsg && (
              <p className="text-[12px] text-slate-400 mt-0.5 truncate">
                <span className="font-medium">
                  {lastMsg.senderRole === "admin" ? "Support: " : "You: "}
                </span>
                {lastMsg.message}
              </p>
            )}

            {/* Meta */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="flex items-center gap-1 text-[10px] text-slate-400">
                <i className={`ti ${catMeta.icon} text-[11px]`} />
                {catMeta.label}
              </span>
              <span className="text-[10px] text-slate-200">·</span>
              <span className="text-[10px] text-slate-400">
                {fmtShort(ticket.createdAt)}
              </span>
              <span className="text-[10px] text-slate-200">·</span>
              <span className="text-[10px] text-slate-400">
                {ticket.messages?.length ?? 0} msg
                {(ticket.messages?.length ?? 0) !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          <i className="ti ti-chevron-right text-slate-300 group-hover:text-[#0C3060] transition-colors text-[15px] flex-shrink-0 mt-1" />
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────
export default function SupportPage() {
  const [view, setView] = useState("list");
  const [activeTicket, setActiveTicket] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching } = useGetMyTicketsQuery({
    status: statusFilter,
    page,
    limit: 10,
  });

  const tickets = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const unreadTotal = tickets.reduce((s, t) => s + (t.unreadByUser || 0), 0);

  const openThread = (id) => {
    setActiveTicket(id);
    setView("thread");
  };
  const backToList = () => {
    setActiveTicket(null);
    setView("list");
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <UserNavbar />

      {/* ── Page hero ── */}
      <div className="bg-[#0C3060] px-6 py-10 relative overflow-hidden">
        <div className="absolute w-72 h-72 rounded-full bg-white/[0.04] -top-20 -right-20" />
        <div className="absolute w-44 h-44 rounded-full bg-white/[0.03] bottom-0 left-20" />
        <div className="w-11/12 mx-auto relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-blue-300 text-[11px] font-semibold uppercase tracking-[0.18em] mb-2">
              Help & Support
            </p>
            <h1 className="text-white text-3xl font-bold mb-1">
              My support tickets
            </h1>
            <p className="text-blue-200/70 text-[14px]">
              {total} ticket{total !== 1 ? "s" : ""}
              {unreadTotal > 0 && (
                <span className="ml-2 bg-red-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                  {unreadTotal} unread
                </span>
              )}
            </p>
          </div>
          {view === "list" && (
            <button
              onClick={() => setView("new")}
              className="h-11 px-6 bg-white text-[#0C3060] font-bold text-[13px] rounded-xl hover:bg-blue-50 active:scale-95 transition border-none cursor-pointer flex items-center gap-2"
            >
              <i className="ti ti-plus text-[15px]" />
              New ticket
            </button>
          )}
        </div>
      </div>

      <div className="w-11/12 mx-auto px-4 py-7">
        {/* ── NEW TICKET ── */}
        {view === "new" && (
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
            <NewTicketForm
              onSuccess={() => {
                setView("list");
                setPage(1);
              }}
              onCancel={backToList}
            />
          </div>
        )}

        {/* ── THREAD ── */}
        {view === "thread" && activeTicket && (
          <div
            className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm"
            style={{
              minHeight: "600px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <TicketThread ticketId={activeTicket} onBack={backToList} />
          </div>
        )}

        {/* ── LIST ── */}
        {view === "list" && (
          <>
            {/* Quick stats row */}
            <div className="grid grid-cols-4 gap-3 mb-6">
              {[
                {
                  label: "Total",
                  value: total,
                  cls: "text-[#0C3060]",
                  bg: "bg-white",
                },
                {
                  label: "Open",
                  value: tickets.filter((t) => t.status === "open").length,
                  cls: "text-blue-700",
                  bg: "bg-blue-50",
                },
                {
                  label: "In Progress",
                  value: tickets.filter((t) => t.status === "in-progress")
                    .length,
                  cls: "text-amber-700",
                  bg: "bg-amber-50",
                },
                {
                  label: "Resolved",
                  value: tickets.filter((t) =>
                    ["resolved", "closed"].includes(t.status),
                  ).length,
                  cls: "text-green-700",
                  bg: "bg-green-50",
                },
              ].map(({ label, value, cls, bg }) => (
                <div
                  key={label}
                  className={`${bg} border border-slate-200 rounded-2xl p-4 text-center`}
                >
                  <p className={`text-[22px] font-black ${cls} leading-none`}>
                    {value}
                  </p>
                  <p className="text-[11px] text-slate-400 font-medium mt-1">
                    {label}
                  </p>
                </div>
              ))}
            </div>

            {/* Filter tabs */}
            <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 mb-5 overflow-x-auto">
              {["all", "open", "in-progress", "resolved", "closed"].map((f) => (
                <button
                  key={f}
                  onClick={() => {
                    setStatusFilter(f);
                    setPage(1);
                  }}
                  className={`flex-1 px-3 py-2 rounded-lg text-[11px] font-semibold whitespace-nowrap transition border-none cursor-pointer
                    ${
                      statusFilter === f
                        ? "bg-[#0C3060] text-white"
                        : "text-slate-500 hover:text-[#0C3060] hover:bg-slate-50 bg-transparent"
                    }`}
                >
                  {f === "in-progress"
                    ? "In Progress"
                    : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            {/* List */}
            {isLoading ? (
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse"
                  >
                    <div className="flex gap-4">
                      <div className="w-10 h-10 bg-slate-100 rounded-xl flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex gap-2 mb-2">
                          <div className="h-3 bg-slate-100 rounded w-20" />
                          <div className="h-3 bg-slate-100 rounded w-16" />
                        </div>
                        <div className="h-4 bg-slate-100 rounded w-48 mb-2" />
                        <div className="h-3 bg-slate-100 rounded w-36" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <i className="ti ti-ticket-off text-[28px] text-slate-300" />
                </div>
                <p className="text-[15px] font-bold text-[#0C3060] mb-1">
                  No tickets yet
                </p>
                <p className="text-slate-400 text-[13px] mb-5">
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
                <div
                  className={`flex flex-col gap-3 mb-5 transition-opacity ${isFetching ? "opacity-60" : "opacity-100"}`}
                >
                  {tickets.map((t) => (
                    <TicketCard
                      key={t._id}
                      ticket={t}
                      onClick={() => openThread(t._id)}
                    />
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
                        <i className="ti ti-chevron-left text-[13px]" />
                      </button>
                      <span className="text-[12px] text-slate-500 px-1">
                        {page} / {totalPages}
                      </span>
                      <button
                        disabled={page === totalPages}
                        onClick={() => setPage((p) => p + 1)}
                        className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:border-blue-300 hover:text-[#0C3060] transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <i className="ti ti-chevron-right text-[13px]" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* FAQ */}
            <div className="mt-8 bg-white border border-slate-100 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <i className="ti ti-help-circle text-[#0C3060] text-[18px]" />
                <p className="text-[13px] font-bold text-[#0C3060]">
                  Common questions
                </p>
              </div>
              <div className="flex flex-col">
                {[
                  {
                    q: "How do I cancel my booking?",
                    a: "Go to My Bookings, select the booking and click Cancel. Refunds are processed within 5–7 business days.",
                  },
                  {
                    q: "Can I change my flight?",
                    a: "Flight changes depend on fare type. Raise a ticket with your booking reference and we'll check your options.",
                  },
                  {
                    q: "Where is my refund?",
                    a: "Refunds typically take 5–7 business days. If it's been longer, raise a ticket with category Refund.",
                  },
                  {
                    q: "How do I get my boarding pass?",
                    a: "Boarding passes are emailed 24 hours before departure. Check your spam folder if you don't see it.",
                  },
                ].map(({ q, a }, i) => (
                  <details
                    key={i}
                    className={`group py-3.5 ${i > 0 ? "border-t border-slate-100" : ""}`}
                  >
                    <summary className="text-[13px] font-semibold text-[#0C3060] cursor-pointer list-none flex items-center justify-between gap-3">
                      {q}
                      <i className="ti ti-chevron-down text-slate-400 group-open:rotate-180 transition-transform text-[13px] flex-shrink-0" />
                    </summary>
                    <p className="text-[12px] text-slate-400 mt-2 leading-relaxed">
                      {a}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <footer className="bg-[#0C3060] text-blue-100 px-6 py-8 mt-10">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-[12px] text-blue-300">
            Average response time: 2–4 hours · Support available 24/7
          </p>
          <p className="text-[11px] text-blue-400 mt-2">
            © 2026 AirlineMS · All rights reserved
          </p>
        </div>
      </footer>
    </div>
  );
}
