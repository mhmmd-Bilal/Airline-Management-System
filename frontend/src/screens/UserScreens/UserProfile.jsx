// src/pages/user/UserProfile.jsx

import { useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useGetMyBookingsQuery } from "../../slices/bookingApiSlice";
import UserNavbar from "../../components/UserNavbar";

const inputCls =
  "w-full h-11 px-4 text-[13px] text-[#0C3060] bg-[#F7FAFD] border border-[#DCE8F5] rounded-2xl outline-none focus:border-[#1565C0] focus:ring-4 focus:ring-blue-50 transition placeholder:text-slate-300";

function StatCard({ icon, label, value, color }) {
  return (
    <div className="bg-white rounded-[28px] border border-[#E6EEF7] p-5 shadow-sm hover:shadow-md transition">
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center"
        style={{
          background: `${color}15`,
        }}
      >
        <i className={`ti ${icon} text-[22px]`} style={{ color }} />
      </div>

      <h3
        className="mt-5 text-[28px] font-black leading-none"
        style={{ color }}
      >
        {value}
      </h3>

      <p className="mt-2 text-[11px] uppercase tracking-[2px] text-[#8EA3B7] font-bold">
        {label}
      </p>
    </div>
  );
}

function QuickAction({ icon, title, subtitle, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group bg-white border border-[#E6EEF7] hover:border-[#1565C0] rounded-[28px] p-5 flex items-center gap-4 transition-all duration-300 cursor-pointer text-left hover:-translate-y-1 hover:shadow-md"
    >
      <div className="w-14 h-14 rounded-2xl bg-[#EEF5FD] group-hover:bg-[#1565C0] transition flex items-center justify-center flex-shrink-0">
        <i
          className={`ti ${icon} text-[#1565C0] group-hover:text-white text-[24px] transition`}
        />
      </div>

      <div>
        <h3 className="text-[15px] font-black text-[#0D1B2A]">{title}</h3>

        <p className="text-[12px] text-[#8EA3B7] mt-1">{subtitle}</p>
      </div>
    </button>
  );
}

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

  const cancelled = bookings.filter((b) => b.status === "cancelled").length;

  const totalSpent = bookings
    .filter((b) => b.paymentStatus === "paid")
    .reduce((a, b) => a + b.totalAmount, 0);

  const accountFields = [
    {
      label: "Full name",
      field: "name",
      value: userData?.name,
      editable: true,
      icon: "ti-user",
    },
    {
      label: "Email address",
      field: "email",
      value: userData?.email,
      editable: false,
      icon: "ti-mail",
    },
    {
      label: "Phone number",
      field: "phone",
      value: userData?.phone,
      editable: true,
      icon: "ti-phone",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F4F8FC]">
      <UserNavbar />

      <div className="w-11/12 mx-auto py-7">
        {/* HERO */}
        <div className="relative overflow-hidden rounded-[36px] bg-gradient-to-br from-[#0D2540] via-[#123B64] to-[#1565C0] p-7 md:p-9 shadow-[0_20px_60px_rgba(13,37,64,0.16)]">
          {/* GLOW */}
          <div className="absolute -top-24 -right-24 w-[260px] h-[260px] rounded-full bg-white/10 blur-3xl" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            {/* LEFT */}
            <div className="flex items-center gap-5 flex-wrap">
              <div className="w-24 h-24 rounded-[28px] bg-white/15 border border-white/10 backdrop-blur-xl flex items-center justify-center text-white text-[38px] font-black shadow-lg">
                {userData?.name?.charAt(0)?.toUpperCase()}
              </div>

              <div>
                <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full mb-4">
                  <div className="w-2 h-2 rounded-full bg-[#4ADE80] animate-pulse" />

                  <span className="text-white text-[11px] font-bold tracking-wide">
                    ACTIVE PASSENGER
                  </span>
                </div>

                <h1 className="text-white text-[32px] md:text-[42px] font-black leading-none tracking-[-1px]">
                  {userData?.name}
                </h1>

                <p className="mt-3 text-blue-100 text-[14px] font-medium">
                  {userData?.email}
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  <div className="bg-white/10 border border-white/10 px-4 py-2 rounded-2xl">
                    <p className="text-white/60 text-[10px] uppercase tracking-[2px] font-bold">
                      Role
                    </p>

                    <p className="text-white text-[13px] font-bold mt-1 capitalize">
                      {userData?.role}
                    </p>
                  </div>

                  <div className="bg-white/10 border border-white/10 px-4 py-2 rounded-2xl">
                    <p className="text-white/60 text-[10px] uppercase tracking-[2px] font-bold">
                      Flights
                    </p>

                    <p className="text-white text-[13px] font-bold mt-1">
                      {bookings.length} Total Bookings
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT */}
            <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-[30px] p-6 min-w-[240px]">
              <p className="text-white/70 text-[11px] uppercase tracking-[2px] font-bold">
                Total Travel Spend
              </p>

              <h2 className="mt-3 text-white text-[40px] font-black leading-none">
                ₹{totalSpent.toLocaleString()}
              </h2>

              <p className="mt-3 text-white/70 text-[12px]">
                Across all successful bookings
              </p>
            </div>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-7">
          <StatCard
            icon="ti-plane-departure"
            label="Upcoming Flights"
            value={confirmed}
            color="#1565C0"
          />

          <StatCard
            icon="ti-circle-check"
            label="Completed Trips"
            value={completed}
            color="#2E7D32"
          />

          <StatCard
            icon="ti-x"
            label="Cancelled"
            value={cancelled}
            color="#D32F2F"
          />
        </div>

        {/* PROFILE + ACTIVITY */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_0.7fr] gap-6 mt-7">
          {/* ACCOUNT DETAILS */}
          <div className="bg-white rounded-[32px] border border-[#E6EEF7] p-6 shadow-sm">
            <div className="flex items-center justify-between mb-7">
              <div>
                <h2 className="text-[24px] font-black text-[#0D1B2A]">
                  Personal Information
                </h2>

                <p className="text-[12px] text-[#8EA3B7] mt-1">
                  Manage your passenger account details
                </p>
              </div>

              <button
                onClick={() => setEditMode(!editMode)}
                className={`h-11 px-5 rounded-2xl text-[13px] font-bold transition border-none cursor-pointer ${
                  editMode
                    ? "bg-red-50 text-red-600"
                    : "bg-[#EEF5FD] text-[#1565C0]"
                }`}
              >
                {editMode ? "Cancel" : "Edit Profile"}
              </button>
            </div>

            <div className="space-y-5">
              {accountFields.map(({ label, field, value, editable, icon }) => (
                <div
                  key={field}
                  className="border border-[#EDF3F8] rounded-[24px] p-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#EEF5FD] flex items-center justify-center flex-shrink-0">
                      <i className={`ti ${icon} text-[#1565C0] text-[20px]`} />
                    </div>

                    <div className="flex-1">
                      <p className="text-[11px] uppercase tracking-[2px] text-[#8EA3B7] font-bold">
                        {label}
                      </p>

                      <div className="mt-2">
                        {editMode && editable ? (
                          <input
                            className={inputCls}
                            value={form[field] ?? value}
                            onChange={(e) =>
                              setForm((p) => ({
                                ...p,
                                [field]: e.target.value,
                              }))
                            }
                          />
                        ) : (
                          <h3 className="text-[16px] font-bold text-[#0D1B2A] break-all">
                            {value || "—"}
                          </h3>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {editMode && (
              <button
                className="w-full mt-6 h-12 rounded-2xl bg-gradient-to-r from-[#0D2540] to-[#1565C0] text-white font-bold text-[14px] border-none cursor-pointer shadow-lg shadow-blue-100"
                onClick={() => {
                  // TODO: update profile API
                  setEditMode(false);
                }}
              >
                Save Changes
              </button>
            )}
          </div>

          {/* SIDE PANEL */}
          <div className="space-y-6">
            {/* ACCOUNT STATUS */}
            <div className="bg-white rounded-[32px] border border-[#E6EEF7] p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[2px] text-[#8EA3B7] font-bold">
                    Account Status
                  </p>

                  <h3 className="text-[22px] font-black text-[#0D1B2A] mt-2">
                    Verified User
                  </h3>
                </div>

                <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center">
                  <i className="ti ti-shield-check text-green-600 text-[28px]" />
                </div>
              </div>

              <div className="mt-6 bg-[#F4F8FC] rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-[#5F7488]">
                    Booking Activity
                  </span>

                  <span className="text-[12px] font-black text-[#0D1B2A]">
                    {bookings.length} Flights
                  </span>
                </div>

                <div className="mt-3 h-2 bg-[#DDE9F5] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#1565C0]"
                    style={{
                      width: `${
                        bookings.length > 0
                          ? (completed / bookings.length) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* QUICK ACTIONS */}
            <div className="space-y-4">
              <QuickAction
                icon="ti-ticket"
                title="My Bookings"
                subtitle={`${bookings.length} bookings available`}
                onClick={() => navigate("/bookings")}
              />

              <QuickAction
                icon="ti-search"
                title="Search Flights"
                subtitle="Book your next destination"
                onClick={() => navigate("/")}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
