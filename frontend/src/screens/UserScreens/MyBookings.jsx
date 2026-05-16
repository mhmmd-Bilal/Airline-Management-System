// src/pages/user/MyBookings.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGetMyBookingsQuery, useCancelBookingMutation } from "../../slices/bookingApiSlice";
import UserNavbar from "../../components/UserNavbar";

const STATUS_CLS = {
  confirmed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  completed: "bg-blue-100 text-blue-800",
  pending:   "bg-orange-100 text-orange-800",
};

const PAYMENT_CLS = {
  paid:     "bg-green-100 text-green-700",
  pending:  "bg-orange-100 text-orange-700",
  refunded: "bg-blue-100 text-blue-700",
  failed:   "bg-red-100 text-red-700",
};

const fmt = (dt) =>
  dt ? new Date(dt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true }) : "—";

function CancelModal({ booking, onClose, onConfirm, loading }) {
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          </div>
          <div>
            <p className="font-bold text-[#0C3060]">Cancel booking?</p>
            <p className="text-[12px] text-slate-400">{booking.bookingReference}</p>
          </div>
        </div>
        <p className="text-[13px] text-slate-500 mb-4 leading-relaxed">
          This will cancel your booking for <span className="font-semibold text-[#0C3060]">{booking.flightId?.source} → {booking.flightId?.destination}</span>.
          A refund will be initiated to your original payment method.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for cancellation (optional)"
          className="w-full h-20 px-3 py-2 text-[13px] text-[#0C3060] bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#0C3060] resize-none mb-4"
        />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 h-10 border border-slate-200 bg-white text-slate-600 rounded-xl text-[13px] font-semibold cursor-pointer hover:bg-slate-50 transition">
            Keep booking
          </button>
          <button onClick={() => onConfirm(reason)} disabled={loading}
            className="flex-1 h-10 bg-red-500 hover:bg-red-600 text-white rounded-xl text-[13px] font-bold border-none cursor-pointer disabled:opacity-60 transition"
          >
            {loading ? "Cancelling..." : "Yes, cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MyBookings() {
  const navigate    = useNavigate();
  const [cancelTarget, setCancelTarget] = useState(null);
  const [filter,       setFilter]       = useState("all");

  const { data, isLoading, isError } = useGetMyBookingsQuery();
  const [cancelBooking, { isLoading: cancelling }] = useCancelBookingMutation();

  const bookings = (data?.data ?? []).filter((b) =>
    filter === "all" ? true : b.status === filter
  );

  const handleCancel = async (reason) => {
    try {
      await cancelBooking({ id: cancelTarget._id, reason }).unwrap();
      setCancelTarget(null);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Navbar */}
    <UserNavbar/>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#0C3060]">My Bookings</h1>
            <p className="text-slate-400 text-sm mt-0.5">{data?.data?.length ?? 0} booking{data?.data?.length !== 1 ? "s" : ""} total</p>
          </div>
          {/* Filter */}
          <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1">
            {["all","confirmed","completed","cancelled"].map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold capitalize transition border-none cursor-pointer
                  ${filter === f ? "bg-[#0C3060] text-white" : "text-slate-500 hover:text-[#0C3060] bg-transparent"}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-3">
            {[1,2,3].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse">
                <div className="h-4 bg-slate-100 rounded w-40 mb-3" />
                <div className="h-6 bg-slate-100 rounded w-64" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="text-center py-16 text-slate-400">Failed to load bookings</div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-[#EAF2FB] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[#0C3060]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
            </div>
            <p className="text-[#0C3060] font-bold text-lg mb-1">No bookings found</p>
            <p className="text-slate-400 text-sm mb-5">Your upcoming trips will appear here</p>
            <button onClick={() => navigate("/")}
              className="h-11 px-6 bg-[#0C3060] text-white rounded-xl font-bold text-sm border-none cursor-pointer hover:bg-[#0a2550] transition"
            >
              Search flights
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {bookings.map((b) => {
              const flight = b.flightId;
              const canCancel = b.status === "confirmed" &&
                flight && new Date(flight.departureTime) > new Date(Date.now() + 2 * 3600000);

              return (
                <div key={b._id} className="bg-white rounded-2xl border border-slate-100 hover:border-slate-200 transition overflow-hidden">
                  {/* Header */}
                  <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Booking</p>
                      <p className="text-sm font-black text-[#0C3060] tracking-wide">{b.bookingReference}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_CLS[b.status]}`}>
                        {b.status}
                      </span>
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize ${PAYMENT_CLS[b.paymentStatus]}`}>
                        {b.paymentStatus}
                      </span>
                    </div>
                  </div>

                  <div className="p-5">
                    {/* Flight route */}
                    {flight ? (
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-10 h-10 bg-[#EAF2FB] rounded-xl flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 text-[#0C3060]" viewBox="0 0 24 24" fill="currentColor"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-bold text-[#0C3060] text-sm">{flight.flightNumber}</p>
                            <span className="text-slate-300">·</span>
                            <p className="text-sm text-slate-600">{flight.source} → {flight.destination}</p>
                          </div>
                          <p className="text-[12px] text-slate-400">{fmt(flight.departureTime)} → {fmt(flight.arrivalTime)}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-slate-400 text-sm mb-4">Flight details unavailable</p>
                    )}

                    {/* Booking details row */}
                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-[12px] mb-4">
                      {[
                        ["Seats",      b.seats?.join(", ")],
                        ["Class",      b.seatClass?.charAt(0).toUpperCase() + b.seatClass?.slice(1)],
                        ["Passengers", b.passengerCount],
                        ["Amount",     "₹" + b.totalAmount?.toLocaleString()],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <span className="text-slate-400">{label}: </span>
                          <span className="font-semibold text-[#0C3060]">{value}</span>
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => navigate(`/bookings/${b._id}`)}
                        className="h-9 px-4 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-lg text-[12px] font-semibold cursor-pointer transition"
                      >
                        View details
                      </button>
                      {canCancel && (
                        <button onClick={() => setCancelTarget(b)}
                          className="h-9 px-4 border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-[12px] font-semibold cursor-pointer transition"
                        >
                          Cancel booking
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
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