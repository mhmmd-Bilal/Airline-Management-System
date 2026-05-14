import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import {
  useLazyGetFlightsByCrewIdQuery,
} from "../../slices/flightApiSlice";

import {
  FlightCard,
  Card,
  InfoRow,
  MiniRoute,
  Badge,
} from "../../components/crew/CrewShared";

import {
  statusBadgeMap,
  fmt,
} from "../../components/crew/crewConstants";

import { useGetCrewByIdQuery } from "../../slices/crewApiSlice";

const resolveCrewName = (c) => c?.userId?.name ?? "—";

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#D0E6F7]">
          <p className="text-[14px] font-bold text-[#0D1B2A]">
            {title}
          </p>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-[#D0E6F7] bg-[#F0F7FF] flex items-center justify-center text-[#1565C0] hover:bg-[#E1EFFE] transition cursor-pointer"
          >
            <i className="ti ti-x text-[15px]" />
          </button>
        </div>

        <div className="px-6 py-5 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function CrewFlights() {
  const { userData } = useSelector((s) => s.auth);

  const [viewFlight, setViewFlight] = useState(null);
  const [filter, setFilter] = useState("all");

  const { data } = useGetCrewByIdQuery(userData?._id);

  const crew = data?.data;

  const [getFlightsByCrewId, { data: flightData, isLoading }] =
    useLazyGetFlightsByCrewIdQuery();

  useEffect(() => {
    if (crew?._id) {
      getFlightsByCrewId({ crewId: crew._id });
    }
  }, [crew?._id]);

  const allFlights = (flightData?.data ?? []).filter((f) =>
    f.crewIds?.some(
      (c) => String(c?._id ?? c) === String(crew?._id),
    ),
  );

  const filtered =
    filter === "all"
      ? allFlights
      : allFlights.filter((f) => f.status === filter);

  const statusFilters = [
    { key: "all", label: "All" },
    { key: "scheduled", label: "Scheduled" },
    { key: "boarding", label: "Boarding" },
    { key: "in-flight", label: "In Flight" },
    { key: "completed", label: "Completed" },
    { key: "delayed", label: "Delayed" },
    { key: "cancelled", label: "Cancelled" },
  ];

  // ==========================
  // STRICT PROGRESS CALCULATION
  // ==========================
  const getFlightProgress = (flight) => {
    const routes = flight?.routes || [];

    // Completed always 100
    if (flight.status === "completed") {
      return 100;
    }

    // Not started statuses
    if (
      ["scheduled", "cancelled", "delayed"].includes(
        flight.status,
      )
    ) {
      return 0;
    }

    // No route handling
    if (routes.length <= 1) {
      const dep = new Date(flight.departureTime);
      const arr = new Date(flight.arrivalTime);
      const now = new Date();

      const total = arr - dep;
      const elapsed = now - dep;

      if (total <= 0) return 0;

      return Math.min(
        99,
        Math.max(
          0,
          Math.round((elapsed / total) * 100),
        ),
      );
    }

    // Find current stop index
    const currentIndex = routes.findIndex(
      (r) =>
        String(r).trim().toLowerCase() ===
        String(flight.currentStop || "")
          .trim()
          .toLowerCase(),
    );

    // Stop not found
    if (currentIndex === -1) {
      return 5;
    }

    const lastIndex = routes.length - 1;

    // ONLY LAST STOP = 100%
    if (currentIndex === lastIndex) {
      return 100;
    }

    // Mid stop calculation
    return Math.round(
      (currentIndex / lastIndex) * 100,
    );
  };

  return (
    <div className="p-5 md:p-7">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <p className="text-[11px] font-semibold text-[#5A7089] uppercase tracking-[0.8px]">
          All assigned flights ({allFlights.length})
        </p>

        {/* Filters */}
        <div className="flex gap-1 bg-white border border-[#D0E6F7] rounded-xl p-1 overflow-x-auto">
          {statusFilters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
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

      {/* Loading */}
      {isLoading ? (
        <Card className="p-8 text-center text-[13px] text-[#7A90A4]">
          Loading...
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center">
          <i className="ti ti-plane-off text-[36px] text-[#D0E6F7] block mb-3" />

          <p className="text-[13px] text-[#7A90A4]">
            No flights found
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((f) => (
            <FlightCard
              key={f._id}
              flight={f}
              onClick={() => setViewFlight(f)}
            />
          ))}
        </div>
      )}

      {/* Modal */}
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

          return (
            <Modal
              title={`Flight — ${viewFlight.flightNumber}`}
              onClose={() => setViewFlight(null)}
            >
              {/* Top Section */}
              <div className="flex items-center justify-between bg-[#EAF4FB] rounded-xl px-5 py-4 mb-4">
                <div className="text-center">
                  <p className="text-[28px] font-bold text-[#0D1B2A] leading-none">
                    {viewFlight.routes?.[0] ||
                      viewFlight.source}
                  </p>

                  <p className="text-[11px] text-[#7A90A4] mt-1">
                    {viewFlight.source}
                  </p>
                </div>

                <div className="flex flex-col items-center gap-2">
                  <i className="ti ti-plane text-[#1565C0] text-[22px]" />

                  <Badge
                    label={b.label}
                    cls={b.cls}
                  />
                </div>

                <div className="text-center">
                  <p className="text-[28px] font-bold text-[#0D1B2A] leading-none">
                    {viewFlight.routes?.[
                      viewFlight.routes.length - 1
                    ] || viewFlight.destination}
                  </p>

                  <p className="text-[11px] text-[#7A90A4] mt-1">
                    {viewFlight.destination}
                  </p>
                </div>
              </div>

              {/* Route Visual */}
              <MiniRoute
                routes={viewFlight.routes}
                status={viewFlight.status}
                currentStop={viewFlight.currentStop}
                progress={getFlightProgress(viewFlight)}
              />

              {/* Flight Info */}
              <div className="mt-4">
                {[
                  [
                    "Departure",
                    fmt(viewFlight.departureTime),
                  ],

                  [
                    "Arrival",
                    fmt(viewFlight.arrivalTime),
                  ],

                  [
                    "Aircraft",
                    viewFlight.aircraftId
                      ?.registrationNumber || "—",
                  ],

                  [
                    "Model",
                    viewFlight.aircraftId?.model || "—",
                  ],

                  [
                    "Available seats",
                    viewFlight.availableSeats === 0
                      ? "Full"
                      : String(
                          viewFlight.availableSeats,
                        ),
                  ],

                  [
                    "Current stop",
                    viewFlight.currentStop || "—",
                  ],

                  [
                    "Progress",
                    `${getFlightProgress(
                      viewFlight,
                    )}%`,
                  ],

                  [
                    "Stops",
                    viewFlight.routes?.length > 2
                      ? `${
                          viewFlight.routes.length - 2
                        } intermediate`
                      : "Non-stop",
                  ],

                  ["Crew", crewNames],
                ].map(([l, v], i) => (
                  <InfoRow
                    key={l}
                    label={l}
                    value={v}
                    i={i}
                  />
                ))}
              </div>

              {/* Close */}
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