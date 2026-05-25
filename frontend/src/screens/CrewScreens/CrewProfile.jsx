// src/pages/crew/CrewProfile.jsx
import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  Avatar,
  Card,
  SectionLabel,
  InfoRow,
  StatCard,
  Badge,
} from "../../components/crew/crewShared";
import {
  medicalCls,
  fmtDate,
  inputCls,
} from "../../components/crew/crewConstants";
import { useGetAllFlightsQuery } from "../../slices/flightApiSlice";
import { useGetMyCrewProfileQuery } from "../../slices/crewApiSlice";
import { useUpdateUserMutation } from "../../slices/userApiSlice";
import { setCredentials } from "../../slices/authSlice";

/* ── modal shell ───────────────────────────────────── */
function Modal({ title, onClose, children }) {
  return (
    <div
      className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#D0E6F7] flex-shrink-0">
          <p className="text-[14px] font-bold text-[#0D1B2A]">{title}</p>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-[#D0E6F7] bg-[#F0F7FF] flex items-center justify-center text-[#1565C0] hover:bg-[#E1EFFE] transition cursor-pointer"
          >
            <i className="ti ti-x text-[15px]" />
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

/* ── edit profile modal ────────────────────────────── */
function EditProfileModal({ userData, onClose }) {
  const dispatch = useDispatch();
  const [updateUser, { isLoading }] = useUpdateUserMutation();

  const [form, setForm] = useState({
    name: userData?.name || "",
    phone: userData?.phone || "",
    password: "",
    confirm: "",
  });
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);

  const set = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.phone.trim()) e.phone = "Phone is required";
    if (form.password) {
      if (form.password.length < 6) e.password = "Min. 6 characters";
      if (form.password !== form.confirm) e.confirm = "Passwords do not match";
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
      dispatch(setCredentials(res.data));
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1200);
    } catch (err) {
      setErrors({ api: err?.data?.message ?? "Failed to save changes" });
    }
  };

  return (
    <Modal title="Edit profile" onClose={onClose}>
      {/* Name */}
      <div className="mb-4">
        <label className="block text-[11px] font-semibold uppercase tracking-[0.6px] text-[#5A7089] mb-1.5">
          Full name <span className="text-red-400">*</span>
        </label>
        <input
          className={inputCls}
          placeholder="Your full name"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
        />
        {errors.name && (
          <p className="text-[11px] text-red-500 mt-1">{errors.name}</p>
        )}
      </div>

      {/* Email — read only */}
      <div className="mb-4">
        <label className="block text-[11px] font-semibold uppercase tracking-[0.6px] text-[#5A7089] mb-1.5">
          Email address
        </label>
        <input
          className={`${inputCls} opacity-60 cursor-not-allowed`}
          value={userData?.email}
          readOnly
        />
        <p className="text-[10px] text-[#B0C4D8] mt-1">
          Email cannot be changed
        </p>
      </div>

      {/* Phone */}
      <div className="mb-4">
        <label className="block text-[11px] font-semibold uppercase tracking-[0.6px] text-[#5A7089] mb-1.5">
          Phone number <span className="text-red-400">*</span>
        </label>
        <input
          className={inputCls}
          placeholder="10-digit number"
          value={form.phone}
          onChange={(e) => set("phone", e.target.value)}
        />
        {errors.phone && (
          <p className="text-[11px] text-red-500 mt-1">{errors.phone}</p>
        )}
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 my-4">
        <div className="flex-1 h-px bg-[#EAF4FB]" />
        <span className="text-[11px] text-[#B0C4D8] font-medium">
          Change password (optional)
        </span>
        <div className="flex-1 h-px bg-[#EAF4FB]" />
      </div>

      {/* New password */}
      <div className="mb-4">
        <label className="block text-[11px] font-semibold uppercase tracking-[0.6px] text-[#5A7089] mb-1.5">
          New password
        </label>
        <input
          type="password"
          className={inputCls}
          placeholder="Min. 6 characters"
          value={form.password}
          onChange={(e) => set("password", e.target.value)}
        />
        {errors.password && (
          <p className="text-[11px] text-red-500 mt-1">{errors.password}</p>
        )}
      </div>

      {/* Confirm password — only shown when typing */}
      {form.password && (
        <div className="mb-4">
          <label className="block text-[11px] font-semibold uppercase tracking-[0.6px] text-[#5A7089] mb-1.5">
            Confirm new password
          </label>
          <input
            type="password"
            className={inputCls}
            placeholder="Re-enter new password"
            value={form.confirm}
            onChange={(e) => set("confirm", e.target.value)}
          />
          {errors.confirm && (
            <p className="text-[11px] text-red-500 mt-1">{errors.confirm}</p>
          )}
        </div>
      )}

      {/* API error */}
      {errors.api && (
        <div className="mb-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-[12px] text-red-600">
          <i className="ti ti-alert-circle text-[14px]" /> {errors.api}
        </div>
      )}

      {/* Success */}
      {success && (
        <div className="mb-4 px-3 py-2.5 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2 text-[12px] text-green-700">
          <i className="ti ti-circle-check text-[14px]" /> Profile updated
          successfully!
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 mt-2">
        <button
          onClick={onClose}
          className="flex-1 h-10 border border-[#D0E6F7] bg-[#F0F7FF] text-[#1565C0] text-[13px] font-semibold rounded-[10px] hover:bg-[#E1EFFE] transition cursor-pointer"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={isLoading}
          className="flex-1 h-10 bg-[#1565C0] hover:bg-[#1251A3] text-white text-[13px] font-semibold rounded-[10px] shadow-[0_4px_16px_rgba(21,101,192,0.25)] transition cursor-pointer border-none disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <i className="ti ti-device-floppy text-[14px]" />
              Save changes
            </>
          )}
        </button>
      </div>
    </Modal>
  );
}

/* ── change password modal ─────────────────────────── */
function ChangePasswordModal({ userData, onClose }) {
  const dispatch = useDispatch();
  const [updateUser, { isLoading }] = useUpdateUserMutation();

  const [pw, setPw] = useState({ current: "", new: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);

  const set = (k, v) => {
    setPw((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!pw.current.trim()) e.current = "Current password is required";
    if (!pw.new.trim()) e.new = "New password is required";
    else if (pw.new.length < 6) e.new = "Min. 6 characters";
    if (pw.new !== pw.confirm) e.confirm = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = async () => {
    if (!validate()) return;
    try {
      // Send new password — backend hashes and saves
      const res = await updateUser({ password: pw.new }).unwrap();
      dispatch(setCredentials(res.data));
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1200);
    } catch (err) {
      setErrors({ api: err?.data?.message ?? "Failed to update password" });
    }
  };

  return (
    <Modal title="Change password" onClose={onClose}>
      {[
        {
          field: "current",
          label: "Current password",
          ph: "Enter current password",
        },
        { field: "new", label: "New password", ph: "Min. 6 characters" },
        {
          field: "confirm",
          label: "Confirm new password",
          ph: "Re-enter new password",
        },
      ].map(({ field, label, ph }) => (
        <div key={field} className="mb-4">
          <label className="block text-[11px] font-semibold uppercase tracking-[0.6px] text-[#5A7089] mb-1.5">
            {label}
          </label>
          <input
            type="password"
            className={inputCls}
            placeholder={ph}
            value={pw[field]}
            onChange={(e) => set(field, e.target.value)}
          />
          {errors[field] && (
            <p className="text-[11px] text-red-500 mt-1">{errors[field]}</p>
          )}
        </div>
      ))}

      {errors.api && (
        <div className="mb-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-[12px] text-red-600">
          <i className="ti ti-alert-circle text-[14px]" /> {errors.api}
        </div>
      )}

      {success && (
        <div className="mb-4 px-3 py-2.5 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2 text-[12px] text-green-700">
          <i className="ti ti-circle-check text-[14px]" /> Password updated
          successfully!
        </div>
      )}

      <div className="flex gap-3 mt-2">
        <button
          onClick={onClose}
          className="flex-1 h-10 border border-[#D0E6F7] bg-[#F0F7FF] text-[#1565C0] text-[13px] font-semibold rounded-[10px] hover:bg-[#E1EFFE] transition cursor-pointer"
        >
          Cancel
        </button>
        <button
          onClick={handleChange}
          disabled={isLoading}
          className="flex-1 h-10 bg-[#1565C0] hover:bg-[#1251A3] text-white text-[13px] font-semibold rounded-[10px] shadow-[0_4px_16px_rgba(21,101,192,0.25)] transition cursor-pointer border-none disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Updating…
            </>
          ) : (
            "Update password"
          )}
        </button>
      </div>
    </Modal>
  );
}

/* ── main page ─────────────────────────────────────── */
export default function CrewProfile() {
  const { userData } = useSelector((s) => s.auth);
  const [showEdit, setShowEdit] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const name = userData?.name ?? "Crew Member";

  const { data: crewData } = useGetMyCrewProfileQuery();
  const crew = crewData?.data;

  const { data: flightData } = useGetAllFlightsQuery({
    status: "all",
    search: "",
    page: 1,
    limit: 50,
  });

  const allFlights = (flightData?.data ?? []).filter((f) =>
    f.crewIds?.some((c) => String(c?._id) === String(crew?._id)),
  );
  const completedFlights = allFlights.filter((f) => f.status === "completed");
  const upcomingFlights = allFlights.filter((f) =>
    ["scheduled", "delayed", "boarding"].includes(f.status),
  );

  return (
    <div className="p-5 md:p-7">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        {/* ── Identity card ── */}
        <Card className="p-6 flex flex-col items-center text-center">
          <div className="relative mb-4">
            <Avatar name={name} size="xl" />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-green-500 border-2 border-white flex items-center justify-center">
              <i className="ti ti-check text-white text-[10px]" />
            </div>
          </div>

          <p className="text-[16px] font-bold text-[#0D1B2A]">{name}</p>
          <p className="text-[12px] text-[#7A90A4] mt-0.5">
            {crew?.role} · {crew?.employeeId}
          </p>

          <div className="flex items-center gap-2 mt-3 flex-wrap justify-center">
            <Badge
              label={crew?.currentStatus}
              cls="bg-blue-100 text-blue-800"
            />
            <Badge
              label={crew?.medicalStatus}
              cls={
                medicalCls[crew?.medicalStatus] || "bg-gray-100 text-gray-600"
              }
            />
          </div>

          {/* Contact info */}
          <div className="w-full mt-5 pt-5 border-t border-[#F0F7FF]">
            {[
              ["ti-mail", crew?.userId?.email || "—"],
              ["ti-phone", crew?.userId?.phone || "—"],
              ["ti-map-pin", crew?.nationality || "—"],
              ["ti-cake", fmtDate(crew?.dateOfBirth)],
            ].map(([icon, value]) => (
              <div key={icon} className="flex items-center gap-2.5 py-2">
                <i
                  className={`ti ${icon} text-[#B0C4D8] text-[14px] flex-shrink-0`}
                />
                <span className="text-[12px] text-[#5A7089] truncate">
                  {value}
                </span>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="w-full mt-5 flex flex-col gap-2">
            <button
              onClick={() => setShowEdit(true)}
              className="w-full h-10 bg-[#1565C0] hover:bg-[#1251A3] text-white text-[12px] font-semibold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer border-none"
            >
              <i className="ti ti-pencil text-[14px]" />
              Edit profile
            </button>
            <button
              onClick={() => setShowPw(true)}
              className="w-full h-10 border border-[#D0E6F7] bg-[#F0F7FF] hover:bg-[#E1EFFE] text-[#1565C0] text-[12px] font-semibold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <i className="ti ti-lock text-[14px]" />
              Change password
            </button>
          </div>
        </Card>

        {/* ── Details ── */}
        <div className="lg:col-span-2 flex flex-col gap-3.5">
          <Card className="p-5">
            <SectionLabel>Professional information</SectionLabel>
            {[
              ["Employee ID", crew?.employeeId],
              ["Role", crew?.role],
              [
                "Experience",
                crew?.experience ? `${crew.experience} years` : "—",
              ],
              [
                "Salary",
                crew?.salary
                  ? `₹${Number(crew.salary).toLocaleString()} / month`
                  : "—",
              ],
              ["Current Status", crew?.currentStatus],
            ].map(([l, v], i) => (
              <InfoRow key={l} label={l} value={v} i={i} />
            ))}
          </Card>

          <Card className="p-5">
            <SectionLabel>License information</SectionLabel>
            {[
              ["License Number", crew?.licenseNumber || "—"],
              ["Expiry Date", fmtDate(crew?.licenseExpiry)],
              ["Nationality", crew?.nationality || "—"],
            ].map(([l, v], i) => (
              <InfoRow key={l} label={l} value={v} i={i} />
            ))}
          </Card>

          <div className="grid grid-cols-3 gap-3.5">
            <StatCard
              label="Total Flights"
              value={allFlights.length}
              icon="ti-plane"
              color="bg-blue-50 text-blue-700"
            />
            <StatCard
              label="Completed"
              value={completedFlights.length}
              icon="ti-circle-check"
              color="bg-green-50 text-green-700"
            />
            <StatCard
              label="Upcoming"
              value={upcomingFlights.length}
              icon="ti-calendar"
              color="bg-violet-50 text-violet-700"
            />
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      {showEdit && (
        <EditProfileModal
          userData={userData}
          onClose={() => setShowEdit(false)}
        />
      )}

      {showPw && (
        <ChangePasswordModal
          userData={userData}
          onClose={() => setShowPw(false)}
        />
      )}
    </div>
  );
}
