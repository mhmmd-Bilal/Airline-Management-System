// src/pages/crew/CrewAttendance.jsx
import { useState } from "react";
import { useSelector } from "react-redux";
import {
  useGetTodayAttendanceQuery,
  useGetMyAttendanceByMonthQuery,
  usePunchInMutation,
  usePunchOutMutation,
} from "../../slices/attendanceApiSlice";
import { useGetAllFlightsQuery } from "../../slices/flightApiSlice";

// ── Helpers ────────────────────────────────────────────
const fmtTime = (dt) =>
  dt
    ? new Date(dt).toLocaleTimeString("en-IN", {
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

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const statusConfig = {
  present: {
    cls: "bg-green-500",
    label: "Present",
    dot: "bg-green-500",
    text: "text-green-700",
    bg: "bg-green-50",
  },
  "half-day": {
    cls: "bg-orange-400",
    label: "Half Day",
    dot: "bg-orange-400",
    text: "text-orange-700",
    bg: "bg-orange-50",
  },
  absent: {
    cls: "bg-red-400",
    label: "Absent",
    dot: "bg-red-400",
    text: "text-red-700",
    bg: "bg-red-50",
  },
  leave: {
    cls: "bg-gray-400",
    label: "Leave",
    dot: "bg-gray-400",
    text: "text-gray-600",
    bg: "bg-gray-50",
  },
};

const inputCls =
  "w-full h-[42px] px-3 text-[13px] text-[#0D1B2A] bg-[#F0F7FF] border border-[#D0E6F7] rounded-[10px] outline-none focus:border-[#1565C0] focus:shadow-[0_0_0_3px_rgba(21,101,192,0.1)] transition placeholder:text-[#B0C4D8]";

// ── Shared primitives ──────────────────────────────────
function Card({ children, className = "" }) {
  return (
    <div
      className={`bg-white border border-[#D0E6F7] rounded-2xl ${className}`}
    >
      {children} 
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <p className="text-[10px] font-bold text-[#1565C0] uppercase tracking-[1.2px] mb-4">
      {children}
    </p>
  );
}

// ── Punch card ─────────────────────────────────────────
function PunchCard({
  attendance,
  onPunchIn,
  onPunchOut,
  punchingIn,
  punchingOut,
  error,
}) {
  const hasPunchedIn = !!attendance?.clockIn;
  const hasPunchedOut = !!attendance?.clockOut;

  const duration = () => {
    if (!attendance?.clockIn) return null;
    const end = attendance.clockOut
      ? new Date(attendance.clockOut)
      : new Date();
    const mins = Math.floor((end - new Date(attendance.clockIn)) / 60000);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  return (
    <Card className="p-6 relative overflow-hidden">
      {/* decorative ring */}
      <div
        className={`absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-[0.06]
        ${hasPunchedOut ? "bg-green-600" : hasPunchedIn ? "bg-[#1565C0]" : "bg-gray-400"}`}
      />

      <SectionLabel>Today's punch</SectionLabel>

      {/* Status icon + info */}
      <div className="flex items-center gap-4 mb-6">
        <div
          className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 relative z-10
          ${hasPunchedOut ? "bg-green-50" : hasPunchedIn ? "bg-blue-50" : "bg-[#F0F7FF]"}`}
        >
          <i
            className={`ti text-[26px]
            ${
              hasPunchedOut
                ? "ti-circle-check text-green-600"
                : hasPunchedIn
                  ? "ti-clock-play text-[#1565C0]"
                  : "ti-clock-pause text-[#B0C4D8]"
            }`}
          />
          {hasPunchedIn && !hasPunchedOut && (
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-white animate-pulse" />
          )}
        </div>
        <div className="relative z-10">
          <p
            className={`text-[18px] font-bold leading-tight
            ${hasPunchedOut ? "text-green-700" : hasPunchedIn ? "text-[#1565C0]" : "text-[#B0C4D8]"}`}
          >
            {hasPunchedOut
              ? "Shift complete"
              : hasPunchedIn
                ? "On duty"
                : "Not started"}
          </p>
          {hasPunchedIn && (
            <p className="text-[12px] text-[#7A90A4] mt-0.5">
              {hasPunchedOut
                ? `${fmtTime(attendance.clockIn)} — ${fmtTime(attendance.clockOut)}`
                : `Clocked in at ${fmtTime(attendance.clockIn)}`}
            </p>
          )}
          {hasPunchedIn && (
            <p className="text-[12px] font-semibold text-[#1565C0] mt-0.5">
              {hasPunchedOut ? "Total" : "Duration"}: {duration()}
            </p>
          )}
        </div>
      </div>

      {/* Clock in / out boxes */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div
          className={`rounded-xl p-3.5 border ${hasPunchedIn ? "bg-blue-50 border-blue-100" : "bg-[#F7FAFD] border-[#EAF4FB]"}`}
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <i
              className={`ti ti-login text-[12px] ${hasPunchedIn ? "text-[#1565C0]" : "text-[#B0C4D8]"}`}
            />
            <p className="text-[10px] font-semibold text-[#7A90A4] uppercase tracking-wider">
              Clock In
            </p>
          </div>
          <p
            className={`text-[18px] font-bold ${hasPunchedIn ? "text-[#0D1B2A]" : "text-[#D0E6F7]"}`}
          >
            {attendance?.clockIn ? fmtTime(attendance.clockIn) : "--:--"}
          </p>
        </div>
        <div
          className={`rounded-xl p-3.5 border ${hasPunchedOut ? "bg-green-50 border-green-100" : "bg-[#F7FAFD] border-[#EAF4FB]"}`}
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <i
              className={`ti ti-logout text-[12px] ${hasPunchedOut ? "text-green-600" : "text-[#B0C4D8]"}`}
            />
            <p className="text-[10px] font-semibold text-[#7A90A4] uppercase tracking-wider">
              Clock Out
            </p>
          </div>
          <p
            className={`text-[18px] font-bold ${hasPunchedOut ? "text-[#0D1B2A]" : "text-[#D0E6F7]"}`}
          >
            {attendance?.clockOut ? fmtTime(attendance.clockOut) : "--:--"}
          </p>
        </div>
      </div>

      {/* Linked flight */}
      {attendance?.flightId && (
        <div className="flex items-center gap-2.5 bg-[#EAF4FB] rounded-xl px-3.5 py-2.5 mb-5">
          <i className="ti ti-plane text-[#1565C0] text-[14px]" />
          <p className="text-[12px] font-semibold text-[#0D1B2A]">
            {attendance.flightId.flightNumber}
          </p>
          <span className="text-[#B0C4D8] text-[11px]">
            {attendance.flightId.source} → {attendance.flightId.destination}
          </span>
        </div>
      )}

      {/* Status badge */}
      {attendance?.status && (
        <div className="flex items-center gap-2 mb-5">
          <span className="text-[11px] text-[#7A90A4]">Today's status:</span>
          <span
            className={`text-[11px] font-bold px-2.5 py-1 rounded-full
            ${statusConfig[attendance.status]?.bg || "bg-gray-50"}
            ${statusConfig[attendance.status]?.text || "text-gray-600"}`}
          >
            {statusConfig[attendance.status]?.label || attendance.status}
          </span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-[12px] text-red-600 flex items-center gap-2">
          <i className="ti ti-alert-circle text-[14px] flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Action buttons */}
      {!hasPunchedIn && !hasPunchedOut && (
        <button
          onClick={onPunchIn}
          disabled={punchingIn}
          className="w-full h-12 bg-[#1565C0] hover:bg-[#1251A3] active:scale-[0.99] text-white text-[14px] font-bold rounded-xl shadow-[0_4px_16px_rgba(21,101,192,0.25)] transition border-none cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {punchingIn ? (
            <>
              <i className="ti ti-loader-2 animate-spin text-[16px]" /> Punching
              in...
            </>
          ) : (
            <>
              <i className="ti ti-clock-play text-[18px]" /> Punch In
            </>
          )}
        </button>
      )}

      {hasPunchedIn && !hasPunchedOut && (
        <button
          onClick={onPunchOut}
          disabled={punchingOut}
          className="w-full h-12 bg-red-500 hover:bg-red-600 active:scale-[0.99] text-white text-[14px] font-bold rounded-xl shadow-[0_4px_16px_rgba(229,57,53,0.25)] transition border-none cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {punchingOut ? (
            <>
              <i className="ti ti-loader-2 animate-spin text-[16px]" /> Punching
              out...
            </>
          ) : (
            <>
              <i className="ti ti-clock-stop text-[18px]" /> Punch Out
            </>
          )}
        </button>
      )}

      {hasPunchedOut && (
        <div className="w-full h-12 bg-green-50 border border-green-200 rounded-xl flex items-center justify-center gap-2">
          <i className="ti ti-circle-check text-green-600 text-[18px]" />
          <span className="text-[13px] font-bold text-green-700">
            Shift completed for today
          </span>
        </div>
      )}
    </Card>
  );
}

// ── Attendance calendar ────────────────────────────────
// ── Attendance calendar ────────────────────────────────
function AttendanceCalendar({ year, month, records }) {
  // build a map: "YYYY-MM-DD" → record
  const recordMap = {};

  records.forEach((r) => {
    const d = new Date(r.date);

    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0",
    )}-${String(d.getDate()).padStart(2, "0")}`;

    recordMap[key] = r;
  });

  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = new Date();

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const cells = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  while (cells.length % 7 !== 0) cells.push(null);

  const getCellData = (day) => {
    if (!day) return null;

    const key = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    const record = recordMap[key];

    const isToday =
      today.getDate() === day &&
      today.getMonth() + 1 === month &&
      today.getFullYear() === year;

    const isFuture = new Date(year, month - 1, day) > today;

    return { key, record, isToday, isFuture };
  };

  const getStatusStyles = (status) => {
    switch (status) {
      case "present":
        return {
          bg: "bg-green-50",
          border: "border-green-200",
          day: "text-green-700",
          time: "text-green-600",
        };

      case "half-day":
        return {
          bg: "bg-orange-50",
          border: "border-orange-200",
          day: "text-orange-700",
          time: "text-orange-600",
        };

      case "absent":
        return {
          bg: "bg-red-50",
          border: "border-red-200",
          day: "text-red-700",
          time: "text-red-600",
        };

      case "leave":
        return {
          bg: "bg-gray-50",
          border: "border-gray-200",
          day: "text-gray-700",
          time: "text-gray-600",
        };

      default:
        return {
          bg: "bg-[#F7FAFD]",
          border: "border-[#EAF4FB]",
          day: "text-[#0D1B2A]",
          time: "text-[#7A90A4]",
        };
    }
  };

  return (
    <div>
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {dayNames.map((d) => (
          <div
            key={d}
            className="text-center text-[10px] font-bold text-[#7A90A4] uppercase py-2"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar cells */}
      <div className="grid grid-cols-7 gap-2">
        {cells.map((day, idx) => {
          if (!day) {
            return <div key={`empty-${idx}`} />;
          }

          const cell = getCellData(day);

          const record = cell.record;

          const styles = getStatusStyles(record?.status);

          return (
            <div
              key={idx}
              className={`
                relative rounded-2xl border min-h-[92px]
                p-2 flex flex-col transition-all duration-200
                hover:shadow-md
                ${
                  cell.isToday
                    ? "bg-[#1565C0] border-[#1565C0] shadow-lg"
                    : cell.isFuture
                      ? "bg-white border-[#EEF5FC] opacity-60"
                      : `${styles.bg} ${styles.border}`
                }
              `}
            >
              {/* Day Number */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`
                    text-[13px] font-bold
                    ${
                      cell.isToday
                        ? "text-white"
                        : cell.isFuture
                          ? "text-[#B0C4D8]"
                          : styles.day
                    }
                  `}
                >
                  {day}
                </span>

                {/* Status Dot */}
                {record && (
                  <div
                    className={`
                      w-2 h-2 rounded-full
                      ${statusConfig[record.status]?.dot}
                    `}
                  />
                )}
              </div>

              {/* Attendance Status */}
              {record?.status && (
                <div
                  className={`
                    text-[9px] font-bold rounded-full px-2 py-0.5 w-fit mb-1
                    ${
                      cell.isToday
                        ? "bg-white/20 text-white"
                        : `${statusConfig[record.status]?.bg} ${statusConfig[record.status]?.text}`
                    }
                  `}
                >
                  {statusConfig[record.status]?.label}
                </div>
              )}

              {/* Punch Times */}
              {record?.clockIn && (
                <div className="mt-auto flex flex-col gap-1">
                  <div
                    className={`
                      rounded-lg px-2 py-1
                      ${
                        cell.isToday
                          ? "bg-white/15"
                          : "bg-white border border-white"
                      }
                    `}
                  >
                    <p
                      className={`
                        text-[8px] uppercase font-bold mb-0.5
                        ${cell.isToday ? "text-blue-100" : "text-[#7A90A4]"}
                      `}
                    >
                      In
                    </p>

                    <p
                      className={`
                        text-[10px] font-semibold leading-none
                        ${cell.isToday ? "text-white" : styles.time}
                      `}
                    >
                      {fmtTime(record.clockIn)}
                    </p>
                  </div>

                  <div
                    className={`
                      rounded-lg px-2 py-1
                      ${
                        cell.isToday
                          ? "bg-white/15"
                          : "bg-white border border-white"
                      }
                    `}
                  >
                    <p
                      className={`
                        text-[8px] uppercase font-bold mb-0.5
                        ${cell.isToday ? "text-blue-100" : "text-[#7A90A4]"}
                      `}
                    >
                      Out
                    </p>

                    <p
                      className={`
                        text-[10px] font-semibold leading-none
                        ${cell.isToday ? "text-white" : styles.time}
                      `}
                    >
                      {record.clockOut ? fmtTime(record.clockOut) : "-- : --"}
                    </p>
                  </div>
                </div>
              )}

              {/* No attendance */}
              {!record && !cell.isFuture && (
                <div className="mt-auto">
                  <p className="text-[9px] text-[#B0C4D8] text-center">
                    No record
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Monthly summary stats ──────────────────────────────
function MonthlySummary({ records }) {
  const counts = { present: 0, "half-day": 0, absent: 0, leave: 0 };
  let totalMinutes = 0;

  records.forEach((r) => {
    counts[r.status] = (counts[r.status] || 0) + 1;
    if (r.clockIn && r.clockOut) {
      totalMinutes += (new Date(r.clockOut) - new Date(r.clockIn)) / 60000;
    }
  });

  const totalHours = Math.floor(totalMinutes / 60);
  const totalMins = Math.round(totalMinutes % 60);
  const workingDays = counts.present + counts["half-day"] + counts.absent;
  const attendancePct =
    workingDays > 0
      ? Math.round(
          ((counts.present + counts["half-day"] * 0.5) / workingDays) * 100,
        )
      : 0;

  return (
    <div className="grid grid-cols-2 gap-3">
      {[
        {
          label: "Present",
          value: counts.present,
          icon: "ti-circle-check",
          ...statusConfig.present,
        },
        {
          label: "Half Day",
          value: counts["half-day"],
          icon: "ti-circle-half",
          ...statusConfig["half-day"],
        },
        {
          label: "Absent",
          value: counts.absent,
          icon: "ti-circle-x",
          ...statusConfig.absent,
        },
        {
          label: "Leave",
          value: counts.leave,
          icon: "ti-circle-minus",
          ...statusConfig.leave,
        },
      ].map(({ label, value, icon, bg, text }) => (
        <div
          key={label}
          className={`${bg} rounded-xl p-3.5 flex items-center gap-3`}
        >
          <i className={`ti ${icon} text-[18px] ${text}`} />
          <div>
            <p className={`text-[20px] font-bold ${text} leading-none`}>
              {value}
            </p>
            <p className="text-[10px] font-medium text-[#7A90A4] mt-0.5">
              {label}
            </p>
          </div>
        </div>
      ))}

      {/* Total hours */}
      <div className="bg-[#EAF4FB] rounded-xl p-3.5 flex items-center gap-3">
        <i className="ti ti-clock text-[18px] text-[#1565C0]" />
        <div>
          <p className="text-[20px] font-bold text-[#0D1B2A] leading-none">
            {totalHours}h {totalMins}m
          </p>
          <p className="text-[10px] font-medium text-[#7A90A4] mt-0.5">
            Total hours
          </p>
        </div>
      </div>

      {/* Attendance % */}
      <div className="bg-[#EAF4FB] rounded-xl p-3.5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-medium text-[#7A90A4]">Attendance</p>
          <p className="text-[14px] font-bold text-[#1565C0]">
            {attendancePct}%
          </p>
        </div>
        <div className="h-1.5 bg-white rounded-full overflow-hidden">
          <div
            className="h-full bg-[#1565C0] rounded-full transition-all duration-700"
            style={{ width: `${attendancePct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Recent records list ────────────────────────────────
function RecentRecords({ records }) {
  if (!records.length)
    return (
      <div className="text-center py-6">
        <i className="ti ti-calendar-off text-[28px] text-[#D0E6F7] block mb-2" />
        <p className="text-[12px] text-[#7A90A4]">No records this month</p>
      </div>
    );

  return (
    <div className="flex flex-col divide-y divide-[#F0F7FF]">
      {[...records]
        .reverse()
        .slice(0, 8)
        .map((r) => {
          const sc = statusConfig[r.status] || statusConfig.absent;
          const mins =
            r.clockIn && r.clockOut
              ? Math.floor((new Date(r.clockOut) - new Date(r.clockIn)) / 60000)
              : null;
          return (
            <div key={r._id} className="flex items-center gap-3 py-3">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${sc.bg}`}
              >
                <div className={`w-2.5 h-2.5 rounded-full ${sc.dot}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-[#0D1B2A]">
                  {fmtDate(r.date)}
                </p>
                <p className="text-[10px] text-[#7A90A4]">
                  {r.clockIn ? fmtTime(r.clockIn) : "—"}
                  {r.clockOut
                    ? ` → ${fmtTime(r.clockOut)}`
                    : r.clockIn
                      ? " → ongoing"
                      : ""}
                  {r.flightId && ` · ${r.flightId.flightNumber}`}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}
                >
                  {sc.label}
                </span>
                {mins !== null && (
                  <p className="text-[10px] text-[#B0C4D8] mt-0.5">
                    {Math.floor(mins / 60)}h {mins % 60}m
                  </p>
                )}
              </div>
            </div>
          );
        })}
    </div>
  );
}

// ── Main component ─────────────────────────────────────
export default function CrewAttendance() {
  const { userData } = useSelector((state) => state.auth);

  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth() + 1);
  const [punchError, setPunchError] = useState("");

  // ── API ──────────────────────────────────────────────
  const { data: attendanceData, isLoading: loadingToday } =
    useGetTodayAttendanceQuery();

  const { data: monthData, isLoading: loadingMonth } =
    useGetMyAttendanceByMonthQuery({ year: calYear, month: calMonth });

  const { data: flightData } = useGetAllFlightsQuery({
    status: "all",
    search: "",
    page: 1,
    limit: 50,
  });

  const [punchIn, { isLoading: punchingIn }] = usePunchInMutation();
  const [punchOut, { isLoading: punchingOut }] = usePunchOutMutation();

  const todayAttendance = attendanceData?.data ?? null;
  const monthRecords = monthData?.data ?? [];

  // active flights for this crew to auto-link on punch in
  const activeFlights = (flightData?.data ?? []).filter(
    (f) =>
      f.status === "in-flight" &&
      f.crewIds?.some((c) => String(c?._id ?? c) === String(userData?._id)),
  );

  const handlePunchIn = async () => {
    setPunchError("");
    try {
      await punchIn({ flightId: activeFlights[0]?._id || undefined }).unwrap();
    } catch (err) {
      setPunchError(err?.data?.message ?? "Failed to punch in");
    }
  };

  const handlePunchOut = async () => {
    setPunchError("");
    try {
      await punchOut().unwrap();
    } catch (err) {
      setPunchError(err?.data?.message ?? "Failed to punch out");
    }
  };

  // month navigation
  const prevMonth = () => {
    if (calMonth === 1) {
      setCalYear((y) => y - 1);
      setCalMonth(12);
    } else setCalMonth((m) => m - 1);
  };
  const nextMonth = () => {
    const isCurrentMonth =
      calYear === today.getFullYear() && calMonth === today.getMonth() + 1;
    if (isCurrentMonth) return; // can't go to future months
    if (calMonth === 12) {
      setCalYear((y) => y + 1);
      setCalMonth(1);
    } else setCalMonth((m) => m + 1);
  };
  const isCurrentMonth =
    calYear === today.getFullYear() && calMonth === today.getMonth() + 1;

  return (
    <div className="p-5">
      {/* <p className="text-[11px] font-semibold text-[#5A7089] uppercase tracking-[0.8px] mb-6">
        Attendance
      </p> */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ── Left col: punch card ── */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          {loadingToday ? (
            <Card className="p-8 text-center text-[13px] text-[#7A90A4]">
              Loading...
            </Card>
          ) : (
            <PunchCard
              attendance={todayAttendance}
              onPunchIn={handlePunchIn}
              onPunchOut={handlePunchOut}
              punchingIn={punchingIn}
              punchingOut={punchingOut}
              error={punchError}
            />
          )}

          {/* Policy tip */}
          <div className="bg-[#EAF4FB] border border-[#D0E6F7] rounded-xl p-4 flex items-start gap-3">
            <i className="ti ti-info-circle text-[#1565C0] text-[16px] flex-shrink-0 mt-0.5" />
            <p className="text-[12px] text-[#5A7089] leading-relaxed">
              Punch in at the start of your shift and punch out when done.
              Shifts under{" "}
              <span className="font-semibold text-[#0D1B2A]">4 hours</span> are
              automatically marked as{" "}
              <span className="font-semibold text-orange-600">half-day</span>.
            </p>
          </div>
        </div>

        {/* ── Right col: calendar + summary ── */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Calendar card */}
          <Card className="p-5">
            {/* Calendar header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-[15px] font-bold text-[#0D1B2A]">
                  {MONTHS[calMonth - 1]} {calYear}
                </p>
                <p className="text-[11px] text-[#7A90A4] mt-0.5">
                  {monthRecords.length} record
                  {monthRecords.length !== 1 ? "s" : ""} this month
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={prevMonth}
                  className="w-8 h-8 rounded-lg border border-[#D0E6F7] bg-[#F0F7FF] flex items-center justify-center text-[#1565C0] hover:bg-[#E1EFFE] transition cursor-pointer"
                >
                  <i className="ti ti-chevron-left text-[14px]" />
                </button>
                <button
                  onClick={nextMonth}
                  disabled={isCurrentMonth}
                  className="w-8 h-8 rounded-lg border border-[#D0E6F7] bg-[#F0F7FF] flex items-center justify-center text-[#1565C0] hover:bg-[#E1EFFE] transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <i className="ti ti-chevron-right text-[14px]" />
                </button>
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 mb-5">
              {Object.entries(statusConfig).map(([key, sc]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${sc.dot}`} />
                  <span className="text-[10px] font-medium text-[#7A90A4]">
                    {sc.label}
                  </span>
                </div>
              ))}
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-lg bg-[#1565C0] flex items-center justify-center">
                  <span className="text-[8px] font-bold text-white">T</span>
                </div>
                <span className="text-[10px] font-medium text-[#7A90A4]">
                  Today
                </span>
              </div>
            </div>

            {loadingMonth ? (
              <div className="h-40 flex items-center justify-center text-[13px] text-[#7A90A4]">
                Loading calendar...
              </div>
            ) : (
              <AttendanceCalendar
                year={calYear}
                month={calMonth}
                records={monthRecords}
              />
            )}
          </Card>

          {/* Monthly summary */}
          <Card className="p-5">
            <SectionLabel>
              Monthly summary — {MONTHS[calMonth - 1]}
            </SectionLabel>
            {loadingMonth ? (
              <div className="h-20 flex items-center justify-center text-[13px] text-[#7A90A4]">
                Loading...
              </div>
            ) : (
              <MonthlySummary records={monthRecords} />
            )}
          </Card>

          {/* Recent records */}
          <Card className="p-5">
            <SectionLabel>Recent records</SectionLabel>
            {loadingMonth ? (
              <div className="h-20 flex items-center justify-center text-[13px] text-[#7A90A4]">
                Loading...
              </div>
            ) : (
              <RecentRecords records={monthRecords} />
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
