// src/pages/user/DealsPage.jsx
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import UserNavbar from "../../components/UserNavbar";
import { useGetAllFlightsQuery } from "../../slices/flightApiSlice";

// ── Helpers ────────────────────────────────────────────
const fmt = (dt) =>
  dt ? new Date(dt).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }) : "—";

const fmtDate = (dt) =>
  dt ? new Date(dt).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  }) : "—";

const duration = (dep, arr) => {
  if (!dep || !arr) return "—";
  const mins  = Math.round((new Date(arr) - new Date(dep)) / 60000);
  const h     = Math.floor(mins / 60);
  const m     = mins % 60;
  return `${h}h ${m}m`;
};

const SORT_OPTIONS = [
  { value: "price-asc",      label: "Price: Low to High"   },
  { value: "price-desc",     label: "Price: High to Low"   },
  { value: "departure-asc",  label: "Departure: Earliest"  },
  { value: "departure-desc", label: "Departure: Latest"    },
  { value: "duration-asc",   label: "Duration: Shortest"   },
  { value: "seats-desc",     label: "Seats: Most Available"},
];

const STATUS_CONFIG = {
  scheduled: { label: "Scheduled", cls: "bg-blue-100 text-blue-800"   },
  boarding:  { label: "Boarding",  cls: "bg-violet-100 text-violet-800"},
  delayed:   { label: "Delayed",   cls: "bg-orange-100 text-orange-800"},
};

// ── Shared UI ──────────────────────────────────────────
function Badge({ label, cls }) {
  return (
    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${cls}`}>
      {label}
    </span>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="w-10 h-10 border-4 border-blue-100 border-t-[#0C3060] rounded-full animate-spin" />
    </div>
  );
}

// ── Filter sidebar ─────────────────────────────────────
function FilterPanel({
  priceRange, setPriceRange, maxPrice,
  selectedStops, setSelectedStops,
  selectedStatus, setSelectedStatus,
  dateFrom, setDateFrom,
  dateTo, setDateTo,
  onReset,
}) {
  const stopOptions   = [
    { value: "0", label: "Non-stop"      },
    { value: "1", label: "1 stop"        },
    { value: "2", label: "2+ stops"      },
  ];
  const statusOptions = ["scheduled", "boarding", "delayed"];

  const toggleStop = (val) =>
    setSelectedStops((p) =>
      p.includes(val) ? p.filter((s) => s !== val) : [...p, val]
    );

  const toggleStatus = (val) =>
    setSelectedStatus((p) =>
      p.includes(val) ? p.filter((s) => s !== val) : [...p, val]
    );

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 sticky top-24">
      <div className="flex items-center justify-between mb-5">
        <p className="text-[13px] font-bold text-[#0C3060]">Filters</p>
        <button
          onClick={onReset}
          className="text-[11px] text-blue-500 font-semibold hover:underline bg-transparent border-none cursor-pointer"
        >
          Reset all
        </button>
      </div>

      {/* Date range */}
      <div className="mb-5">
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">Departure date</p>
        <div className="flex flex-col gap-2">
          <div>
            <label className="text-[10px] text-slate-400 font-medium mb-1 block">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full h-9 border border-slate-200 rounded-lg px-3 text-[12px] text-[#0C3060] outline-none focus:border-[#0C3060] bg-slate-50 transition"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 font-medium mb-1 block">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full h-9 border border-slate-200 rounded-lg px-3 text-[12px] text-[#0C3060] outline-none focus:border-[#0C3060] bg-slate-50 transition"
            />
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 mb-5" />

      {/* Price range */}
      <div className="mb-5">
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">Max price</p>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] text-slate-400">₹0</span>
          <span className="text-[13px] font-bold text-[#0C3060]">₹{priceRange.toLocaleString()}</span>
          <span className="text-[11px] text-slate-400">₹{maxPrice.toLocaleString()}</span>
        </div>
        <input
          type="range"
          min={0}
          max={maxPrice}
          step={500}
          value={priceRange}
          onChange={(e) => setPriceRange(Number(e.target.value))}
          className="w-full accent-[#0C3060] cursor-pointer"
        />
      </div>

      <div className="border-t border-slate-100 mb-5" />

      {/* Stops */}
      <div className="mb-5">
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">Stops</p>
        <div className="flex flex-col gap-2.5">
          {stopOptions.map(({ value, label }) => (
            <label key={value} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedStops.includes(value)}
                onChange={() => toggleStop(value)}
                className="w-4 h-4 accent-[#0C3060] cursor-pointer"
              />
              <span className="text-[13px] text-slate-600 font-medium">{label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-100 mb-5" />

      {/* Status */}
      <div>
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">Flight status</p>
        <div className="flex flex-col gap-2.5">
          {statusOptions.map((s) => {
            const cfg = STATUS_CONFIG[s];
            return (
              <label key={s} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedStatus.includes(s)}
                  onChange={() => toggleStatus(s)}
                  className="w-4 h-4 accent-[#0C3060] cursor-pointer"
                />
                <span className="text-[13px] text-slate-600 font-medium">{cfg.label}</span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Flight card ────────────────────────────────────────
function FlightCard({ flight, onBook }) {
  const [expanded, setExpanded] = useState(false);
  const cfg      = STATUS_CONFIG[flight.status] || { label: flight.status, cls: "bg-gray-100 text-gray-600" };
  const stops    = flight.routes?.length > 2 ? flight.routes.length - 2 : 0;
  const stopText = stops === 0 ? "Non-stop" : `${stops} stop${stops > 1 ? "s" : ""}`;
  const isFull   = flight.availableSeats === 0;
  const isLow    = !isFull && flight.availableSeats <= 10;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-blue-300 hover:shadow-md transition-all">
      {/* Main row */}
      <div className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">

          {/* Airline code / flight number */}
          <div className="w-12 h-12 bg-[#EAF2FB] rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-[#0C3060] font-black text-[14px]">
              {flight.flightNumber?.split("-")[0] || "AI"}
            </span>
          </div>

          {/* Route + times */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-1.5">
              <span className="text-[13px] font-bold text-[#0C3060]">{flight.flightNumber}</span>
              <Badge label={cfg.label} cls={cfg.cls} />
              {isLow && !isFull && (
                <span className="text-[11px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                  Only {flight.availableSeats} left!
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Departure */}
              <div className="text-center">
                <p className="text-[20px] font-black text-[#0C3060] leading-none">
                  {new Date(flight.departureTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5 font-medium">{flight.source}</p>
              </div>

              {/* Duration line */}
              <div className="flex-1 flex flex-col items-center min-w-[80px]">
                <p className="text-[10px] text-slate-400 font-medium mb-1">{duration(flight.departureTime, flight.arrivalTime)}</p>
                <div className="relative w-full flex items-center">
                  <div className="flex-1 h-px bg-slate-200" />
                  <svg className="w-3.5 h-3.5 text-[#0C3060] mx-1 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                  </svg>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>
                <p className="text-[10px] text-slate-400 font-medium mt-1">{stopText}</p>
              </div>

              {/* Arrival */}
              <div className="text-center">
                <p className="text-[20px] font-black text-[#0C3060] leading-none">
                  {new Date(flight.arrivalTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5 font-medium">{flight.destination}</p>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mt-1.5">{fmtDate(flight.departureTime)}</p>
          </div>

          {/* Price + book */}
          <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-1 sm:min-w-[130px]">
            <div className="text-right">
              <p className="text-[11px] text-slate-400">per person</p>
              <p className="text-[24px] font-black text-[#0C3060] leading-tight">
                ₹{flight.price?.toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-400">
                {isFull ? (
                  <span className="text-red-500 font-semibold">Sold out</span>
                ) : (
                  <span>{flight.availableSeats} seats left</span>
                )}
              </p>
            </div>
            <button
              onClick={() => onBook(flight)}
              disabled={isFull}
              className={`h-10 px-5 rounded-xl text-[13px] font-bold transition active:scale-95 border-none cursor-pointer whitespace-nowrap
                ${isFull
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                  : "bg-[#0C3060] hover:bg-[#0a2550] text-white shadow-[0_4px_12px_rgba(12,48,96,0.2)]"
                }`}
            >
              {isFull ? "Sold out" : "Book now"}
            </button>
          </div>
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded((e) => !e)}
          className="mt-3 flex items-center gap-1 text-[12px] text-blue-500 font-semibold hover:text-blue-700 transition bg-transparent border-none cursor-pointer"
        >
          {expanded ? "Hide details" : "View details"}
          <svg className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-slate-100 px-5 py-4 bg-[#F8FAFC]">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Aircraft",    value: flight.aircraftId?.registrationNumber || "—" },
              { label: "Model",       value: flight.aircraftId?.model || "—"              },
              { label: "Total seats", value: flight.totalSeats || "—"                     },
              { label: "Flight No.",  value: flight.flightNumber                          },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">{label}</p>
                <p className="text-[13px] font-bold text-[#0C3060]">{value}</p>
              </div>
            ))}
          </div>

          {/* Stops route */}
          {flight.routes?.length > 0 && (
            <div className="mt-4">
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-2">Route</p>
              <div className="flex items-center gap-2 flex-wrap">
                {flight.routes.map((stop, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className={`text-[12px] font-bold px-3 py-1 rounded-full
                      ${i === 0 || i === flight.routes.length - 1
                        ? "bg-[#0C3060] text-white"
                        : "bg-[#EAF2FB] text-[#0C3060]"}`}>
                      {stop}
                    </span>
                    {i < flight.routes.length - 1 && (
                      <svg className="w-3 h-3 text-slate-300 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────
export default function DealsPage() {
  const navigate  = useNavigate();

  // filters
  const [search,         setSearch]         = useState("");
  const [sortBy,         setSortBy]         = useState("departure-asc");
  const [priceRange,     setPriceRange]     = useState(200000);
  const [selectedStops,  setSelectedStops]  = useState([]);
  const [selectedStatus, setSelectedStatus] = useState([]);
  const [dateFrom,       setDateFrom]       = useState("");
  const [dateTo,         setDateTo]         = useState("");
  const [page,           setPage]           = useState(1);
  const [showFilters,    setShowFilters]    = useState(false);

  // fetch only upcoming flights (scheduled + boarding + delayed)
  const { data: scheduledData, isLoading: l1 } = useGetAllFlightsQuery({ status: "scheduled", limit: 200, page: 1 });
  const { data: boardingData,  isLoading: l2 } = useGetAllFlightsQuery({ status: "boarding",  limit: 200, page: 1 });
  const { data: delayedData,   isLoading: l3 } = useGetAllFlightsQuery({ status: "delayed",   limit: 200, page: 1 });

  const isLoading = l1 || l2 || l3;

  const allFlights = useMemo(() => [
    ...(scheduledData?.data ?? []),
    ...(boardingData?.data  ?? []),
    ...(delayedData?.data   ?? []),
  ], [scheduledData, boardingData, delayedData]);

  const maxPrice = useMemo(() =>
    Math.max(...allFlights.map((f) => f.price || 0), 10000),
  [allFlights]);

  // ── Apply filters ──────────────────────────────────
  const filtered = useMemo(() => {
    let result = [...allFlights];

    // search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((f) =>
        f.flightNumber?.toLowerCase().includes(q) ||
        f.source?.toLowerCase().includes(q) ||
        f.destination?.toLowerCase().includes(q)
      );
    }

    // price
    result = result.filter((f) => (f.price || 0) <= priceRange);

    // stops
    if (selectedStops.length > 0) {
      result = result.filter((f) => {
        const stops = Math.max(0, (f.routes?.length || 0) - 2);
        if (selectedStops.includes("0") && stops === 0) return true;
        if (selectedStops.includes("1") && stops === 1) return true;
        if (selectedStops.includes("2") && stops >= 2) return true;
        return false;
      });
    }

    // status
    if (selectedStatus.length > 0) {
      result = result.filter((f) => selectedStatus.includes(f.status));
    }

    // date range
    if (dateFrom) {
      result = result.filter((f) => new Date(f.departureTime) >= new Date(dateFrom));
    }
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59);
      result = result.filter((f) => new Date(f.departureTime) <= end);
    }

    // sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "price-asc":      return (a.price || 0) - (b.price || 0);
        case "price-desc":     return (b.price || 0) - (a.price || 0);
        case "departure-asc":  return new Date(a.departureTime) - new Date(b.departureTime);
        case "departure-desc": return new Date(b.departureTime) - new Date(a.departureTime);
        case "duration-asc": {
          const da = new Date(a.arrivalTime) - new Date(a.departureTime);
          const db = new Date(b.arrivalTime) - new Date(b.departureTime);
          return da - db;
        }
        case "seats-desc": return (b.availableSeats || 0) - (a.availableSeats || 0);
        default: return 0;
      }
    });

    return result;
  }, [allFlights, search, priceRange, selectedStops, selectedStatus, dateFrom, dateTo, sortBy]);

  // pagination (client-side since we fetched all)
  const PER_PAGE    = 10;
  const totalPages  = Math.ceil(filtered.length / PER_PAGE);
  const paginated   = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const activeFilterCount = [
    selectedStops.length > 0,
    selectedStatus.length > 0,
    !!dateFrom,
    !!dateTo,
    priceRange < maxPrice,
  ].filter(Boolean).length;

  const resetFilters = () => {
    setPriceRange(maxPrice);
    setSelectedStops([]);
    setSelectedStatus([]);
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const handleBook = (flight) => {
    navigate(`/flights/${flight._id}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <UserNavbar />

      {/* ── Page header ── */}
      <div className="bg-[#0C3060] px-6 py-10 relative overflow-hidden">
        <div className="absolute w-80 h-80 rounded-full bg-white/[0.04] -top-20 -right-20" />
        <div className="absolute w-48 h-48 rounded-full bg-white/[0.03] bottom-0 left-32" />
        <div className="max-w-6xl mx-auto relative z-10">
          <p className="text-blue-300 text-[11px] font-semibold uppercase tracking-[0.18em] mb-2">Available flights</p>
          <h1 className="text-white text-3xl font-bold mb-1">Deals & upcoming flights</h1>
          <p className="text-blue-200/70 text-[14px]">
            {isLoading ? "Loading..." : `${filtered.length} flight${filtered.length !== 1 ? "s" : ""} available`}
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-7">

        {/* ── Search + sort bar ── */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by flight number, city..."
              className="w-full h-11 border border-slate-200 bg-white rounded-xl pl-10 pr-4 text-[13px] text-[#0C3060] placeholder-slate-400 outline-none focus:border-[#0C3060] focus:ring-2 focus:ring-blue-50 transition"
            />
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
            className="h-11 border border-slate-200 bg-white rounded-xl px-3 text-[13px] text-[#0C3060] outline-none focus:border-[#0C3060] transition cursor-pointer min-w-[190px]"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Mobile filter toggle */}
          <button
            onClick={() => setShowFilters((o) => !o)}
            className="lg:hidden h-11 px-4 border border-slate-200 bg-white rounded-xl text-[13px] text-[#0C3060] font-semibold flex items-center gap-2 transition hover:border-blue-300 cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
            </svg>
            Filters
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 bg-[#0C3060] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        <div className="flex gap-6">

          {/* ── Sidebar filters (desktop) ── */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <FilterPanel
              priceRange={priceRange}     setPriceRange={setPriceRange}
              maxPrice={maxPrice}
              selectedStops={selectedStops}   setSelectedStops={setSelectedStops}
              selectedStatus={selectedStatus} setSelectedStatus={setSelectedStatus}
              dateFrom={dateFrom}   setDateFrom={setDateFrom}
              dateTo={dateTo}       setDateTo={setDateTo}
              onReset={resetFilters}
            />
          </aside>

          {/* ── Mobile filter drawer ── */}
          {showFilters && (
            <div className="lg:hidden fixed inset-0 z-[100] flex">
              <div className="absolute inset-0 bg-black/40" onClick={() => setShowFilters(false)} />
              <div className="relative ml-auto w-80 bg-white h-full overflow-y-auto p-5 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[14px] font-bold text-[#0C3060]">Filters</p>
                  <button onClick={() => setShowFilters(false)} className="text-slate-400 hover:text-[#0C3060] cursor-pointer bg-transparent border-none">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <FilterPanel
                  priceRange={priceRange}     setPriceRange={setPriceRange}
                  maxPrice={maxPrice}
                  selectedStops={selectedStops}   setSelectedStops={setSelectedStops}
                  selectedStatus={selectedStatus} setSelectedStatus={setSelectedStatus}
                  dateFrom={dateFrom}   setDateFrom={setDateFrom}
                  dateTo={dateTo}       setDateTo={setDateTo}
                  onReset={resetFilters}
                />
                <button
                  onClick={() => setShowFilters(false)}
                  className="mt-5 w-full h-11 bg-[#0C3060] text-white text-[13px] font-bold rounded-xl cursor-pointer border-none"
                >
                  Show {filtered.length} flights
                </button>
              </div>
            </div>
          )}

          {/* ── Flight list ── */}
          <div className="flex-1 min-w-0">

            {/* Active filter chips */}
            {activeFilterCount > 0 && (
              <div className="flex items-center gap-2 flex-wrap mb-4">
                <span className="text-[11px] text-slate-400 font-medium">Active:</span>
                {selectedStops.map((s) => (
                  <span key={s} className="flex items-center gap-1.5 bg-blue-50 text-blue-700 text-[11px] font-semibold px-2.5 py-1 rounded-full">
                    {s === "0" ? "Non-stop" : s === "1" ? "1 stop" : "2+ stops"}
                    <button onClick={() => setSelectedStops((p) => p.filter((x) => x !== s))} className="hover:text-blue-900 cursor-pointer bg-transparent border-none leading-none">×</button>
                  </span>
                ))}
                {selectedStatus.map((s) => (
                  <span key={s} className="flex items-center gap-1.5 bg-violet-50 text-violet-700 text-[11px] font-semibold px-2.5 py-1 rounded-full">
                    {STATUS_CONFIG[s]?.label || s}
                    <button onClick={() => setSelectedStatus((p) => p.filter((x) => x !== s))} className="hover:text-violet-900 cursor-pointer bg-transparent border-none leading-none">×</button>
                  </span>
                ))}
                {priceRange < maxPrice && (
                  <span className="flex items-center gap-1.5 bg-green-50 text-green-700 text-[11px] font-semibold px-2.5 py-1 rounded-full">
                    Max ₹{priceRange.toLocaleString()}
                    <button onClick={() => setPriceRange(maxPrice)} className="hover:text-green-900 cursor-pointer bg-transparent border-none leading-none">×</button>
                  </span>
                )}
                {(dateFrom || dateTo) && (
                  <span className="flex items-center gap-1.5 bg-orange-50 text-orange-700 text-[11px] font-semibold px-2.5 py-1 rounded-full">
                    {dateFrom || "—"} → {dateTo || "—"}
                    <button onClick={() => { setDateFrom(""); setDateTo(""); }} className="hover:text-orange-900 cursor-pointer bg-transparent border-none leading-none">×</button>
                  </span>
                )}
                <button onClick={resetFilters} className="text-[11px] text-red-400 font-semibold hover:underline cursor-pointer bg-transparent border-none">Clear all</button>
              </div>
            )}

            {isLoading ? (
              <Spinner />
            ) : paginated.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center">
                <svg className="w-12 h-12 text-slate-200 mx-auto mb-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                </svg>
                <p className="text-[14px] font-bold text-slate-500 mb-1">No flights found</p>
                <p className="text-[12px] text-slate-400">Try adjusting your filters or search term</p>
                <button onClick={resetFilters} className="mt-4 text-[12px] text-blue-500 font-semibold hover:underline cursor-pointer bg-transparent border-none">
                  Reset all filters
                </button>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-3 mb-6">
                  {paginated.map((f) => (
                    <FlightCard key={f._id} flight={f} onBook={handleBook} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between">
                    <p className="text-[12px] text-slate-400">
                      Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length} flights
                    </p>
                    <div className="flex items-center gap-1.5">
                      <button
                        disabled={page === 1}
                        onClick={() => setPage((p) => p - 1)}
                        className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:border-blue-300 hover:text-[#0C3060] transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>

                      {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                        let p;
                        if (totalPages <= 7)        p = i + 1;
                        else if (page <= 4)         p = i + 1;
                        else if (page >= totalPages - 3) p = totalPages - 6 + i;
                        else                        p = page - 3 + i;

                        return (
                          <button
                            key={p}
                            onClick={() => setPage(p)}
                            className={`w-8 h-8 rounded-lg text-[13px] font-semibold transition cursor-pointer border
                              ${page === p
                                ? "bg-[#0C3060] text-white border-[#0C3060]"
                                : "border-slate-200 bg-white text-slate-500 hover:border-blue-300 hover:text-[#0C3060]"
                              }`}
                          >
                            {p}
                          </button>
                        );
                      })}

                      <button
                        disabled={page === totalPages}
                        onClick={() => setPage((p) => p + 1)}
                        className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:border-blue-300 hover:text-[#0C3060] transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}