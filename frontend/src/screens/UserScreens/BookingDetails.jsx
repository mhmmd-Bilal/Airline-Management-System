// src/pages/user/BookingDetails.jsx
import { useParams, useNavigate } from "react-router-dom";
import {
  useCancelBookingMutation,
  useGetBookingByIdQuery,
} from "../../slices/bookingApiSlice";
import UserNavbar from "../../components/UserNavbar";
import { useState } from "react";

const STATUS_CLS = {
  confirmed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  completed: "bg-blue-100 text-blue-700",
  pending: "bg-orange-100 text-orange-700",
};

const FLIGHT_STATUS = {
  scheduled: "bg-slate-100 text-slate-700",
  boarding: "bg-amber-100 text-amber-700",
  delayed: "bg-red-100 text-red-700",
  "in-flight": "bg-sky-100 text-sky-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

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

function CancelModal({ booking, onClose, onConfirm, loading }) {
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
            <svg
              className="w-5 h-5 text-red-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-[#0C3060]">Cancel booking?</p>
            <p className="text-[12px] text-slate-400">
              {booking.bookingReference}
            </p>
          </div>
        </div>
        <p className="text-[13px] text-slate-500 mb-4 leading-relaxed">
          This will cancel your booking for{" "}
          <span className="font-semibold text-[#0C3060]">
            {booking.flightId?.source} → {booking.flightId?.destination}
          </span>
          . A refund will be initiated to your original payment method.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for cancellation (optional)"
          className="w-full h-20 px-3 py-2 text-[13px] text-[#0C3060] bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#0C3060] resize-none mb-4"
        />
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 h-10 border border-slate-200 bg-white text-slate-600 rounded-xl text-[13px] font-semibold cursor-pointer hover:bg-slate-50 transition"
          >
            Keep booking
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={loading}
            className="flex-1 h-10 bg-red-500 hover:bg-red-600 text-white rounded-xl text-[13px] font-bold border-none cursor-pointer disabled:opacity-60 transition"
          >
            {loading ? "Cancelling..." : "Yes, cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BookingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cancelTarget, setCancelTarget] = useState(null);

  const { data, isLoading, isError } = useGetBookingByIdQuery(id);
  const [cancelBooking, { isLoading: cancelling }] = useCancelBookingMutation();

  const booking = data?.data;
  const flight = booking?.flightId;

  const handleCancel = async (reason) => {
    try {
      await cancelBooking({ id: cancelTarget._id, reason }).unwrap();
      setCancelTarget(null);
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <UserNavbar />
        <div className="w-11/12 mx-auto py-10">
          <div className="bg-white rounded-3xl h-96 animate-pulse" />
        </div>
      </div>
    );
  }

  if (isError || !booking) {
    return (
      <div className="min-h-screen bg-slate-50">
        <UserNavbar />
        <div className="w-11/12 mx-auto py-20 text-center">
          <p className="text-red-500 font-semibold">Failed to load booking</p>
        </div>
      </div>
    );
  }

  const progressSteps = ["scheduled", "boarding", "in-flight", "completed"];

  const currentIndex = progressSteps.indexOf(flight?.status);

  return (
    <div className="min-h-screen bg-slate-50">
      <UserNavbar />

      <div className="w-11/12 mx-auto py-8">
        {/* Top */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <button
              onClick={() => navigate(-1)}
              className="text-sm text-slate-400 hover:text-[#0C3060] cursor-pointer mb-2"
            >
              ← Back
            </button>

            <h1 className="text-3xl font-black text-[#0C3060]">
              Booking Details
            </h1>

            <p className="text-slate-400 text-sm mt-1">
              {booking.bookingReference}
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <span
              className={`px-4 py-2 rounded-full text-xs font-bold capitalize ${STATUS_CLS[booking.status]}`}
            >
              {booking.status}
            </span>

            <span
              className={`px-4 py-2 rounded-full text-xs font-bold capitalize ${FLIGHT_STATUS[flight?.status]}`}
            >
              {flight?.status}
            </span>
          </div>
        </div>

        {/* Hero Flight Card */}
        <div className="bg-gradient-to-r from-[#0C3060] to-[#18457A] rounded-3xl p-8 text-white mb-6 overflow-hidden relative">
          <div className="absolute right-0 top-0 w-72 h-72 bg-white/5 rounded-full blur-3xl" />

          <div className="relative z-10">
            <div className="flex items-center justify-between flex-wrap gap-5">
              <div>
                <p className="text-white/70 text-sm mb-1">Flight Number</p>
                <h2 className="text-4xl font-black">{flight?.flightNumber}</h2>
              </div>

              <div className="text-right">
                <p className="text-white/70 text-sm mb-1">Booking Date</p>
                <p className="font-semibold">{fmt(booking.createdAt)}</p>
              </div>
            </div>

            <div className="mt-10 flex items-center justify-between gap-5 flex-wrap">
              <div>
                <p className="text-5xl font-black">{flight?.source}</p>
                <p className="text-white/70 mt-1">Departure</p>
              </div>

              <div className="flex-1 px-4 min-w-[180px]">
                <div className="relative">
                  <div className="h-1 bg-white/20 rounded-full" />

                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#0C3060] shadow-xl">
                      ✈
                    </div>
                  </div>
                </div>

                <div className="flex justify-between mt-3 text-xs text-white/70">
                  <span>{fmt(flight?.departureTime)}</span>
                  <span>{fmt(flight?.arrivalTime)}</span>
                </div>
              </div>

              <div className="text-right">
                <p className="text-5xl font-black">{flight?.destination}</p>
                <p className="text-white/70 mt-1">Arrival</p>
              </div>
            </div>
          </div>
        </div>

        {/* Flight Progress */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-black text-[#0C3060]">
                Flight Progress
              </h3>

              <p className="text-sm text-slate-400 mt-1">
                Current flight journey status
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            {progressSteps.map((step, index) => {
              const active = currentIndex >= index;

              return (
                <div
                  key={step}
                  className="flex-1 flex flex-col items-center relative"
                >
                  {index !== progressSteps.length - 1 && (
                    <div
                      className={`absolute top-5 left-1/2 w-full h-1 ${
                        currentIndex > index ? "bg-[#0C3060]" : "bg-slate-200"
                      }`}
                    />
                  )}

                  <div
                    className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-4
                    ${
                      active
                        ? "bg-[#0C3060] border-[#0C3060] text-white"
                        : "bg-white border-slate-200 text-slate-400"
                    }`}
                  >
                    {index + 1}
                  </div>

                  <p
                    className={`mt-3 text-xs font-bold capitalize text-center
                    ${active ? "text-[#0C3060]" : "text-slate-400"}`}
                  >
                    {step}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Booking */}
          <div className="bg-white rounded-3xl border border-slate-100 p-6">
            <h3 className="text-lg font-black text-[#0C3060] mb-5">
              Booking Information
            </h3>

            <div className="space-y-4">
              {[
                ["Booking Ref", booking.bookingReference],
                ["Passengers", booking.passengerCount],
                ["Class", booking.seatClass],
                ["Seats", booking.seats?.join(", ")],
                ["Amount", `₹${booking.totalAmount}`],
                ["Payment", booking.paymentStatus],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between border-b border-slate-100 pb-3"
                >
                  <span className="text-slate-400 text-sm">{label}</span>

                  <span className="font-bold text-[#0C3060] capitalize">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Flight */}
          <div className="bg-white rounded-3xl border border-slate-100 p-6">
            <h3 className="text-lg font-black text-[#0C3060] mb-5">
              Flight Information
            </h3>

            <div className="space-y-4">
              {[
                ["Departure", fmt(flight?.departureTime)],
                ["Arrival", fmt(flight?.arrivalTime)],
                ["Current Stop", flight?.currentStop || "In Route"],
                ["Routes", flight?.routes?.join(" → ") || "Direct"],
                ["Available Seats", flight?.availableSeats],
                ["Status", flight?.status],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between border-b border-slate-100 pb-3"
                >
                  <span className="text-slate-400 text-sm">{label}</span>

                  <span className="font-bold text-[#0C3060] text-right max-w-[60%] capitalize">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Aircraft */}
          <div className="bg-white rounded-3xl border border-slate-100 p-6">
            <h3 className="text-lg font-black text-[#0C3060] mb-5">
              Aircraft Details
            </h3>

            <div className="flex items-center justify-center py-6">
              <div className="w-28 h-28 rounded-full bg-[#EAF2FB] flex items-center justify-center">
                <svg
                  className="w-14 h-14 text-[#0C3060]"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                </svg>
              </div>
            </div>

            <div className="space-y-4">
              {[
                ["Aircraft", flight?.aircraftId?.model || "Assigned"],
                ["Registration", flight?.aircraftId?.registrationNumber || "—"],
                ["Capacity", flight?.aircraftId?.capacity || "—"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between border-b border-slate-100 pb-3"
                >
                  <span className="text-slate-400 text-sm">{label}</span>

                  <span className="font-bold text-[#0C3060]">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Section */}
          <div className="mt-6 bg-white rounded-3xl border border-slate-100 p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-xl font-black text-[#0C3060]">
                  Booking Actions
                </h3>

                <p className="text-sm text-slate-400 mt-1">
                  Manage your booking and refund options
                </p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {/* Refund Status */}
                {booking.paymentStatus === "refunded" && (
                  <button
                    disabled
                    className="h-11 px-5 rounded-2xl bg-green-50 text-green-700 text-sm font-bold border border-green-200 cursor-default"
                  >
                    Refund Completed
                  </button>
                )}

                {/* Cancel Button */}
                {booking.status === "confirmed" &&
                  new Date(flight?.departureTime) >
                    new Date(Date.now() + 2 * 3600000) && (
                    <button
                      className="h-11 px-5 rounded-2xl bg-red-50 hover:bg-red-100 text-red-600 text-sm font-bold border border-red-200 cursor-pointer transition-all"
                      onClick={() => setCancelTarget(booking)}
                    >
                      Cancel Booking
                    </button>
                  )}
              </div>
            </div>
          </div>
        </div>

        {/* Cancellation */}
        {booking.status === "cancelled" && (
          <div className="mt-6 bg-red-50 border border-red-100 rounded-3xl p-6">
            <h3 className="text-red-600 font-black text-lg mb-2">
              Booking Cancelled
            </h3>

            <p className="text-sm text-red-500">{booking.cancellationReason}</p>

            <p className="text-xs text-red-400 mt-2">
              Cancelled at: {fmt(booking.cancelledAt)}
            </p>
          </div>
        )}
      </div>

      {cancelTarget && (
        <CancelModal
          booking={cancelTarget}
          onClose={() => setCancelTarget(null)}
          onConfirm={handleCancel}
          loading={cancelling}
        />
      )}
    </div>
  );
}
