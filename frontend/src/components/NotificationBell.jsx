// src/components/NotificationBell.jsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  useGetMyNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  useDeleteNotificationMutation,
} from "../slices/notificationApiSlice";
import { getSocket } from "../services/socketService";

/* ─────────────────────────────────────────────── constants ── */

const TYPE_CFG = {
  booking:  { icon: "ti-ticket",           color: "bg-blue-50 text-blue-600"    },
  flight:   { icon: "ti-plane",            color: "bg-indigo-50 text-indigo-600" },
  payment:  { icon: "ti-credit-card",      color: "bg-green-50 text-green-600"  },
  refund:   { icon: "ti-receipt-refund",   color: "bg-emerald-50 text-emerald-600"},
  support:  { icon: "ti-headset",          color: "bg-violet-50 text-violet-600" },
  loyalty:  { icon: "ti-star",             color: "bg-amber-50 text-amber-600"  },
  system:   { icon: "ti-bell",             color: "bg-slate-50 text-slate-500"  },
};

const fmtRelative = (dt) => {
  if (!dt) return "";
  const diff = Date.now() - new Date(dt).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

/* ─────────────────────────────────── props ──
   theme = "light"  → used in UserNavbar (white bg, blue text)
   theme = "dark"   → used in AdminTopbar / CrewLayout (dark sidebar style)
   notifPath = "/notifications" | "/admin/notifications" | "/crew/notifications"
──────────────────────────────────────────── */

export default function NotificationBell({ theme = "light", notifPath = "/notifications" }) {
  const { userData }  = useSelector((s) => s.auth);
  const navigate      = useNavigate();
  const [open, setOpen]         = useState(false);
  const [liveCount, setLiveCount] = useState(0);
  const dropdownRef = useRef(null);

  /* ── Queries ── */
  const { data: countData, refetch: refetchCount } = useGetUnreadCountQuery();
  const { data: notifData, refetch: refetchList }  = useGetMyNotificationsQuery(
    { page: 1, limit: 8 },
    { skip: !open }   // only fetch list when dropdown is open
  );

  const [markAsRead]      = useMarkAsReadMutation();
  const [markAllAsRead]   = useMarkAllAsReadMutation();
  const [deleteNotif]     = useDeleteNotificationMutation();

  const unreadCount   = (countData?.count ?? 0) + liveCount;
  const notifications = notifData?.data ?? [];

  /* ── Socket: live notification badge ── */
  useEffect(() => {
    if (!userData) return;
    const socket = getSocket();

    const handleNotif = () => {
      setLiveCount((c) => c + 1);
      refetchCount();
      if (open) refetchList();
    };

    socket.on("notification", handleNotif);
    return () => socket.off("notification", handleNotif);
  }, [userData, open]);

  /* ── Close on outside click ── */
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  /* ── Reset live count when opening ── */
  const handleOpen = () => {
    setOpen((o) => !o);
    if (!open) {
      setLiveCount(0);
      refetchCount();
      refetchList();
    }
  };

  const handleMarkAll = async () => {
    await markAllAsRead();
    setLiveCount(0);
    refetchCount();
    refetchList();
  };

  const handleRead = async (id, e) => {
    e.stopPropagation();
    await markAsRead(id);
    refetchCount();
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    await deleteNotif(id);
    refetchCount();
    refetchList();
  };

  const handleViewAll = () => {
    setOpen(false);
    navigate(notifPath);
  };

  /* ── Styles by theme ── */
  const btnCls = theme === "dark"
    ? "w-9 h-9 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] flex items-center justify-center text-white/70 hover:text-white transition relative cursor-pointer border-none"
    : "w-9 h-9 rounded-lg border border-[#D0E6F7] bg-[#F0F7FF] hover:bg-[#E1EFFE] flex items-center justify-center text-[#1565C0] transition relative cursor-pointer";

  const iconCls = theme === "dark" ? "ti ti-bell text-[17px]" : "ti ti-bell text-[17px]";

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button onClick={handleOpen} className={btnCls}>
        <i className={iconCls} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[340px] bg-white border border-[#D0E6F7] rounded-2xl shadow-2xl z-[300] overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#EAF4FB]">
            <div className="flex items-center gap-2">
              <p className="text-[13px] font-bold text-[#0D1B2A]">Notifications</p>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold bg-red-500 text-white px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAll}
                  className="text-[11px] font-semibold text-[#1565C0] hover:underline cursor-pointer bg-transparent border-none"
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto" style={{ maxHeight: "360px" }}>
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <i className="ti ti-bell-off text-[28px] text-[#D0E6F7]" />
                <p className="text-[12px] text-[#B0C4D8]">No notifications</p>
              </div>
            ) : (
              notifications.map((n) => {
                const cfg = TYPE_CFG[n.type] ?? TYPE_CFG.system;
                return (
                  <div
                    key={n._id}
                    className={`flex gap-3 px-4 py-3 border-b border-[#F7FAFD] hover:bg-[#FAFCFF] transition cursor-pointer group
                      ${!n.isRead ? "bg-blue-50/30" : ""}`}
                    onClick={() => !n.isRead && markAsRead(n._id)}
                  >
                    {/* Icon */}
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                      <i className={`ti ${cfg.icon} text-[15px]`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <p className={`text-[12px] font-bold leading-tight ${n.isRead ? "text-[#334155]" : "text-[#0D1B2A]"}`}>
                          {n.title}
                          {!n.isRead && (
                            <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full ml-1.5 mb-0.5 align-middle" />
                          )}
                        </p>
                        {/* Actions — show on hover */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition flex-shrink-0">
                          {!n.isRead && (
                            <button
                              onClick={(e) => handleRead(n._id, e)}
                              title="Mark read"
                              className="w-5 h-5 rounded flex items-center justify-center text-[#1565C0] hover:bg-blue-100 transition cursor-pointer border-none bg-transparent"
                            >
                              <i className="ti ti-check text-[11px]" />
                            </button>
                          )}
                          <button
                            onClick={(e) => handleDelete(n._id, e)}
                            title="Delete"
                            className="w-5 h-5 rounded flex items-center justify-center text-red-400 hover:bg-red-50 transition cursor-pointer border-none bg-transparent"
                          >
                            <i className="ti ti-x text-[11px]" />
                          </button>
                        </div>
                      </div>
                      <p className="text-[11px] text-[#7A90A4] mt-0.5 leading-relaxed line-clamp-2">
                        {n.message}
                      </p>
                      <p className="text-[10px] text-[#B0C4D8] mt-1">{fmtRelative(n.createdAt)}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-[#EAF4FB]">
            <button
              onClick={handleViewAll}
              className="w-full h-9 bg-[#F0F7FF] hover:bg-[#E1EFFE] text-[#1565C0] text-[12px] font-bold rounded-xl border-none cursor-pointer transition"
            >
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}