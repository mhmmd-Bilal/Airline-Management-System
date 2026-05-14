import { NavLink } from "react-router-dom";
import Avatar from "./shared/Avatar";

const navItems = [
  { label: "Overview",  icon: "ti-layout-dashboard", path: "/" },
  { label: "Flights",   icon: "ti-plane",             path: "/flights" },
  { label: "Fleet",     icon: "ti-propeller",          path: "/fleet" },
  { label: "Crew",      icon: "ti-users",              path: "/crew" },
  { label: "Revenue",   icon: "ti-chart-bar",          path: "/revenue" },
  { label: "Support",   icon: "ti-headset",            path: "/support" },
  { label: "Settings",  icon: "ti-settings",           path: "/settings" },
];

export default function AdminSidebar({ isOpen, onClose, user }) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-[90] md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-screen w-[220px] bg-[#0D2540] flex flex-col z-[100]
          transition-transform duration-300
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0`}
      >
        {/* Brand */}
        <div className="px-5 py-6 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg bg-white/[0.12] flex items-center justify-center flex-shrink-0">
              <i className="ti ti-plane text-[#90CAF9] text-[17px]" />
            </div>
            <p className="text-white text-[17px] font-semibold tracking-[-0.3px]">AirlineMS</p>
          </div>
          <span className="text-white/45 text-[10px] tracking-[0.5px]">Admin Dashboard</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 pt-3 overflow-y-auto">
          {navItems.map((n) => (
            <NavLink
              key={n.path}
              to={n.path}
              end={n.path === "/admin"}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-5 py-[10px] text-[13px] font-medium
                border-l-[3px] transition-all duration-150 no-underline
                ${isActive
                  ? "text-white bg-white/[0.08] border-[#90CAF9]"
                  : "text-white/50 border-transparent hover:text-white hover:bg-white/[0.05]"
                }`
              }
            >
              <i className={`ti ${n.icon} text-[17px]`} />
              {n.label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="px-5 py-4 border-t border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <Avatar name={user?.name || "Admin User"} size="sm" />
            <div className="min-w-0">
              <p className="text-white text-[12px] font-medium truncate">{user?.name || "Admin User"}</p>
              <p className="text-white/40 text-[10px] truncate">{user?.email || "admin@airline.com"}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}