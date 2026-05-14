// All shared crew UI primitives — import from here in every crew page

import { statusDotColor } from "./crewConstants";

export function Badge({ label, cls }) {
  return (
    <span className={`text-[11px] font-semibold px-2.5 py-[3px] rounded-full whitespace-nowrap ${cls}`}>
      {label}
    </span>
  );
}

export function Avatar({ name = "", size = "md" }) {
  const initials = name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const s = { sm: "w-8 h-8 text-[11px]", md: "w-10 h-10 text-[13px]", lg: "w-14 h-14 text-[18px]", xl: "w-20 h-20 text-[24px]" };
  return (
    <div className={`${s[size]} rounded-full bg-[#E3F2FD] text-[#1565C0] flex items-center justify-center font-bold flex-shrink-0 ring-4 ring-white`}>
      {initials || "?"}
    </div>
  );
}

export function Card({ children, className = "" }) {
  return (
    <div className={`bg-white border border-[#D0E6F7] rounded-2xl ${className}`}>
      {children}
    </div>
  );
}

export function SectionLabel({ children }) {
  return (
    <p className="text-[10px] font-bold text-[#1565C0] uppercase tracking-[1.2px] mb-4">
      {children}
    </p>
  );
}

export function InfoRow({ label, value, i = 1 }) {
  return (
    <div className={`flex justify-between items-center py-3 ${i > 0 ? "border-t border-[#F0F7FF]" : ""}`}>
      <span className="text-[12px] font-medium text-[#7A90A4]">{label}</span>
      <span className="text-[12px] font-semibold text-[#0D1B2A] text-right max-w-[60%]">{value}</span>
    </div>
  );
}

export function StatCard({ label, value, icon, color, sub }) {
  return (
    <div className="bg-white border border-[#D0E6F7] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
          <i className={`ti ${icon} text-[16px]`} />
        </div>
        {sub && <span className="text-[10px] text-[#B0C4D8] font-medium">{sub}</span>}
      </div>
      <p className="text-[28px] font-bold text-[#0D1B2A] leading-none">{value}</p>
      <p className="text-[11px] font-medium text-[#7A90A4] mt-1.5">{label}</p>
    </div>
  );
}

export function MiniRoute({ routes = [], status, currentStop }) {
  const sc = statusDotColor[status] || "#1565C0";
  const activeIdx = currentStop
    ? routes.indexOf(currentStop)
    : status === "completed"  ? routes.length - 1
    : status === "boarding"   ? 0
    : status === "in-flight"  ? Math.max(1, Math.floor(routes.length / 2))
    : -1;
  if (!routes.length) return null;
  return (
    <div className="flex items-center gap-0.5 mt-2.5">
      {routes.map((stop, i) => {
        const isPast    = activeIdx >= 0 && i < activeIdx;
        const isCurrent = activeIdx >= 0 && i === activeIdx;
        return (
          <div key={i} className="flex items-center gap-0.5 flex-1 min-w-0">
            <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
              <div className="w-2 h-2 rounded-full border-2 transition-all"
                style={{
                  borderColor:     status === "cancelled" ? "#B71C1C" : sc,
                  backgroundColor: isPast || isCurrent || status === "completed" ? sc : "white",
                  transform:       isCurrent ? "scale(1.4)" : "scale(1)",
                  opacity:         status === "cancelled" ? 0.4 : 1,
                }}
              />
              <span className="text-[8px] font-bold" style={{ color: isCurrent ? sc : isPast ? "#0D1B2A" : "#B0C4D8" }}>
                {stop}
              </span>
            </div>
            {i < routes.length - 1 && (
              <div className="flex-1 h-px mb-2.5 mx-0.5"
                style={{ backgroundColor: isPast || status === "completed" ? sc : "#E8F2FA", opacity: status === "cancelled" ? 0.3 : 1 }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

const fmtTime = (dt) =>
  dt ? new Date(dt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }) : "—";

export function FlightCard({ flight, onClick }) {
  const statusBadgeMap = {
    scheduled:   { label: "Scheduled",  cls: "bg-blue-100 text-blue-800"    },
    delayed:     { label: "Delayed",    cls: "bg-orange-100 text-orange-800" },
    boarding:    { label: "Boarding",   cls: "bg-violet-100 text-violet-800" },
    "in-flight": { label: "In Flight",  cls: "bg-indigo-100 text-indigo-800" },
    completed:   { label: "Completed",  cls: "bg-green-100 text-green-800"   },
    cancelled:   { label: "Cancelled",  cls: "bg-red-100 text-red-800"       },
  };
  const fmt = (dt) => dt ? new Date(dt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
  const b = statusBadgeMap[flight.status] || { label: flight.status, cls: "bg-gray-100 text-gray-600" };
  return (
    <div onClick={onClick}
      className="bg-white border border-[#D0E6F7] rounded-2xl p-5 hover:border-[#1565C0] hover:shadow-[0_8px_24px_rgba(21,101,192,0.10)] transition-all cursor-pointer group"
    >
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-[#EAF4FB] flex items-center justify-center flex-shrink-0 group-hover:bg-[#1565C0] transition-colors">
          <i className="ti ti-plane text-[#1565C0] text-[18px] group-hover:text-white transition-colors" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[14px] font-bold text-[#1565C0]">{flight.flightNumber}</span>
            <Badge label={b.label} cls={b.cls} />
          </div>
          <p className="text-[13px] font-semibold text-[#0D1B2A]">
            {flight.source}<span className="text-[#B0C4D8] mx-1.5">→</span>{flight.destination}
          </p>
          <p className="text-[11px] text-[#B0C4D8] mt-0.5">
            {flight.aircraftId?.registrationNumber} · {flight.aircraftId?.model}
          </p>
          <MiniRoute routes={flight.routes} status={flight.status} currentStop={flight.currentStop} />
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-[10px] font-semibold text-[#B0C4D8] uppercase tracking-wider mb-1">Departure</p>
          <p className="text-[12px] font-bold text-[#0D1B2A]">{fmt(flight.departureTime)}</p>
          <p className="text-[10px] font-semibold text-[#B0C4D8] uppercase tracking-wider mt-2 mb-1">Arrival</p>
          <p className="text-[12px] font-bold text-[#0D1B2A]">{fmt(flight.arrivalTime)}</p>
        </div>
      </div>
    </div>
  );
}

export function PunchCard({ attendance, onPunchIn, onPunchOut, punchingIn, punchingOut, error }) {
  const hasPunchedIn  = !!attendance?.clockIn;
  const hasPunchedOut = !!attendance?.clockOut;

  const duration = () => {
    if (!attendance?.clockIn) return null;
    const end  = attendance.clockOut ? new Date(attendance.clockOut) : new Date();
    const mins = Math.floor((end - new Date(attendance.clockIn)) / 60000);
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  return (
    <div className="bg-white border border-[#D0E6F7] rounded-2xl p-5">
      <SectionLabel>Today's attendance</SectionLabel>
      <div className="flex items-center gap-4 mb-5">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0
          ${hasPunchedOut ? "bg-green-50" : hasPunchedIn ? "bg-blue-50" : "bg-[#F0F7FF]"}`}>
          <i className={`ti text-[24px]
            ${hasPunchedOut ? "ti-circle-check text-green-600" : hasPunchedIn ? "ti-clock-play text-[#1565C0]" : "ti-clock text-[#B0C4D8]"}`} />
        </div>
        <div>
          <p className={`text-[14px] font-bold
            ${hasPunchedOut ? "text-green-700" : hasPunchedIn ? "text-[#1565C0]" : "text-[#B0C4D8]"}`}>
            {hasPunchedOut ? "Shift complete" : hasPunchedIn ? "On duty" : "Not started"}
          </p>
          {hasPunchedIn && (
            <p className="text-[11px] text-[#7A90A4] mt-0.5">
              In: {fmtTime(attendance.clockIn)}
              {hasPunchedOut && ` · Out: ${fmtTime(attendance.clockOut)}`}
            </p>
          )}
          {hasPunchedIn && (
            <p className="text-[11px] font-semibold text-[#1565C0] mt-0.5">Duration: {duration()}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-[#F0F7FF] rounded-xl p-3">
          <p className="text-[10px] text-[#7A90A4] uppercase tracking-wider mb-1">Clock In</p>
          <p className="text-[14px] font-bold text-[#0D1B2A]">{attendance?.clockIn ? fmtTime(attendance.clockIn) : "—"}</p>
        </div>
        <div className="bg-[#F0F7FF] rounded-xl p-3">
          <p className="text-[10px] text-[#7A90A4] uppercase tracking-wider mb-1">Clock Out</p>
          <p className="text-[14px] font-bold text-[#0D1B2A]">{attendance?.clockOut ? fmtTime(attendance.clockOut) : "—"}</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-[12px] text-red-600">{error}</div>
      )}

      {!hasPunchedIn && !hasPunchedOut && (
        <button onClick={onPunchIn} disabled={punchingIn}
          className="w-full h-12 bg-[#1565C0] hover:bg-[#1251A3] active:scale-[0.99] text-white text-[14px] font-bold rounded-xl shadow-[0_4px_16px_rgba(21,101,192,0.25)] transition border-none cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {punchingIn ? <><i className="ti ti-loader-2 animate-spin text-[16px]" /> Punching in...</> : <><i className="ti ti-clock-play text-[16px]" /> Punch In</>}
        </button>
      )}
      {hasPunchedIn && !hasPunchedOut && (
        <button onClick={onPunchOut} disabled={punchingOut}
          className="w-full h-12 bg-red-500 hover:bg-red-600 active:scale-[0.99] text-white text-[14px] font-bold rounded-xl shadow-[0_4px_16px_rgba(229,57,53,0.25)] transition border-none cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {punchingOut ? <><i className="ti ti-loader-2 animate-spin text-[16px]" /> Punching out...</> : <><i className="ti ti-clock-stop text-[16px]" /> Punch Out</>}
        </button>
      )}
      {hasPunchedOut && (
        <div className="w-full h-12 bg-green-50 border border-green-200 rounded-xl flex items-center justify-center gap-2">
          <i className="ti ti-circle-check text-green-600 text-[16px]" />
          <span className="text-[13px] font-semibold text-green-700">Shift completed for today</span>
        </div>
      )}

      {attendance?.status && (
        <div className="mt-3 flex justify-center">
          <span className={`text-[11px] font-semibold px-3 py-1 rounded-full ${{
            present:    "bg-green-100 text-green-700",
            "half-day": "bg-orange-100 text-orange-700",
            absent:     "bg-red-100 text-red-700",
            leave:      "bg-gray-100 text-gray-600",
          }[attendance.status]}`}>
            {attendance.status.charAt(0).toUpperCase() + attendance.status.slice(1)}
          </span>
        </div>
      )}
    </div>
  );
}