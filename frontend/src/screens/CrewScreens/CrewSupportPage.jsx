// src/pages/crew/SupportPage.jsx
/*
 * Crew support view — read-only.
 *
 * Data flow (this was the bug):
 *  1. useGetMyCrewProfileQuery()          → gets crew doc (has crew._id)
 *  2. useGetFlightsByCrewIdQuery(crew._id)→ gets flights assigned to this crew
 *  3. per flight: useGetTicketsByFlightQuery(flightId) → gets tickets
 *
 * Previously the page passed `undefined` as the crewId because it was using
 * userData._id (the user _id) instead of the crew document's _id.
 * The flight's `crewIds` array holds crew document _ids, not user _ids.
 */
import { useState } from "react";
import { useSelector } from "react-redux";
import { useGetMyCrewProfileQuery } from "../../slices/crewApiSlice";
import { useGetFlightsByCrewIdQuery } from "../../slices/flightApiSlice";
import { useGetTicketsByFlightQuery } from "../../slices/supportApiSlice";

/* -------------------------------------------------------------------------- */
/*                               CONSTANTS                                    */
/* -------------------------------------------------------------------------- */

const STATUS_CFG = {
  open:          { label: "Open",        cls: "bg-blue-50 text-blue-700 border border-blue-100"   },
  "in-progress": { label: "In Progress", cls: "bg-amber-50 text-amber-700 border border-amber-100"},
  resolved:      { label: "Resolved",    cls: "bg-green-50 text-green-700 border border-green-100"},
  closed:        { label: "Closed",      cls: "bg-slate-100 text-slate-500 border border-slate-200"},
};

const PRIORITY_CFG = {
  low:    { label: "Low",    cls: "bg-slate-100 text-slate-500",    icon: "↓" },
  medium: { label: "Medium", cls: "bg-blue-50 text-blue-600",       icon: "—" },
  high:   { label: "High",   cls: "bg-orange-50 text-orange-600",   icon: "↑" },
  urgent: { label: "Urgent", cls: "bg-red-50 text-red-600 font-bold", icon: "!" },
};

const fmt = (dt) =>
  dt
    ? new Date(dt).toLocaleString("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit", hour12: true,
      })
    : "—";

/* -------------------------------------------------------------------------- */
/*              FLIGHT TICKET LIST — one per assigned flight                  */
/* -------------------------------------------------------------------------- */

function FlightTickets({ flightId, flight }) {
  const [filter, setFilter] = useState("all");
  const { data, isLoading } = useGetTicketsByFlightQuery({ flightId, status: filter });
  const tickets = data?.data ?? [];
  const total   = data?.total ?? 0;

  const flightLabel = `${flight.flightNumber} · ${flight.source} → ${flight.destination}`;

  /* Flight status badge */
  const flightStatusCls = {
    scheduled:  "bg-blue-50 text-blue-700",
    boarding:   "bg-violet-50 text-violet-700",
    "in-flight":"bg-indigo-50 text-indigo-700",
    delayed:    "bg-orange-50 text-orange-700",
    arrived:    "bg-green-50 text-green-700",
    completed:  "bg-green-50 text-green-700",
  }[flight.status] ?? "bg-slate-100 text-slate-500";

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden mb-4">
      {/* Flight header */}
      <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#EAF2FB] rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-[#0C3060]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-[#0C3060] text-sm">{flightLabel}</p>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${flightStatusCls}`}>
                {flight.status}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {new Date(flight.departureTime).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" })}
              {" · "}{total} ticket{total !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5">
          {["all","open","in-progress","resolved","closed"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition border-none cursor-pointer
                ${filter === f ? "bg-[#0C3060] text-white" : "text-slate-400 hover:text-[#0C3060] bg-transparent"}`}
            >
              {f === "in-progress" ? "Active" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Ticket list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8 gap-2">
          <div className="w-5 h-5 border-4 border-[#0C3060] border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-400 text-[13px]">Loading tickets…</span>
        </div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-slate-300 text-[32px] mb-2">🎫</p>
          <p className="text-slate-400 text-[13px]">No {filter !== "all" ? filter : ""} tickets for this flight</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-50">
          {tickets.map((t) => (
            <div key={t._id} className="px-5 py-4 hover:bg-slate-50 transition">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* Ticket meta badges */}
                  <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                    <p className="text-[11px] font-bold text-slate-400">{t.ticketNumber}</p>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_CFG[t.status]?.cls}`}>
                      {STATUS_CFG[t.status]?.label}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-0.5 ${PRIORITY_CFG[t.priority]?.cls}`}>
                      <span>{PRIORITY_CFG[t.priority]?.icon}</span>
                      {PRIORITY_CFG[t.priority]?.label}
                    </span>
                    <span className="text-[10px] text-slate-400 capitalize bg-slate-100 px-2 py-0.5 rounded-full">
                      {t.category}
                    </span>
                  </div>

                  {/* Subject */}
                  <p className="text-[13px] font-semibold text-[#0C3060] truncate mb-0.5">{t.subject}</p>

                  {/* Raised by + time */}
                  <p className="text-[11px] text-slate-400">
                    {t.raisedBy?.name ?? "Passenger"} · {fmt(t.createdAt)}
                  </p>

                  {/* Last message preview */}
                  {t.messages?.length > 0 && (
                    <p className="text-[11px] text-slate-400 mt-1.5 italic truncate max-w-lg">
                      "{t.messages[t.messages.length - 1]?.message}"
                    </p>
                  )}
                </div>

                {/* Right side */}
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <span className="text-[11px] text-slate-400">
                    {t.messages?.length ?? 0} msg{t.messages?.length !== 1 ? "s" : ""}
                  </span>
                  <span className="text-[9px] font-bold bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full uppercase tracking-wide">
                    Read only
                  </span>
                  {/* Urgent indicator */}
                  {t.priority === "urgent" && (
                    <span className="text-[9px] font-bold bg-red-50 text-red-500 px-2 py-0.5 rounded-full uppercase tracking-wide animate-pulse">
                      Urgent
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                         FLIGHT LIST WITH TICKETS                           */
/* -------------------------------------------------------------------------- */

function CrewFlightList({ crewId }) {
  /*
   * Pass crewId (the crew document _id, NOT user _id) to get flights.
   * The flights.crewIds array stores crew document _ids.
   */
  const { data: flightsData, isLoading: flightsLoading } = useGetFlightsByCrewIdQuery(
    { crewId },
    { skip: !crewId },
  );

  const allFlights = flightsData?.data ?? [];

  /* Show active flights only — cancelled/completed have no actionable tickets */
  const activeFlights = allFlights.filter(
    (f) => !["cancelled", "completed"].includes(f.status),
  );

  /* Also show recently completed flights (last 48h) for reference */
  const recentCompleted = allFlights.filter(
    (f) =>
      f.status === "completed" &&
      new Date(f.arrivalTime) > new Date(Date.now() - 48 * 3600000),
  );

  const displayFlights = [...activeFlights, ...recentCompleted];

  if (flightsLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse">
            <div className="h-4 bg-slate-100 rounded w-48 mb-2" />
            <div className="h-5 bg-slate-100 rounded w-72" />
          </div>
        ))}
      </div>
    );
  }

  if (displayFlights.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
        <div className="w-14 h-14 bg-[#EAF2FB] rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-[#0C3060]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
          </svg>
        </div>
        <p className="text-[#0C3060] font-bold mb-1">No active flights</p>
        <p className="text-slate-400 text-sm">You have no active or recent flight assignments</p>
      </div>
    );
  }

  return (
    <>
      {activeFlights.length > 0 && (
        <>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">
            Active flights ({activeFlights.length})
          </p>
          {activeFlights.map((f) => (
            <FlightTickets key={f._id} flightId={f._id} flight={f} />
          ))}
        </>
      )}

      {recentCompleted.length > 0 && (
        <>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 mt-5">
            Recently completed (last 48h)
          </p>
          {recentCompleted.map((f) => (
            <FlightTickets key={f._id} flightId={f._id} flight={f} />
          ))}
        </>
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*                              MAIN PAGE                                     */
/* -------------------------------------------------------------------------- */

export default function CrewSupportPage() {
  const { userData } = useSelector((s) => s.auth);

  /*
   * Step 1 — get the crew document for the logged-in user.
   * We need crew._id (not userData._id) because flights store crew doc _ids
   * in their crewIds array, not user _ids.
   */
  const {
    data:      crewData,
    isLoading: crewLoading,
    isError:   crewError,
  } = useGetMyCrewProfileQuery(undefined, { skip: !userData?._id });

  const crewDoc = crewData?.data;
  const crewId  = crewDoc?._id;   // ← this is what getFlightsByCrewId needs

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <div className="w-11/12 mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#0C3060]">Flight Support Tickets</h1>
            <p className="text-slate-400 text-sm mt-0.5">
              Passenger support tickets for your assigned flights — read only
            </p>
          </div>

          {/* Crew profile chip */}
          {crewDoc && (
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2">
              <div className="w-7 h-7 rounded-full bg-[#EAF2FB] flex items-center justify-center text-[#0C3060] text-[11px] font-bold flex-shrink-0">
                {crewDoc.userId?.name?.charAt(0) ?? "C"}
              </div>
              <div>
                <p className="text-[12px] font-bold text-[#0C3060]">{crewDoc.userId?.name}</p>
                <p className="text-[10px] text-slate-400">{crewDoc.role} · {crewDoc.employeeId}</p>
              </div>
            </div>
          )}
        </div>

        {/* Info banner */}
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-6">
          <svg className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p className="text-[12px] text-blue-700 leading-relaxed">
            These are passenger complaints and support requests linked to your flights.
            For urgent tickets, contact the operations admin directly.
          </p>
        </div>

        {/* States */}
        {crewLoading ? (
          <div className="flex flex-col gap-3">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse">
                <div className="h-4 bg-slate-100 rounded w-48 mb-2" />
                <div className="h-5 bg-slate-100 rounded w-72" />
              </div>
            ))}
          </div>
        ) : crewError ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
            <p className="text-red-400 font-semibold mb-1">Could not load crew profile</p>
            <p className="text-slate-400 text-sm">Make sure your crew profile is set up by an admin</p>
          </div>
        ) : !crewId ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
            <p className="text-[#0C3060] font-bold mb-1">No crew profile found</p>
            <p className="text-slate-400 text-sm">Contact your admin to set up your crew profile</p>
          </div>
        ) : (
          /* Step 2 + 3 happen inside CrewFlightList */
          <CrewFlightList crewId={crewId} />
        )}
      </div>
    </div>
  );
}