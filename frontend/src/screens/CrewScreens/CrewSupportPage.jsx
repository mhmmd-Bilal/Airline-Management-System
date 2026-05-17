// src/pages/crew/SupportPage.jsx
/*
 * Crew support view — read-only.
 * Crew can see tickets raised against flights they are assigned to.
 * They cannot reply or change status — that is admin's responsibility.
 * This gives crew situational awareness (e.g. passenger complaints about a flight).
 */
import { useState } from "react";
import { useGetFlightsByCrewIdQuery } from "../../slices/flightApiSlice";
import { useGetTicketsByFlightQuery } from "../../slices/supportApiSlice";
import { useSelector } from "react-redux";

/* -------------------------------------------------------------------------- */
/*                               CONSTANTS                                    */
/* -------------------------------------------------------------------------- */

const STATUS_CFG = {
  open:          { label: "Open",        cls: "bg-blue-50 text-blue-700"   },
  "in-progress": { label: "In Progress", cls: "bg-amber-50 text-amber-700" },
  resolved:      { label: "Resolved",    cls: "bg-green-50 text-green-700" },
  closed:        { label: "Closed",      cls: "bg-slate-100 text-slate-500"},
};
const PRIORITY_CFG = {
  low:    { label: "Low",    cls: "bg-slate-100 text-slate-500"  },
  medium: { label: "Medium", cls: "bg-blue-50 text-blue-600"    },
  high:   { label: "High",   cls: "bg-orange-50 text-orange-600" },
  urgent: { label: "Urgent", cls: "bg-red-50 text-red-600 font-bold" },
};

const fmt = (dt) =>
  dt ? new Date(dt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true }) : "—";

/* -------------------------------------------------------------------------- */
/*                       FLIGHT TICKET LIST COMPONENT                        */
/* -------------------------------------------------------------------------- */

function FlightTickets({ flightId, flightNumber }) {
  const [filter, setFilter] = useState("all");
  const { data, isLoading } = useGetTicketsByFlightQuery({ flightId, status: filter });
  const tickets = data?.data ?? [];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden mb-4">
      {/* Flight header */}
      <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#EAF2FB] rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-[#0C3060]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
            </svg>
          </div>
          <p className="font-bold text-[#0C3060] text-sm">{flightNumber}</p>
          <span className="text-slate-300">·</span>
          <p className="text-[12px] text-slate-500">{data?.total ?? 0} ticket{data?.total !== 1 ? "s" : ""}</p>
        </div>
        {/* Filter */}
        <div className="flex gap-1 bg-white border border-slate-200 rounded-lg p-0.5">
          {["all","open","in-progress","resolved"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 rounded-md text-[10px] font-semibold capitalize transition border-none cursor-pointer
                ${filter === f ? "bg-[#0C3060] text-white" : "text-slate-400 hover:text-[#0C3060] bg-transparent"}`}
            >
              {f === "in-progress" ? "Active" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-4 border-[#0C3060] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-[13px]">No tickets for this flight</div>
      ) : (
        <div className="divide-y divide-slate-50">
          {tickets.map((t) => (
            <div key={t._id} className="px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="text-[11px] font-bold text-slate-400">{t.ticketNumber}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_CFG[t.status]?.cls}`}>
                      {STATUS_CFG[t.status]?.label}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PRIORITY_CFG[t.priority]?.cls}`}>
                      {PRIORITY_CFG[t.priority]?.label}
                    </span>
                  </div>
                  <p className="text-[13px] font-semibold text-[#0C3060] truncate">{t.subject}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {t.raisedBy?.name ?? "Passenger"} · {t.category} · {fmt(t.createdAt)}
                  </p>
                  {/* Last message preview */}
                  {t.messages?.length > 0 && (
                    <p className="text-[11px] text-slate-400 mt-1 italic truncate">
                      "{t.messages[t.messages.length - 1]?.message}"
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-[11px] text-slate-400">{t.messages?.length ?? 0} msg</span>
                  {/* Read-only badge */}
                  <span className="text-[9px] font-bold bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full uppercase tracking-wide">
                    Read only
                  </span>
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
/*                              MAIN PAGE                                     */
/* -------------------------------------------------------------------------- */

export default function CrewSupportPage() {
  const { userData } = useSelector((s) => s.auth);

  /* Get all flights this crew member is assigned to */
  const { data: flightsData, isLoading: flightsLoading } = useGetFlightsByCrewIdQuery(
    undefined,
    { skip: !userData?._id }
  );

  const flights = (flightsData?.data ?? []).filter(
    (f) => !["cancelled", "completed"].includes(f.status)
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <div className=" mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#0C3060]">Flight Support Tickets</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Passenger support tickets raised for your active flights — read only
          </p>
        </div>

        {/* Info banner */}
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-6">
          <svg className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p className="text-[12px] text-blue-700 leading-relaxed">
            These are passenger complaints and support requests linked to your flights.
            Contact the operations admin to act on any urgent ticket.
          </p>
        </div>

        {flightsLoading ? (
          <div className="flex flex-col gap-3">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse">
                <div className="h-4 bg-slate-100 rounded w-40 mb-2" />
                <div className="h-5 bg-slate-100 rounded w-64" />
              </div>
            ))}
          </div>
        ) : flights.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
            <div className="w-14 h-14 bg-[#EAF2FB] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-[#0C3060]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
              </svg>
            </div>
            <p className="text-[#0C3060] font-bold mb-1">No active flights</p>
            <p className="text-slate-400 text-sm">You have no active flight assignments right now</p>
          </div>
        ) : (
          flights.map((f) => (
            <FlightTickets
              key={f._id}
              flightId={f._id}
              flightNumber={`${f.flightNumber} · ${f.source} → ${f.destination}`}
            />
          ))
        )}
      </div>
    </div>
  );
}