// src/pages/user/TrackPlanePage.jsx
import { useMemo, useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTrackMyFlightQuery } from "../../slices/flightApiSlice";
import UserNavbar from "../../components/UserNavbar";

/* ─────────────────────────────────────────── constants ── */

const STATUS_COLOR = {
  scheduled: { bg: "#546E7A", light: "#EDF2F4", text: "#263238" },
  delayed: { bg: "#EF6C00", light: "#FFF3E0", text: "#E65100" },
  boarding: { bg: "#1565C0", light: "#E3F2FD", text: "#0D47A1" },
  "in-flight": { bg: "#00ACC1", light: "#E0F7FA", text: "#006064" },
  completed: { bg: "#2E7D32", light: "#E8F5E9", text: "#1B5E20" },
  cancelled: { bg: "#D32F2F", light: "#FFEBEE", text: "#B71C1C" },
};

const STATUS_LABEL = {
  scheduled: "Scheduled",
  delayed: "Delayed",
  boarding: "Boarding",
  "in-flight": "In Flight",
  completed: "Completed",
  cancelled: "Cancelled",
};

const fmtTime = (dt) => {
  if (!dt) return "--:--";
  const d = new Date(dt);
  return isNaN(d)
    ? "--:--"
    : d.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
};

const fmtDate = (dt) => {
  if (!dt) return "—";
  const d = new Date(dt);
  return isNaN(d)
    ? "—"
    : d.toLocaleDateString("en-IN", {
        weekday: "short",
        day: "2-digit",
        month: "short",
      });
};

const getDuration = (start, end) => {
  if (!start || !end) return "—";
  const diff = new Date(end) - new Date(start);
  if (isNaN(diff) || diff < 0) return "—";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return `${h}h ${m}m`;
};

/* ─────────────────────────────────────────── component ── */

export default function TrackPlanePage() {
  const { flightId } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useTrackMyFlightQuery(flightId);
  const [now, setNow] = useState(Date.now());

  // tick every 30s to keep progress live
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const flight = data?.data?.flight;

  const stops = useMemo(() => {
    if (!flight) return [];
    return flight.routes?.length > 0
      ? flight.routes.filter(Boolean)
      : [flight.source, flight.destination].filter(Boolean);
  }, [flight]);

  /* ── loading ── */
  if (isLoading)
    return (
      <div className="min-h-screen bg-[#F4F8FC]">
        <UserNavbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="bg-white rounded-3xl shadow-sm border border-[#E2EDF7] px-8 py-6 flex items-center gap-4">
            <div className="w-6 h-6 border-[3px] border-[#1565C0]/20 border-t-[#1565C0] rounded-full animate-spin flex-shrink-0" />
            <p className="text-[#0D1B2A] font-semibold text-[15px]">
              Tracking flight…
            </p>
          </div>
        </div>
      </div>
    );

  /* ── error ── */
  if (isError || !flight)
    return (
      <div className="min-h-screen bg-[#F4F8FC]">
        <UserNavbar />
        <div className="flex items-center justify-center min-h-[60vh] p-5">
          <div className="bg-white max-w-sm w-full rounded-3xl border border-red-100 p-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
              <i className="ti ti-plane-off text-red-500 text-[28px]" />
            </div>
            <h2 className="text-[20px] font-black text-[#0D1B2A] mb-2">
              Flight not found
            </h2>
            <p className="text-[13px] text-[#7A90A4] mb-5">
              Unable to load live tracking data.
            </p>
            <button
              onClick={() => navigate(-1)}
              className="h-10 px-5 bg-[#0C3060] text-white text-[13px] font-bold rounded-xl border-none cursor-pointer hover:bg-[#0a2550] transition"
            >
              Go back
            </button>
          </div>
        </div>
      </div>
    );

  const status = flight.status || "scheduled";
  const scfg = STATUS_COLOR[status] || STATUS_COLOR.scheduled;
  const departure = flight.departureTime
    ? new Date(flight.departureTime)
    : null;
  const arrival = flight.arrivalTime ? new Date(flight.arrivalTime) : null;

  /* ── live time-based progress ── */
  const timeProgress = (() => {
    if (!departure || !arrival) return 0;
    const total = arrival - departure;
    const elapsed = now - departure;
    if (elapsed < 0) return 0;
    if (elapsed > total) return 100;
    return (elapsed / total) * 100;
  })();

  /* ── active stop index ── */
  const activeIdx = (() => {
    if (status === "completed") return stops.length - 1;
    if (status === "boarding") return 0;
    if (!flight.currentStop) return status === "in-flight" ? 0 : -1;
    const idx = stops.findIndex(
      (s) => s?.toLowerCase() === flight.currentStop?.toLowerCase(),
    );
    return idx >= 0 ? idx : 0;
  })();

  /* ── final progress % ── */
  const progressPct = (() => {
    if (status === "completed") return 100;
    if (["scheduled", "cancelled", "delayed"].includes(status)) return 0;
    if (stops.length <= 2) return timeProgress;
    return Math.min(
      Math.round((activeIdx / (stops.length - 1)) * 100) + timeProgress * 0.1,
      97,
    );
  })();

  const booked = (flight.totalSeats || 0) - (flight.availableSeats || 0);

  const isLive = status === "in-flight";
  const isBoarding = status === "boarding";

  return (
    <div className="min-h-screen bg-[#F4F8FC] font-sans">
      <UserNavbar />

      <div className="w-11/12 mx-auto px-4 py-6">
        {/* ── Back ── */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-[13px] text-slate-400 hover:text-[#0C3060] mb-5 transition cursor-pointer bg-transparent border-none"
        >
          <i className="ti ti-arrow-left text-[14px]" />
          Back
        </button>

        {/* ── Hero card ── */}
        <div
          className="rounded-3xl overflow-hidden mb-5 shadow-sm"
          style={{
            background: `linear-gradient(135deg, #0D2540 0%, #123D67 55%, #1565C0 100%)`,
          }}
        >
          {/* Top bar */}
          <div className="flex items-center justify-between px-6 pt-5 pb-3 flex-wrap gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Status pill */}
              <span
                className="px-3 py-1 rounded-full text-[11px] font-bold tracking-wide"
                style={{ backgroundColor: scfg.bg, color: "#fff" }}
              >
                {STATUS_LABEL[status]}
              </span>
              <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-white/10 text-white/80">
                {flight.flightNumber}
              </span>
              {isLive && (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[11px] font-semibold text-white/80">
                  <span className="w-2 h-2 rounded-full bg-[#4ADE80] animate-pulse" />
                  Live
                </span>
              )}
            </div>
            <div className="text-right">
              <p className="text-white/50 text-[11px] uppercase tracking-wider">
                Departure
              </p>
              <p className="text-white text-[13px] font-semibold">
                {fmtDate(departure)}
              </p>
            </div>
          </div>

          {/* Route */}
          <div className="px-6 pb-2 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-white text-[44px] font-black leading-none tracking-tight">
                {flight.source}
              </p>
              <p className="text-white/50 text-[12px] mt-0.5">
                {fmtTime(departure)}
              </p>
            </div>
            <div className="flex-1 flex flex-col items-center gap-2 px-4 min-w-[120px]">
              <p className="text-white/50 text-[11px]">
                {getDuration(departure, arrival)}
              </p>
              <div className="w-full flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-white/40 flex-shrink-0" />
                <div className="flex-1 h-px bg-white/20" />
                <i className="ti ti-plane text-white/70 text-[18px]" />
                <div className="flex-1 h-px bg-white/20" />
                <div className="w-2 h-2 rounded-full bg-white/40 flex-shrink-0" />
              </div>
              <p className="text-white/40 text-[10px]">
                {stops.length > 2
                  ? `${stops.length - 2} stop${stops.length - 2 > 1 ? "s" : ""}`
                  : "Non-stop"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-white text-[44px] font-black leading-none tracking-tight">
                {flight.destination}
              </p>
              <p className="text-white/50 text-[12px] mt-0.5">
                {fmtTime(arrival)}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="px-6 pb-5 pt-3">
            <div className="flex justify-between text-[10px] text-white/40 font-semibold mb-2 uppercase tracking-wider">
              <span>{fmtTime(departure)}</span>
              <span>{Math.round(progressPct)}% complete</span>
              <span>{fmtTime(arrival)}</span>
            </div>
            <div className="relative">
              <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${progressPct}%`,
                    background:
                      "linear-gradient(to right, rgba(144,202,249,0.7), rgba(255,255,255,0.9))",
                  }}
                />
              </div>
              {(isLive || isBoarding) && (
                <div
                  className="absolute -top-2.5 transition-all duration-700"
                  style={{ left: `calc(${progressPct}% - 14px)` }}
                >
                  <div className="w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center">
                    <i
                      className="ti ti-plane text-[16px]"
                      style={{ color: scfg.bg }}
                    />
                  </div>
                </div>
              )}
            </div>
            {isLive && flight.currentStop && (
              <div className="mt-3 inline-flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] animate-pulse" />
                <span className="text-white/80 text-[11px] font-medium">
                  Over {flight.currentStop}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Stats row ── */}
        <div className="grid grid-cols-3 gap-3.5 mb-5">
          {[
            {
              icon: "ti-plane-departure",
              label: "Departure",
              value: fmtTime(departure),
              sub: fmtDate(departure),
            },
            {
              icon: "ti-plane-arrival",
              label: "Arrival",
              value: fmtTime(arrival),
              sub: fmtDate(arrival),
            },
            {
              icon: "ti-armchair",
              label: "Seats filled",
              value: `${booked}/${flight.totalSeats || 0}`,
              sub: "Current occupancy",
            },
          ].map(({ icon, label, value, sub }) => (
            <div
              key={label}
              className="bg-white border border-[#E2EDF7] rounded-2xl p-4 shadow-sm"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-[#EEF7FF] flex items-center justify-center flex-shrink-0">
                  <i className={`ti ${icon} text-[#1565C0] text-[16px]`} />
                </div>
                <p className="text-[11px] font-semibold text-[#8DA2B5] uppercase tracking-wider">
                  {label}
                </p>
              </div>
              <p className="text-[22px] font-black text-[#0D1B2A] leading-none">
                {value}
              </p>
              <p className="text-[11px] text-[#8DA2B5] mt-1">{sub}</p>
            </div>
          ))}
        </div>

        {/* ── Route timeline ── */}
        <div className="bg-white border border-[#E2EDF7] rounded-3xl p-6 mb-5 shadow-sm">
          <div className="flex items-center justify-between mb-7">
            <div>
              <h2 className="text-[18px] font-black text-[#0D1B2A]">
                Flight route
              </h2>
              <p className="text-[12px] text-[#7A90A4] mt-0.5">
                Real-time stop progress
              </p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#EEF7FF]">
              <div
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ backgroundColor: scfg.bg }}
              />
              <span className="text-[10px] font-bold text-[#0D1B2A] uppercase tracking-wider">
                Live
              </span>
            </div>
          </div>

          <div className="relative overflow-x-auto pb-2">
            {/* Track line */}
            <div className="absolute top-[18px] left-0 right-0 h-[3px] bg-[#E8F1F8] rounded-full" />
            <div
              className="absolute top-[18px] left-0 h-[3px] rounded-full transition-all duration-700"
              style={{ width: `${progressPct}%`, backgroundColor: scfg.bg }}
            />

            <div className="relative flex justify-between gap-2 min-w-[400px]">
              {stops.map((stop, i) => {
                const isPast = activeIdx >= 0 && i < activeIdx;
                const isCurrent = activeIdx >= 0 && i === activeIdx;
                const isFirst = i === 0;
                const isLast = i === stops.length - 1;
                const filled = isPast || isCurrent || status === "completed";

                return (
                  <div key={i} className="flex flex-col items-center flex-1">
                    {/* Stop dot */}
                    <div className="relative z-10">
                      {isCurrent && status !== "completed" && (
                        <div
                          className="absolute inset-0 rounded-full animate-ping"
                          style={{
                            backgroundColor: `${scfg.bg}30`,
                            transform: "scale(2.5)",
                          }}
                        />
                      )}
                      <div
                        className="relative w-9 h-9 rounded-full border-[3px] flex items-center justify-center bg-white transition-all duration-500"
                        style={{
                          borderColor: scfg.bg,
                          backgroundColor: filled ? scfg.bg : "white",
                        }}
                      >
                        <i
                          className={`ti ${isFirst ? "ti-plane-departure" : isLast ? "ti-flag" : "ti-map-pin"} text-[14px]`}
                          style={{ color: filled ? "#fff" : scfg.bg }}
                        />
                      </div>
                    </div>

                    <h3
                      className="mt-4 text-[15px] font-black text-center"
                      style={{ color: isCurrent ? scfg.bg : "#0D1B2A" }}
                    >
                      {stop}
                    </h3>
                    <p className="text-[10px] text-[#9AB0C4] mt-0.5 text-center">
                      {isFirst
                        ? "Origin"
                        : isLast
                          ? "Destination"
                          : `Stop ${i}`}
                    </p>
                    {isCurrent && status !== "completed" && (
                      <div
                        className="mt-2 px-2.5 py-0.5 rounded-full text-[9px] font-bold"
                        style={{
                          backgroundColor: `${scfg.bg}15`,
                          color: scfg.bg,
                        }}
                      >
                        Here
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Status-specific callout ── */}
        {status === "delayed" && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 mb-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
              <i className="ti ti-clock-pause text-orange-600 text-[18px]" />
            </div>
            <div>
              <p className="font-bold text-orange-800 text-[14px]">
                Flight delayed
              </p>
              <p className="text-[13px] text-orange-600 mt-0.5 leading-relaxed">
                This flight is experiencing a delay. Please check with the
                airline for the updated departure time. Your connecting travel
                arrangements may be affected.
              </p>
            </div>
          </div>
        )}

        {status === "cancelled" && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 mb-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
              <i className="ti ti-circle-x text-red-600 text-[18px]" />
            </div>
            <div>
              <p className="font-bold text-red-700 text-[14px]">
                Flight cancelled
              </p>
              <p className="text-[13px] text-red-600 mt-0.5 leading-relaxed">
                This flight has been cancelled. Please contact the airline for
                rebooking options or a refund.
              </p>
            </div>
          </div>
        )}

        {status === "completed" && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5 mb-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
              <i className="ti ti-circle-check text-green-600 text-[18px]" />
            </div>
            <div>
              <p className="font-bold text-green-700 text-[14px]">
                Flight completed
              </p>
              <p className="text-[13px] text-green-600 mt-0.5">
                This flight has arrived at {flight.destination}. We hope you had
                a comfortable journey.
              </p>
            </div>
          </div>
        )}

        {/* ── Safety notice ── */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <i className="ti ti-alert-triangle text-amber-600 text-[18px]" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <p className="font-bold text-amber-800 text-[14px]">
                  Passenger safety notice
                </p>
                <span className="text-[9px] font-bold bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full uppercase tracking-wide">
                  Important
                </span>
              </div>
              <p className="text-[13px] text-amber-700 leading-relaxed mb-3">
                For any emergency, medical concern, discomfort, or assistance
                during the flight — contact cabin crew immediately. Our team is
                available throughout the journey.
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  { icon: "ti-heartbeat", label: "Medical assistance" },
                  { icon: "ti-shield-check", label: "Passenger safety" },
                  { icon: "ti-users", label: "Crew support" },
                ].map(({ icon, label }) => (
                  <div
                    key={label}
                    className="flex items-center gap-1.5 bg-white border border-amber-200 rounded-xl px-3 py-2"
                  >
                    <i className={`ti ${icon} text-amber-600 text-[14px]`} />
                    <span className="text-[11px] font-semibold text-amber-800">
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
