// src/pages/crew/CrewFlights.jsx
import { useState } from "react";
import { useSelector } from "react-redux";
import { useGetFlightsByCrewIdQuery } from "../../slices/flightApiSlice";
import {
  useGetMyCrewProfileQuery,
} from "../../slices/crewApiSlice";
import {
  FlightCard,
  Card,
  InfoRow,
  MiniRoute,
  Badge,
} from "../../components/crew/CrewShared";
import { statusBadgeMap, fmt } from "../../components/crew/crewConstants";
import { useNavigate } from "react-router-dom";

const resolveCrewName = (c) => c?.userId?.name ?? "—";

const STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "scheduled", label: "Scheduled" },
  { key: "boarding", label: "Boarding" },
  { key: "in-flight", label: "In Flight" },
  { key: "completed", label: "Completed" },
  { key: "delayed", label: "Delayed" },
  { key: "cancelled", label: "Cancelled" },
];

// ── Progress calculation ───────────────────────────────
const getFlightProgress = (flight) => {
  const routes = flight?.routes || [];

  if (flight.status === "completed") return 100;
  if (["scheduled", "cancelled", "delayed"].includes(flight.status)) return 0;

  // no multi-stop routes — use time-based progress
  if (routes.length <= 1) {
    const dep = new Date(flight.departureTime);
    const arr = new Date(flight.arrivalTime);
    const now = new Date();
    const total = arr - dep;
    const elapsed = now - dep;
    if (total <= 0) return 0;
    return Math.min(99, Math.max(0, Math.round((elapsed / total) * 100)));
  }

  const currentIndex = routes.findIndex(
    (r) =>
      String(r).trim().toLowerCase() ===
      String(flight.currentStop || "")
        .trim()
        .toLowerCase(),
  );

  if (currentIndex === -1) return 5;
  if (currentIndex === routes.length - 1) return 100;
  return Math.round((currentIndex / (routes.length - 1)) * 100);
};

// ── Modal ──────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#D0E6F7]">
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

// ── Main ───────────────────────────────────────────────
export default function CrewFlights() {
  const { userData } = useSelector((s) => s.auth);

  const [viewFlight, setViewFlight] = useState(null);
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);

  const navigate = useNavigate();

  const { data: crewData, isLoading: crewLoading } = useGetMyCrewProfileQuery();

  const crew = crewData?.data;
  const crewId = crew?._id;

  const {
    data: flightData,
    isLoading: flightLoading,
    isFetching,
  } = useGetFlightsByCrewIdQuery(
    { crewId, status: filter, page, limit: 10 },
    { skip: !crewId },
  );

  const flights = flightData?.data ?? [];
  const total = flightData?.total ?? 0;
  const totalPages = flightData?.totalPages ?? 1;
  const isLoading = crewLoading || flightLoading;

  return (
    <div className="p-5 md:p-7">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <p className="text-[11px] font-semibold text-[#5A7089] uppercase tracking-[0.8px]">
          Assigned flights ({total})
        </p>

        {/* Status filter tabs */}
        <div className="flex gap-1 bg-white border border-[#D0E6F7] rounded-xl p-1 overflow-x-auto">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => {
                setFilter(f.key);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition border-none cursor-pointer
                ${
                  filter === f.key
                    ? "bg-[#1565C0] text-white"
                    : "text-[#7A90A4] hover:text-[#0D1B2A] hover:bg-[#F0F7FF] bg-transparent"
                }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <Card className="p-8 text-center text-[13px] text-[#7A90A4]">
          Loading flights...
        </Card>
      ) : !crewId ? (
        <Card className="p-10 text-center">
          <i className="ti ti-user-off text-[36px] text-[#D0E6F7] block mb-3" />
          <p className="text-[13px] text-[#7A90A4]">Crew profile not found</p>
        </Card>
      ) : flights.length === 0 ? (
        <Card className="p-10 text-center">
          <i className="ti ti-plane-off text-[36px] text-[#D0E6F7] block mb-3" />
          <p className="text-[13px] text-[#7A90A4]">
            No {filter !== "all" ? filter : ""} flights found
          </p>
        </Card>
      ) : (
        <>
          <div
            className={`flex flex-col gap-3 transition-opacity ${isFetching ? "opacity-60" : "opacity-100"}`}
          >
            {flights.map((f) => (
              <FlightCard
                key={f._id}
                flight={f}
                onClick={() => navigate(`/crew/flights/${f._id}`)}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-5">
              <p className="text-[11px] text-[#B0C4D8]">
                Showing {flights.length} of {total} flights
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="w-7 h-7 rounded-md border border-[#D0E6F7] bg-[#F0F7FF] flex items-center justify-center text-[#1565C0] hover:bg-[#E1EFFE] transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <i className="ti ti-chevron-left text-[13px]" />
                </button>
                <span className="text-[12px] text-[#7A90A4] px-1">
                  {page} / {totalPages}
                </span>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="w-7 h-7 rounded-md border border-[#D0E6F7] bg-[#F0F7FF] flex items-center justify-center text-[#1565C0] hover:bg-[#E1EFFE] transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <i className="ti ti-chevron-right text-[13px]" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Flight detail modal */}
      {viewFlight &&
        (() => {
          const b = statusBadgeMap[viewFlight.status] || {
            label: viewFlight.status,
            cls: "bg-gray-100 text-gray-600",
          };
          const crewNames =
            viewFlight.crewIds
              ?.map(resolveCrewName)
              .filter(Boolean)
              .join(", ") || "—";
          const progress = getFlightProgress(viewFlight);

          return (
            <Modal
              title={`Flight — ${viewFlight.flightNumber}`}
              onClose={() => setViewFlight(null)}
            >
              {/* Origin / Destination header */}
              <div className="flex items-center justify-between bg-[#EAF4FB] rounded-xl px-5 py-4 mb-4">
                <div className="text-center">
                  <p className="text-[28px] font-bold text-[#0D1B2A] leading-none">
                    {viewFlight.routes?.[0] || viewFlight.source}
                  </p>
                  <p className="text-[11px] text-[#7A90A4] mt-1">
                    {viewFlight.source}
                  </p>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <i className="ti ti-plane text-[#1565C0] text-[22px]" />
                  <Badge label={b.label} cls={b.cls} />
                </div>
                <div className="text-center">
                  <p className="text-[28px] font-bold text-[#0D1B2A] leading-none">
                    {viewFlight.routes?.[viewFlight.routes.length - 1] ||
                      viewFlight.destination}
                  </p>
                  <p className="text-[11px] text-[#7A90A4] mt-1">
                    {viewFlight.destination}
                  </p>
                </div>
              </div>

              <MiniRoute
                routes={viewFlight.routes}
                status={viewFlight.status}
                currentStop={viewFlight.currentStop}
                progress={progress}
              />

              <div className="mt-4">
                {[
                  ["Departure", fmt(viewFlight.departureTime)],
                  ["Arrival", fmt(viewFlight.arrivalTime)],
                  [
                    "Actual arrival",
                    viewFlight.actualArrivalTime
                      ? fmt(viewFlight.actualArrivalTime)
                      : "—",
                  ],
                  [
                    "Aircraft",
                    viewFlight.aircraftId?.registrationNumber || "—",
                  ],
                  ["Model", viewFlight.aircraftId?.model || "—"],
                  [
                    "Available seats",
                    viewFlight.availableSeats === 0
                      ? "Full"
                      : String(viewFlight.availableSeats),
                  ],
                  ["Current stop", viewFlight.currentStop || "—"],
                  ["Progress", `${progress}%`],
                  [
                    "Stops",
                    viewFlight.routes?.length > 2
                      ? `${viewFlight.routes.length - 2} intermediate`
                      : "Non-stop",
                  ],
                  ["Crew", crewNames],
                ].map(([l, v], i) => (
                  <InfoRow key={l} label={l} value={v} i={i} />
                ))}
              </div>

              <button
                onClick={() => setViewFlight(null)}
                className="mt-5 w-full h-10 bg-[#F0F7FF] border border-[#D0E6F7] text-[#1565C0] text-[13px] font-semibold rounded-xl hover:bg-[#E1EFFE] transition cursor-pointer"
              >
                Close
              </button>
            </Modal>
          );
        })()}
    </div>
  );
}
