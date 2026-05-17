// src/pages/user/BookingSuccess.jsx
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useGetBookingByIdQuery } from "../../slices/bookingApiSlice";
import { triggerPdfDownload } from "../../slices/bookingApiSlice";

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

const BASE = "/api/bookings";

/* -------------------------------------------------------------------------- */
/*                         DOWNLOAD BUTTON COMPONENT                          */
/* -------------------------------------------------------------------------- */
function DownloadBtn({ label, icon, url, filename, getState }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handle = async () => {
    setLoading(true);
    setError("");
    try {
      await triggerPdfDownload(url, filename, getState);
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    } catch (err) {
      setError(err.message ?? "Download failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={handle}
        disabled={loading}
        className={`flex items-center justify-center gap-2 h-11 px-4 rounded-xl text-[13px] font-semibold transition border cursor-pointer w-full disabled:opacity-60
          ${
            done
              ? "bg-green-50 border-green-200 text-green-700"
              : "bg-[#EAF2FB] border-[#c5ddf5] text-[#0C3060] hover:bg-[#dbeeff]"
          }`}
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-[#0C3060] border-t-transparent rounded-full animate-spin" />
        ) : done ? (
          <svg
            className="w-4 h-4 text-green-600"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <span>{icon}</span>
        )}
        {done ? "Downloaded!" : loading ? "Generating..." : label}
      </button>
      {error && <p className="text-[11px] text-red-500 text-center">{error}</p>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              MAIN PAGE                                     */
/* -------------------------------------------------------------------------- */
export default function BookingSuccess() {
  const { id } = useParams();
  const navigate = useNavigate();
  const store = useSelector((s) => s); // pass whole store state for token
  const getState = () => store;

  const { data, isLoading } = useGetBookingByIdQuery(id);
  const booking = data?.data;
  const flight = booking?.flightId;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#0C3060] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-400">Booking not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-lg">
          {/* ── Green header ── */}
          <div className="bg-green-500 px-6 py-8 text-center">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <svg
                className="w-8 h-8 text-green-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h1 className="text-white text-2xl font-bold mb-1">
              Booking confirmed!
            </h1>
            <p className="text-green-100 text-sm">
              Documents sent to {booking.passengers[0]?.email}
            </p>
          </div>

          <div className="p-6">
            {/* Reference */}
            <div className="bg-[#EAF2FB] rounded-xl p-4 text-center mb-5">
              <p className="text-[11px] text-slate-400 uppercase tracking-wider mb-1">
                Booking reference
              </p>
              <p className="text-2xl font-black text-[#0C3060] tracking-widest">
                {booking.bookingReference}
              </p>
            </div>

            {/* Email sent notice */}
            <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5">
              <span className="text-amber-500 text-base flex-shrink-0 mt-0.5">
                📧
              </span>
              <p className="text-[12px] text-amber-800 leading-relaxed">
                Your <strong>boarding pass</strong>, <strong>e-ticket</strong>{" "}
                and <strong>invoice</strong> have been emailed to{" "}
                <span className="font-semibold">
                  {booking.passengers[0]?.email}
                </span>
                . You can also download them below.
              </p>
            </div>

            {/* Flight summary */}
            {flight && (
              <div className="flex items-center justify-between mb-5 px-2">
                <div className="text-center">
                  <p className="text-xl font-bold text-[#0C3060]">
                    {new Date(flight.departureTime).toLocaleTimeString(
                      "en-IN",
                      { hour: "2-digit", minute: "2-digit", hour12: true },
                    )}
                  </p>
                  <p className="text-xs text-slate-400">{flight.source}</p>
                </div>
                <div className="text-center flex flex-col items-center gap-1">
                  <svg
                    className="w-5 h-5 text-[#0C3060]"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                  </svg>
                  <p className="text-[10px] text-slate-400">
                    {flight.flightNumber}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-[#0C3060]">
                    {new Date(flight.arrivalTime).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </p>
                  <p className="text-xs text-slate-400">{flight.destination}</p>
                </div>
              </div>
            )}

            {/* Booking details */}
            <div className="flex flex-col gap-0 mb-5">
              {[
                ["Seats", booking.seats?.join(", ")],
                [
                  "Class",
                  booking.seatClass?.charAt(0).toUpperCase() +
                    booking.seatClass?.slice(1),
                ],
                ["Passengers", booking.passengerCount],
                ["Amount paid", "₹" + booking.totalAmount?.toLocaleString()],
                ["Date", fmt(flight?.departureTime)],
              ].map(([label, value], i) => (
                <div
                  key={label}
                  className={`flex justify-between py-2.5 ${i > 0 ? "border-t border-slate-50" : ""}`}
                >
                  <span className="text-[12px] text-slate-400">{label}</span>
                  <span className="text-[12px] font-semibold text-[#0C3060]">
                    {value}
                  </span>
                </div>
              ))}
            </div>

            {/* ── Download section ── */}
            <div className="mb-5">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                Download documents
              </p>

              {/* Boarding passes — one per passenger */}
              {booking.passengers.map((pax, i) => (
                <div key={i} className="mb-2">
                  <DownloadBtn
                    label={`Boarding Pass — ${pax.name} (Seat ${booking.seats[i] ?? "—"})`}
                    icon="🎫"
                    url={`${BASE}/${booking._id}/download/boarding-pass?passenger=${i}`}
                    filename={`boarding-pass-${pax.name.replace(/\s+/g, "-")}-${booking.bookingReference}.pdf`}
                    getState={getState}
                  />
                </div>
              ))}

              {/* E-ticket */}
              <div className="mb-2">
                <DownloadBtn
                  label="E-Ticket (all passengers)"
                  icon="🎟️"
                  url={`${BASE}/${booking._id}/download/ticket`}
                  filename={`e-ticket-${booking.bookingReference}.pdf`}
                  getState={getState}
                />
              </div>

              {/* Invoice */}
              <DownloadBtn
                label="Invoice / Receipt"
                icon="🧾"
                url={`${BASE}/${booking._id}/download/invoice`}
                filename={`invoice-${booking.bookingReference}.pdf`}
                getState={getState}
              />
            </div>

            {/* Navigation */}
            <div className="flex gap-3">
              <button
                onClick={() => navigate("/bookings")}
                className="flex-1 h-11 bg-[#0C3060] hover:bg-[#0a2550] text-white rounded-xl font-bold text-sm transition border-none cursor-pointer"
              >
                My Bookings
              </button>
              <button
                onClick={() => navigate("/")}
                className="flex-1 h-11 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-xl font-semibold text-sm transition cursor-pointer"
              >
                Book another
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
