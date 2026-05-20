// src/pages/user/BookingDetails.jsx
import { useParams, useNavigate } from "react-router-dom";
import { useGetBookingByIdQuery } from "../../slices/bookingApiSlice";
import { useRequestRefundMutation, useGetMyRefundsQuery } from "../../slices/refundApiSlice";
import UserNavbar from "../../components/UserNavbar";
import { useState } from "react";

const STATUS_CLS = {
  confirmed: "bg-green-100 text-green-700",
  cancelled:  "bg-red-100 text-red-700",
  completed:  "bg-blue-100 text-blue-700",
  pending:    "bg-orange-100 text-orange-700",
};

const FLIGHT_STATUS = {
  scheduled:   "bg-slate-100 text-slate-700",
  boarding:    "bg-amber-100 text-amber-700",
  delayed:     "bg-red-100 text-red-700",
  "in-flight": "bg-sky-100 text-sky-700",
  completed:   "bg-green-100 text-green-700",
  cancelled:   "bg-red-100 text-red-700",
};

const REFUND_STATUS_CFG = {
  pending:   { label: "Refund Pending",   cls: "bg-amber-50 border-amber-200",  text: "text-amber-700",  icon: "⏳", desc: "Your refund request is under review. We'll notify you once processed."  },
  approved:  { label: "Refund Approved",  cls: "bg-blue-50 border-blue-200",    text: "text-blue-700",   icon: "✅", desc: "Your refund has been approved and is being processed."                   },
  processed: { label: "Refund Processed", cls: "bg-green-50 border-green-200",  text: "text-green-700",  icon: "💚", desc: "Your refund has been credited. Please allow 5–7 business days to reflect." },
  rejected:  { label: "Refund Rejected",  cls: "bg-red-50 border-red-200",      text: "text-red-600",    icon: "❌", desc: "Your refund request was not approved. Please contact support for details." },
};

const fmt = (dt) =>
  dt ? new Date(dt).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  }) : "—";

const fmtDate = (dt) =>
  dt ? new Date(dt).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  }) : "—";


/* ── Refund request modal ──────────────────────────── */
function RefundModal({ booking, onClose, onConfirm, loading }) {
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
            </svg>
          </div>
          <div>
            <p className="font-bold text-[#0C3060]">Cancel & Request a refund</p>
            <p className="text-[12px] text-slate-400">{booking.bookingReference}</p>
          </div>
        </div>

        {/* Amount highlight */}
        <div className="bg-[#EAF2FB] rounded-2xl p-4 mb-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Refund amount</p>
            <p className="text-2xl font-black text-[#0C3060]">₹{booking.totalAmount?.toLocaleString()}</p>
          </div>
          <div className="text-right text-[12px] text-slate-400">
            <p>{booking.seats?.join(", ")}</p>
            <p className="capitalize">{booking.seatClass}</p>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Additional reason <span className="normal-case font-normal text-slate-300">(optional)</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Any additional context for your refund request…"
            className="w-full h-20 px-3 py-2.5 text-[13px] text-[#0C3060] bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#0C3060] resize-none"
          />
        </div>

        <p className="text-[11px] text-slate-400 mb-4 leading-relaxed">
          Refund requests are reviewed within 1–2 business days. Once approved, credits take 5–7 business days.
        </p>

        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 h-10 border border-slate-200 bg-white text-slate-600 rounded-xl text-[13px] font-semibold cursor-pointer hover:bg-slate-50 transition">
            Cancel
          </button>
          <button onClick={() => onConfirm(reason)} disabled={loading}
            className="flex-1 h-10 bg-[#0C3060] hover:bg-[#0a2550] text-white rounded-xl text-[13px] font-bold border-none cursor-pointer disabled:opacity-60 transition">
            {loading ? "Submitting..." : "Submit request"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main page ─────────────────────────────────────── */
export default function BookingDetails() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const [cancelTarget,  setCancelTarget]  = useState(null);
  const [refundModal,   setRefundModal]   = useState(false);
  const [refundSuccess, setRefundSuccess] = useState(false);

  const { data, isLoading, isError, refetch } = useGetBookingByIdQuery(id);
  const { data: myRefundsData }               = useGetMyRefundsQuery();
  const [requestRefund,  { isLoading: refunding  }] = useRequestRefundMutation();

  const booking = data?.data;
  const flight  = booking?.flightId;

  // find any refund linked to this booking
  const refund = (myRefundsData?.data ?? []).find(
    (r) => String(r.bookingId?._id ?? r.bookingId) === String(booking?._id)
  );

  const handleRefundRequest = async (reason) => {
    try {
      await requestRefund({ bookingId: booking._id, reason }).unwrap();
      setRefundModal(false);
      setRefundSuccess(true);
      refetch();
    } catch (err) { console.error(err); }
  };

  if (isLoading) return (
    <div className="min-h-screen bg-slate-50">
      <UserNavbar />
      <div className="w-11/12 mx-auto py-10">
        <div className="bg-white rounded-3xl h-96 animate-pulse" />
      </div>
    </div>
  );

  if (isError || !booking) return (
    <div className="min-h-screen bg-slate-50">
      <UserNavbar />
      <div className="w-11/12 mx-auto py-20 text-center">
        <p className="text-red-500 font-semibold">Failed to load booking</p>
      </div>
    </div>
  );

  const progressSteps   = ["scheduled", "boarding", "in-flight", "completed"];
  const currentIndex    = progressSteps.indexOf(flight?.status);
  const canCancel       = booking.status === "confirmed" &&
    new Date(flight?.departureTime) > new Date(Date.now() + 2 * 3600000);

  return (
    <div className="min-h-screen bg-slate-50">
      <UserNavbar />

      <div className="w-11/12 mx-auto py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <button onClick={() => navigate(-1)} className="text-sm text-slate-400 hover:text-[#0C3060] cursor-pointer mb-2">
              ← Back
            </button>
            <h1 className="text-3xl font-black text-[#0C3060]">Booking Details</h1>
            <p className="text-slate-400 text-sm mt-1">{booking.bookingReference}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <span className={`px-4 py-2 rounded-full text-xs font-bold capitalize ${STATUS_CLS[booking.status]}`}>
              {booking.status}
            </span>
            <span className={`px-4 py-2 rounded-full text-xs font-bold capitalize ${FLIGHT_STATUS[flight?.status]}`}>
              {flight?.status}
            </span>
          </div>
        </div>

        {/* Hero flight card */}
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
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#0C3060] shadow-xl">✈</div>
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

        {/* Flight progress */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 mb-6">
          <h3 className="text-xl font-black text-[#0C3060] mb-2">Flight Progress</h3>
          <p className="text-sm text-slate-400 mb-8">Current flight journey status</p>
          <div className="flex items-center justify-between gap-2">
            {progressSteps.map((step, index) => {
              const active = currentIndex >= index;
              return (
                <div key={step} className="flex-1 flex flex-col items-center relative">
                  {index !== progressSteps.length - 1 && (
                    <div className={`absolute top-5 left-1/2 w-full h-1 ${currentIndex > index ? "bg-[#0C3060]" : "bg-slate-200"}`} />
                  )}
                  <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-4
                    ${active ? "bg-[#0C3060] border-[#0C3060] text-white" : "bg-white border-slate-200 text-slate-400"}`}>
                    {index + 1}
                  </div>
                  <p className={`mt-3 text-xs font-bold capitalize text-center ${active ? "text-[#0C3060]" : "text-slate-400"}`}>
                    {step}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Details grid */}
        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          {/* Booking info */}
          <div className="bg-white rounded-3xl border border-slate-100 p-6">
            <h3 className="text-lg font-black text-[#0C3060] mb-5">Booking Information</h3>
            <div className="space-y-4">
              {[
                ["Booking Ref",  booking.bookingReference],
                ["Passengers",  booking.passengerCount],
                ["Class",       booking.seatClass],
                ["Seats",       booking.seats?.join(", ")],
                ["Amount",      `₹${booking.totalAmount?.toLocaleString()}`],
                ["Payment",     booking.paymentStatus],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="text-slate-400 text-sm">{label}</span>
                  <span className="font-bold text-[#0C3060] capitalize">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Flight info */}
          <div className="bg-white rounded-3xl border border-slate-100 p-6">
            <h3 className="text-lg font-black text-[#0C3060] mb-5">Flight Information</h3>
            <div className="space-y-4">
              {[
                ["Departure",       fmt(flight?.departureTime)],
                ["Arrival",         fmt(flight?.arrivalTime)],
                ["Current Stop",    flight?.currentStop || "In Route"],
                ["Routes",          flight?.routes?.join(" → ") || "Direct"],
                ["Available Seats", flight?.availableSeats],
                ["Status",          flight?.status],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="text-slate-400 text-sm">{label}</span>
                  <span className="font-bold text-[#0C3060] text-right max-w-[60%] capitalize">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Aircraft info */}
          <div className="bg-white rounded-3xl border border-slate-100 p-6">
            <h3 className="text-lg font-black text-[#0C3060] mb-5">Aircraft Details</h3>
            <div className="flex items-center justify-center py-6">
              <div className="w-28 h-28 rounded-full bg-[#EAF2FB] flex items-center justify-center">
                <svg className="w-14 h-14 text-[#0C3060]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
                </svg>
              </div>
            </div>
            <div className="space-y-4">
              {[
                ["Aircraft",      flight?.aircraftId?.model || "Assigned"],
                ["Registration",  flight?.aircraftId?.registrationNumber || "—"],
                ["Capacity",      flight?.aircraftId?.capacity || "—"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="text-slate-400 text-sm">{label}</span>
                  <span className="font-bold text-[#0C3060]">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Booking actions ── */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-xl font-black text-[#0C3060]">Booking Actions</h3>
              <p className="text-sm text-slate-400 mt-1">Manage your booking and refund options</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {canCancel && (
                <button
                  onClick={() => setRefundModal(true)}
                  className="h-11 px-5 rounded-2xl bg-[#0C3060] hover:bg-[#0a2550] text-white text-sm font-bold border-none cursor-pointer transition"
                >
                  Cancel & Request Refund
                </button>
              )}
              {booking.status === "confirmed" && !canCancel && (
                <span className="text-[12px] text-slate-400 bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl">
                  Cannot cancel within 2 hours of departure
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Cancellation notice ── */}
        {booking.status === "cancelled" && (
          <div className="mb-6 bg-red-50 border border-red-100 rounded-3xl p-6">
            <h3 className="text-red-600 font-black text-lg mb-2">Booking Cancelled</h3>
            <p className="text-sm text-red-500">{booking.cancellationReason || "Cancelled by passenger"}</p>
            <p className="text-xs text-red-400 mt-2">Cancelled at: {fmt(booking.cancelledAt)}</p>
          </div>
        )}

        {/* ── Refund status section ── */}
        {booking.status === "cancelled" && (
          <div className="mb-6">

            {/* No refund requested yet */}
            {!refund && !refundSuccess && booking.paymentStatus === "paid" && (
              <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 flex items-start gap-4">
                <div className="w-11 h-11 rounded-2xl bg-amber-100 flex items-center justify-center flex-shrink-0 text-xl">⚠️</div>
                <div className="flex-1">
                  <h3 className="font-black text-amber-800 text-lg mb-1">Refund not requested yet</h3>
                  <p className="text-sm text-amber-600 leading-relaxed mb-4">
                    Your booking has been cancelled but you haven't submitted a refund request.
                    Click below to request your refund of{" "}
                    <span className="font-bold">₹{booking.totalAmount?.toLocaleString()}</span>.
                  </p>
                  <button
                    onClick={() => setRefundModal(true)}
                    className="h-10 px-5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold rounded-2xl border-none cursor-pointer transition"
                  >
                    Request Refund
                  </button>
                </div>
              </div>
            )}

            {/* Refund just submitted */}
            {refundSuccess && !refund && (
              <div className="bg-blue-50 border border-blue-200 rounded-3xl p-6 flex items-start gap-4">
                <div className="w-11 h-11 rounded-2xl bg-blue-100 flex items-center justify-center flex-shrink-0 text-xl">📨</div>
                <div>
                  <h3 className="font-black text-blue-800 text-lg mb-1">Refund request submitted!</h3>
                  <p className="text-sm text-blue-600 leading-relaxed">
                    We've received your refund request. Our team will review it within 1–2 business days and notify you.
                  </p>
                </div>
              </div>
            )}

            {/* Existing refund — show status */}
            {refund && (() => {
              const cfg = REFUND_STATUS_CFG[refund.status] ?? REFUND_STATUS_CFG.pending;
              return (
                <div className={`border rounded-3xl p-6 ${cfg.cls}`}>
                  <div className="flex items-start justify-between flex-wrap gap-4 mb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-white/60 flex items-center justify-center text-xl flex-shrink-0">
                        {cfg.icon}
                      </div>
                      <div>
                        <h3 className={`font-black text-xl ${cfg.text}`}>{cfg.label}</h3>
                        <p className={`text-sm mt-0.5 ${cfg.text} opacity-80`}>{cfg.desc}</p>
                      </div>
                    </div>

                    {/* Refund amount */}
                    <div className="bg-white rounded-2xl px-5 py-4 border border-white/60 min-w-[160px] text-right">
                      <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-1">Refund amount</p>
                      <p className="text-3xl font-black text-[#0C3060]">
                        ₹{refund.amount?.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="bg-white/50 rounded-2xl p-4">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">Refund timeline</p>
                    <div className="flex flex-col gap-2.5">
                      {[
                        {
                          label:  "Refund requested",
                          time:   fmt(refund.createdAt),
                          done:   true,
                          icon:   "📋",
                        },
                        {
                          label:  "Under review",
                          time:   refund.status !== "pending" ? "Reviewed" : "Pending",
                          done:   refund.status !== "pending",
                          icon:   "🔍",
                        },
                        {
                          label:  refund.status === "rejected" ? "Refund rejected" : "Refund processed",
                          time:   refund.processedAt ? fmt(refund.processedAt) : "Awaiting",
                          done:   !!refund.processedAt,
                          icon:   refund.status === "rejected" ? "❌" : "✅",
                        },
                        {
                          label:  "Credited to account",
                          time:   refund.status === "processed"
                            ? `Expected by ${fmtDate(new Date(new Date(refund.processedAt).getTime() + 7 * 86400000))}`
                            : "After processing",
                          done:   false,
                          icon:   "🏦",
                        },
                      ].filter((s) => !(refund.status === "rejected" && s.label === "Credited to account"))
                       .map(({ label, time, done, icon }, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] flex-shrink-0
                            ${done ? "bg-white shadow-sm" : "bg-white/30"}`}>
                            {icon}
                          </div>
                          <div className="flex-1 flex items-center justify-between gap-2">
                            <span className={`text-[13px] font-semibold ${done ? cfg.text : "text-slate-400"}`}>
                              {label}
                            </span>
                            <span className="text-[11px] text-slate-400 text-right">{time}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Rejection note */}
                  {refund.status === "rejected" && refund.reason && (
                    <div className="mt-3 bg-white/60 rounded-xl px-4 py-3 flex items-start gap-2">
                      <span className="text-[13px]">📝</span>
                      <div>
                        <p className="text-[11px] font-bold text-red-700 uppercase tracking-wider mb-0.5">Admin note</p>
                        <p className="text-[12px] text-red-600">{refund.reason}</p>
                      </div>
                    </div>
                  )}

                  {/* Contact support if rejected */}
                  {refund.status === "rejected" && (
                    <div className="mt-3 flex items-center gap-3">
                      <a href="/support"
                        className="h-9 px-4 bg-white text-red-600 text-[12px] font-bold rounded-xl border border-red-200 cursor-pointer hover:bg-red-50 transition flex items-center"
                      >
                        Contact support
                      </a>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Already refunded via payment status (legacy) */}
            {!refund && booking.paymentStatus === "refunded" && (
              <div className="bg-green-50 border border-green-100 rounded-3xl p-6 flex items-start justify-between flex-wrap gap-4">
                <div>
                  <h3 className="text-green-700 font-black text-xl mb-2">Refund Processed</h3>
                  <p className="text-green-600 text-sm leading-relaxed">
                    Your refund has been processed and credited to your original payment method.
                  </p>
                </div>
                <div className="bg-white rounded-2xl px-5 py-4 border border-green-100 min-w-[160px]">
                  <p className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">Refunded Amount</p>
                  <p className="text-3xl font-black text-[#0C3060]">₹{booking.totalAmount?.toLocaleString()}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modals ── */}

      {refundModal && (
        <RefundModal
          booking={booking}
          onClose={() => setRefundModal(false)}
          onConfirm={handleRefundRequest}
          loading={refunding}
        />
      )}
    </div>
  );
}