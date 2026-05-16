// src/pages/user/SearchResults.jsx
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSearchFlightsQuery } from "../../slices/flightApiSlice";
import { useSelector } from "react-redux";
import {toast} from 'react-toastify'
import UserNavbar from "../../components/UserNavbar";

const CLASS_MULTIPLIER = { economy: 1, business: 2.5, first: 4.5 };
const CLASS_LABEL = {
  economy: "Economy",
  business: "Business",
  first: "First Class",
};

const fmt = (dt) =>
  dt
    ? new Date(dt).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : "—";

const fmtDate = (dt) =>
  dt
    ? new Date(dt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const duration = (dep, arr) => {
  const mins = Math.round((new Date(arr) - new Date(dep)) / 60000);
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
};

export default function SearchResults() {
  const { userData } = useSelector((state) => state.auth);

  const { search } = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(search);

  const source = params.get("from") || "";
  const destination = params.get("to") || "";
  const date = params.get("date") || "";
  const passengers = Number(params.get("passengers") || 1);

  const [selectedClass, setSelectedClass] = useState("economy");
  const [sortBy, setSortBy] = useState("departure");

  const { data, isLoading, isError } = useSearchFlightsQuery(
    { source, destination, date, passengers },
    { skip: !source || !destination || !date },
  );

  const flights = (data?.data ?? [])
    .map((f) => ({
      ...f,
      displayPrice: Math.round(
        f.price * CLASS_MULTIPLIER[selectedClass] * passengers,
      ),
    }))
    .sort((a, b) => {
      if (sortBy === "price") return a.displayPrice - b.displayPrice;
      if (sortBy === "duration")
        return (
          new Date(a.arrivalTime) -
          new Date(a.departureTime) -
          (new Date(b.arrivalTime) - new Date(b.departureTime))
        );
      return new Date(a.departureTime) - new Date(b.departureTime);
    });

  const handleFlightSelection = (flightId, selectedClass, passengers) => {
    if (userData) {
      navigate(
        `/flights/${flightId}?class=${selectedClass}&passengers=${passengers}`,
      );
    }else{
      toast.error("Please Login First")
      navigate("/login")
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <UserNavbar />

      {/* Search summary bar */}
      <div className="bg-[#0C3060] px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-white">
            <span className="text-lg font-bold">{source}</span>
            <svg
              className="w-4 h-4 text-blue-300"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
            <span className="text-lg font-bold">{destination}</span>
          </div>
          <div className="text-blue-200 text-sm">·</div>
          <span className="text-blue-200 text-sm">{fmtDate(date)}</span>
          <div className="text-blue-200 text-sm">·</div>
          <span className="text-blue-200 text-sm">
            {passengers} passenger{passengers > 1 ? "s" : ""}
          </span>
          <button
            onClick={() => navigate("/")}
            className="ml-auto text-[11px] bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition border-none cursor-pointer"
          >
            Modify search
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Filters row */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <p className="text-[#0C3060] font-bold text-lg">
              {isLoading
                ? "Searching..."
                : `${flights.length} flight${flights.length !== 1 ? "s" : ""} found`}
            </p>
            <p className="text-slate-400 text-sm">
              {source} → {destination} · {fmtDate(date)}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Class selector */}
            <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1">
              {Object.entries(CLASS_LABEL).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setSelectedClass(key)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition border-none cursor-pointer
                    ${selectedClass === key ? "bg-[#0C3060] text-white" : "text-slate-500 hover:text-[#0C3060] bg-transparent"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-9 px-3 text-[12px] bg-white border border-slate-200 rounded-xl outline-none text-slate-600"
            >
              <option value="departure">Sort: Departure</option>
              <option value="price">Sort: Price</option>
              <option value="duration">Sort: Duration</option>
            </select>
          </div>
        </div>

        {/* Flight cards */}
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse"
              >
                <div className="h-4 bg-slate-100 rounded w-32 mb-3" />
                <div className="h-6 bg-slate-100 rounded w-48" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="text-center py-16">
            <p className="text-slate-400 text-sm">
              Failed to load flights. Try again.
            </p>
          </div>
        ) : flights.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-[#EAF2FB] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-[#0C3060]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M12 19l7-7 3 3-7 7-3-3z" />
                <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                <path d="M2 2l7.586 7.586" />
                <circle cx="11" cy="11" r="2" />
              </svg>
            </div>
            <p className="text-[#0C3060] font-bold text-lg mb-1">
              No flights found
            </p>
            <p className="text-slate-400 text-sm">
              Try different dates or a nearby city
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {flights.map((f) => (
              <div
                key={f._id}
                className="bg-white rounded-2xl border border-slate-100 hover:border-[#0C3060] hover:shadow-[0_4px_20px_rgba(12,48,96,0.08)] transition-all cursor-pointer group"
                onClick={() =>
                  handleFlightSelection(f._id, selectedClass, passengers)
                }
              >
                <div className="p-5 flex items-center gap-6 flex-wrap">
                  {/* Airline logo placeholder */}
                  <div className="w-12 h-12 bg-[#EAF2FB] rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-[#0C3060] font-black text-sm">
                      AI
                    </span>
                  </div>

                  {/* Route */}
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="text-center">
                      <p className="text-[22px] font-bold text-[#0C3060] leading-none">
                        {fmt(f.departureTime)}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {f.source}
                      </p>
                    </div>
                    <div className="flex-1 flex flex-col items-center gap-1 min-w-[80px]">
                      <p className="text-[10px] text-slate-400 font-medium">
                        {duration(f.departureTime, f.arrivalTime)}
                      </p>
                      <div className="w-full flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full border-2 border-[#0C3060] flex-shrink-0" />
                        <div className="flex-1 h-px bg-[#0C3060]/20" />
                        <svg
                          className="w-3.5 h-3.5 text-[#0C3060] flex-shrink-0"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                        </svg>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        {f.routes?.length > 2
                          ? `${f.routes.length - 2} stop${f.routes.length - 2 > 1 ? "s" : ""}`
                          : "Non-stop"}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[22px] font-bold text-[#0C3060] leading-none">
                        {fmt(f.arrivalTime)}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {f.destination}
                      </p>
                    </div>
                  </div>

                  {/* Seats + price */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-[11px] text-slate-400 mb-0.5">
                      {CLASS_LABEL[selectedClass]}
                    </p>
                    <p className="text-[26px] font-bold text-[#0C3060] leading-none">
                      ₹{f.displayPrice.toLocaleString()}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      per passenger
                    </p>
                    <p
                      className={`text-[10px] font-semibold mt-1 ${f.availableSeats < 10 ? "text-red-500" : "text-green-600"}`}
                    >
                      {f.availableSeats < 10
                        ? `Only ${f.availableSeats} left!`
                        : `${f.availableSeats} seats`}
                    </p>
                  </div>

                  <div className="w-full sm:w-auto">
                    <div className="h-11 px-6 bg-[#0C3060] group-hover:bg-[#0a2550] text-white rounded-xl text-sm font-bold flex items-center justify-center transition">
                      Select →
                    </div>
                  </div>
                </div>

                {/* Bottom strip */}
                <div className="px-5 py-2.5 border-t border-slate-50 flex items-center gap-4 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
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
                    {f.aircraftId?.model || "Aircraft"}
                  </span>
                  <span className="flex items-center gap-1">
                    <svg
                      className="w-3 h-3"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    Departs {fmtDate(f.departureTime)}
                  </span>
                  <span
                    className={`ml-auto font-semibold px-2 py-0.5 rounded-full
                    ${f.status === "boarding" ? "bg-violet-100 text-violet-700" : "bg-green-100 text-green-700"}`}
                  >
                    {f.status === "boarding" ? "Boarding" : "Scheduled"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
