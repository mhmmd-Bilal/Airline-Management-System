import { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { useGetTodayAttendanceQuery } from "../../slices/attendanceApiSlice";
import { useGetCrewByIdQuery } from "../../slices/crewApiSlice";

const navItems = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: "ti-layout-dashboard",
    path: "/",
  },
  {
    id: "flights",
    label: "My Flights",
    icon: "ti-plane",
    path: "/flights",
  },
  {
    id: "profile",
    label: "Profile",
    icon: "ti-user-circle",
    path: "/profile",
  },
  {
    id: "medical",
    label: "Medical",
    icon: "ti-heart-rate-monitor",
    path: "/medical",
  },
  {
    id: "attendance",
    label: "Attendance",
    icon: "ti-clock",
    path: "/attendance",
  },
];

const medicalCls = {
  Fit: "bg-green-100 text-green-700",
  "Under Treatment": "bg-orange-100 text-orange-700",
};

const fmtTime = (dt) =>
  dt
    ? new Date(dt).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : "—";

function Avatar({ name = "", size = "md" }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  const s = {
    sm: "w-8 h-8 text-[11px]",
    md: "w-10 h-10 text-[13px]",
    lg: "w-14 h-14 text-[18px]",
  };
  return (
    <div
      className={`${s[size]} rounded-full bg-[#E3F2FD] text-[#1565C0] flex items-center justify-center font-bold flex-shrink-0 ring-4 ring-white`}
    >
      {initials || "?"}
    </div>
  );
}

function Badge({ label, cls }) {
  return (
    <span
      className={`text-[11px] font-semibold px-2.5 py-[3px] rounded-full whitespace-nowrap ${cls}`}
    >
      {label}
    </span>
  );
}

export default function CrewLayout() {
  const { userData } = useSelector((s) => s.auth);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  let crew;
  const name = userData?.name ?? "Crew Member";

  const { data } = useGetCrewByIdQuery(userData?._id);

  crew = data?.data;

  const { data: attendanceData } = useGetTodayAttendanceQuery();
  const todayAttendance = attendanceData?.data ?? null;

  const pageTitle =
    navItems.find((n) =>
      n.path === "/"
        ? location.pathname === "/"
        : location.pathname.startsWith(n.path),
    )?.label || "Dashboard";

  const isActive = (path) =>
    path === "/"
      ? location.pathname === "/"
      : location.pathname.startsWith(path);

  return (
    <div className="flex min-h-screen bg-[#EAF4FB]">
      {/* ── Mobile overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-[90] md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`fixed top-0 left-0 h-screen w-[220px] bg-[#0D2540] flex flex-col z-[100]
        transition-transform duration-300
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
      >
        {/* Brand */}
        <div className="px-5 py-6 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg bg-white/[0.12] flex items-center justify-center flex-shrink-0">
              <i className="ti ti-plane text-[#90CAF9] text-[17px]" />
            </div>
            <p className="text-white text-[17px] font-semibold tracking-[-0.3px]">
              AirlineMS
            </p>
          </div>
          <span className="text-white/40 text-[10px] tracking-[0.5px]">
            Crew Portal
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 pt-3 overflow-y-auto">
          {navItems.map((n) => (
            <button
              key={n.path}
              onClick={() => {
                navigate(n.path);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-5 py-[10px] text-[13px] font-medium
                border-l-[3px] transition-all duration-150 text-left border-none cursor-pointer
                ${
                  isActive(n.path)
                    ? "text-white bg-white/[0.08] border-l-[3px] border-[#90CAF9]"
                    : "text-white/50 border-l-[3px] border-transparent hover:text-white hover:bg-white/[0.05]"
                }`}
            >
              <i className={`ti ${n.icon} text-[17px]`} />
              {n.label}
            </button>
          ))}
        </nav>

        {/* Attendance status in sidebar */}
        {todayAttendance?.clockIn && !todayAttendance?.clockOut && (
          <div className="px-5 py-3 border-t border-white/[0.08]">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/20">
              <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0 animate-pulse" />
              <p className="text-[11px] font-medium text-green-300 truncate">
                On duty · {fmtTime(todayAttendance.clockIn)}
              </p>
            </div>
          </div>
        )}

        {/* User */}
        <div className="px-5 py-4 border-t border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <Avatar name={name} size="sm" />
            <div className="min-w-0">
              <p className="text-white text-[12px] font-semibold truncate">
                {name}
              </p>
              <p className="text-white/40 text-[10px] truncate">{crew?.role}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-h-screen md:ml-[220px]">
        {/* Topbar */}
        <div className="bg-white border-b border-[#D0E6F7] px-5 md:px-7 h-[60px] flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden w-9 h-9 rounded-lg border border-[#D0E6F7] bg-[#F0F7FF] flex items-center justify-center text-[#1565C0] text-[17px] cursor-pointer"
            >
              <i className="ti ti-menu-2" />
            </button>
            <span className="text-[15px] font-bold text-[#0D1B2A]">
              {pageTitle}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Live duty pill */}
            {todayAttendance?.clockIn && !todayAttendance?.clockOut && (
              <span className="hidden sm:flex items-center gap-1.5 bg-blue-50 text-blue-700 text-[11px] font-semibold px-3 py-1 rounded-full">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                On duty since {fmtTime(todayAttendance.clockIn)}
              </span>
            )}
            <Badge
              label={crew?.medicalStatus}
              cls={
                medicalCls[crew?.medicalStatus] || "bg-gray-100 text-gray-600"
              }
            />
            <Badge
              label={crew?.currentStatus}
              cls="bg-blue-100 text-blue-800"
            />
            <button className="w-9 h-9 rounded-lg border border-[#D0E6F7] bg-[#F0F7FF] flex items-center justify-center text-[#1565C0] hover:bg-[#E1EFFE] transition relative cursor-pointer">
              <i className="ti ti-bell text-[17px]" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
            </button>
            <Avatar name={name} size="sm" />
          </div>
        </div>

        {/* Page renders here */}
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
