import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  useGetFlightByIdQuery,
  useUpdateFlightMutation,
} from "../../slices/flightApiSlice";

import {
  Card,
  Badge,
  InfoRow,
  MiniRoute,
} from "../../components/crew/CrewShared";

import { statusBadgeMap, fmt } from "../../components/crew/crewConstants";

const STATUS_OPTIONS = [
  "scheduled",
  "boarding",
  "in-flight",
  "completed",
  "delayed",
  "cancelled",
];

export default function CrewFlightDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, refetch } = useGetFlightByIdQuery(id);

  const [updateFlight, { isLoading: updating }] = useUpdateFlightMutation();
  // const { data: bookingData, isLoading: bookingsLoading } =
  //   useGetBookingsByFlightIdQuery(
  //     { flightId: id, status: bookingFilter, page: bookingPage, limit: 10 },
  //     { skip: tab !== "bookings" }, // only fetch when on bookings tab
  //   );

  // const bookings = bookingData?.data ?? [];

  const flight = data?.data;

  const [status, setStatus] = useState("");
  const [currentStop, setCurrentStop] = useState("");

  useMemo(() => {
    if (flight) {
      setStatus(flight.status || "");
      setCurrentStop(flight.currentStop || "");
    }
  }, [flight]);

  if (isLoading) {
    return (
      <div className="p-8">
        <Card className="p-10 text-center">Loading flight details...</Card>
      </div>
    );
  }

  if (!flight) {
    return (
      <div className="p-8">
        <Card className="p-10 text-center">Flight not found</Card>
      </div>
    );
  }

  const badge = statusBadgeMap[flight.status] || {
    label: flight.status,
    cls: "bg-gray-100 text-gray-600",
  };

  const progress = (() => {
    const routes = flight.routes || [];

    if (flight.status === "completed") return 100;

    const currentIndex = routes.findIndex(
      (r) => String(r).toLowerCase() === String(currentStop).toLowerCase(),
    );

    if (currentIndex === -1) return 0;

    return Math.round((currentIndex / (routes.length - 1)) * 100);
  })();

  const handleUpdate = async () => {
    try {
      await updateFlight({
        id: flight._id,
        status,
        currentStop,
      }).unwrap();

      refetch();
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div className="p-5 md:p-7">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[11px] font-semibold text-[#5A7089] uppercase tracking-[0.8px]">
            Flight details
          </p>

          <h1 className="text-[28px] font-bold text-[#0D1B2A] mt-1">
            {flight.flightNumber}
          </h1>
        </div>

        <button
          onClick={() => navigate(-1)}
          className="h-10 px-4 rounded-xl bg-[#F0F7FF] border border-[#D0E6F7] text-[#1565C0] text-[13px] font-semibold hover:bg-[#E1EFFE] transition cursor-pointer"
        >
          Back
        </button>
      </div>

      {/* Top Card */}
      <Card className="p-6 mb-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[32px] font-bold text-[#0D1B2A]">
              {flight.source}
            </p>

            <p className="text-[12px] text-[#7A90A4]">Departure</p>
          </div>

          <div className="flex flex-col items-center gap-2">
            <i className="ti ti-plane text-[#1565C0] text-[28px]" />

            <Badge label={badge.label} cls={badge.cls} />
          </div>

          <div className="text-right">
            <p className="text-[32px] font-bold text-[#0D1B2A]">
              {flight.destination}
            </p>

            <p className="text-[12px] text-[#7A90A4]">Arrival</p>
          </div>
        </div>

        <MiniRoute
          routes={flight.routes}
          currentStop={currentStop}
          status={status}
          progress={progress}
        />
      </Card>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Flight Info */}
        <div className="lg:col-span-2">
          <Card className="p-5">
            <p className="text-[13px] font-bold text-[#0D1B2A] mb-4">
              Flight information
            </p>

            {[
              ["Flight Number", flight.flightNumber],
              ["Departure", fmt(flight.departureTime)],
              ["Arrival", fmt(flight.arrivalTime)],
              ["Aircraft", flight.aircraftId?.registrationNumber || "—"],
              ["Aircraft Model", flight.aircraftId?.model || "—"],
              ["Seats Available", flight.availableSeats],
              ["Current Stop", currentStop || "—"],
              ["Status", status],
            ].map(([l, v], i) => (
              <InfoRow key={l} label={l} value={v} i={i} />
            ))}
          </Card>
        </div>

        {/* Controls */}
        <div>
          <Card className="p-5 sticky top-5">
            <p className="text-[13px] font-bold text-[#0D1B2A] mb-4">
              Flight controls
            </p>

            {/* If completed or cancelled */}
            {["completed", "cancelled"].includes(flight.status) ? (
              <div className="rounded-xl border border-[#D0E6F7] bg-[#F8FBFF] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <i className="ti ti-lock text-[#1565C0] text-[18px]" />
                  <p className="text-[13px] font-bold text-[#0D1B2A]">
                    Flight Locked
                  </p>
                </div>

                <p className="text-[12px] text-[#7A90A4] leading-relaxed">
                  This flight is marked as{" "}
                  <span className="font-semibold capitalize text-[#0D1B2A]">
                    {flight.status}
                  </span>
                  . Flight controls are disabled and can no longer be updated.
                </p>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-[#7A90A4]">Current Status</span>
                    <span className="font-semibold capitalize text-[#0D1B2A]">
                      {flight.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-[#7A90A4]">Current Stop</span>
                    <span className="font-semibold text-[#0D1B2A]">
                      {flight.currentStop || "—"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-[#7A90A4]">Flight Number</span>
                    <span className="font-semibold text-[#0D1B2A]">
                      {flight.flightNumber}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Status */}
                <div className="mb-4">
                  <label className="text-[11px] font-semibold text-[#7A90A4] block mb-1.5">
                    Flight Status
                  </label>

                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full h-11 px-3 text-[13px] bg-[#F0F7FF] border border-[#D0E6F7] rounded-xl outline-none focus:border-[#1565C0]"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Stops */}
                <div className="mb-5">
                  <label className="text-[11px] font-semibold text-[#7A90A4] block mb-1.5">
                    Current Stop
                  </label>

                  <select
                    value={currentStop}
                    onChange={(e) => setCurrentStop(e.target.value)}
                    className="w-full h-11 px-3 text-[13px] bg-[#F0F7FF] border border-[#D0E6F7] rounded-xl outline-none focus:border-[#1565C0]"
                  >
                    <option value="">Select stop</option>

                    {flight.routes?.map((stop, index) => (
                      <option key={stop} value={stop}>
                        Stop {index + 1} — {stop}
                      </option>
                    ))}
                  </select>

                  {currentStop && (
                    <p className="mt-2 text-[11px] text-[#7A90A4]">
                      Current selected stop:{" "}
                      <span className="font-semibold text-[#1565C0]">
                        {currentStop}
                      </span>
                    </p>
                  )}
                </div>

                {/* Update */}
                <button
                  onClick={handleUpdate}
                  disabled={updating}
                  className="w-full h-11 rounded-xl bg-[#1565C0] hover:bg-[#1251A3] text-white text-[13px] font-bold transition disabled:opacity-60 cursor-pointer"
                >
                  {updating ? "Updating..." : "Update Flight"}
                </button>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
