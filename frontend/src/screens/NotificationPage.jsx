// src/pages/NotificationsPage.jsx
// Used by user (/notifications), crew (/crew/notifications), admin (/admin/notifications)
// Admin gets an extra "Broadcast" panel at the top.

import { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  useGetMyNotificationsQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  useDeleteNotificationMutation,
  useClearAllReadMutation,
  useBroadcastNotificationMutation,
  useGetAllNotificationsQuery,
} from "../slices/notificationApiSlice";
import { getSocket } from "../services/socketService";

/* -------------------------------------------------------------------------- */
/*                               CONSTANTS                                    */
/* -------------------------------------------------------------------------- */

const TYPE_CFG = {
  booking:  { icon: "🎫", color: "bg-blue-50 text-blue-700 border-blue-100"      },
  flight:   { icon: "✈️",  color: "bg-indigo-50 text-indigo-700 border-indigo-100"},
  payment:  { icon: "💳", color: "bg-green-50 text-green-700 border-green-100"   },
  refund:   { icon: "💰", color: "bg-emerald-50 text-emerald-700 border-emerald-100"},
  support:  { icon: "🎧", color: "bg-violet-50 text-violet-700 border-violet-100" },
  loyalty:  { icon: "⭐", color: "bg-amber-50 text-amber-700 border-amber-100"   },
  system:   { icon: "🔔", color: "bg-slate-50 text-slate-600 border-slate-200"   },
};

const fmt = (dt) =>
  dt
    ? new Date(dt).toLocaleString("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit", hour12: true,
      })
    : "—";

const fmtRelative = (dt) => {
  if (!dt) return "";
  const diff = Date.now() - new Date(dt).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `${days}d ago`;
  return fmt(dt);
};

/* -------------------------------------------------------------------------- */
/*                         BROADCAST PANEL (admin)                           */
/* -------------------------------------------------------------------------- */

function BroadcastPanel() {
  const [form, setForm]     = useState({ title: "", message: "", type: "system", roleTarget: "all" });
  const [success, setSuccess] = useState(false);
  const [broadcastNotification, { isLoading }] = useBroadcastNotificationMutation();

  const handleSend = async () => {
    if (!form.title.trim() || !form.message.trim()) return;
    try {
      await broadcastNotification(form).unwrap();
      setForm({ title: "", message: "", type: "system", roleTarget: "all" });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) { console.error(err); }
  };

  const inputCls = "w-full h-[42px] px-3 text-[13px] text-[#0D1B2A] bg-[#F0F7FF] border border-[#D0E6F7] rounded-[10px] outline-none focus:border-[#1565C0] transition placeholder:text-[#B0C4D8]";

  return (
    <div className="bg-white border border-[#D0E6F7] rounded-2xl p-5 mb-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-[#EAF4FB] rounded-lg flex items-center justify-center text-[16px]">📢</div>
        <div>
          <p className="text-[13px] font-bold text-[#0D1B2A]">Broadcast Notification</p>
          <p className="text-[11px] text-[#7A90A4]">Send a notification to all users of a role</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-[11px] font-semibold text-[#5A7089] uppercase tracking-wider mb-1.5">Target</label>
          <select className={inputCls} value={form.roleTarget} onChange={(e) => setForm((p) => ({ ...p, roleTarget: e.target.value }))}>
            <option value="all">Everyone</option>
            <option value="passenger">Passengers only</option>
            <option value="crew">Crew only</option>
            <option value="admin">Admins only</option>
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-[#5A7089] uppercase tracking-wider mb-1.5">Type</label>
          <select className={inputCls} value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}>
            {Object.keys(TYPE_CFG).map((t) => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-3">
        <label className="block text-[11px] font-semibold text-[#5A7089] uppercase tracking-wider mb-1.5">Title</label>
        <input className={inputCls} placeholder="Notification title…" value={form.title}
          onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
      </div>

      <div className="mb-4">
        <label className="block text-[11px] font-semibold text-[#5A7089] uppercase tracking-wider mb-1.5">Message</label>
        <textarea
          className="w-full px-3 py-2.5 text-[13px] text-[#0D1B2A] bg-[#F0F7FF] border border-[#D0E6F7] rounded-[10px] outline-none focus:border-[#1565C0] transition placeholder:text-[#B0C4D8] resize-none"
          rows={2} placeholder="Message body…" value={form.message}
          onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
        />
      </div>

      {success && (
        <div className="mb-3 px-3 py-2 bg-green-50 border border-green-200 rounded-[10px] text-[12px] text-green-700 flex items-center gap-2">
          <span>✓</span> Notification sent successfully
        </div>
      )}

      <button
        onClick={handleSend}
        disabled={isLoading || !form.title.trim() || !form.message.trim()}
        className="w-full h-10 bg-[#1565C0] hover:bg-[#1251A3] text-white text-[13px] font-bold rounded-[10px] border-none cursor-pointer disabled:opacity-50 transition"
      >
        {isLoading ? "Sending…" : "Send broadcast"}
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                       NOTIFICATION CARD                                   */
/* -------------------------------------------------------------------------- */

function NotifCard({ notif, onRead, onDelete }) {
  const cfg = TYPE_CFG[notif.type] ?? TYPE_CFG.system;

  return (
    <div
      className={`flex gap-3 p-4 rounded-2xl border transition-all
        ${notif.isRead
          ? "bg-white border-slate-100 hover:border-slate-200"
          : "bg-blue-50/40 border-blue-100 hover:border-blue-200"
        }`}
    >
      {/* Icon */}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[18px] flex-shrink-0 border ${cfg.color}`}>
        {cfg.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <p className={`text-[13px] font-bold truncate ${notif.isRead ? "text-[#334155]" : "text-[#0C3060]"}`}>
                {notif.title}
              </p>
              {!notif.isRead && (
                <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
              )}
            </div>
            <p className="text-[12px] text-slate-500 leading-relaxed">{notif.message}</p>
            <p className="text-[10px] text-slate-400 mt-1.5">{fmtRelative(notif.createdAt)}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {!notif.isRead && (
              <button
                onClick={() => onRead(notif._id)}
                title="Mark as read"
                className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 hover:bg-blue-100 transition cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </button>
            )}
            <button
              onClick={() => onDelete(notif._id)}
              title="Delete"
              className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                           MAIN PAGE                                        */
/* -------------------------------------------------------------------------- */

export default function NotificationsPage({ navbarComponent: Navbar }) {
  const { userData } = useSelector((s) => s.auth);
  const isAdmin = userData?.role === "admin";

  const [page,       setPage]       = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [liveCount,  setLiveCount]  = useState(0);  // new notifications arrived via socket

  const {
    data, isLoading, refetch,
  } = useGetMyNotificationsQuery({ page, limit: 20, unreadOnly });

  const [markAsRead]       = useMarkAsReadMutation();
  const [markAllAsRead]    = useMarkAllAsReadMutation();
  const [deleteNotif]      = useDeleteNotificationMutation();
  const [clearAllRead]     = useClearAllReadMutation();

  const notifications = data?.data       ?? [];
  const total         = data?.total       ?? 0;
  const unreadCount   = data?.unreadCount ?? 0;
  const totalPages    = data?.totalPages  ?? 1;

  /* ── Real-time: listen for new notifications via socket ── */
  useEffect(() => {
    const token = userData?.token;
    if (!token) return;

    const socket = getSocket(token);

    const handleNotif = () => {
      setLiveCount((c) => c + 1);
      refetch();
    };

    socket.on("notification", handleNotif);
    return () => socket.off("notification", handleNotif);
  }, [userData?.token, refetch]);

  const handleRead = async (id) => {
    await markAsRead(id);
  };

  const handleDelete = async (id) => {
    await deleteNotif(id);
  };

  const handleMarkAll = async () => {
    await markAllAsRead();
    setLiveCount(0);
  };

  const handleClearRead = async () => {
    await clearAllRead();
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {Navbar && <Navbar />}

      <div className="w-11/12 mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#0C3060]">Notifications</h1>
            <p className="text-slate-400 text-sm mt-0.5">
              {unreadCount > 0
                ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
                : "All caught up"}
            </p>
          </div>

          {/* Live badge */}
          {liveCount > 0 && (
            <button
              onClick={() => { setLiveCount(0); refetch(); }}
              className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl text-[12px] font-semibold text-blue-700 cursor-pointer hover:bg-blue-100 transition animate-pulse"
            >
              <span className="w-2 h-2 bg-blue-500 rounded-full" />
              {liveCount} new — tap to refresh
            </button>
          )}
        </div>

        {/* Admin broadcast panel */}
        {isAdmin && <BroadcastPanel />}

        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setUnreadOnly(!unreadOnly); setPage(1); }}
              className={`h-8 px-3 rounded-lg text-[12px] font-semibold border transition cursor-pointer
                ${unreadOnly
                  ? "bg-[#0C3060] text-white border-[#0C3060]"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
            >
              {unreadOnly ? "Showing unread" : "All notifications"}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAll}
                className="h-8 px-3 rounded-lg text-[12px] font-semibold text-blue-600 bg-blue-50 border border-blue-100 hover:bg-blue-100 transition cursor-pointer"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={handleClearRead}
              className="h-8 px-3 rounded-lg text-[12px] font-semibold text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 transition cursor-pointer"
            >
              Clear read
            </button>
          </div>
        </div>

        {/* Notification list */}
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {[1,2,3].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 animate-pulse flex gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex-shrink-0" />
                <div className="flex-1">
                  <div className="h-4 bg-slate-100 rounded w-48 mb-2" />
                  <div className="h-3 bg-slate-100 rounded w-72" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
            <p className="text-[40px] mb-3">🔔</p>
            <p className="font-bold text-[#0C3060] mb-1">No notifications</p>
            <p className="text-slate-400 text-sm">
              {unreadOnly ? "No unread notifications" : "You're all caught up"}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {notifications.map((n) => (
              <NotifCard
                key={n._id}
                notif={n}
                onRead={handleRead}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-5">
            <p className="text-[11px] text-slate-400">
              Showing {notifications.length} of {total}
            </p>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 transition disabled:opacity-40 cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <span className="text-[12px] text-slate-500 px-1">{page} / {totalPages}</span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 transition disabled:opacity-40 cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}