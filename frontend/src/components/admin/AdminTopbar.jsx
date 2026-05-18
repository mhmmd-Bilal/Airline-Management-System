// src/components/admin/AdminTopbar.jsx
import { useLocation } from "react-router-dom";
import Avatar from "./shared/Avatar";
import NotificationBell from "../NotificationBell";

const routeLabels = {
  "/":          "Overview",
  "/flights":  "Flights",
  "/fleet":    "Fleet",
  "/crew":     "Crew",
  "/revenue":  "Revenue",
  "/support":  "Support",
  "/settings": "Settings",
};

const IconBtn = ({ icon, label }) => (
  <button
    aria-label={label}
    className="w-9 h-9 rounded-lg border border-[#D0E6F7] bg-[#F0F7FF] flex items-center justify-center text-[#1565C0] text-[17px] hover:bg-[#E1EFFE] transition"
  >
    <i className={`ti ${icon}`} />
  </button>
);

export default function AdminTopbar({ onMenuClick, user }) {
  const { pathname } = useLocation();
  const title = routeLabels[pathname] || "Dashboard";

  return (
    <div className="bg-white border-b border-[#D0E6F7] px-5 md:px-7 h-[60px] flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="md:hidden w-9 h-9 rounded-lg border border-[#D0E6F7] bg-[#F0F7FF] flex items-center justify-center text-[#1565C0] text-[17px]"
          aria-label="Open menu"
        >
          <i className="ti ti-menu-2" />
        </button>
        <span className="text-[15px] font-semibold text-[#0D1B2A]">{title}</span>
      </div>

      <div className="flex items-center gap-2.5">
        <NotificationBell theme="light" notifPath="/admin/notifications" />
        <IconBtn icon="ti-search" label="Search" />
        <Avatar name={user?.name || "Admin User"} size="md" />
      </div>
    </div>
  );
}