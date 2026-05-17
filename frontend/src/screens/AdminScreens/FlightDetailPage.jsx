// src/pages/admin/FlightDetailPage.jsx
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useGetFlightByIdQuery } from "../../slices/flightApiSlice";
import Badge from "../../components/admin/shared/Badge";
import { useGetFlightSeatsQuery, useGetBookingsByFlightIdQuery } from "../../slices/bookingApiSlice";

// ── Helpers ────────────────────────────────────────────
const fmt = (dt) =>
  dt ? new Date(dt).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }) : "—";

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  }) : "—";

const duration = (dep, arr) => {
  if (!dep || !arr) return "—";
  const mins = Math.round((new Date(arr) - new Date(dep)) / 60000);
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
};

const statusBadgeMap = {
  scheduled:   "Scheduled",
  delayed:     "Delayed",
  boarding:    "Boarding",
  "in-flight": "In Flight",
  completed:   "Arrived",
  cancelled:   "Cancelled",
};

const statusColorMap = {
  scheduled:   "#1565C0",
  delayed:     "#E65100",
  boarding:    "#4527A0",
  "in-flight": "#1565C0",
  completed:   "#2E7D32",
  cancelled:   "#B71C1C",
};

const crewRoleIcon = {
  Pilot:         "ti-steering-wheel",
  "Co-Pilot":    "ti-steering-wheel",
  "Cabin Crew":  "ti-users",
  "Ground Staff":"ti-building-airport",
};

const BOOKING_STATUS_CLS = {
  confirmed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  completed: "bg-blue-100 text-blue-800",
  pending:   "bg-orange-100 text-orange-800",
};

const PAYMENT_STATUS_CLS = {
  paid:     "bg-green-100 text-green-700",
  pending:  "bg-orange-100 text-orange-700",
  refunded: "bg-blue-100 text-blue-700",
  failed:   "bg-red-100 text-red-700",
};

const CLASS_LABEL = {
  economy:  "Economy",
  business: "Business",
  first:    "First Class",
};

// ── Shared UI ──────────────────────────────────────────
function SectionTitle({ icon, title, count }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div className="w-8 h-8 bg-[#EAF4FB] rounded-lg flex items-center justify-center">
        <i className={`ti ${icon} text-[#1565C0] text-[15px]`} />
      </div>
      <h2 className="text-[14px] font-bold text-[#0D1B2A]">{title}</h2>
      {count !== undefined && (
        <span className="text-[11px] font-semibold bg-[#EAF4FB] text-[#1565C0] px-2 py-0.5 rounded-full">
          {count}
        </span>
      )}
    </div>
  );
}

function InfoGrid({ rows }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between items-center py-3 border-b border-[#F0F7FF]">
          <span className="text-[12px] font-medium text-[#7A90A4]">{label}</span>
          <span className="text-[12px] font-semibold text-[#0D1B2A] text-right max-w-[55%]">{value ?? "—"}</span>
        </div>
      ))}
    </div>
  );
}

function Avatar({ name = "", size = "md" }) {
  const initials = name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const s = { sm: "w-8 h-8 text-[11px]", md: "w-10 h-10 text-[13px]", lg: "w-12 h-12 text-[15px]" };
  return (
    <div className={`${s[size]} rounded-full bg-[#E3F2FD] text-[#1565C0] flex items-center justify-center font-bold flex-shrink-0`}>
      {initials || "?"}
    </div>
  );
}

// ── Route visualiser ───────────────────────────────────
function RouteVisualiser({ flight }) {
  const stops       = flight.routes?.length > 0 ? flight.routes : [flight.source, flight.destination].filter(Boolean);
  const status      = flight.status;
  const statusColor = statusColorMap[status] || "#1565C0";

  const activeIdx = (() => {
    if (status === "completed") return stops.length - 1;
    if (status === "boarding")  return 0;
    if (!flight.currentStop)    return status === "in-flight" ? 0 : -1;
    const idx = stops.findIndex((s) => s?.toLowerCase() === flight.currentStop?.toLowerCase());
    return idx >= 0 ? idx : 0;
  })();

  const progressPct = (() => {
    if (status === "completed") return 100;
    if (["scheduled", "cancelled", "delayed"].includes(status)) return 0;
    if (status === "boarding")  return 5;
    if (stops.length <= 1)      return 50;
    return Math.min(Math.round((activeIdx / (stops.length - 1)) * 100), 95);
  })();

  return (
    <div className="bg-[#EAF4FB] rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="text-center">
          <p className="text-[32px] font-black text-[#0D1B2A] leading-none">{stops[0] || flight.source}</p>
          <p className="text-[12px] text-[#7A90A4] mt-1 font-medium">{flight.source}</p>
          <p className="text-[11px] text-[#B0C4D8] mt-0.5">{fmt(flight.departureTime)}</p>
        </div>
        <div className="flex-1 flex flex-col items-center px-6 gap-2">
          <span className="text-[11px] font-bold text-[#7A90A4] uppercase tracking-widest">{flight.flightNumber}</span>
          <Badge label={statusBadgeMap[status] || status} />
          <span className="text-[11px] text-[#7A90A4]">{duration(flight.departureTime, flight.arrivalTime)}</span>
          {status === "in-flight" && flight.currentStop && (
            <span className="text-[10px] font-semibold text-[#1565C0] bg-blue-50 px-2 py-0.5 rounded-full">
              Over {flight.currentStop}
            </span>
          )}
        </div>
        <div className="text-center">
          <p className="text-[32px] font-black text-[#0D1B2A] leading-none">{stops[stops.length - 1] || flight.destination}</p>
          <p className="text-[12px] text-[#7A90A4] mt-1 font-medium">{flight.destination}</p>
          <p className="text-[11px] text-[#B0C4D8] mt-0.5">{fmt(flight.arrivalTime)}</p>
        </div>
      </div>

      <div className="relative mb-6 mx-2">
        <div className="h-2 bg-white rounded-full overflow-hidden">
          {!["scheduled", "cancelled", "delayed"].includes(status) && (
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${progressPct}%`, backgroundColor: statusColor }} />
          )}
        </div>
        {["boarding", "in-flight"].includes(status) && (
          <div className="absolute -top-4 transition-all duration-700" style={{ left: `calc(${progressPct}% - 10px)` }}>
            <i className="ti ti-plane text-[#1565C0] text-[22px]" />
          </div>
        )}
        {status === "completed" && (
          <div className="absolute -top-3 right-0">
            <i className="ti ti-circle-check text-[#2E7D32] text-[20px]" />
          </div>
        )}
      </div>

      {stops.length > 0 && (
        <div className="relative">
          <div className="flex items-start justify-between gap-2">
            {stops.map((stop, i) => {
              const isPast    = activeIdx >= 0 && i < activeIdx;
              const isCurrent = activeIdx >= 0 && i === activeIdx;
              const isFirst   = i === 0;
              const isLast    = i === stops.length - 1;
              const filled    = isPast || isCurrent || status === "completed" || (status === "boarding" && isFirst);
              return (
                <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
                  <div className="relative flex items-center justify-center">
                    {isCurrent && (
                      <div className="absolute w-6 h-6 rounded-full animate-ping" style={{ backgroundColor: statusColor, opacity: 0.2 }} />
                    )}
                    <div className="w-3.5 h-3.5 rounded-full border-2 relative z-10 transition-all duration-500"
                      style={{
                        borderColor:     statusColor,
                        backgroundColor: filled ? statusColor : "white",
                        transform:       isCurrent ? "scale(1.4)" : "scale(1)",
                      }}
                    />
                  </div>
                  <p className="text-[13px] font-black text-center" style={{ color: isCurrent ? statusColor : isPast ? "#0D1B2A" : "#7A90A4" }}>
                    {stop}
                  </p>
                  <p className="text-[9px] text-[#B0C4D8] text-center">
                    {isFirst ? "Origin" : isLast ? "Destination" : `Stop ${i}`}
                  </p>
                  {isCurrent && (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: `${statusColor}20`, color: statusColor }}>
                      Here
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="absolute top-[6px] left-0 right-0 flex pointer-events-none px-[7px]">
            {stops.slice(0, -1).map((_, i) => (
              <div key={i} className="h-0.5 flex-1 mx-1 rounded-full"
                style={{ backgroundColor: (status === "completed" || (activeIdx >= 0 && i < activeIdx)) ? statusColor : "#D0E6F7" }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tabs ───────────────────────────────────────────────
const TABS = [
  { id: "overview",  label: "Overview",  icon: "ti-info-circle"  },
  { id: "crew",      label: "Crew",      icon: "ti-users"        },
  { id: "aircraft",  label: "Aircraft",  icon: "ti-plane"        },
  { id: "bookings",  label: "Bookings",  icon: "ti-ticket"       },
  { id: "timeline",  label: "Timeline",  icon: "ti-timeline"     },
];

// ── Main page ──────────────────────────────────────────
export default function FlightDetailPage() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const [tab, setTab]           = useState("overview");
  const [bookingFilter, setBookingFilter] = useState("all");
  const [bookingPage,   setBookingPage]   = useState(1);

  const { data, isLoading, isError } = useGetFlightByIdQuery(id);
  const flight = data?.data;

  const { data: bookingData, isLoading: bookingsLoading } = useGetBookingsByFlightIdQuery(
    { flightId: id, status: bookingFilter, page: bookingPage, limit: 10 },
    { skip: tab !== "bookings" }   // only fetch when on bookings tab
  );

  const bookings    = bookingData?.data       ?? [];
  const bookingStats= bookingData?.stats      ?? {};
  const totalPages  = bookingData?.totalPages ?? 1;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-[#EAF4FB] border-t-[#1565C0] rounded-full animate-spin" />
      </div>
    );
  }

  if (isError || !flight) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <i className="ti ti-plane-off text-[48px] text-[#D0E6F7]" />
        <p className="text-[15px] font-semibold text-[#7A90A4]">Flight not found</p>
        <button onClick={() => navigate(-1)} className="text-[13px] text-[#1565C0] font-semibold hover:underline cursor-pointer bg-transparent border-none">
          ← Go back
        </button>
      </div>
    );
  }

  const stops = Math.max(0, (flight.routes?.length || 0) - 2);

  return (
    <div className="min-h-screen bg-[#EAF4FB]">

      {/* ── Top bar ── */}
      <div className="bg-white border-b border-[#D0E6F7] px-5 md:px-8 py-4 flex items-center gap-4 sticky top-0 z-50">
        <button onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl border border-[#D0E6F7] bg-[#F0F7FF] flex items-center justify-center text-[#1565C0] hover:bg-[#E1EFFE] transition cursor-pointer flex-shrink-0"
        >
          <i className="ti ti-arrow-left text-[16px]" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-[17px] font-bold text-[#0D1B2A]">{flight.flightNumber}</h1>
            <Badge label={statusBadgeMap[flight.status] || flight.status} />
          </div>
          <p className="text-[12px] text-[#7A90A4] mt-0.5">
            {flight.source} → {flight.destination} · {fmtDate(flight.departureTime)}
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* ── Hero stat cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
          {[
            { label: "Price",           value: `₹${flight.price?.toLocaleString()}`,                               icon: "ti-currency-rupee", color: "bg-blue-50 text-blue-700"    },
            { label: "Available Seats", value: `${flight.availableSeats} / ${flight.totalSeats}`,                  icon: "ti-armchair",       color: "bg-green-50 text-green-700"  },
            { label: "Duration",        value: duration(flight.departureTime, flight.arrivalTime),                  icon: "ti-clock",          color: "bg-violet-50 text-violet-700" },
            { label: "Stops",           value: stops === 0 ? "Non-stop" : `${stops} stop${stops > 1 ? "s" : ""}`, icon: "ti-map-pin",        color: "bg-orange-50 text-orange-700" },
          ].map(({ label, value, icon, color }) => (
            <div key={label} className="bg-white border border-[#D0E6F7] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-medium text-[#7A90A4] uppercase tracking-[0.6px]">{label}</p>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
                  <i className={`ti ${icon} text-[15px]`} />
                </div>
              </div>
              <p className="text-[22px] font-bold text-[#0D1B2A] leading-none">{value}</p>
            </div>
          ))}
        </div>

        {/* ── Route visualiser ── */}
        <div className="bg-white border border-[#D0E6F7] rounded-2xl p-5 mb-6">
          <SectionTitle icon="ti-map-route" title="Flight route" />
          <RouteVisualiser flight={flight} />
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 bg-white border border-[#D0E6F7] rounded-xl p-1 mb-6 overflow-x-auto">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold whitespace-nowrap transition flex-1 justify-center border-none cursor-pointer
                ${tab === t.id
                  ? "bg-[#1565C0] text-white shadow-[0_2px_8px_rgba(21,101,192,0.25)]"
                  : "text-[#7A90A4] hover:text-[#0D1B2A] hover:bg-[#F0F7FF] bg-transparent"}`}
            >
              <i className={`ti ${t.icon} text-[14px]`} />
              <span className="hidden sm:block">{t.label}</span>
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}
        <div className="bg-white border border-[#D0E6F7] rounded-2xl p-5">

          {/* ── OVERVIEW ── */}
          {tab === "overview" && (
            <>
              <SectionTitle icon="ti-info-circle" title="Flight information" />
              <InfoGrid rows={[
                ["Flight Number",    flight.flightNumber],
                ["Status",          statusBadgeMap[flight.status] || flight.status],
                ["Source",          flight.source],
                ["Destination",     flight.destination],
                ["Departure",       fmt(flight.departureTime)],
                ["Arrival",         fmt(flight.arrivalTime)],
                ["Actual Arrival",  flight.actualArrivalTime ? fmt(flight.actualArrivalTime) : "—"],
                ["Duration",        duration(flight.departureTime, flight.arrivalTime)],
                ["Current Stop",    flight.currentStop || "—"],
                ["Total Stops",     stops === 0 ? "Non-stop" : `${stops} intermediate stop${stops > 1 ? "s" : ""}`],
                ["Price",           `₹${flight.price?.toLocaleString()}`],
                ["Total Seats",     flight.totalSeats],
                ["Available Seats", flight.availableSeats],
                ["Booked Seats",    (flight.totalSeats || 0) - (flight.availableSeats || 0)],
              ]} />

              {flight.routes?.length > 0 && (
                <div className="mt-5">
                  <p className="text-[11px] font-bold text-[#5A7089] uppercase tracking-[0.8px] mb-3">Route stops</p>
                  <div className="flex flex-wrap gap-2">
                    {flight.routes.map((stop, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className={`text-[12px] font-bold px-3 py-1.5 rounded-xl
                          ${i === 0 || i === flight.routes.length - 1 ? "bg-[#1565C0] text-white" : "bg-[#EAF4FB] text-[#1565C0]"}`}>
                          {stop}
                        </span>
                        {i < flight.routes.length - 1 && (
                          <i className="ti ti-chevron-right text-[#B0C4D8] text-[12px]" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── CREW ── */}
          {tab === "crew" && (
            <>
              <SectionTitle icon="ti-users" title="Assigned crew" count={flight.crewIds?.length || 0} />
              {!flight.crewIds?.length ? (
                <div className="text-center py-10">
                  <i className="ti ti-user-off text-[36px] text-[#D0E6F7] block mb-2" />
                  <p className="text-[13px] text-[#7A90A4]">No crew assigned yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {flight.crewIds.map((c) => {
                    const u    = c.userId ?? {};
                    const name = u.name   ?? "—";
                    const roleIcon  = crewRoleIcon[c.role] || "ti-user";
                    const statusCls = {
                      Available: "bg-green-100 text-green-700",
                      "On Duty": "bg-blue-100 text-blue-700",
                      "Off Duty":"bg-gray-100 text-gray-600",
                      "On Leave":"bg-orange-100 text-orange-700",
                    }[c.currentStatus] || "bg-gray-100 text-gray-600";
                    return (
                      <div key={c._id} className="flex items-center gap-4 p-4 bg-[#F7FAFD] border border-[#EAF4FB] rounded-2xl hover:border-[#1565C0] transition">
                        <Avatar name={name} size="lg" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <p className="text-[13px] font-bold text-[#0D1B2A] truncate">{name}</p>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusCls}`}>{c.currentStatus}</span>
                          </div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <i className={`ti ${roleIcon} text-[#1565C0] text-[12px]`} />
                            <p className="text-[12px] text-[#1565C0] font-semibold">{c.role}</p>
                          </div>
                          {[["ID", c.employeeId], ["Email", u.email], ["Phone", u.phone], ["Experience", c.experience ? `${c.experience} yrs` : null]].map(([label, value]) =>
                            value ? <p key={label} className="text-[11px] text-[#7A90A4]"><span className="font-medium">{label}:</span> {value}</p> : null
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {flight.crewIds?.length > 0 && (
                <div className="mt-5 pt-4 border-t border-[#EAF4FB]">
                  <p className="text-[11px] font-bold text-[#5A7089] uppercase tracking-[0.8px] mb-3">Crew composition</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(flight.crewIds.reduce((acc, c) => { acc[c.role] = (acc[c.role] || 0) + 1; return acc; }, {}))
                      .map(([role, count]) => (
                        <span key={role} className="text-[12px] font-semibold bg-[#EAF4FB] text-[#1565C0] px-3 py-1.5 rounded-xl">
                          {role} × {count}
                        </span>
                      ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── AIRCRAFT ── */}
          {tab === "aircraft" && (
            <>
              <SectionTitle icon="ti-plane" title="Aircraft details" />
              {!flight.aircraftId ? (
                <div className="text-center py-10">
                  <i className="ti ti-plane-off text-[36px] text-[#D0E6F7] block mb-2" />
                  <p className="text-[13px] text-[#7A90A4]">No aircraft assigned</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-4 bg-[#EAF4FB] rounded-2xl p-5 mb-5">
                    <div className="w-14 h-14 bg-[#1565C0] rounded-2xl flex items-center justify-center flex-shrink-0">
                      <i className="ti ti-plane text-white text-[24px]" />
                    </div>
                    <div>
                      <p className="text-[18px] font-black text-[#0D1B2A]">{flight.aircraftId.registrationNumber}</p>
                      <p className="text-[13px] text-[#1565C0] font-semibold">{flight.aircraftId.model}</p>
                      <p className="text-[11px] text-[#7A90A4] mt-0.5">Capacity: {flight.aircraftId.capacity} seats</p>
                    </div>
                  </div>
                  <InfoGrid rows={[
                    ["Registration",         flight.aircraftId.registrationNumber],
                    ["Model",                flight.aircraftId.model],
                    ["Total capacity",       flight.aircraftId.capacity],
                    ["Seats on this flight", flight.totalSeats],
                    ["Available seats",      flight.availableSeats],
                    ["Occupancy rate",       flight.totalSeats ? `${Math.round(((flight.totalSeats - flight.availableSeats) / flight.totalSeats) * 100)}%` : "—"],
                  ]} />
                </>
              )}
            </>
          )}

          {/* ── BOOKINGS ── */}
          {tab === "bookings" && (
            <>
              <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                <SectionTitle icon="ti-ticket" title="Passenger bookings" count={bookingStats.total ?? 0} />
                {/* Filter */}
                <div className="flex gap-1 bg-[#F0F7FF] border border-[#D0E6F7] rounded-lg p-0.5">
                  {["all", "confirmed", "completed", "cancelled"].map((f) => (
                    <button key={f} onClick={() => { setBookingFilter(f); setBookingPage(1); }}
                      className={`px-3 py-1.5 rounded-md text-[11px] font-semibold capitalize transition border-none cursor-pointer
                        ${bookingFilter === f ? "bg-[#1565C0] text-white" : "text-[#7A90A4] hover:text-[#0D1B2A] bg-transparent"}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Booking stats row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                {[
                  { label: "Total bookings", value: bookingStats.total     ?? 0, color: "bg-blue-50 text-blue-700",    icon: "ti-ticket"       },
                  { label: "Confirmed",      value: bookingStats.confirmed  ?? 0, color: "bg-green-50 text-green-700",  icon: "ti-circle-check" },
                  { label: "Cancelled",      value: bookingStats.cancelled  ?? 0, color: "bg-red-50 text-red-700",      icon: "ti-circle-x"     },
                  { label: "Revenue",        value: `₹${(bookingStats.revenue ?? 0).toLocaleString()}`, color: "bg-violet-50 text-violet-700", icon: "ti-currency-rupee" },
                ].map(({ label, value, color, icon }) => (
                  <div key={label} className={`${color} rounded-2xl p-4 flex items-center gap-3`}>
                    <i className={`ti ${icon} text-[20px]`} />
                    <div>
                      <p className="text-[20px] font-black leading-none">{value}</p>
                      <p className="text-[11px] font-medium mt-0.5 opacity-80">{label}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Seat occupancy bar */}
              <div className="bg-[#EAF4FB] rounded-2xl p-5 mb-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-[13px] font-bold text-[#0D1B2A]">Seat occupancy</p>
                    <p className="text-[11px] text-[#7A90A4] mt-0.5">
                      {(flight.totalSeats || 0) - (flight.availableSeats || 0)} booked of {flight.totalSeats} total
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[28px] font-black text-[#1565C0] leading-none">
                      {flight.totalSeats
                        ? `${Math.round(((flight.totalSeats - flight.availableSeats) / flight.totalSeats) * 100)}%`
                        : "0%"}
                    </p>
                    <p className="text-[11px] text-[#7A90A4]">filled</p>
                  </div>
                </div>
                <div className="h-3 bg-white rounded-full overflow-hidden">
                  <div className="h-full bg-[#1565C0] rounded-full transition-all duration-700"
                    style={{ width: flight.totalSeats ? `${Math.round(((flight.totalSeats - flight.availableSeats) / flight.totalSeats) * 100)}%` : "0%" }}
                  />
                </div>
              </div>

              {/* Booking records table */}
              {bookingsLoading ? (
                <div className="flex items-center justify-center py-12 gap-3">
                  <div className="w-6 h-6 border-[3px] border-[#EAF4FB] border-t-[#1565C0] rounded-full animate-spin" />
                  <span className="text-[13px] text-[#7A90A4]">Loading bookings...</span>
                </div>
              ) : bookings.length === 0 ? (
                <div className="text-center py-10 bg-[#F7FAFD] border border-[#EAF4FB] rounded-2xl">
                  <i className="ti ti-ticket text-[36px] text-[#D0E6F7] block mb-2" />
                  <p className="text-[13px] font-semibold text-[#7A90A4]">No bookings found</p>
                  <p className="text-[11px] text-[#B0C4D8] mt-1">
                    {bookingFilter !== "all" ? `No ${bookingFilter} bookings for this flight` : "This flight has no bookings yet"}
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px]">
                      <thead>
                        <tr>
                          {["Passenger", "Ref", "Seats", "Class", "Passengers", "Amount", "Booking", "Payment"].map((h) => (
                            <th key={h} className="text-[10px] font-semibold text-[#7A90A4] uppercase tracking-[0.5px] pb-3 text-left pr-4 whitespace-nowrap">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {bookings.map((b) => (
                          <tr key={b._id}>
                            {/* Passenger */}
                            <td className="py-3 pr-4 border-t border-[#EAF4FB] align-middle">
                              <div className="flex items-center gap-2.5">
                                <Avatar name={b.passengerId?.name || "?"} size="sm" />
                                <div className="min-w-0">
                                  <p className="text-[12px] font-semibold text-[#0D1B2A] truncate max-w-[120px]">
                                    {b.passengerId?.name || "—"}
                                  </p>
                                  <p className="text-[10px] text-[#7A90A4] truncate max-w-[120px]">
                                    {b.passengerId?.email || "—"}
                                  </p>
                                </div>
                              </div>
                            </td>
                            {/* Ref */}
                            <td className="py-3 pr-4 border-t border-[#EAF4FB] align-middle">
                              <span className="text-[11px] font-black text-[#1565C0] tracking-wide">{b.bookingReference}</span>
                            </td>
                            {/* Seats */}
                            <td className="py-3 pr-4 border-t border-[#EAF4FB] align-middle">
                              <div className="flex flex-wrap gap-1">
                                {b.seats?.map((s) => (
                                  <span key={s} className="text-[10px] font-bold bg-[#EAF4FB] text-[#1565C0] px-1.5 py-0.5 rounded-md">
                                    {s}
                                  </span>
                                ))}
                              </div>
                            </td>
                            {/* Class */}
                            <td className="py-3 pr-4 border-t border-[#EAF4FB] align-middle">
                              <span className="text-[11px] font-semibold text-[#7A90A4]">
                                {CLASS_LABEL[b.seatClass] || b.seatClass}
                              </span>
                            </td>
                            {/* Passenger count */}
                            <td className="py-3 pr-4 border-t border-[#EAF4FB] align-middle">
                              <span className="text-[12px] font-semibold text-[#0D1B2A]">{b.passengerCount}</span>
                            </td>
                            {/* Amount */}
                            <td className="py-3 pr-4 border-t border-[#EAF4FB] align-middle">
                              <span className="text-[12px] font-bold text-[#0D1B2A]">₹{b.totalAmount?.toLocaleString()}</span>
                            </td>
                            {/* Booking status */}
                            <td className="py-3 pr-4 border-t border-[#EAF4FB] align-middle">
                              <span className={`text-[11px] font-semibold px-2.5 py-[3px] rounded-full whitespace-nowrap capitalize ${BOOKING_STATUS_CLS[b.status] || "bg-gray-100 text-gray-600"}`}>
                                {b.status}
                              </span>
                            </td>
                            {/* Payment status */}
                            <td className="py-3 pr-4 border-t border-[#EAF4FB] align-middle">
                              <span className={`text-[11px] font-semibold px-2.5 py-[3px] rounded-full whitespace-nowrap capitalize ${PAYMENT_STATUS_CLS[b.paymentStatus] || "bg-gray-100 text-gray-600"}`}>
                                {b.paymentStatus}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#EAF4FB]">
                      <p className="text-[11px] text-[#B0C4D8]">
                        Page {bookingPage} of {totalPages} · {bookingStats.total} bookings
                      </p>
                      <div className="flex items-center gap-1.5">
                        <button disabled={bookingPage === 1} onClick={() => setBookingPage((p) => p - 1)}
                          className="w-7 h-7 rounded-md border border-[#D0E6F7] bg-[#F0F7FF] flex items-center justify-center text-[#1565C0] hover:bg-[#E1EFFE] transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <i className="ti ti-chevron-left text-[13px]" />
                        </button>
                        <span className="text-[12px] text-[#7A90A4] px-1">{bookingPage} / {totalPages}</span>
                        <button disabled={bookingPage === totalPages} onClick={() => setBookingPage((p) => p + 1)}
                          className="w-7 h-7 rounded-md border border-[#D0E6F7] bg-[#F0F7FF] flex items-center justify-center text-[#1565C0] hover:bg-[#E1EFFE] transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <i className="ti ti-chevron-right text-[13px]" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* ── TIMELINE ── */}
          {tab === "timeline" && (
            <>
              <SectionTitle icon="ti-timeline" title="Flight timeline" />
              <div className="relative">
                <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-[#EAF4FB]" />
                {[
                  { label: "Flight created",        time: fmt(flight.createdAt),   icon: "ti-plus",            color: "bg-blue-100 text-blue-700",    done: true },
                  { label: "Scheduled departure",   time: fmt(flight.departureTime),icon: "ti-calendar",        color: "bg-violet-100 text-violet-700", done: new Date() >= new Date(flight.departureTime) },
                  { label: "Boarding started",      time: ["boarding","in-flight","completed"].includes(flight.status) ? "Confirmed" : "Pending", icon: "ti-door-enter", color: ["boarding","in-flight","completed"].includes(flight.status) ? "bg-violet-100 text-violet-700" : "bg-gray-100 text-gray-400", done: ["boarding","in-flight","completed"].includes(flight.status) },
                  { label: "Departed",              time: ["in-flight","completed"].includes(flight.status) ? "Confirmed" : "Pending", icon: "ti-plane-departure", color: ["in-flight","completed"].includes(flight.status) ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-400", done: ["in-flight","completed"].includes(flight.status) },
                  ...(flight.routes?.slice(1, -1).map((stop, i) => ({
                    label: `Stop ${i + 1}: ${stop}`,
                    time:  "Intermediate stop",
                    icon:  "ti-map-pin",
                    color: "bg-orange-100 text-orange-700",
                    done:  flight.currentStop && flight.routes?.indexOf(flight.currentStop) > i + 1,
                  })) || []),
                  { label: "Arrived at destination", time: flight.actualArrivalTime ? fmt(flight.actualArrivalTime) : flight.status === "completed" ? "Confirmed" : fmt(flight.arrivalTime) + " (scheduled)", icon: "ti-plane-arrival", color: flight.status === "completed" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400", done: flight.status === "completed" },
                ].map(({ label, time, icon, color, done }, i) => (
                  <div key={i} className="flex gap-4 mb-5 relative">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 relative z-10 ${done ? color : "bg-gray-100 text-gray-300"}`}>
                      <i className={`ti ${icon} text-[16px]`} />
                    </div>
                    <div className="flex-1 pt-1.5">
                      <p className={`text-[13px] font-bold ${done ? "text-[#0D1B2A]" : "text-[#B0C4D8]"}`}>{label}</p>
                      <p className={`text-[11px] mt-0.5 ${done ? "text-[#7A90A4]" : "text-[#D0E6F7]"}`}>{time}</p>
                    </div>
                    {done && <i className="ti ti-check text-green-500 text-[14px] pt-2 flex-shrink-0" />}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}