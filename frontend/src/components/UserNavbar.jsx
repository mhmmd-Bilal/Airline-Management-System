// src/components/user/UserNavbar.jsx
import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { logout } from "../slices/authSlice";

const NAV_LINKS = [
  { label: "Home", to: "/", authRequired: false },
  { label: "My Bookings", to: "/bookings", authRequired: true },
  { label: "Deals", to: "/deals", authRequired: false },
  { label: "Loyalty", to: "/loyalty", authRequired: true },
];

// ── Logo ──────────────────────────────────────────────
function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <div className="w-9 h-9 bg-[#0C3060] rounded-xl flex items-center justify-center flex-shrink-0">
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
          <path d="M3 15l6-9 4 5 2-2 5 6H3z" fill="white" />
          <path
            d="M2 17h20"
            stroke="white"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <span className="text-[#0C3060] font-bold text-lg tracking-tight">
        AirlineMS
      </span>
    </Link>
  );
}

// ── User dropdown ─────────────────────────────────────
function UserMenu({ userData, onLogout }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const initial = userData?.name?.charAt(0).toUpperCase() ?? "U";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 bg-[#EAF2FB] hover:bg-blue-100 px-2.5 py-1.5 rounded-xl transition cursor-pointer border-none"
      >
        <div className="w-7 h-7 bg-[#0C3060] rounded-full flex items-center justify-center text-white text-[12px] font-bold flex-shrink-0">
          {initial}
        </div>
        <span className="text-[#0C3060] text-[13px] font-semibold hidden sm:block max-w-[120px] truncate">
          {userData?.name}
        </span>
        <svg
          className={`w-3.5 h-3.5 text-[#0C3060] transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-[40]"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-slate-100 rounded-2xl shadow-xl z-[50] overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-[#F8FAFC]">
              <p className="text-[13px] font-bold text-[#0C3060] truncate">
                {userData?.name}
              </p>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                {userData?.email}
              </p>
            </div>

            {[
              {
                label: "My Profile",
                icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
                to: "/profile",
              },
              {
                label: "My Bookings",
                icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
                to: "/bookings",
              },
              {
                label: "Loyalty Rewards",
                icon: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z",
                to: "/loyalty",
              },
              {
                label: "Support",
                icon: "M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z",
                to: "/support",
              },
            ].map(({ label, icon, to }) => (
              <button
                key={label}
                onClick={() => {
                  navigate(to);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-[13px] text-slate-600 hover:bg-[#EAF2FB] hover:text-[#0C3060] transition text-left border-none bg-transparent cursor-pointer"
              >
                <svg
                  className="w-4 h-4 flex-shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                </svg>
                {label}
              </button>
            ))}

            <div className="border-t border-slate-100">
              <button
                onClick={() => {
                  onLogout();
                  setOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-[13px] text-red-500 hover:bg-red-50 transition text-left border-none bg-transparent cursor-pointer"
              >
                <svg
                  className="w-4 h-4 flex-shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                Sign out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main navbar ────────────────────────────────────────
export default function UserNavbar() {
  const { userData } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  const isActive = (to) =>
    to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);

  // ── Only show auth-required links when logged in ──
  const visibleLinks = NAV_LINKS.filter((l) => !l.authRequired || !!userData);

  return (
    <>
      <nav className="bg-white border-b border-blue-100 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <Logo />

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-500">
          {visibleLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`transition pb-0.5 ${
                isActive(l.to)
                  ? "text-[#0C3060] font-semibold border-b-2 border-[#0C3060]"
                  : "hover:text-[#0C3060]"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Desktop auth */}
        <div className="hidden md:flex items-center gap-3">
          {userData ? (
            <UserMenu userData={userData} onLogout={handleLogout} />
          ) : (
            <>
              <button
                onClick={() => navigate("/login")}
                className="text-sm text-[#0C3060] font-medium hover:underline transition cursor-pointer bg-transparent border-none"
              >
                Sign in
              </button>
              <button
                onClick={() => navigate("/register")}
                className="text-sm bg-[#0C3060] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#0a2550] active:scale-95 transition cursor-pointer border-none"
              >
                Register
              </button>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-[#0C3060] cursor-pointer bg-transparent border-none"
          onClick={() => setMenuOpen((o) => !o)}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            {menuOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-b border-blue-100 px-6 py-4 flex flex-col gap-1 z-40 relative">
          {visibleLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setMenuOpen(false)}
              className={`py-2.5 px-3 rounded-xl text-sm font-medium transition
                ${
                  isActive(l.to)
                    ? "bg-[#EAF2FB] text-[#0C3060] font-semibold"
                    : "text-slate-500 hover:bg-slate-50 hover:text-[#0C3060]"
                }`}
            >
              {l.label}
            </Link>
          ))}

          <div className="border-t border-slate-100 mt-2 pt-3">
            {userData ? (
              <>
                <div className="flex items-center gap-3 px-3 py-2 mb-2">
                  <div className="w-8 h-8 bg-[#0C3060] rounded-full flex items-center justify-center text-white text-[12px] font-bold flex-shrink-0">
                    {userData?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-[#0C3060] truncate">
                      {userData?.name}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {userData?.email}
                    </p>
                  </div>
                </div>

                {[
                  { label: "My Profile", to: "/profile" },
                  { label: "My Bookings", to: "/bookings" },
                  { label: "Loyalty", to: "/loyalty" },
                ].map(({ label, to }) => (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setMenuOpen(false)}
                    className="block py-2.5 px-3 rounded-xl text-sm text-slate-600 hover:bg-[#EAF2FB] hover:text-[#0C3060] transition"
                  >
                    {label}
                  </Link>
                ))}

                <button
                  onClick={() => {
                    handleLogout();
                    setMenuOpen(false);
                  }}
                  className="w-full mt-2 py-2.5 px-3 rounded-xl text-sm text-red-500 hover:bg-red-50 transition text-left bg-transparent border-none cursor-pointer"
                >
                  Sign out
                </button>
              </>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    navigate("/login");
                    setMenuOpen(false);
                  }}
                  className="flex-1 border border-[#C5D8ED] text-[#0C3060] rounded-xl py-2.5 text-sm font-medium hover:bg-[#EAF2FB] transition cursor-pointer bg-transparent"
                >
                  Sign in
                </button>
                <button
                  onClick={() => {
                    navigate("/register");
                    setMenuOpen(false);
                  }}
                  className="flex-1 bg-[#0C3060] text-white rounded-xl py-2.5 text-sm font-medium hover:bg-[#0a2550] transition cursor-pointer border-none"
                >
                  Register
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
