// src/pages/user/UserProfile.jsx
import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useGetMyBookingsQuery } from "../../slices/bookingApiSlice";
import { useUpdateUserMutation } from "../../slices/userApiSlice";
import { setCredentials } from "../../slices/authSlice";
import UserNavbar from "../../components/UserNavbar";

const inputCls =
  "w-full h-11 px-4 text-[13px] text-[#0C3060] bg-[#F7FAFD] border border-[#DCE8F5] rounded-2xl outline-none focus:border-[#1565C0] focus:ring-4 focus:ring-blue-50 transition placeholder:text-slate-300";

/* ── tiny primitives ──────────────────────────────── */
function StatCard({ icon, label, value, color }) {
  return (
    <div className="bg-white rounded-[28px] border border-[#E6EEF7] p-5 shadow-sm hover:shadow-md transition">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: `${color}15` }}>
        <i className={`ti ${icon} text-[22px]`} style={{ color }} />
      </div>
      <h3 className="mt-5 text-[28px] font-black leading-none" style={{ color }}>{value}</h3>
      <p className="mt-2 text-[11px] uppercase tracking-[2px] text-[#8EA3B7] font-bold">{label}</p>
    </div>
  );
}

function QuickAction({ icon, title, subtitle, onClick }) {
  return (
    <button onClick={onClick}
      className="group bg-white border border-[#E6EEF7] hover:border-[#1565C0] rounded-[28px] p-5 flex items-center gap-4 transition-all duration-300 cursor-pointer text-left hover:-translate-y-1 hover:shadow-md w-full"
    >
      <div className="w-14 h-14 rounded-2xl bg-[#EEF5FD] group-hover:bg-[#1565C0] transition flex items-center justify-center flex-shrink-0">
        <i className={`ti ${icon} text-[#1565C0] group-hover:text-white text-[24px] transition`} />
      </div>
      <div>
        <h3 className="text-[15px] font-black text-[#0D1B2A]">{title}</h3>
        <p className="text-[12px] text-[#8EA3B7] mt-1">{subtitle}</p>
      </div>
    </button>
  );
}

/* ── edit profile sheet ───────────────────────────── */
function EditProfileSheet({ userData, onClose, onSaved }) {
  const dispatch = useDispatch();
  const [updateUser, { isLoading }] = useUpdateUserMutation();

  const [form, setForm] = useState({
    name:     userData?.name  || "",
    phone:    userData?.phone || "",
    password: "",
    confirm:  "",
  });
  const [errors,  setErrors]  = useState({});
  const [success, setSuccess] = useState(false);

  const set = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim())          e.name    = "Name is required";
    if (!form.phone.trim())         e.phone   = "Phone is required";
    if (!/^[6-9]\d{9}$/.test(form.phone)) e.phone = "Invalid Indian phone number";
    if (form.password) {
      if (form.password.length < 8)                e.password = "Min. 8 characters";
      if (form.password !== form.confirm)          e.confirm  = "Passwords do not match";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    try {
      const payload = { name: form.name.trim(), phone: form.phone.trim() };
      if (form.password) payload.password = form.password;

      const res = await updateUser(payload).unwrap();
      // update Redux so the navbar + hero reflect the new name immediately
      dispatch(setCredentials(res.data));
      setSuccess(true);
      setTimeout(() => { setSuccess(false); onSaved?.(); }, 1200);
    } catch (err) {
      setErrors({ api: err?.data?.message ?? "Failed to save changes" });
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 sm:p-6"
      style={{ background: "rgba(13,27,64,0.45)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#EDF3F8]">
          <div>
            <h2 className="text-[18px] font-black text-[#0D1B2A]">Edit profile</h2>
            <p className="text-[12px] text-[#8EA3B7] mt-0.5">Update your personal information</p>
          </div>
          <button onClick={onClose}
            className="w-9 h-9 rounded-2xl bg-[#F4F8FC] border border-[#E6EEF7] flex items-center justify-center text-[#5F7488] hover:bg-[#EDF3F8] transition cursor-pointer">
            <i className="ti ti-x text-[15px]" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-[11px] font-bold text-[#8EA3B7] uppercase tracking-[1.5px] mb-2">Full name</label>
            <div className="relative">
              <i className="ti ti-user absolute left-3.5 top-1/2 -translate-y-1/2 text-[#B0C4D8] text-[16px]" />
              <input className={`${inputCls} pl-10`} placeholder="Your full name"
                value={form.name} onChange={(e) => set("name", e.target.value)} />
            </div>
            {errors.name && <p className="text-[11px] text-red-500 mt-1">{errors.name}</p>}
          </div>

          {/* Email — read only */}
          <div>
            <label className="block text-[11px] font-bold text-[#8EA3B7] uppercase tracking-[1.5px] mb-2">Email address</label>
            <div className="relative">
              <i className="ti ti-mail absolute left-3.5 top-1/2 -translate-y-1/2 text-[#B0C4D8] text-[16px]" />
              <input className={`${inputCls} pl-10 opacity-60 cursor-not-allowed`}
                value={userData?.email} readOnly />
            </div>
            <p className="text-[10px] text-[#B0C4D8] mt-1">Email cannot be changed</p>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-[11px] font-bold text-[#8EA3B7] uppercase tracking-[1.5px] mb-2">Phone number</label>
            <div className="relative">
              <i className="ti ti-phone absolute left-3.5 top-1/2 -translate-y-1/2 text-[#B0C4D8] text-[16px]" />
              <input className={`${inputCls} pl-10`} placeholder="10-digit number"
                value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
            {errors.phone && <p className="text-[11px] text-red-500 mt-1">{errors.phone}</p>}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 pt-1">
            <div className="flex-1 h-px bg-[#EDF3F8]" />
            <span className="text-[11px] text-[#B0C4D8] font-medium">Change password (optional)</span>
            <div className="flex-1 h-px bg-[#EDF3F8]" />
          </div>

          {/* New password */}
          <div>
            <label className="block text-[11px] font-bold text-[#8EA3B7] uppercase tracking-[1.5px] mb-2">New password</label>
            <div className="relative">
              <i className="ti ti-lock absolute left-3.5 top-1/2 -translate-y-1/2 text-[#B0C4D8] text-[16px]" />
              <input type="password" className={`${inputCls} pl-10`} placeholder="Min. 8 characters"
                value={form.password} onChange={(e) => set("password", e.target.value)} />
            </div>
            {errors.password && <p className="text-[11px] text-red-500 mt-1">{errors.password}</p>}
          </div>

          {/* Confirm password */}
          {form.password && (
            <div>
              <label className="block text-[11px] font-bold text-[#8EA3B7] uppercase tracking-[1.5px] mb-2">Confirm password</label>
              <div className="relative">
                <i className="ti ti-lock-check absolute left-3.5 top-1/2 -translate-y-1/2 text-[#B0C4D8] text-[16px]" />
                <input type="password" className={`${inputCls} pl-10`} placeholder="Re-enter new password"
                  value={form.confirm} onChange={(e) => set("confirm", e.target.value)} />
              </div>
              {errors.confirm && <p className="text-[11px] text-red-500 mt-1">{errors.confirm}</p>}
            </div>
          )}

          {/* API error */}
          {errors.api && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2 text-[12px] text-red-600">
              <i className="ti ti-alert-circle text-[14px]" /> {errors.api}
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="px-4 py-3 bg-green-50 border border-green-200 rounded-2xl flex items-center gap-2 text-[12px] text-green-700">
              <i className="ti ti-circle-check text-[14px]" /> Profile updated successfully!
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose}
            className="flex-1 h-12 border border-[#DCE8F5] bg-[#F7FAFD] text-[#5F7488] text-[13px] font-bold rounded-2xl cursor-pointer hover:bg-[#EDF3F8] transition">
            Cancel
          </button>
          <button onClick={handleSave} disabled={isLoading}
            className="flex-1 h-12 bg-[#0D2540] hover:bg-[#123B64] text-white text-[13px] font-bold rounded-2xl border-none cursor-pointer disabled:opacity-60 transition flex items-center justify-center gap-2">
            {isLoading
              ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving…</>
              : <><i className="ti ti-device-floppy text-[15px]" />Save changes</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── main page ────────────────────────────────────── */
export default function UserProfile() {
  const { userData } = useSelector((s) => s.auth);
  const navigate     = useNavigate();
  const [showEdit, setShowEdit] = useState(false);

  const { data: bookingData } = useGetMyBookingsQuery();
  const bookings   = bookingData?.data ?? [];
  const confirmed  = bookings.filter((b) => b.status === "confirmed").length;
  const completed  = bookings.filter((b) => b.status === "completed").length;
  const cancelled  = bookings.filter((b) => b.status === "cancelled").length;
  const totalSpent = bookings
    .filter((b) => b.paymentStatus === "paid")
    .reduce((a, b) => a + b.totalAmount, 0);

  return (
    <div className="min-h-screen bg-[#F4F8FC]">
      <UserNavbar />

      <div className="w-11/12 mx-auto py-7">

        {/* ── Hero ── */}
        <div className="relative overflow-hidden rounded-[36px] bg-gradient-to-br from-[#0D2540] via-[#123B64] to-[#1565C0] p-7 md:p-9 shadow-[0_20px_60px_rgba(13,37,64,0.16)]">
          <div className="absolute -top-24 -right-24 w-[260px] h-[260px] rounded-full bg-white/10 blur-3xl" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div className="flex items-center gap-5 flex-wrap">
              {/* Avatar */}
              <div className="w-24 h-24 rounded-[28px] bg-white/15 border border-white/10 backdrop-blur-xl flex items-center justify-center text-white text-[38px] font-black shadow-lg flex-shrink-0">
                {userData?.name?.charAt(0)?.toUpperCase()}
              </div>

              <div>
                <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full mb-4">
                  <div className="w-2 h-2 rounded-full bg-[#4ADE80] animate-pulse" />
                  <span className="text-white text-[11px] font-bold tracking-wide">ACTIVE PASSENGER</span>
                </div>
                <h1 className="text-white text-[32px] md:text-[40px] font-black leading-none tracking-[-1px]">
                  {userData?.name}
                </h1>
                <p className="mt-2 text-blue-100 text-[14px] font-medium">{userData?.email}</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <div className="bg-white/10 border border-white/10 px-4 py-2 rounded-2xl">
                    <p className="text-white/60 text-[10px] uppercase tracking-[2px] font-bold">Role</p>
                    <p className="text-white text-[13px] font-bold mt-0.5 capitalize">{userData?.role}</p>
                  </div>
                  <div className="bg-white/10 border border-white/10 px-4 py-2 rounded-2xl">
                    <p className="text-white/60 text-[10px] uppercase tracking-[2px] font-bold">Bookings</p>
                    <p className="text-white text-[13px] font-bold mt-0.5">{bookings.length} total</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Spend card */}
            <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-[30px] p-6 min-w-[220px] flex-shrink-0">
              <p className="text-white/70 text-[11px] uppercase tracking-[2px] font-bold">Total spent</p>
              <h2 className="mt-2 text-white text-[36px] font-black leading-none">
                ₹{totalSpent.toLocaleString()}
              </h2>
              <p className="mt-2 text-white/60 text-[12px]">Across all bookings</p>
            </div>
          </div>
        </div>

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-7">
          <StatCard icon="ti-plane-departure" label="Upcoming flights" value={confirmed} color="#1565C0" />
          <StatCard icon="ti-circle-check"    label="Completed trips"  value={completed} color="#2E7D32" />
          <StatCard icon="ti-x"               label="Cancelled"        value={cancelled} color="#D32F2F" />
        </div>

        {/* ── Profile + side panel ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_0.7fr] gap-6 mt-7">

          {/* Account details */}
          <div className="bg-white rounded-[32px] border border-[#E6EEF7] p-6 shadow-sm">
            <div className="flex items-center justify-between mb-7">
              <div>
                <h2 className="text-[22px] font-black text-[#0D1B2A]">Personal information</h2>
                <p className="text-[12px] text-[#8EA3B7] mt-1">Your passenger account details</p>
              </div>
              <button
                onClick={() => setShowEdit(true)}
                className="h-10 px-5 rounded-2xl text-[13px] font-bold bg-[#EEF5FD] text-[#1565C0] hover:bg-[#1565C0] hover:text-white transition border-none cursor-pointer flex items-center gap-2"
              >
                <i className="ti ti-pencil text-[14px]" />
                Edit profile
              </button>
            </div>

            <div className="space-y-4">
              {[
                { label: "Full name",     icon: "ti-user",   value: userData?.name  },
                { label: "Email address", icon: "ti-mail",   value: userData?.email },
                { label: "Phone number",  icon: "ti-phone",  value: userData?.phone || "—" },
                { label: "Account type",  icon: "ti-shield", value: userData?.role?.charAt(0).toUpperCase() + userData?.role?.slice(1) },
              ].map(({ label, icon, value }) => (
                <div key={label} className="flex items-center gap-4 border border-[#EDF3F8] rounded-[24px] p-4 hover:border-[#DCE8F5] transition">
                  <div className="w-11 h-11 rounded-2xl bg-[#EEF5FD] flex items-center justify-center flex-shrink-0">
                    <i className={`ti ${icon} text-[#1565C0] text-[18px]`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-[1.5px] text-[#8EA3B7] font-bold mb-0.5">{label}</p>
                    <p className="text-[15px] font-bold text-[#0D1B2A] truncate">{value || "—"}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Change password CTA */}
            <button
              onClick={() => setShowEdit(true)}
              className="mt-5 w-full h-11 border border-dashed border-[#DCE8F5] rounded-2xl flex items-center justify-center gap-2 text-[13px] font-semibold text-[#8EA3B7] hover:border-[#1565C0] hover:text-[#1565C0] hover:bg-[#F7FAFD] transition cursor-pointer"
            >
              <i className="ti ti-lock text-[14px]" />
              Change password
            </button>
          </div>

          {/* Side panel */}
          <div className="space-y-5">
            {/* Account status */}
            <div className="bg-white rounded-[32px] border border-[#E6EEF7] p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-[11px] uppercase tracking-[2px] text-[#8EA3B7] font-bold">Account status</p>
                  <h3 className="text-[20px] font-black text-[#0D1B2A] mt-1.5">Verified user</h3>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center">
                  <i className="ti ti-shield-check text-green-600 text-[24px]" />
                </div>
              </div>

              {/* Mini stats */}
              <div className="space-y-2.5">
                {[
                  { label: "Upcoming",  value: confirmed, color: "#1565C0" },
                  { label: "Completed", value: completed, color: "#2E7D32" },
                  { label: "Cancelled", value: cancelled, color: "#D32F2F" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center justify-between bg-[#F4F8FC] rounded-2xl px-4 py-3">
                    <span className="text-[12px] font-semibold text-[#5F7488]">{label}</span>
                    <span className="text-[13px] font-black" style={{ color }}>{value}</span>
                  </div>
                ))}
              </div>

              {/* Completion bar */}
              <div className="mt-4">
                <div className="flex justify-between text-[10px] font-bold text-[#8EA3B7] mb-1.5">
                  <span>Completion rate</span>
                  <span>{bookings.length > 0 ? Math.round((completed / bookings.length) * 100) : 0}%</span>
                </div>
                <div className="h-2 bg-[#DDE9F5] rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-[#1565C0] transition-all duration-700"
                    style={{ width: `${bookings.length > 0 ? (completed / bookings.length) * 100 : 0}%` }} />
                </div>
              </div>
            </div>

            {/* Quick actions */}
            <div className="space-y-3">
              <QuickAction
                icon="ti-ticket"
                title="My bookings"
                subtitle={`${bookings.length} booking${bookings.length !== 1 ? "s" : ""}`}
                onClick={() => navigate("/bookings")}
              />
              <QuickAction
                icon="ti-search"
                title="Search flights"
                subtitle="Book your next trip"
                onClick={() => navigate("/")}
              />
              <QuickAction
                icon="ti-headset"
                title="Support"
                subtitle="Get help with your bookings"
                onClick={() => navigate("/support")}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Edit sheet */}
      {showEdit && (
        <EditProfileSheet
          userData={userData}
          onClose={() => setShowEdit(false)}
          onSaved={() => setShowEdit(false)}
        />
      )}
    </div>
  );
}