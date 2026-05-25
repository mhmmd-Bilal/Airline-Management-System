// src/pages/admin/CrewProfilePage.jsx
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useGetCrewByUserIdQuery } from "../../slices/crewApiSlice";
import Badge from "../../components/admin/shared/Badge";
import Avatar from "../../components/admin/shared/Avatar";

// ── Helpers ────────────────────────────────────────────
const fmt = (dt) =>
  dt
    ? new Date(dt).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : "—";

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const fmtDuration = (hrs) => {
  if (!hrs && hrs !== 0) return "—";
  const h = Math.floor(hrs);
  const m = Math.round((hrs - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

const FLIGHT_STATUS = {
  scheduled: { cls: "bg-blue-50 text-blue-700", label: "Scheduled" },
  boarding: { cls: "bg-violet-50 text-violet-700", label: "Boarding" },
  "in-flight": { cls: "bg-indigo-50 text-indigo-700", label: "In Flight" },
  delayed: { cls: "bg-orange-50 text-orange-700", label: "Delayed" },
  completed: { cls: "bg-green-50 text-green-700", label: "Completed" },
  cancelled: { cls: "bg-red-50 text-red-600", label: "Cancelled" },
};

const ATTENDANCE_STATUS = {
  present: { cls: "bg-green-50 text-green-700", label: "Present" },
  absent: { cls: "bg-red-50 text-red-600", label: "Absent" },
  leave: { cls: "bg-orange-50 text-orange-700", label: "Leave" },
  "half-day": { cls: "bg-amber-50 text-amber-700", label: "Half Day" },
};

const CREW_STATUS = {
  Available: { cls: "bg-green-50 text-green-700" },
  "On Duty": { cls: "bg-blue-50 text-blue-700" },
  "Off Duty": { cls: "bg-slate-100 text-slate-500" },
  "On Leave": { cls: "bg-orange-50 text-orange-700" },
};

const MEDICAL_STATUS = {
  Fit: { cls: "bg-green-50 text-green-700", icon: "ti-circle-check" },
  "Under Treatment": {
    cls: "bg-orange-50 text-orange-700",
    icon: "ti-alert-triangle",
  },
};

// ── Shared primitives ──────────────────────────────────
function StatCard({ label, value, icon, color, sub, warn }) {
  return (
    <div
      className={`bg-white border rounded-2xl p-5 relative overflow-hidden
      ${warn ? "border-orange-300" : "border-[#D0E6F7]"}`}
    >
      {warn && (
        <div className="absolute top-3 right-3">
          <i className="ti ti-alert-triangle text-orange-500 text-[14px]" />
        </div>
      )}
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-medium text-[#7A90A4] uppercase tracking-[0.6px]">
          {label}
        </p>
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}
        >
          <i className={`ti ${icon} text-[15px]`} />
        </div>
      </div>
      <p className="text-[24px] font-bold text-[#0D1B2A] leading-none">
        {value ?? "—"}
      </p>
      {sub && <p className="text-[11px] text-[#7A90A4] mt-1.5">{sub}</p>}
    </div>
  );
}

function SectionCard({ title, icon, children, action }) {
  return (
    <div className="bg-white border border-[#D0E6F7] rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#EAF4FB]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-[#EAF4FB] rounded-lg flex items-center justify-center">
            <i className={`ti ${icon} text-[#1565C0] text-[13px]`} />
          </div>
          <p className="text-[13px] font-bold text-[#0D1B2A]">{title}</p>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function InfoRow({ label, value, i }) {
  return (
    <div
      className={`flex items-center justify-between py-2.5 ${i > 0 ? "border-t border-[#F0F7FF]" : ""}`}
    >
      <span className="text-[12px] font-medium text-[#7A90A4]">{label}</span>
      <span className="text-[12px] font-semibold text-[#0D1B2A] text-right max-w-[58%]">
        {value ?? "—"}
      </span>
    </div>
  );
}

function EmptyState({ icon, message }) {
  return (
    <div className="text-center py-8">
      <i className={`ti ${icon} text-[32px] text-[#D0E6F7] block mb-2`} />
      <p className="text-[12px] text-[#7A90A4]">{message}</p>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-32 bg-[#EAF4FB] rounded-2xl" />
      <div className="grid grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-[#EAF4FB] rounded-2xl" />
        ))}
      </div>
      <div className="h-48 bg-[#EAF4FB] rounded-2xl" />
    </div>
  );
}

// ── Attendance calendar (current month) ───────────────
function AttendanceCalendar({ records }) {
  const [offset, setOffset] = useState(0); // 0 = current month, -1 = prev, etc.
  const now = new Date();
  const year = new Date(
    now.getFullYear(),
    now.getMonth() + offset,
    1,
  ).getFullYear();
  const month = new Date(
    now.getFullYear(),
    now.getMonth() + offset,
    1,
  ).getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0=Sun

  const recordMap = {};
  records.forEach((r) => {
    const key = new Date(r.date).toISOString().slice(0, 10);
    recordMap[key] = r;
  });

  const DOT = {
    present: "bg-green-500",
    absent: "bg-red-400",
    leave: "bg-orange-400",
    "half-day": "bg-amber-400",
  };

  const monthLabel = new Date(year, month, 1).toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
  });
  const isFuture = offset >= 0 && new Date(year, month + 1, 1) > now;

  return (
    <div>
      {/* Month nav */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setOffset((o) => o - 1)}
          className="w-7 h-7 rounded-lg border border-[#D0E6F7] bg-[#F0F7FF] flex items-center justify-center text-[#1565C0] hover:bg-[#E1EFFE] transition cursor-pointer"
        >
          <i className="ti ti-chevron-left text-[12px]" />
        </button>
        <p className="text-[12px] font-bold text-[#0D1B2A]">{monthLabel}</p>
        <button
          disabled={offset >= 0}
          onClick={() => setOffset((o) => o + 1)}
          className="w-7 h-7 rounded-lg border border-[#D0E6F7] bg-[#F0F7FF] flex items-center justify-center text-[#1565C0] hover:bg-[#E1EFFE] transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <i className="ti ti-chevron-right text-[12px]" />
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 mb-1">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <p
            key={d}
            className="text-center text-[9px] font-bold text-[#B0C4D8] py-1"
          >
            {d}
          </p>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {/* Empty cells before first day */}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`e-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const record = recordMap[dateStr];
          const isToday = dateStr === now.toISOString().slice(0, 10);
          const isFut = new Date(dateStr) > now;

          return (
            <div
              key={day}
              title={
                record
                  ? `${record.status}${record.clockIn ? ` · In: ${fmt(record.clockIn)}` : ""}${record.clockOut ? ` · Out: ${fmt(record.clockOut)}` : ""}`
                  : dateStr
              }
              className={`aspect-square flex flex-col items-center justify-center rounded-lg text-[10px] font-semibold relative cursor-default transition
                ${
                  isToday
                    ? "bg-[#1565C0] text-white"
                    : record
                      ? "bg-[#F0F7FF] text-[#0D1B2A]"
                      : isFut
                        ? "text-[#D0E6F7]"
                        : "text-[#B0C4D8]"
                }`}
            >
              {day}
              {record && !isToday && (
                <span
                  className={`absolute bottom-0.5 w-1 h-1 rounded-full ${DOT[record.status] || "bg-slate-300"}`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-[#EAF4FB]">
        {[
          ["bg-green-500", "Present"],
          ["bg-amber-400", "Half day"],
          ["bg-orange-400", "Leave"],
          ["bg-red-400", "Absent"],
        ].map(([cls, label]) => (
          <span
            key={label}
            className="flex items-center gap-1.5 text-[10px] text-[#7A90A4] font-medium"
          >
            <span className={`w-2 h-2 rounded-full ${cls}`} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── TABS ───────────────────────────────────────────────
const TABS = [
  { id: "overview", label: "Overview", icon: "ti-info-circle" },
  { id: "attendance", label: "Attendance", icon: "ti-calendar-check" },
  { id: "flights", label: "Flights", icon: "ti-plane" },
  { id: "medical", label: "Medical", icon: "ti-heart-rate-monitor" },
];

// ── Main page ──────────────────────────────────────────
export default function CrewProfilePage() {
  const { userId } = useParams(); // /admin/crew/:userId
  const navigate = useNavigate();
  const [tab, setTab] = useState("overview");
  const [flightFilter, setFlightFilter] = useState("all");
  const [attPage, setAttPage] = useState(1);
  const ATT_PAGE_SIZE = 10;

  const { data, isLoading, isError, error } = useGetCrewByUserIdQuery(userId, {
    skip: !userId,
  });

  console.log(data);

  // ── The updated endpoint returns the rich payload ──
  const d = data?.data;
  const profile = d?.profile;
  const attendance = d?.attendance;
  const flights = d?.flights;
  const medical = d?.medicalRecords;
  const summary = d?.summary;

  if (isLoading)
    return (
      <div className="p-5">
        <Skeleton />
      </div>
    );

  if (isError || !d)
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <i className="ti ti-user-off text-[48px] text-[#D0E6F7]" />
        <p className="text-[14px] font-semibold text-[#7A90A4]">
          Crew profile not found
        </p>
        <button
          onClick={() => navigate(-1)}
          className="text-[13px] text-[#1565C0] font-semibold hover:underline bg-transparent border-none cursor-pointer"
        >
          ← Go back
        </button>
      </div>
    );

  const medCfg = MEDICAL_STATUS[profile?.medicalStatus] || MEDICAL_STATUS.Fit;
  const statCfg =
    CREW_STATUS[profile?.currentStatus] || CREW_STATUS["Off Duty"];

  // Filtered flights
  const filteredFlights =
    flightFilter === "all"
      ? (flights?.all ?? [])
      : (flights?.all ?? []).filter((f) => f.status === flightFilter);

  // Paginated attendance
  const attRecords = attendance?.records ?? [];
  const attTotalPages = Math.ceil(attRecords.length / ATT_PAGE_SIZE);
  const pagedAtt = attRecords.slice(
    (attPage - 1) * ATT_PAGE_SIZE,
    attPage * ATT_PAGE_SIZE,
  );

  return (
    <div className="min-h-screen bg-[#EAF4FB]">
      {/* ── Top bar ── */}
      <div className="bg-white border-b border-[#D0E6F7] px-5 md:px-8 py-4 flex items-center gap-4 sticky top-0 z-50">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl border border-[#D0E6F7] bg-[#F0F7FF] flex items-center justify-center text-[#1565C0] hover:bg-[#E1EFFE] transition cursor-pointer flex-shrink-0"
        >
          <i className="ti ti-arrow-left text-[16px]" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-[17px] font-bold text-[#0D1B2A] truncate">
            {profile?.userId?.name ?? "Crew member"}
          </h1>
          <p className="text-[12px] text-[#7A90A4]">
            {profile?.role} · {profile?.employeeId}
          </p>
        </div>
        <span
          className={`text-[11px] font-bold px-3 py-1.5 rounded-full ${statCfg.cls}`}
        >
          {profile?.currentStatus}
        </span>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* ── Hero profile card ── */}
        <div className="bg-white border border-[#D0E6F7] rounded-2xl p-6 mb-6 flex flex-col sm:flex-row sm:items-center gap-5">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-2xl bg-[#EAF4FB] text-[#1565C0] flex items-center justify-center text-[32px] font-black flex-shrink-0">
            {profile?.userId?.name?.charAt(0).toUpperCase() ?? "?"}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap mb-2">
              <h2 className="text-[20px] font-black text-[#0D1B2A]">
                {profile?.userId?.name}
              </h2>
              <span
                className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${statCfg.cls}`}
              >
                {profile?.currentStatus}
              </span>
              <span
                className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${medCfg.cls}`}
              >
                <i className={`ti ${medCfg.icon} text-[11px]`} />
                {profile?.medicalStatus}
              </span>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1">
              {[
                ["ti-id-badge", profile?.role],
                ["ti-mail", profile?.userId?.email],
                ["ti-phone", profile?.userId?.phone || "—"],
                ["ti-flag", profile?.nationality || "—"],
                [
                  "ti-calendar",
                  `Joined ${fmtDate(profile?.userId?.createdAt)}`,
                ],
              ].map(([icon, val]) => (
                <span
                  key={icon}
                  className="flex items-center gap-1.5 text-[12px] text-[#7A90A4]"
                >
                  <i className={`ti ${icon} text-[13px]`} />
                  {val}
                </span>
              ))}
            </div>
          </div>

          {/* Warnings */}
          <div className="flex flex-col gap-2 flex-shrink-0">
            {profile?.licenseExpiringSoon && (
              <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2">
                <i className="ti ti-alert-triangle text-orange-500 text-[13px]" />
                <p className="text-[11px] font-semibold text-orange-700">
                  License expires {fmtDate(profile.licenseExpiry)}
                </p>
              </div>
            )}
            {profile?.medicalDueSoon && (
              <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2">
                <i className="ti ti-alert-triangle text-orange-500 text-[13px]" />
                <p className="text-[11px] font-semibold text-orange-700">
                  Medical due {fmtDate(profile.medicalNextDue)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Summary stat cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
          <StatCard
            label="Total flights"
            value={summary?.totalFlights}
            icon="ti-plane"
            color="bg-blue-50 text-blue-700"
            sub={`${summary?.completedFlights ?? 0} completed`}
          />
          <StatCard
            label="Flight hours"
            value={fmtDuration(summary?.totalFlightHours)}
            icon="ti-clock"
            color="bg-violet-50 text-violet-700"
            sub="Total air time"
          />
          <StatCard
            label="Attendance rate"
            value={`${summary?.attendanceRate ?? 0}%`}
            icon="ti-calendar-check"
            color="bg-green-50 text-green-700"
            sub={`${fmtDuration(summary?.totalHoursWorked)} worked`}
          />
          <StatCard
            label="Experience"
            value={profile?.experience ? `${profile.experience} yrs` : "—"}
            icon="ti-star"
            color="bg-orange-50 text-orange-700"
            sub={profile?.role}
          />
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 bg-white border border-[#D0E6F7] rounded-xl p-1 mb-6 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold whitespace-nowrap transition flex-1 justify-center border-none cursor-pointer
                ${
                  tab === t.id
                    ? "bg-[#1565C0] text-white shadow-[0_2px_8px_rgba(21,101,192,0.25)]"
                    : "text-[#7A90A4] hover:text-[#0D1B2A] hover:bg-[#F0F7FF] bg-transparent"
                }`}
            >
              <i className={`ti ${t.icon} text-[14px]`} />
              <span className="hidden sm:block">{t.label}</span>
            </button>
          ))}
        </div>

        {/* ─────────────────────────────────────── */}
        {/* TAB: OVERVIEW                           */}
        {/* ─────────────────────────────────────── */}
        {tab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Personal info */}
            <SectionCard title="Personal information" icon="ti-user">
              {[
                ["Full name", profile?.userId?.name],
                ["Email", profile?.userId?.email],
                ["Phone", profile?.userId?.phone || "—"],
                ["Nationality", profile?.nationality || "—"],
                ["Date of birth", fmtDate(profile?.dateOfBirth)],
                ["Employee ID", profile?.employeeId],
                ["Role", profile?.role],
                [
                  "Experience",
                  profile?.experience ? `${profile.experience} years` : "—",
                ],
                [
                  "Salary",
                  profile?.salary
                    ? `₹${Number(profile.salary).toLocaleString()}`
                    : "—",
                ],
                ["Joined", fmtDate(profile?.userId?.createdAt)],
              ].map(([l, v], i) => (
                <InfoRow key={l} label={l} value={v} i={i} />
              ))}
            </SectionCard>

            {/* License + Medical */}
            <div className="flex flex-col gap-5">
              <SectionCard title="License details" icon="ti-certificate">
                {[
                  ["License number", profile?.licenseNumber || "—"],
                  ["License expiry", fmtDate(profile?.licenseExpiry)],
                  [
                    "Status",
                    profile?.licenseExpiringSoon ? "⚠️ Expiring soon" : "Valid",
                  ],
                ].map(([l, v], i) => (
                  <InfoRow key={l} label={l} value={v} i={i} />
                ))}
              </SectionCard>

              <SectionCard title="Medical status" icon="ti-heart-rate-monitor">
                <div
                  className={`flex items-center gap-3 p-3 rounded-xl mb-3 ${medCfg.cls}`}
                >
                  <i className={`ti ${medCfg.icon} text-[20px]`} />
                  <div>
                    <p className="text-[13px] font-bold">
                      {profile?.medicalStatus}
                    </p>
                    <p className="text-[11px] opacity-80">
                      {profile?.medicalStatus === "Fit"
                        ? "Cleared for operations"
                        : "Review required"}
                    </p>
                  </div>
                </div>
                {[
                  ["Last checked", fmtDate(profile?.medicalLastChecked)],
                  ["Next due", fmtDate(profile?.medicalNextDue)],
                  [
                    "Alert",
                    profile?.medicalDueSoon
                      ? "⚠️ Due within 30 days"
                      : "On schedule",
                  ],
                ].map(([l, v], i) => (
                  <InfoRow key={l} label={l} value={v} i={i} />
                ))}
              </SectionCard>
            </div>

            {/* Quick flight summary */}
            <SectionCard title="Flight summary" icon="ti-chart-bar">
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  {
                    label: "Completed",
                    value: flights?.breakdown?.completed ?? 0,
                    cls: "bg-green-50 text-green-700",
                  },
                  {
                    label: "Upcoming",
                    value: summary?.upcomingFlightCount ?? 0,
                    cls: "bg-blue-50 text-blue-700",
                  },
                  {
                    label: "Cancelled",
                    value: flights?.breakdown?.cancelled ?? 0,
                    cls: "bg-red-50 text-red-600",
                  },
                ].map(({ label, value, cls }) => (
                  <div
                    key={label}
                    className={`${cls} rounded-xl p-3 text-center`}
                  >
                    <p className="text-[20px] font-black leading-none">
                      {value}
                    </p>
                    <p className="text-[10px] font-semibold mt-1 opacity-80">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
              {[
                ["Total flights", flights?.totalCount],
                ["Flight hours", fmtDuration(flights?.totalFlightHours)],
                [
                  "Last flight",
                  flights?.lastFlight
                    ? `${flights.lastFlight.flightNumber} · ${fmtDate(flights.lastFlight.departureTime)}`
                    : "—",
                ],
                [
                  "Next flight",
                  flights?.nextFlight
                    ? `${flights.nextFlight.flightNumber} · ${fmtDate(flights.nextFlight.departureTime)}`
                    : "None scheduled",
                ],
              ].map(([l, v], i) => (
                <InfoRow key={l} label={l} value={v} i={i} />
              ))}
            </SectionCard>

            {/* Attendance summary */}
            <SectionCard title="Attendance summary" icon="ti-calendar">
              <div className="grid grid-cols-2 gap-2 mb-4">
                {[
                  {
                    label: "Present",
                    value: attendance?.breakdown?.present ?? 0,
                    cls: "bg-green-50 text-green-700",
                  },
                  {
                    label: "Absent",
                    value: attendance?.breakdown?.absent ?? 0,
                    cls: "bg-red-50 text-red-600",
                  },
                  {
                    label: "Leave",
                    value: attendance?.breakdown?.leave ?? 0,
                    cls: "bg-orange-50 text-orange-700",
                  },
                  {
                    label: "Half day",
                    value: attendance?.breakdown?.["half-day"] ?? 0,
                    cls: "bg-amber-50 text-amber-700",
                  },
                ].map(({ label, value, cls }) => (
                  <div
                    key={label}
                    className={`${cls} rounded-xl p-3 text-center`}
                  >
                    <p className="text-[20px] font-black leading-none">
                      {value}
                    </p>
                    <p className="text-[10px] font-semibold mt-1 opacity-80">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
              {[
                ["Attendance rate", `${attendance?.attendanceRate ?? 0}%`],
                ["Total records", attendance?.totalRecords ?? 0],
                ["All-time hours", fmtDuration(attendance?.totalHoursWorked)],
                ["This month hours", fmtDuration(attendance?.monthHoursWorked)],
                [
                  "Today",
                  attendance?.todayRecord
                    ? attendance.todayRecord.status
                    : "No record",
                ],
                [
                  "Punched in",
                  summary?.isPunchedIn ? "Yes — currently on duty" : "No",
                ],
              ].map(([l, v], i) => (
                <InfoRow key={l} label={l} value={v} i={i} />
              ))}
            </SectionCard>
          </div>
        )}

        {/* ─────────────────────────────────────── */}
        {/* TAB: ATTENDANCE                         */}
        {/* ─────────────────────────────────────── */}
        {tab === "attendance" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Calendar */}
            <SectionCard title="Attendance calendar" icon="ti-calendar">
              <AttendanceCalendar records={attRecords} />
            </SectionCard>

            {/* Records table */}
            <div className="lg:col-span-2">
              <SectionCard
                title={`All records (${attRecords.length})`}
                icon="ti-list"
              >
              
                {pagedAtt.length === 0 ? (
                  <EmptyState
                    icon="ti-calendar-off"
                    message="No attendance records"
                  />
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[420px]">
                        <thead>
                          <tr>
                            {[
                              "Date",
                              "Clock In",
                              "Clock Out",
                              "Duration",
                              "Status",
                              "Verified",
                            ].map((h) => (
                              <th
                                key={h}
                                className="text-left py-2 px-3 text-[10px] font-bold text-[#7A90A4] uppercase tracking-[0.6px] border-b border-[#EAF4FB]"
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {pagedAtt.map((a, i) => {
                            const stCfg =
                              ATTENDANCE_STATUS[a.status] ||
                              ATTENDANCE_STATUS.present;
                            const dur =
                              a.clockIn && a.clockOut
                                ? fmtDuration(
                                    (new Date(a.clockOut) -
                                      new Date(a.clockIn)) /
                                      3600000,
                                  )
                                : a.clockIn && !a.clockOut
                                  ? "In progress"
                                  : "—";

                            // highlight today's record
                            const isToday =
                              new Date(a.date).toISOString().slice(0, 10) ===
                              new Date().toISOString().slice(0, 10);

                            return (
                              <tr
                                key={a._id ?? i}
                                className={`transition border-b border-[#F7FAFD] last:border-0
                  ${isToday ? "bg-blue-50/50" : "hover:bg-[#F8FBFF]"}`}
                              >
                                {/* Date — bold + "Today" tag if applicable */}
                                <td className="py-2.5 px-3">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[12px] font-semibold text-[#0D1B2A]">
                                      {fmtDate(a.date)}
                                    </span>
                                    {isToday && (
                                      <span className="text-[9px] font-bold bg-[#1565C0] text-white px-1.5 py-0.5 rounded-full">
                                        Today
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* Clock in */}
                                <td className="py-2.5 px-3">
                                  {a.clockIn ? (
                                    <span className="text-[12px] text-[#0D1B2A] font-medium">
                                      {new Date(a.clockIn).toLocaleTimeString(
                                        "en-IN",
                                        {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                          hour12: true,
                                        },
                                      )}
                                    </span>
                                  ) : (
                                    <span className="text-[12px] text-[#B0C4D8]">
                                      —
                                    </span>
                                  )}
                                </td>

                                {/* Clock out */}
                                <td className="py-2.5 px-3">
                                  {a.clockOut ? (
                                    <span className="text-[12px] text-[#0D1B2A] font-medium">
                                      {new Date(a.clockOut).toLocaleTimeString(
                                        "en-IN",
                                        {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                          hour12: true,
                                        },
                                      )}
                                    </span>
                                  ) : a.clockIn ? (
                                    <span className="text-[11px] text-[#1565C0] font-semibold flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                                      On duty
                                    </span>
                                  ) : (
                                    <span className="text-[12px] text-[#B0C4D8]">
                                      —
                                    </span>
                                  )}
                                </td>

                                {/* Duration */}
                                <td className="py-2.5 px-3">
                                  <span
                                    className={`text-[12px] font-medium
                    ${dur === "In progress" ? "text-[#1565C0]" : "text-[#7A90A4]"}`}
                                  >
                                    {dur}
                                  </span>
                                </td>

                                {/* Status badge */}
                                <td className="py-2.5 px-3">
                                  <span
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${stCfg.cls}`}
                                  >
                                    {stCfg.label}
                                  </span>
                                </td>

                                {/* Biometric verified */}
                                <td className="py-2.5 px-3">
                                  {a.biometricVerified ? (
                                    <span className="flex items-center gap-1 text-[11px] font-semibold text-green-600">
                                      <i className="ti ti-fingerprint text-[13px]" />
                                      Yes
                                    </span>
                                  ) : (
                                    <span className="text-[11px] text-[#B0C4D8]">
                                      —
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {attTotalPages > 1 && (
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#EAF4FB]">
                        <p className="text-[11px] text-[#B0C4D8]">
                          Showing {pagedAtt.length} of {attRecords.length}
                        </p>
                        <div className="flex items-center gap-1.5">
                          <button
                            disabled={attPage === 1}
                            onClick={() => setAttPage((p) => p - 1)}
                            className="w-7 h-7 rounded-md border border-[#D0E6F7] bg-[#F0F7FF] flex items-center justify-center text-[#1565C0] hover:bg-[#E1EFFE] transition disabled:opacity-40 cursor-pointer"
                          >
                            <i className="ti ti-chevron-left text-[12px]" />
                          </button>
                          <span className="text-[12px] text-[#7A90A4] px-1">
                            {attPage} / {attTotalPages}
                          </span>
                          <button
                            disabled={attPage === attTotalPages}
                            onClick={() => setAttPage((p) => p + 1)}
                            className="w-7 h-7 rounded-md border border-[#D0E6F7] bg-[#F0F7FF] flex items-center justify-center text-[#1565C0] hover:bg-[#E1EFFE] transition disabled:opacity-40 cursor-pointer"
                          >
                            <i className="ti ti-chevron-right text-[12px]" />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </SectionCard>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────── */}
        {/* TAB: FLIGHTS                            */}
        {/* ─────────────────────────────────────── */}
        {tab === "flights" && (
          <div className="flex flex-col gap-5">
            {/* Active flights banner */}
            {(flights?.active?.length ?? 0) > 0 && (
              <div className="bg-[#1565C0] rounded-2xl p-4 flex items-center gap-4 relative overflow-hidden">
                <div className="absolute right-0 top-0 w-40 h-full bg-white/[0.06] skew-x-[-15deg] translate-x-6" />
                <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <i className="ti ti-plane text-white text-[20px]" />
                </div>
                <div className="flex-1 relative z-10">
                  <p className="text-white font-bold text-[13px]">
                    Currently on {flights.active.length} active flight
                    {flights.active.length > 1 ? "s" : ""}
                  </p>
                  <p className="text-blue-200 text-[11px] mt-0.5">
                    {flights.active
                      .map(
                        (f) =>
                          `${f.flightNumber} (${f.source}→${f.destination})`,
                      )
                      .join(" · ")}
                  </p>
                </div>
              </div>
            )}

            {/* Next flight card */}
            {flights?.nextFlight && (
              <div className="bg-white border border-[#D0E6F7] rounded-2xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center flex-shrink-0">
                  <i className="ti ti-plane-departure text-[18px]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-[#7A90A4] uppercase tracking-wider mb-0.5">
                    Next flight
                  </p>
                  <p className="text-[14px] font-bold text-[#0D1B2A]">
                    {flights.nextFlight.flightNumber} —{" "}
                    {flights.nextFlight.source} →{" "}
                    {flights.nextFlight.destination}
                  </p>
                  <p className="text-[11px] text-[#7A90A4]">
                    {fmt(flights.nextFlight.departureTime)}
                  </p>
                </div>
                <span
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0
                  ${FLIGHT_STATUS[flights.nextFlight.status]?.cls}`}
                >
                  {FLIGHT_STATUS[flights.nextFlight.status]?.label}
                </span>
              </div>
            )}

            {/* Status filter */}
            <SectionCard
              title={`All flights (${flights?.totalCount ?? 0})`}
              icon="ti-list"
              action={
                <div className="flex gap-1 bg-[#F0F7FF] border border-[#D0E6F7] rounded-xl p-0.5">
                  {[
                    "all",
                    "in-flight",
                    "completed",
                    "scheduled",
                    "delayed",
                    "cancelled",
                  ].map((f) => (
                    <button
                      key={f}
                      onClick={() => setFlightFilter(f)}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold capitalize transition border-none cursor-pointer
                        ${
                          flightFilter === f
                            ? "bg-[#1565C0] text-white"
                            : "text-[#7A90A4] hover:text-[#0D1B2A] bg-transparent"
                        }`}
                    >
                      {f === "all" ? "All" : (FLIGHT_STATUS[f]?.label ?? f)}
                    </button>
                  ))}
                </div>
              }
            >
              {filteredFlights.length === 0 ? (
                <EmptyState icon="ti-plane-off" message="No flights found" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px]">
                    <thead>
                      <tr>
                        {[
                          "Flight",
                          "Route",
                          "Aircraft",
                          "Departure",
                          "Arrival",
                          "Status",
                        ].map((h) => (
                          <th
                            key={h}
                            className="text-left py-2 px-3 text-[10px] font-bold text-[#7A90A4] uppercase tracking-[0.6px] border-b border-[#EAF4FB]"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredFlights.map((f, i) => {
                        const stCfg =
                          FLIGHT_STATUS[f.status] || FLIGHT_STATUS.scheduled;
                        return (
                          <tr
                            key={f._id}
                            className="hover:bg-[#F8FBFF] transition cursor-pointer"
                            onClick={() => navigate(`/admin/flights/${f._id}`)}
                          >
                            <td className="py-2.5 px-3">
                              <span className="text-[12px] font-bold text-[#1565C0]">
                                {f.flightNumber}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="text-[12px] font-semibold text-[#0D1B2A]">
                                {f.source} → {f.destination}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="text-[12px] text-[#7A90A4]">
                                {f.aircraftId?.registrationNumber ?? "—"}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-[12px] text-[#7A90A4]">
                              {fmt(f.departureTime)}
                            </td>
                            <td className="py-2.5 px-3 text-[12px] text-[#7A90A4]">
                              {fmt(f.arrivalTime)}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${stCfg.cls}`}
                              >
                                {stCfg.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>
          </div>
        )}

        {/* ─────────────────────────────────────── */}
        {/* TAB: MEDICAL                            */}
        {/* ─────────────────────────────────────── */}
        {tab === "medical" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Status card */}
            <SectionCard
              title="Medical certification"
              icon="ti-heart-rate-monitor"
            >
              <div
                className={`rounded-2xl p-5 flex items-center gap-4 mb-4 ${medCfg.cls}`}
              >
                <div className="w-12 h-12 rounded-xl bg-white/30 flex items-center justify-center flex-shrink-0">
                  <i className={`ti ${medCfg.icon} text-[24px]`} />
                </div>
                <div>
                  <p className="text-[20px] font-black">
                    {profile?.medicalStatus}
                  </p>
                  <p className="text-[12px] opacity-80">
                    {profile?.medicalStatus === "Fit"
                      ? "Cleared for all operations"
                      : "Requires medical review"}
                  </p>
                </div>
              </div>
              {[
                ["Last checked", fmtDate(profile?.medicalLastChecked)],
                ["Next due", fmtDate(profile?.medicalNextDue)],
              ].map(([l, v], i) => (
                <InfoRow key={l} label={l} value={v} i={i} />
              ))}

              {profile?.medicalDueSoon && (
                <div className="mt-4 bg-orange-50 border border-orange-200 rounded-xl p-3.5 flex items-start gap-2.5">
                  <i className="ti ti-alert-triangle text-orange-500 text-[15px] flex-shrink-0 mt-0.5" />
                  <p className="text-[12px] text-orange-700 font-medium">
                    Medical certificate due within 30 days. Remind crew member
                    to schedule renewal.
                  </p>
                </div>
              )}
            </SectionCard>

            {/* Incident records */}
            <SectionCard
              title={`Incident reports (${medical?.total ?? 0})`}
              icon="ti-first-aid-kit"
            >
              {/* Summary pills */}
              <div className="flex gap-2 mb-4">
                {[
                  {
                    label: "Open",
                    value: medical?.open,
                    cls: "bg-blue-50 text-blue-700",
                  },
                  {
                    label: "Resolved",
                    value: medical?.resolved,
                    cls: "bg-green-50 text-green-700",
                  },
                  {
                    label: "Total",
                    value: medical?.total,
                    cls: "bg-slate-100 text-slate-600",
                  },
                ].map(({ label, value, cls }) => (
                  <div
                    key={label}
                    className={`flex-1 ${cls} rounded-xl p-3 text-center`}
                  >
                    <p className="text-[18px] font-black leading-none">
                      {value ?? 0}
                    </p>
                    <p className="text-[10px] font-semibold mt-0.5 opacity-80">
                      {label}
                    </p>
                  </div>
                ))}
              </div>

              {(medical?.records?.length ?? 0) === 0 ? (
                <EmptyState
                  icon="ti-clipboard-off"
                  message="No incident reports filed"
                />
              ) : (
                <div className="flex flex-col gap-2">
                  {medical.records.slice(0, 5).map((r, i) => (
                    <div
                      key={r._id ?? i}
                      className="bg-[#F8FBFF] border border-[#EAF4FB] rounded-xl p-3.5"
                    >
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize
                          ${{ open: "bg-blue-100 text-blue-700", reviewed: "bg-amber-100 text-amber-700", resolved: "bg-green-100 text-green-700" }[r.status] ?? "bg-slate-100 text-slate-600"}`}
                        >
                          {r.status}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400 capitalize">
                          {r.userType} patient
                        </span>
                        {r.flightId && (
                          <span className="text-[10px] font-semibold text-[#1565C0] bg-blue-50 px-2 py-0.5 rounded-full">
                            <i className="ti ti-plane text-[10px] mr-1" />
                            {r.flightId.flightNumber}
                          </span>
                        )}
                        <span className="text-[10px] text-[#B0C4D8] ml-auto">
                          {fmt(r.createdAt)}
                        </span>
                      </div>
                      <p className="text-[12px] text-[#0D1B2A] font-medium leading-relaxed">
                        {r.symptoms?.slice(0, 100)}
                        {r.symptoms?.length > 100 ? "…" : ""}
                      </p>
                      {r.treatment && (
                        <p className="text-[11px] text-[#7A90A4] mt-1">
                          <span className="font-semibold">Treatment:</span>{" "}
                          {r.treatment.slice(0, 80)}
                          {r.treatment.length > 80 ? "…" : ""}
                        </p>
                      )}
                    </div>
                  ))}
                  {medical.records.length > 5 && (
                    <p className="text-[11px] text-[#B0C4D8] text-center pt-1">
                      + {medical.records.length - 5} more records
                    </p>
                  )}
                </div>
              )}
            </SectionCard>
          </div>
        )}
      </div>
    </div>
  );
}
