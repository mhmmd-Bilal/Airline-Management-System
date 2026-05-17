// src/pages/user/FlightDetail.jsx
import { useState, useCallback, useMemo, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useGetFlightByIdQuery } from "../../slices/flightApiSlice";
import {
  useGetFlightSeatsQuery,
  useCreateOrderMutation,
  useVerifyPaymentMutation,
} from "../../slices/bookingApiSlice";
import { useEarnPointsMutation } from "../../slices/loyaltyApiSlice";
import Loader from "../../components/Loader";
import UserNavbar from "../../components/UserNavbar";

/* -------------------------------------------------------------------------- */
/*                               CONSTANTS                                    */
/* -------------------------------------------------------------------------- */

const CLASS_MULTIPLIER = { economy: 1, business: 2.5, first: 4.5 };
const CLASS_LABEL = {
  economy: "Economy",
  business: "Business Class",
  first: "First Class",
};
const CLASS_PERKS = {
  economy: ['Standard seat (32" pitch)', "1 carry-on bag", "Meal not included"],
  business: [
    'Wide seat (60" pitch)',
    "2 checked bags",
    "Meal included",
    "Priority boarding",
  ],
  first: [
    "Flat-bed seat",
    "3 checked bags",
    "Fine dining",
    "Lounge access",
    "Dedicated crew",
  ],
};

const CLASS_CONFIG = {
  economy: { cols: ["A", "B", "C", "D", "E", "F"], rowStart: 10 },
  business: { cols: ["A", "C", "D", "F"], rowStart: 4 },
  first: { cols: ["A", "D"], rowStart: 1 },
};

const MAX_SEATS_PER_BOOKING = 9; // airline industry standard

function computeClassSeats(totalSeats) {
  const first = Math.max(2, Math.round(totalSeats * 0.05));
  const business = Math.max(4, Math.round(totalSeats * 0.15));
  const economy = Math.max(0, totalSeats - first - business);
  return { first, business, economy };
}

function generateSeatRows(seatClass, maxSeats, bookedSeats = []) {
  const cfg = CLASS_CONFIG[seatClass];
  const rows = [];
  let generated = 0;

  for (let r = cfg.rowStart; generated < maxSeats; r++) {
    const rowSeats = [];
    for (const col of cfg.cols) {
      if (generated >= maxSeats) break;
      const seatId = `${r}${col}`;
      rowSeats.push({ seat: seatId, booked: bookedSeats.includes(seatId) });
      generated++;
    }
    if (rowSeats.length > 0) rows.push({ row: r, seats: rowSeats });
  }
  return rows;
}

const emptyPassenger = () => ({
  name: "",
  email: "",
  phone: "",
  age: "",
  gender: "",
});

/* -------------------------------------------------------------------------- */
/*                               UTILITIES                                    */
/* -------------------------------------------------------------------------- */

const inputCls =
  "w-full h-11 px-3 text-[13px] text-[#0C3060] bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#0C3060] focus:ring-2 focus:ring-blue-50 transition placeholder:text-slate-300";

const BackArrow = () => (
  <svg
    className="w-4 h-4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);

/* -------------------------------------------------------------------------- */
/*                           SEAT MAP COMPONENT                               */
/* -------------------------------------------------------------------------- */

function SeatMap({
  seatClass,
  seatRows,
  selectedSeats,
  onToggle,
  passengersCount,
  flexMode,
}) {
  const cfg = CLASS_CONFIG[seatClass];
  const midpoint = Math.floor(cfg.cols.length / 2);
  const remaining = passengersCount - selectedSeats.length;
  const maxReached = !flexMode && remaining === 0;

  return (
    <div>
      {/* Legend */}
      <div className="flex items-center gap-5 mb-5 text-[11px] text-slate-500 flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-md bg-slate-100 border border-slate-200" />
          Available
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-md bg-[#0C3060]" />
          Your selection
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-md bg-red-400" />
          Already booked
        </div>
      </div>

      {/* Flex mode hint */}
      {flexMode && (
        <div className="mb-4 px-4 py-2.5 bg-blue-50 border border-blue-100 rounded-xl text-[12px] text-[#0C3060] font-medium flex items-center gap-2">
          <span className="text-blue-400">→</span>
          Select up to {MAX_SEATS_PER_BOOKING} seats. You can select{" "}
          {selectedSeats.length > 0
            ? `${selectedSeats.length} so far`
            : "any number"}
          .
        </div>
      )}

      {/* Seat grid */}
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <div className="flex gap-1.5 mb-2 justify-center">
            <div className="w-8" />
            {cfg.cols.map((col, i) => (
              <div key={col} className="flex items-center">
                {i === midpoint && <div className="w-4" />}
                <div className="w-9 text-center text-[10px] font-bold text-slate-400">
                  {col}
                </div>
              </div>
            ))}
          </div>

          {seatRows.map(({ row, seats }) => (
            <div
              key={row}
              className="flex items-center gap-1.5 mb-1.5 justify-center"
            >
              <div className="w-8 text-[10px] text-slate-300 font-medium text-center">
                {row}
              </div>
              {seats.map(({ seat, booked }, i) => {
                const isSelected = selectedSeats.includes(seat);
                // In flex mode: only block if booked or at max; in fixed mode: block if max reached and not selected
                const atMax = flexMode
                  ? selectedSeats.length >= MAX_SEATS_PER_BOOKING && !isSelected
                  : maxReached && !isSelected;
                const isDisabled = booked || atMax;

                return (
                  <div key={seat} className="flex items-center gap-1.5">
                    {i === midpoint && <div className="w-4" />}
                    <button
                      disabled={isDisabled}
                      onClick={() => onToggle(seat)}
                      title={booked ? `Seat ${seat} — already booked` : seat}
                      className={`w-9 h-9 rounded-lg text-[10px] font-bold transition border
                        ${
                          booked
                            ? "bg-red-400 text-white border-red-400 cursor-not-allowed"
                            : isSelected
                              ? "bg-[#0C3060] text-white border-[#0C3060] shadow-md scale-105 cursor-pointer"
                              : atMax
                                ? "bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed"
                                : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-[#EAF2FB] hover:border-[#0C3060] cursor-pointer"
                        }`}
                    >
                      {booked ? "✕" : seat}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Selection status */}
      <div
        className={`mt-4 px-4 py-2.5 rounded-xl text-[12px] font-medium flex items-center gap-2
        ${
          selectedSeats.length > 0 &&
          (flexMode || selectedSeats.length === passengersCount)
            ? "bg-green-50 border border-green-200 text-green-700"
            : "bg-blue-50 border border-blue-100 text-[#0C3060]"
        }`}
      >
        {selectedSeats.length === 0 ? (
          <>
            <span className="text-blue-400">→</span> Click any available seat to
            select
          </>
        ) : flexMode ? (
          <>
            <span className="text-green-500">✓</span> {selectedSeats.length}{" "}
            seat{selectedSeats.length !== 1 ? "s" : ""} selected:{" "}
            {selectedSeats.join(", ")}
          </>
        ) : selectedSeats.length === passengersCount ? (
          <>
            <span className="text-green-500">✓</span> All seats selected:{" "}
            {selectedSeats.join(", ")}
          </>
        ) : (
          <>
            <span className="text-blue-400">→</span> Select {remaining} more
            seat{remaining !== 1 ? "s" : ""}
          </>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                            MAIN COMPONENT                                  */
/* -------------------------------------------------------------------------- */

export default function FlightDetail() {
  const { id } = useParams();
  const { search } = useLocation();
  const navigate = useNavigate();
  const { userData } = useSelector((s) => s.auth);

  const params = new URLSearchParams(search);
  const initClass = params.get("class") || "economy";
  const initPax = Number(params.get("passengers") || 0);

  // ── flex mode: no passenger count specified upfront ──
  // user picks seats first, then forms are generated based on selection
  const flexMode = initPax === 0;

  const [step, setStep] = useState(1);
  const [seatClass, setSeatClass] = useState(initClass);
  const [selectedSeats, setSelectedSeats] = useState([]);

  // In flex mode, passengers array is derived from selectedSeats (updated when moving to step 3)
  const [passengers, setPassengers] = useState(() =>
    flexMode ? [] : Array.from({ length: initPax }, emptyPassenger),
  );
  const [passengerErrors, setPassengerErrors] = useState([]);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState("");

  /* ── API queries ── */
  const { data: flightData, isLoading: flightLoading } =
    useGetFlightByIdQuery(id);
  const {
    data: seatsData,
    isLoading: seatsLoading,
    refetch: refetchSeats,
  } = useGetFlightSeatsQuery(id);
  const [createOrder] = useCreateOrderMutation();
  const [verifyPayment] = useVerifyPaymentMutation();
  const [earnLoyaltyPoints] = useEarnPointsMutation();

  const flight = flightData?.data;

  const bookedSeats = useMemo(() => {
    if (!seatsData?.data) return [];
    return (
      seatsData.data.byClass?.[seatClass] ?? seatsData.data.bookedSeats ?? []
    );
  }, [seatsData, seatClass]);

  const classSeats = useMemo(
    () =>
      flight?.totalSeats
        ? computeClassSeats(flight.totalSeats)
        : { economy: 0, business: 0, first: 0 },
    [flight?.totalSeats],
  );

  const seatRows = useMemo(
    () => generateSeatRows(seatClass, classSeats[seatClass], bookedSeats),
    [seatClass, classSeats, bookedSeats],
  );

  // Passenger count = fixed (initPax) or dynamic (selectedSeats.length in flex mode)
  const passengersCount = flexMode ? selectedSeats.length : initPax;
  const pricePerPax = flight
    ? Math.round(flight.price * CLASS_MULTIPLIER[seatClass])
    : 0;
  const totalPrice = pricePerPax * Math.max(passengersCount, 1);

  /* ── Seat toggle ── */
  const toggleSeat = (seat) => {
    setSelectedSeats((prev) =>
      prev.includes(seat)
        ? prev.filter((s) => s !== seat)
        : flexMode
          ? prev.length < MAX_SEATS_PER_BOOKING
            ? [...prev, seat]
            : prev
          : prev.length < initPax
            ? [...prev, seat]
            : prev,
    );
  };

  /* ── Class change ── */
  const handleClassChange = (cls) => {
    setSeatClass(cls);
    setSelectedSeats([]);
  };

  /* ── Enter seat step ── */
  const handleEnterSeatStep = () => {
    refetchSeats();
    setSelectedSeats([]);
    setStep(2);
  };

  /* ── Move from seats → passengers ──
     In flex mode: build the passengers array to match seat count */
  const handleEnterPassengerStep = () => {
    if (selectedSeats.length === 0) return;

    if (flexMode) {
      // Grow or shrink passenger array to match selected seats
      setPassengers((prev) => {
        const count = selectedSeats.length;
        if (prev.length === count) return prev;
        if (prev.length < count) {
          return [
            ...prev,
            ...Array.from({ length: count - prev.length }, emptyPassenger),
          ];
        }
        return prev.slice(0, count);
      });
      setPassengerErrors([]);
    }

    setStep(3);
  };

  /* ── Passenger field ── */
  const updatePassenger = useCallback((idx, field, value) => {
    setPassengers((p) =>
      p.map((pax, i) => (i === idx ? { ...pax, [field]: value } : pax)),
    );
    setPassengerErrors((e) =>
      e.map((err, i) => (i === idx ? { ...err, [field]: undefined } : err)),
    );
  }, []);

  /* ── Validation ── */
  const validatePassengers = () => {
    const errors = passengers.map((p) => {
      const e = {};
      if (!p.name.trim()) e.name = "Required";
      if (!p.email.trim()) e.email = "Required";
      if (!p.phone.trim()) e.phone = "Required";
      if (!p.age) e.age = "Required";
      if (!p.gender) e.gender = "Required";
      return e;
    });
    setPassengerErrors(errors);
    return errors.every((e) => Object.keys(e).length === 0);
  };

  const handleContinueToPayment = () => {
    if (!validatePassengers()) return;
    setBookingError("");
    setStep(4);
  };

  /* ── Payment ── */
  const handlePayment = async () => {
    if (!validatePassengers()) {
      setStep(3);
      return;
    }
    setBookingLoading(true);
    setBookingError("");

    try {
      const orderRes = await createOrder({
        flightId: id,
        passengers,
        seats: selectedSeats,
        seatClass,
      }).unwrap();

      const { orderId, amount, currency, keyId, bookingMeta } = orderRes.data;

      if (!window.Razorpay) {
        setBookingError(
          "Payment SDK not loaded. Please refresh and try again.",
        );
        setBookingLoading(false);
        return;
      }

      const rzp = new window.Razorpay({
        key: keyId,
        amount: amount * 100,
        currency: currency ?? "INR",
        name: "AirlineMS",
        description: `${flight.flightNumber} · ${flight.source} → ${flight.destination}`,
        order_id: orderId,
        prefill: {
          name: userData?.name ?? "",
          email: userData?.email ?? "",
          contact: userData?.phone ?? "",
        },
        theme: { color: "#0C3060" },
        handler: async (response) => {
          try {
            const booking = await verifyPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              ...bookingMeta,
            }).unwrap();
            setBookingLoading(false);
            await earnLoyaltyPoints({ amount, bookingId: booking.data._id });
            navigate(`/booking-success/${booking.data._id}`);
          } catch (err) {
            setBookingError(
              err?.data?.message ?? "Payment verification failed",
            );
            setBookingLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            setBookingLoading(false);
            setBookingError("Payment cancelled. You can try again.");
          },
        },
      });

      rzp.on("payment.failed", (response) => {
        setBookingError(
          response?.error?.description ??
            "Payment failed. Please try a different method.",
        );
        setBookingLoading(false);
      });

      rzp.open();
    } catch (err) {
      setBookingError(err?.data?.message ?? "Failed to initiate payment");
      setBookingLoading(false);
    }
  };

  /* ── Loading / not found ── */
  if (flightLoading) return <Loader />;
  if (!flight)
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-400">Flight not found</p>
      </div>
    );

  const duration = Math.round(
    (new Date(flight.arrivalTime) - new Date(flight.departureTime)) / 60000,
  );
  const stopsLabel = (() => {
    if (flight.routes?.length > 2) {
      const s = flight.routes.length - 2;
      return `${s} stop${s > 1 ? "s" : ""}`;
    }
    return "Non-stop";
  })();

  /* ======================================================================= */
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <UserNavbar />

      {/* Step nav */}
      <nav className="bg-white border-b border-blue-100 px-6 py-4 flex items-center gap-4 sticky top-0 z-50">
        <button
          onClick={() => navigate(-1)}
          className="text-[#0C3060] hover:opacity-70 transition flex items-center gap-1.5 text-sm font-medium"
        >
          <BackArrow /> Back
        </button>
        <div className="ml-auto flex items-center gap-2">
          {["Class", "Seats", "Passengers", "Payment"].map((s, i) => (
            <div key={s} className="flex items-center gap-1.5">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition
                ${step > i + 1 ? "bg-green-500 text-white" : step === i + 1 ? "bg-[#0C3060] text-white" : "bg-slate-100 text-slate-400"}`}
              >
                {step > i + 1 ? "✓" : i + 1}
              </div>
              <span
                className={`text-[11px] font-medium hidden sm:block ${step === i + 1 ? "text-[#0C3060]" : "text-slate-400"}`}
              >
                {s}
              </span>
              {i < 3 && (
                <div className="w-6 h-px bg-slate-200 hidden sm:block" />
              )}
            </div>
          ))}
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* ───────── STEP 1: Class ───────── */}
          {step === 1 && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <h2 className="text-lg font-bold text-[#0C3060] mb-1">
                Choose your class
              </h2>
              <p className="text-slate-400 text-sm mb-5">
                Select the travel experience that suits you
              </p>

              <div className="flex flex-col gap-3">
                {Object.entries(CLASS_LABEL).map(([key, label]) => {
                  const price = Math.round(
                    flight.price *
                      CLASS_MULTIPLIER[key] *
                      Math.max(passengersCount, 1),
                  );
                  const selected = seatClass === key;
                  const totalInCls = classSeats[key];
                  const bookedInCls =
                    seatsData?.data?.byClass?.[key]?.length ?? 0;
                  const availInCls = Math.max(0, totalInCls - bookedInCls);
                  const soldOut = availInCls === 0;
                  const notEnough = !flexMode && availInCls < initPax;

                  return (
                    <div
                      key={key}
                      onClick={() => !soldOut && handleClassChange(key)}
                      className={`border-2 rounded-2xl p-4 transition-all
                        ${soldOut ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                        ${selected ? "border-[#0C3060] bg-[#EAF2FB]" : "border-slate-100 hover:border-slate-300 bg-white"}`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0
                            ${selected ? "border-[#0C3060]" : "border-slate-300"}`}
                          >
                            {selected && (
                              <div className="w-2.5 h-2.5 rounded-full bg-[#0C3060]" />
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-[#0C3060]">{label}</p>
                            <p className="text-xs text-slate-400">
                              {flexMode
                                ? "Select seats on next step"
                                : `${initPax} passenger${initPax > 1 ? "s" : ""}`}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[22px] font-bold text-[#0C3060]">
                            ₹
                            {Math.round(
                              flight.price * CLASS_MULTIPLIER[key],
                            ).toLocaleString()}
                          </p>
                          <p className="text-xs text-slate-400">
                            per passenger
                          </p>
                          <p
                            className={`text-[11px] font-semibold mt-0.5
                            ${soldOut ? "text-red-500" : notEnough ? "text-orange-500" : availInCls <= 5 ? "text-orange-400" : "text-green-600"}`}
                          >
                            {soldOut
                              ? "Sold out"
                              : notEnough
                                ? `Only ${availInCls} left`
                                : `${availInCls} seat${availInCls > 1 ? "s" : ""} available`}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {CLASS_PERKS[key].map((perk) => (
                          <span
                            key={perk}
                            className="text-[11px] bg-white border border-slate-100 text-slate-500 px-2.5 py-1 rounded-full flex items-center gap-1"
                          >
                            <span className="text-green-500">✓</span> {perk}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {(() => {
                const avail =
                  classSeats[seatClass] -
                  (seatsData?.data?.byClass?.[seatClass]?.length ?? 0);
                const notEnough = !flexMode && avail < initPax;
                return (
                  <>
                    <button
                      onClick={handleEnterSeatStep}
                      disabled={notEnough}
                      className="w-full mt-5 h-12 bg-[#0C3060] hover:bg-[#0a2550] text-white rounded-xl font-bold text-sm transition border-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Continue to seat selection →
                    </button>
                    {notEnough && (
                      <p className="text-center text-[12px] text-red-500 mt-2">
                        Not enough {CLASS_LABEL[seatClass]} seats for {initPax}{" "}
                        passenger{initPax > 1 ? "s" : ""}
                      </p>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {/* ───────── STEP 2: Seats ───────── */}
          {step === 2 && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <div className="flex items-center gap-3 mb-1">
                <button
                  onClick={() => setStep(1)}
                  className="text-slate-400 hover:text-[#0C3060] transition"
                >
                  <BackArrow />
                </button>
                <h2 className="text-lg font-bold text-[#0C3060]">
                  Select your seats
                </h2>
              </div>

              <div className="flex items-center gap-3 ml-7 mb-4 flex-wrap">
                <span className="text-[12px] text-slate-400">
                  {CLASS_LABEL[seatClass]}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">
                  {classSeats[seatClass]} total
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-50 text-red-500 font-medium">
                  {bookedSeats.length} booked
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-green-50 text-green-600 font-medium">
                  {Math.max(0, classSeats[seatClass] - bookedSeats.length)}{" "}
                  available
                </span>

                {/* Seat count indicator */}
                {flexMode ? (
                  <span className="text-[12px] text-slate-400">
                    · {selectedSeats.length} selected (max{" "}
                    {MAX_SEATS_PER_BOOKING})
                  </span>
                ) : (
                  <span className="text-[12px] text-slate-400">
                    · {selectedSeats.length}/{initPax} selected
                  </span>
                )}
              </div>

              {seatsLoading ? (
                <div className="flex items-center justify-center py-10 gap-3">
                  <div className="w-5 h-5 border-2 border-[#0C3060] border-t-transparent rounded-full animate-spin" />
                  <span className="text-slate-400 text-sm">
                    Loading seat availability...
                  </span>
                </div>
              ) : (
                <SeatMap
                  seatClass={seatClass}
                  seatRows={seatRows}
                  selectedSeats={selectedSeats}
                  onToggle={toggleSeat}
                  passengersCount={flexMode ? selectedSeats.length : initPax}
                  flexMode={flexMode}
                />
              )}

              <button
                disabled={
                  selectedSeats.length === 0 ||
                  (!flexMode && selectedSeats.length !== initPax)
                }
                onClick={handleEnterPassengerStep}
                className="w-full mt-5 h-12 bg-[#0C3060] hover:bg-[#0a2550] text-white rounded-xl font-bold text-sm transition border-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {selectedSeats.length === 0
                  ? "Select at least 1 seat"
                  : flexMode
                    ? `Continue with ${selectedSeats.length} seat${selectedSeats.length !== 1 ? "s" : ""} →`
                    : selectedSeats.length === initPax
                      ? "Continue to passenger details →"
                      : `Select ${initPax - selectedSeats.length} more seat${initPax - selectedSeats.length !== 1 ? "s" : ""}`}
              </button>
            </div>
          )}

          {/* ───────── STEP 3: Passengers ───────── */}
          {step === 3 && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <div className="flex items-center gap-3 mb-1">
                <button
                  onClick={() => setStep(2)}
                  className="text-slate-400 hover:text-[#0C3060] transition"
                >
                  <BackArrow />
                </button>
                <h2 className="text-lg font-bold text-[#0C3060]">
                  Passenger details
                </h2>
              </div>
              <p className="text-slate-400 text-sm mb-5 ml-7">
                Fill in details for {passengers.length} passenger
                {passengers.length !== 1 ? "s" : ""}
              </p>

              {passengers.map((pax, idx) => {
                const errors = passengerErrors[idx] || {};
                return (
                  <div
                    key={idx}
                    className="mb-5 pb-5 border-b border-slate-50 last:border-0 last:mb-0 last:pb-0"
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-7 h-7 rounded-full bg-[#EAF2FB] flex items-center justify-center text-[#0C3060] text-[11px] font-bold flex-shrink-0">
                        {idx + 1}
                      </div>
                      <p className="font-semibold text-[#0C3060] text-sm">
                        Passenger {idx + 1}
                      </p>
                      <span className="text-[11px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">
                        Seat {selectedSeats[idx]}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        {
                          field: "name",
                          label: "Full Name",
                          placeholder: "As on ID",
                          type: "text",
                        },
                        {
                          field: "email",
                          label: "Email",
                          placeholder: "email@example.com",
                          type: "email",
                        },
                        {
                          field: "phone",
                          label: "Phone",
                          placeholder: "10-digit number",
                          type: "tel",
                        },
                        {
                          field: "age",
                          label: "Age",
                          placeholder: "Age",
                          type: "number",
                        },
                      ].map(({ field, label, placeholder, type }) => (
                        <div key={field}>
                          <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                            {label}
                          </label>
                          <input
                            type={type}
                            className={inputCls}
                            placeholder={placeholder}
                            value={pax[field]}
                            onChange={(e) =>
                              updatePassenger(idx, field, e.target.value)
                            }
                          />
                          {errors[field] && (
                            <p className="text-[11px] text-red-500 mt-1">
                              {errors[field]}
                            </p>
                          )}
                        </div>
                      ))}
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                          Gender
                        </label>
                        <select
                          className={inputCls}
                          value={pax.gender}
                          onChange={(e) =>
                            updatePassenger(idx, "gender", e.target.value)
                          }
                        >
                          <option value="">Select</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                        {errors.gender && (
                          <p className="text-[11px] text-red-500 mt-1">
                            {errors.gender}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              <button
                onClick={handleContinueToPayment}
                className="w-full mt-5 h-12 bg-[#0C3060] hover:bg-[#0a2550] text-white rounded-xl font-bold text-sm transition border-none cursor-pointer"
              >
                Continue to payment →
              </button>
            </div>
          )}

          {/* ───────── STEP 4: Payment ───────── */}
          {step === 4 && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <div className="flex items-center gap-3 mb-5">
                <button
                  onClick={() => setStep(3)}
                  className="text-slate-400 hover:text-[#0C3060] transition"
                >
                  <BackArrow />
                </button>
                <h2 className="text-lg font-bold text-[#0C3060]">
                  Review & pay
                </h2>
              </div>

              <div className="mb-5">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Passengers
                </p>
                {passengers.map((pax, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between py-2.5 ${idx > 0 ? "border-t border-slate-50" : ""}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#EAF2FB] flex items-center justify-center text-[#0C3060] text-[11px] font-bold">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#0C3060]">
                          {pax.name || `Passenger ${idx + 1}`}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Seat {selectedSeats[idx]} · {CLASS_LABEL[seatClass]}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-[#0C3060]">
                      ₹{pricePerPax.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>

              <div className="bg-slate-50 rounded-xl p-4 mb-5">
                <div className="flex justify-between text-sm text-slate-500 mb-2">
                  <span>Base fare × {passengers.length}</span>
                  <span>
                    ₹{(pricePerPax * passengers.length).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-slate-500 mb-2">
                  <span>Taxes & fees</span>
                  <span>Included</span>
                </div>
                <div className="flex justify-between font-bold text-[#0C3060] text-base pt-2 border-t border-slate-200">
                  <span>Total</span>
                  <span>
                    ₹{(pricePerPax * passengers.length).toLocaleString()}
                  </span>
                </div>
              </div>

              {bookingError && (
                <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5">
                  <svg
                    className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <p className="text-[12px] text-red-600">{bookingError}</p>
                </div>
              )}

              <button
                onClick={handlePayment}
                disabled={bookingLoading}
                className="w-full h-14 bg-[#0C3060] hover:bg-[#0a2550] text-white rounded-xl font-bold text-base transition border-none cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {bookingLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />{" "}
                    Processing...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <rect x="1" y="4" width="22" height="16" rx="2" />
                      <line x1="1" y1="10" x2="23" y2="10" />
                    </svg>
                    Pay ₹{(pricePerPax * passengers.length).toLocaleString()}{" "}
                    securely
                  </>
                )}
              </button>
              <p className="text-center text-[11px] text-slate-400 mt-3 flex items-center justify-center gap-1">
                <svg
                  className="w-3 h-3"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
                Secured by Razorpay · 256-bit SSL encryption
              </p>
            </div>
          )}
        </div>

        {/* ── Right: Flight summary ── */}
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-2xl border border-slate-100 p-5 sticky top-20">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-4">
              Flight summary
            </p>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[22px] font-bold text-[#0C3060] leading-none">
                  {new Date(flight.departureTime).toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">{flight.source}</p>
              </div>
              <div className="flex flex-col items-center gap-1 px-3">
                <p className="text-[10px] text-slate-400">
                  {Math.floor(duration / 60)}h {duration % 60}m
                </p>
                <div className="w-16 h-px bg-slate-200" />
                <p className="text-[10px] text-slate-400">{stopsLabel}</p>
              </div>
              <div className="text-right">
                <p className="text-[22px] font-bold text-[#0C3060] leading-none">
                  {new Date(flight.arrivalTime).toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {flight.destination}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 text-[12px]">
              {[
                ["Flight", flight.flightNumber],
                [
                  "Date",
                  new Date(flight.departureTime).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  }),
                ],
                ["Class", CLASS_LABEL[seatClass]],
                ["Seats", selectedSeats.join(", ") || "—"],
                [
                  "Passengers",
                  passengers.length ||
                    (flexMode ? "Select seats first" : initPax),
                ],
                [
                  "Available",
                  `${flight.availableSeats} / ${flight.totalSeats}`,
                ],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-slate-400">{label}</span>
                  <span className="font-semibold text-[#0C3060]">{value}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-sm">Total</span>
                <span className="text-xl font-bold text-[#0C3060]">
                  {passengers.length > 0 || !flexMode
                    ? `₹${(pricePerPax * Math.max(passengers.length, initPax)).toLocaleString()}`
                    : `₹${pricePerPax.toLocaleString()} / seat`}
                </span>
              </div>
              {flexMode && selectedSeats.length === 0 && (
                <p className="text-[11px] text-slate-400 mt-1 text-right">
                  Select seats to see total
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
