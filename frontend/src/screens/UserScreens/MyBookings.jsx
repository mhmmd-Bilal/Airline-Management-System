// src/pages/user/MyBookings.jsx
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  useGetMyBookingsQuery,
  useCancelBookingMutation,
  triggerPdfDownload,
} from "../../slices/bookingApiSlice";
import UserNavbar from "../../components/UserNavbar";

/* -------------------------------------------------------------------------- */
/*                               CONSTANTS                                    */
/* -------------------------------------------------------------------------- */

const BASE = "/api/bookings";

const STATUS_CLS = {
  confirmed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  completed: "bg-blue-100 text-blue-800",
  pending: "bg-orange-100 text-orange-800",
};

const PAYMENT_CLS = {
  paid: "bg-green-100 text-green-700",
  pending: "bg-orange-100 text-orange-700",
  refunded: "bg-blue-100 text-blue-700",
  failed: "bg-red-100 text-red-700",
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

/* -------------------------------------------------------------------------- */
/*                           CANCEL MODAL                                     */
/* -------------------------------------------------------------------------- */


/* -------------------------------------------------------------------------- */
/*                        DOWNLOAD DROPDOWN                                   */
/* -------------------------------------------------------------------------- */

function DownloadDropdown({ booking, getState }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(null);
  const [done, setDone] = useState(null);
  const [error, setError] = useState("");
  const ref = useRef(null);

  /* Close on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /*
   * Build the passenger list for boarding pass items.
   *
   * ROOT CAUSE FIX:
   * `booking.passengers` is a subdocument array stored directly on the
   * booking document — it is NOT a ref. It always comes back from the API.
   * However if it arrives as undefined/empty (e.g. older bookings or API
   * projection issues), we fall back to passengerCount to still render
   * the correct number of boarding pass download buttons.
   */
  const passengerList =
    Array.isArray(booking.passengers) && booking.passengers.length > 0
      ? booking.passengers
      : Array.from({ length: booking.passengerCount ?? 1 }, (_, i) => ({
          name: `Passenger ${i + 1}`,
        }));

  /* One boarding pass entry per passenger + e-ticket + invoice */
  const items = [
    ...passengerList.map((pax, i) => ({
      key: `bp-${i}`,
      icon: "🎫",
      label: `Boarding Pass — ${pax.name}`,
      sub: `Seat ${booking.seats?.[i] ?? "—"}`,
      url: `${BASE}/${booking._id}/download/boarding-pass?passenger=${i}`,
      filename: `boarding-pass-${pax.name.replace(/\s+/g, "-")}-${booking.bookingReference}.pdf`,
    })),
    {
      key: "ticket",
      icon: "🎟️",
      label: "E-Ticket",
      sub: `All ${passengerList.length} passenger${passengerList.length > 1 ? "s" : ""}`,
      url: `${BASE}/${booking._id}/download/ticket`,
      filename: `e-ticket-${booking.bookingReference}.pdf`,
    },
    {
      key: "invoice",
      icon: "🧾",
      label: "Invoice / Receipt",
      sub: `₹${booking.totalAmount?.toLocaleString()}`,
      url: `${BASE}/${booking._id}/download/invoice`,
      filename: `invoice-${booking.bookingReference}.pdf`,
    },
  ];

  const handleDownload = async (item) => {
    setLoading(item.key);
    setError("");
    try {
      await triggerPdfDownload(item.url, item.filename, getState);
      setDone(item.key);
      setTimeout(() => setDone(null), 3000);
    } catch (err) {
      setError(err.message ?? "Download failed");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="relative" ref={ref}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`h-9 px-3 flex items-center gap-1.5 border rounded-lg text-[12px] font-semibold cursor-pointer transition
          ${
            open
              ? "bg-[#0C3060] text-white border-[#0C3060]"
              : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
          }`}
      >
        <svg
          className="w-3.5 h-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Download
        <svg
          className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute left-0 top-full mt-2 z-[999] bg-white border border-slate-200 rounded-xl shadow-xl w-72 flex flex-col"
          style={{ maxHeight: "320px" }}
        >
          {/* Sticky header */}
          <div className="px-3 py-2.5 border-b border-slate-100 flex items-center justify-between flex-shrink-0 bg-white">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {booking.bookingReference}
            </p>
            <p className="text-[10px] text-slate-400">
              {passengerList.length} passenger
              {passengerList.length > 1 ? "s" : ""}
            </p>
          </div>

          {/* Scrollable body */}
          <div className="overflow-y-auto flex-1">
            {/* Boarding passes section label */}
            {passengerList.length > 0 && (
              <div className="px-3 pt-2 pb-1">
                <p className="text-[9px] font-bold text-slate-300 uppercase tracking-wider">
                  Boarding Passes
                </p>
              </div>
            )}

            {/* All items */}
            {items.map((item, idx) => {
              const isLoading = loading === item.key;
              const isDone = done === item.key;

              /* Divider before E-Ticket */
              const showDivider = item.key === "ticket";

              return (
                <div key={item.key}>
                  {showDivider && (
                    <div className="px-3 pt-2 pb-1 border-t border-slate-100 mt-1">
                      <p className="text-[9px] font-bold text-slate-300 uppercase tracking-wider">
                        Documents
                      </p>
                    </div>
                  )}
                  <button
                    onClick={() => handleDownload(item)}
                    disabled={!!loading}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition
                    border-b border-slate-50 last:border-0 disabled:opacity-60
                    ${isDone ? "bg-green-50" : "hover:bg-slate-50 cursor-pointer"}`}
                  >
                    {/* Status icon */}
                    <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 text-[13px]">
                      {isLoading ? (
                        <div className="w-3.5 h-3.5 border-2 border-[#0C3060] border-t-transparent rounded-full animate-spin" />
                      ) : isDone ? (
                        <svg
                          className="w-3.5 h-3.5 text-green-500"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        item.icon
                      )}
                    </div>

                    {/* Label */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-[12px] font-semibold truncate ${isDone ? "text-green-700" : "text-[#0C3060]"}`}
                      >
                        {isDone ? "Downloaded!" : item.label}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {item.sub}
                      </p>
                    </div>

                    {/* Download arrow */}
                    {!isLoading && !isDone && (
                      <svg
                        className="w-3.5 h-3.5 text-slate-300 flex-shrink-0"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
          {/* end scrollable body */}

          {/* Error — outside scroll, always visible */}
          {error && (
            <div className="px-3 py-2 bg-red-50 border-t border-red-100 flex-shrink-0">
              <p className="text-[11px] text-red-600">{error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              MAIN PAGE                                     */
/* -------------------------------------------------------------------------- */

export default function MyBookings() {
  const navigate = useNavigate();
  const store = useSelector((s) => s);
  const getState = () => store;

  const [filter, setFilter] = useState("all");

  const { data, isLoading, isError } = useGetMyBookingsQuery();

  const bookings = (data?.data ?? []).filter((b) =>
    filter === "all" ? true : b.status === filter,
  );


  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <UserNavbar />

      <div className="w-11/12 mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#0C3060]">My Bookings</h1>
            <p className="text-slate-400 text-sm mt-0.5">
              {data?.data?.length ?? 0} booking
              {data?.data?.length !== 1 ? "s" : ""} total
            </p>
          </div>
          <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1">
            {["all", "confirmed", "completed", "cancelled"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold capitalize transition border-none cursor-pointer
                  ${filter === f ? "bg-[#0C3060] text-white" : "text-slate-500 hover:text-[#0C3060] bg-transparent"}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* States */}
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse"
              >
                <div className="h-4 bg-slate-100 rounded w-40 mb-3" />
                <div className="h-6 bg-slate-100 rounded w-64" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="text-center py-16 text-slate-400">
            Failed to load bookings
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-[#EAF2FB] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-[#0C3060]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-[#0C3060] font-bold text-lg mb-1">
              No bookings found
            </p>
            <p className="text-slate-400 text-sm mb-5">
              Your upcoming trips will appear here
            </p>
            <button
              onClick={() => navigate("/")}
              className="h-11 px-6 bg-[#0C3060] text-white rounded-xl font-bold text-sm border-none cursor-pointer hover:bg-[#0a2550] transition"
            >
              Search flights
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {bookings.map((b) => {
              const flight = b.flightId;
              const canCancel =
                b.status === "confirmed" &&
                flight &&
                new Date(flight.departureTime) >
                  new Date(Date.now() + 2 * 3600000);
              const canDownload = ["confirmed", "completed"].includes(b.status);

              return (
                <div
                  key={b._id}
                  className="bg-white rounded-2xl border border-slate-100 hover:border-slate-200 transition"
                >
                  {/* Card header */}
                  <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Booking
                      </p>
                      <p className="text-sm font-black text-[#0C3060] tracking-wide">
                        {b.bookingReference}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_CLS[b.status]}`}
                      >
                        {b.status}
                      </span>
                      <span
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize ${PAYMENT_CLS[b.paymentStatus]}`}
                      >
                        {b.paymentStatus}
                      </span>
                    </div>
                  </div>

                  <div className="p-5">
                    {/* Flight route */}
                    {flight ? (
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-10 h-10 bg-[#EAF2FB] rounded-xl flex items-center justify-center flex-shrink-0">
                          <svg
                            className="w-5 h-5 text-[#0C3060]"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                          >
                            <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-bold text-[#0C3060] text-sm">
                              {flight.flightNumber}
                            </p>
                            <span className="text-slate-300">·</span>
                            <p className="text-sm text-slate-600">
                              {flight.source} → {flight.destination}
                            </p>
                          </div>
                          <p className="text-[12px] text-slate-400">
                            {fmt(flight.departureTime)} →{" "}
                            {fmt(flight.arrivalTime)}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-slate-400 text-sm mb-4">
                        Flight details unavailable
                      </p>
                    )}

                    {/* Details */}
                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-[12px] mb-4">
                      {[
                        ["Seats", b.seats?.join(", ")],
                        [
                          "Class",
                          b.seatClass?.charAt(0).toUpperCase() +
                            b.seatClass?.slice(1),
                        ],
                        ["Passengers", b.passengerCount],
                        ["Amount", "₹" + b.totalAmount?.toLocaleString()],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <span className="text-slate-400">{label}: </span>
                          <span className="font-semibold text-[#0C3060]">
                            {value}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 flex-wrap items-center">
                      <button
                        onClick={() => navigate(`/bookings/${b._id}`)}
                        className="h-9 px-4 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-lg text-[12px] font-semibold cursor-pointer transition"
                      >
                        View details
                      </button>

                      {canDownload && (
                        <DownloadDropdown booking={b} getState={getState} />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
