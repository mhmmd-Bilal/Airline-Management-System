// src/pages/user/UserProfile.jsx
import { useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useGetMyBookingsQuery } from "../../slices/bookingApiSlice";
import UserNavbar from "../../components/UserNavbar";

const inputCls =
  "w-full h-11 px-3 text-[13px] text-[#0C3060] bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#0C3060] focus:ring-2 focus:ring-blue-50 transition placeholder:text-slate-300";

export default function UserProfile() {
  const { userData } = useSelector((s) => s.auth);
  const navigate = useNavigate();
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({
    name: userData?.name || "",
    phone: userData?.phone || "",
  });

  const { data: bookingData } = useGetMyBookingsQuery();
  const bookings = bookingData?.data ?? [];
  const confirmed = bookings.filter((b) => b.status === "confirmed").length;
  const completed = bookings.filter((b) => b.status === "completed").length;
  const totalSpent = bookings
    .filter((b) => b.paymentStatus === "paid")
    .reduce((a, b) => a + b.totalAmount, 0);

  const accountFields = [
    {
      label: "Full name",
      field: "name",
      value: userData?.name,
      editable: true,
    },
    { label: "Email", field: "email", value: userData?.email, editable: false },
    { label: "Phone", field: "phone", value: userData?.phone, editable: true },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Navbar */}
     <UserNavbar/>

      <div className="w-11/12 mx-auto px-4 py-8">
        {/* Profile header */}
        <div className="bg-[#0C3060] rounded-2xl p-6 mb-5 relative overflow-hidden">
          <div className="absolute w-48 h-48 rounded-full bg-white/[0.05] -top-12 -right-12" />
          <div className="relative z-10 flex items-center gap-4 flex-wrap">
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-white text-2xl font-black flex-shrink-0">
              {userData?.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-white/70 text-[11px] font-semibold uppercase tracking-widest mb-1">
                Passenger Account
              </p>
              <h1 className="text-white text-xl font-bold">{userData?.name}</h1>
              <p className="text-blue-200 text-sm">{userData?.email}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3.5 mb-5">
          {[
            { label: "Upcoming", value: confirmed, color: "text-[#0C3060]" },
            { label: "Completed", value: completed, color: "text-green-600" },
            {
              label: "Spent",
              value: `₹${totalSpent.toLocaleString()}`,
              color: "text-[#0C3060]",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white rounded-2xl border border-slate-100 p-4 text-center"
            >
              <p className={`text-2xl font-bold leading-none mb-1 ${s.color}`}>
                {s.value}
              </p>
              <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
                {s.label}
              </p>
            </div>
          ))}
        </div>

        {/* Account details */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Account details
            </p>
            <button
              onClick={() => setEditMode(!editMode)}
              className="text-[12px] text-[#0C3060] font-semibold hover:underline bg-transparent border-none cursor-pointer"
            >
              {editMode ? "Cancel" : "Edit"}
            </button>
          </div>

          {accountFields.map(({ label, field, value, editable }, i) => (
            <div
              key={field}
              className={`flex items-center justify-between py-3 ${i > 0 ? "border-t border-slate-50" : ""}`}
            >
              <span className="text-[12px] font-medium text-slate-400 w-32 flex-shrink-0">
                {label}
              </span>
              {editMode && editable ? (
                <input
                  className={`${inputCls} max-w-[240px]`}
                  value={form[field] ?? value}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, [field]: e.target.value }))
                  }
                />
              ) : (
                <span className="text-[13px] font-semibold text-[#0C3060]">
                  {value || "—"}
                </span>
              )}
            </div>
          ))}

          {editMode && (
            <button
              className="w-full mt-4 h-11 bg-[#0C3060] hover:bg-[#0a2550] text-white rounded-xl font-bold text-sm border-none cursor-pointer transition"
              onClick={() => {
                // TODO: dispatch updateProfile API call
                setEditMode(false);
              }}
            >
              Save changes
            </button>
          )}
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate("/bookings")}
            className="bg-white border border-slate-100 hover:border-[#0C3060] rounded-2xl p-4 flex items-center gap-3 cursor-pointer transition group text-left"
          >
            <div className="w-10 h-10 bg-[#EAF2FB] group-hover:bg-[#0C3060] rounded-xl flex items-center justify-center transition flex-shrink-0">
              <svg
                className="w-5 h-5 text-[#0C3060] group-hover:text-white transition"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <p className="text-[13px] font-bold text-[#0C3060]">
                My Bookings
              </p>
              <p className="text-[11px] text-slate-400">
                {bookings.length} total
              </p>
            </div>
          </button>

          <button
            onClick={() => navigate("/")}
            className="bg-white border border-slate-100 hover:border-[#0C3060] rounded-2xl p-4 flex items-center gap-3 cursor-pointer transition group text-left"
          >
            <div className="w-10 h-10 bg-[#EAF2FB] group-hover:bg-[#0C3060] rounded-xl flex items-center justify-center transition flex-shrink-0">
              <svg
                className="w-5 h-5 text-[#0C3060] group-hover:text-white transition"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            </div>
            <div>
              <p className="text-[13px] font-bold text-[#0C3060]">
                Search Flights
              </p>
              <p className="text-[11px] text-slate-400">Find new trips</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
