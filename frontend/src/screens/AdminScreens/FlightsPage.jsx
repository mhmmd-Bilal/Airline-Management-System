// src/pages/admin/FlightsPage.jsx
import { useState, useCallback, useEffect } from "react";
import { Th, Td } from "../../components/admin/shared/AdminTable";
import Badge from "../../components/admin/shared/Badge";
import {
  useGetAllFlightsQuery,
  useGetFlightStatsQuery,
  useCreateFlightMutation,
  useUpdateFlightMutation,
  useDeleteFlightMutation,
} from "../../slices/flightApiSlice";
import { useGetAllAircraftQuery } from "../../slices/aircraftApiSlice";
import { useGetAllCrewQuery } from "../../slices/crewApiSlice";
import { useNavigate } from "react-router-dom";

const statusEnum = [
  "scheduled",
  "delayed",
  "boarding",
  "in-flight",
  "completed",
  "cancelled",
];

const statusBadgeMap = {
  scheduled: "Scheduled",
  delayed: "Delayed",
  boarding: "Boarding",
  "in-flight": "In Flight",
  completed: "Arrived",
  cancelled: "Cancelled",
};

const emptyForm = {
  flightNumber: "",
  source: "",
  destination: "",
  routes: "",
  departureTime: "",
  arrivalTime: "",
  currentStop: "",
  status: "scheduled",
  aircraftId: "",
  totalSeats: "",
  price: "",
  crewIds: [],
};

const generateFlightNumber = (registrationNumber) => {
  const suffix = registrationNumber
    .replace(/[^A-Z0-9]/gi, "")
    .toUpperCase()
    .slice(-3);
  const rand = Math.floor(100 + Math.random() * 900);
  return `AI-${suffix}-${rand}`;
};

const fmt = (dt) =>
  dt
    ? new Date(dt).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const fmtInput = (dt) => (dt ? new Date(dt).toISOString().slice(0, 16) : "");

const inputCls =
  "w-full h-[42px] px-3 text-[13px] text-[#0D1B2A] bg-[#F0F7FF] border border-[#D0E6F7] rounded-[10px] outline-none focus:border-[#1565C0] focus:shadow-[0_0_0_3px_rgba(21,101,192,0.1)] transition placeholder:text-[#B0C4D8]";

// ── Shared UI ──────────────────────────────────────────
function StatCard({ label, value, icon, color }) {
  return (
    <div className="bg-white border border-[#D0E6F7] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-medium text-[#7A90A4] uppercase tracking-[0.6px]">
          {label}
        </p>
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}
        >
          <i className={`ti ${icon} text-[15px]`} />
        </div>
      </div>
      <p className="text-[26px] font-semibold text-[#0D1B2A] leading-none">
        {value}
      </p>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#D0E6F7] flex-shrink-0">
          <p className="text-[14px] font-semibold text-[#0D1B2A]">{title}</p>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-[#D0E6F7] bg-[#F0F7FF] flex items-center justify-center text-[#1565C0] hover:bg-[#E1EFFE] transition"
          >
            <i className="ti ti-x text-[15px]" />
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, error, hint, children }) {
  return (
    <div className="mb-4">
      <label className="block text-[11px] font-medium uppercase tracking-[0.6px] text-[#5A7089] mb-1.5">
        {label}
      </label>
      {children}
      {hint && <p className="text-[10px] text-[#B0C4D8] mt-1">{hint}</p>}
      {error && <p className="text-[11px] text-red-500 mt-1">{error}</p>}
    </div>
  );
}

// ── Aircraft dropdown ──────────────────────────────────
function AircraftSelect({ value, onSelect, editItem }) {
  const { data: availableData, isLoading } = useGetAllAircraftQuery({
    status: "available",
    limit: 100,
  });

  const { data: assignedData } = useGetAllAircraftQuery(
    { status: "assigned", limit: 100 },
    { skip: !editItem },
  );

  const seen = new Set();
  const options = [
    ...(availableData?.data ?? []),
    ...(assignedData?.data ?? []),
  ].filter((a) => {
    if (seen.has(a._id)) return false;
    seen.add(a._id);
    return true;
  });

  const handleChange = (e) => {
    const selectedId = e.target.value;
    if (!selectedId) {
      onSelect(null);
      return;
    }
    const aircraft = options.find((a) => a._id === selectedId);
    onSelect(aircraft ?? null);
  };

  if (isLoading) {
    return (
      <div
        className={`${inputCls} flex items-center text-[#B0C4D8] text-[12px]`}
      >
        Loading aircraft...
      </div>
    );
  }

  if (!isLoading && options.length === 0) {
    return (
      <div className={`${inputCls} flex items-center text-red-400 text-[12px]`}>
        No available aircraft
      </div>
    );
  }

  return (
    <select className={inputCls} value={value} onChange={handleChange}>
      <option value="">— Select aircraft —</option>
      {options.map((a) => (
        <option key={a._id} value={a._id}>
          {a.registrationNumber} · {a.model} · {a.capacity} seats
          {a.status === "assigned" ? " (assigned)" : ""}
        </option>
      ))}
    </select>
  );
}

// ── Crew multi-select ──────────────────────────────────
function CrewSelect({ value, onChange }) {
  const { data: availableData, isLoading: loadingAvailable } =
    useGetAllCrewQuery({
      currentStatus: "Available",
      limit: 100,
    });

  const { data: onDutyData, isLoading: loadingOnDuty } = useGetAllCrewQuery({
    currentStatus: "On Duty",
    limit: 100,
  });

  const isLoading = loadingAvailable || loadingOnDuty;

  const seen = new Set();
  const options = [
    ...(availableData?.data ?? []),
    ...(onDutyData?.data ?? []),
  ].filter((c) => {
    if (seen.has(c._id)) return false;
    seen.add(c._id);
    return true;
  });

  const toggle = (id) => {
    onChange(
      value.includes(id) ? value.filter((v) => v !== id) : [...value, id],
    );
  };

  const resolveName = (c) => c.userId?.name ?? "—";

  if (isLoading) {
    return (
      <div
        className={`${inputCls} flex items-center text-[#B0C4D8] text-[12px]`}
      >
        Loading crew...
      </div>
    );
  }

  if (!isLoading && options.length === 0) {
    return (
      <div
        className={`${inputCls} flex items-center text-[#B0C4D8] text-[12px]`}
      >
        No available crew
      </div>
    );
  }

  return (
    <div className="border border-[#D0E6F7] rounded-[10px] bg-[#F0F7FF] max-h-[180px] overflow-y-auto">
      {options.map((c) => {
        const selected = value.includes(c._id);
        return (
          <label
            key={c._id}
            className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition border-b border-[#EAF4FB] last:border-b-0
              ${selected ? "bg-[#E3F2FD]" : "hover:bg-white"}`}
          >
            <input
              type="checkbox"
              checked={selected}
              onChange={() => toggle(c._id)}
              className="w-3.5 h-3.5 accent-[#1565C0] flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-[#0D1B2A] truncate">
                {resolveName(c)}
              </p>
              <p className="text-[10px] text-[#7A90A4]">
                {c.role} · {c.employeeId}
              </p>
            </div>
            {selected && (
              <i className="ti ti-check text-[#1565C0] text-[13px] flex-shrink-0" />
            )}
          </label>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Move this OUTSIDE FlightForm component
// (place above FlightForm)
// ─────────────────────────────────────────────────────────

const Locked = ({ children, reason }) => (
  <div className="relative group">
    {children}

    {reason && (
      <>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          <i className="ti ti-lock text-[#B0C4D8] text-[12px]" />
        </div>

        <div className="absolute bottom-full left-0 mb-1.5 hidden group-hover:flex items-center z-50">
          <div className="bg-[#0D1B2A] text-white text-[10px] font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
            {reason}
          </div>
        </div>
      </>
    )}
  </div>
);

// ─────────────────────────────────────────────────────────
// FlightForm
// ─────────────────────────────────────────────────────────

function FlightForm({
  form,
  formErrors,
  updateForm,
  updateMultiple,
  editItem,
}) {
  const status = editItem?.status;

  // ── Lock rules per status ──────────────────────────────
  const lock = {
    all: ["completed", "cancelled"].includes(status),

    aircraft: [
      "in-flight",
      "boarding",
      "delayed",
      "completed",
      "cancelled",
    ].includes(status),

    flightNumber: [
      "in-flight",
      "boarding",
      "delayed",
      "completed",
      "cancelled",
    ].includes(status),

    totalSeats: ["in-flight", "boarding", "completed", "cancelled"].includes(
      status,
    ),

    source: [
      "in-flight",
      "boarding",
      "delayed",
      "completed",
      "cancelled",
    ].includes(status),

    destination: [
      "in-flight",
      "boarding",
      "delayed",
      "completed",
      "cancelled",
    ].includes(status),

    departureTime: ["in-flight", "boarding", "completed", "cancelled"].includes(
      status,
    ),

    arrivalTime: [
      "in-flight",
      "boarding",
      "delayed",
      "completed",
      "cancelled",
    ].includes(status),

    price: [
      "in-flight",
      "boarding",
      "delayed",
      "completed",
      "cancelled",
    ].includes(status),

    status: ["completed", "cancelled"].includes(status),

    routes: [
      "in-flight",
      "boarding",
      "delayed",
      "completed",
      "cancelled",
    ].includes(status),

    currentStop: ["completed", "cancelled"].includes(status),

    crew: ["in-flight", "completed", "cancelled"].includes(status),
  };

  // ── Disabled input style ───────────────────────────────
  const disabledCls = "opacity-50 cursor-not-allowed bg-[#F8FAFB] select-none";

  // ── Status banner ──────────────────────────────────────
  const statusMessages = {
    completed: {
      msg: "This flight has completed. All fields are locked.",
      color: "bg-green-50 border-green-200 text-green-800",
      icon: "ti-circle-check text-green-600",
    },

    cancelled: {
      msg: "This flight is cancelled. All fields are locked.",
      color: "bg-red-50 border-red-200 text-red-800",
      icon: "ti-ban text-red-500",
    },

    "in-flight": {
      msg: "Flight is in-flight. Only current stop and status can be edited.",
      color: "bg-indigo-50 border-indigo-200 text-indigo-800",
      icon: "ti-plane text-indigo-600",
    },

    boarding: {
      msg: "Boarding in progress. Only status and crew can be edited.",
      color: "bg-violet-50 border-violet-200 text-violet-800",
      icon: "ti-door-enter text-violet-600",
    },

    delayed: {
      msg: "Flight is delayed. Only departure time, current stop and status can be edited.",
      color: "bg-orange-50 border-orange-200 text-orange-800",
      icon: "ti-clock-pause text-orange-500",
    },
  };

  const lockReason = (field) => {
    const map = {
      completed: "Locked — flight completed",
      cancelled: "Locked — flight cancelled",
      "in-flight": "Locked during flight",
      boarding: "Locked — boarding in progress",
      delayed: "Locked — only departure time editable",
    };

    return lock[field] ? map[status] : undefined;
  };

  const handleAircraftSelect = (aircraft) => {
    if (lock.aircraft) return;

    if (!aircraft) {
      updateMultiple({
        aircraftId: "",
        flightNumber: "",
        totalSeats: "",
      });

      return;
    }

    updateMultiple({
      aircraftId: aircraft._id,
      flightNumber: generateFlightNumber(aircraft.registrationNumber),
      totalSeats: aircraft.capacity,
    });
  };

  return (
    <>
      {/* ── Status restriction banner ── */}
      {status && statusMessages[status] && (
        <div
          className={`flex items-start gap-2.5 px-4 py-3 rounded-xl border mb-5 ${statusMessages[status].color}`}
        >
          <i
            className={`ti ${statusMessages[status].icon} text-[15px] flex-shrink-0 mt-0.5`}
          />
          <p className="text-[12px] font-medium leading-relaxed">
            {statusMessages[status].msg}
          </p>
        </div>
      )}

      {/* ── Aircraft ── */}
      <Field
        label="Aircraft"
        error={formErrors.aircraftId}
        hint={
          lock.aircraft
            ? undefined
            : "Selecting an aircraft auto-fills flight number and seats"
        }
      >
        <div
          className={lock.aircraft ? `${disabledCls} pointer-events-none` : ""}
        >
          <AircraftSelect
            value={form.aircraftId}
            onSelect={handleAircraftSelect}
            editItem={editItem}
            disabled={lock.aircraft}
          />
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-x-4">
        {/* ── Flight number ── */}
        <Field
          label="Flight Number"
          error={formErrors.flightNumber}
          hint={lock.flightNumber ? undefined : "Auto-generated, you can edit"}
        >
          <Locked reason={lockReason("flightNumber")}>
            <input
              className={`${inputCls} pr-9 ${lock.flightNumber ? disabledCls : ""}`}
              placeholder="Select aircraft first"
              value={form.flightNumber}
              disabled={lock.flightNumber}
              onChange={(e) => updateForm("flightNumber", e.target.value)}
            />
            {form.flightNumber && !lock.flightNumber && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-semibold text-[#1565C0] bg-blue-50 px-1.5 py-0.5 rounded-full">
                auto
              </span>
            )}
          </Locked>
        </Field>

        {/* ── Available seats ── */}
        <Field
          label="Available Seats"
          error={formErrors.totalSeats}
          hint={
            lock.totalSeats ? undefined : "Auto-filled from aircraft capacity"
          }
        >
          <Locked reason={lockReason("totalSeats")}>
            <input
              type="number"
              className={`${inputCls} pr-9 ${lock.totalSeats ? disabledCls : ""}`}
              placeholder="Select aircraft first"
              value={form.totalSeats}
              disabled={lock.totalSeats}
              onChange={(e) => updateForm("totalSeats", e.target.value)}
            />
            {form.totalSeats && !lock.totalSeats && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-semibold text-[#1565C0] bg-blue-50 px-1.5 py-0.5 rounded-full">
                auto
              </span>
            )}
          </Locked>
        </Field>

        {/* ── Source ── */}
        <Field label="Source" error={formErrors.source}>
          <Locked reason={lockReason("source")}>
            <input
              className={`${inputCls} ${lock.source ? `${disabledCls} pr-9` : ""}`}
              placeholder="e.g. Delhi"
              value={form.source}
              disabled={lock.source}
              onChange={(e) => updateForm("source", e.target.value)}
            />
          </Locked>
        </Field>

        {/* ── Destination ── */}
        <Field label="Destination" error={formErrors.destination}>
          <Locked reason={lockReason("destination")}>
            <input
              className={`${inputCls} ${lock.destination ? `${disabledCls} pr-9` : ""}`}
              placeholder="e.g. Mumbai"
              value={form.destination}
              disabled={lock.destination}
              onChange={(e) => updateForm("destination", e.target.value)}
            />
          </Locked>
        </Field>

        {/* ── Departure time ── */}
        <Field label="Departure Time" error={formErrors.departureTime}>
          <Locked reason={lockReason("departureTime")}>
            <input
              type="datetime-local"
              className={`${inputCls} ${lock.departureTime ? `${disabledCls} pr-9` : ""}`}
              value={form.departureTime}
              disabled={lock.departureTime}
              onChange={(e) => updateForm("departureTime", e.target.value)}
            />
          </Locked>
        </Field>

        {/* ── Arrival time ── */}
        <Field label="Arrival Time" error={formErrors.arrivalTime}>
          <Locked reason={lockReason("arrivalTime")}>
            <input
              type="datetime-local"
              className={`${inputCls} ${lock.arrivalTime ? `${disabledCls} pr-9` : ""}`}
              value={form.arrivalTime}
              disabled={lock.arrivalTime}
              onChange={(e) => updateForm("arrivalTime", e.target.value)}
            />
          </Locked>
        </Field>

        {/* ── Price ── */}
        <Field label="Price (₹)" error={formErrors.price}>
          <Locked reason={lockReason("price")}>
            <input
              type="number"
              className={`${inputCls} ${lock.price ? `${disabledCls} pr-9` : ""}`}
              placeholder="e.g. 4500"
              value={form.price}
              disabled={lock.price}
              onChange={(e) => updateForm("price", e.target.value)}
            />
          </Locked>
        </Field>

        {/* ── Status ── */}
        <Field label="Status">
          <Locked reason={lockReason("status")}>
            <select
              className={`${inputCls} ${lock.status ? `${disabledCls} pr-9` : ""}`}
              value={form.status}
              disabled={lock.status}
              onChange={(e) => updateForm("status", e.target.value)}
            >
              {statusEnum.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </Locked>
        </Field>
      </div>

      {/* ── Routes ── */}
      <Field
        label="Stops (comma separated IATA codes)"
        hint={
          lock.routes ? undefined : "Include source and destination codes too"
        }
      >
        <Locked reason={lockReason("routes")}>
          <input
            className={`${inputCls} ${lock.routes ? `${disabledCls} pr-9` : ""}`}
            placeholder="e.g. DEL, NAG, BOM"
            value={form.routes}
            disabled={lock.routes}
            onChange={(e) => updateForm("routes", e.target.value)}
          />
        </Locked>
      </Field>

      {/* ── Current stop — only shown when editing ── */}
      {editItem && (
        <Field label="Current Stop">
          <Locked reason={lockReason("currentStop")}>
            <input
              className={`${inputCls} ${lock.currentStop ? `${disabledCls} pr-9` : ""}`}
              placeholder="e.g. NAG"
              value={form.currentStop}
              disabled={lock.currentStop}
              onChange={(e) => updateForm("currentStop", e.target.value)}
            />
          </Locked>
        </Field>
      )}

      {/* ── Crew ── */}
      <Field
        label="Assign Crew"
        hint={
          lock.crew
            ? undefined
            : `${form.crewIds.length} crew member${form.crewIds.length !== 1 ? "s" : ""} selected`
        }
      >
        <div className={lock.crew ? `${disabledCls} pointer-events-none` : ""}>
          <CrewSelect
            value={form.crewIds}
            onChange={(ids) => updateForm("crewIds", ids)}
            disabled={lock.crew}
          />
        </div>
      </Field>

      {formErrors.api && (
        <div className="mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-[12px] text-red-600">
          {formErrors.api}
        </div>
      )}
    </>
  );
}

// ── Route visualiser ───────────────────────────────────
function RouteVisualiser({ flight }) {
  const stops = flight.routes || [];
  const status = flight.status;

  // ── Live clock ────────────────────────────────────────
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!["boarding", "in-flight", "delayed"].includes(status)) return;

    const interval = setInterval(() => {
      setNow(new Date());
    }, 30000);

    return () => clearInterval(interval);
  }, [status]);

  const departure = flight.departureTime
    ? new Date(flight.departureTime)
    : null;

  const arrival = flight.arrivalTime ? new Date(flight.arrivalTime) : null;

  // ── Time based progress ───────────────────────────────
  const timeProgressPct = (() => {
    if (!departure || !arrival) return 0;

    if (status === "completed") return 100;

    if (
      status === "scheduled" ||
      status === "cancelled" ||
      status === "delayed"
    ) {
      return 0;
    }

    const total = arrival - departure;
    const elapsed = now - departure;

    if (total <= 0) return 0;

    if (elapsed <= 0) return 0;

    if (elapsed >= total) return 100;

    return Math.round((elapsed / total) * 100);
  })();

  // ── Current stop index ────────────────────────────────
  const currentStopIdx = (() => {
    if (!flight.currentStop) return -1;

    const normalizedCurrent = String(flight.currentStop).trim().toLowerCase();

    const idx = stops.findIndex(
      (s) => String(s).trim().toLowerCase() === normalizedCurrent,
    );

    if (idx !== -1) return idx;

    const normalizedSource = String(flight.source || "")
      .trim()
      .toLowerCase();

    if (normalizedCurrent === normalizedSource) {
      return 0;
    }

    return -1;
  })();

  const stopBasedIdx =
    currentStopIdx !== -1
      ? currentStopIdx
      : status === "boarding"
        ? 0
        : status === "completed"
          ? stops.length - 1
          : 0;

  // ── FINAL PROGRESS LOGIC ──────────────────────────────
  const progressPct = (() => {
    // Completed
    if (status === "completed") return 100;

    // Not started
    if (
      status === "scheduled" ||
      status === "cancelled" ||
      status === "delayed"
    ) {
      return 0;
    }

    // Boarding
    if (status === "boarding") {
      return 5;
    }

    // No route stops
    if (stops.length <= 1) {
      return Math.min(Math.max(timeProgressPct, 5), 95);
    }

    // In flight
    if (status === "in-flight") {
      const totalSegments = stops.length - 1;

      if (totalSegments <= 0) return 10;

      // Last stop but not completed
      if (stopBasedIdx >= totalSegments) {
        return 95;
      }

      // STRICT STOP PROGRESS
      const pct = ((stopBasedIdx + 1) / (totalSegments + 1)) * 100;

      return Math.min(Math.max(Math.round(pct), 10), 95);
    }

    return 0;
  })();

  // ── Plane position ────────────────────────────────────
  const showPlane = ["boarding", "in-flight"].includes(status);

  const planePct = status === "completed" ? 98 : Math.min(progressPct + 1, 95);

  // ── Status colors ─────────────────────────────────────
  const statusColor =
    {
      scheduled: "#1565C0",
      delayed: "#E65100",
      boarding: "#4527A0",
      "in-flight": "#1565C0",
      completed: "#2E7D32",
      cancelled: "#B71C1C",
    }[status] || "#1565C0";

  // ── Display stops ─────────────────────────────────────
  const displayStops =
    stops.length > 0
      ? stops
      : [flight.source, flight.destination].filter(Boolean);

  // ── Active stop index ─────────────────────────────────
  const activeIdx = (() => {
    if (stops.length > 0) {
      if (status === "in-flight" && stopBasedIdx >= stops.length - 1) {
        return stops.length - 2;
      }

      return stopBasedIdx;
    }

    if (status === "completed") return 1;

    if (status === "boarding") return 0;

    if (status === "in-flight") {
      return timeProgressPct >= 50 ? 1 : 0;
    }

    return -1;
  })();

  return (
    <div className="bg-[#EAF4FB] rounded-2xl p-5 mb-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-center">
          <p className="text-[28px] font-bold text-[#0D1B2A] leading-none">
            {displayStops[0] || flight.source}
          </p>

          <p className="text-[11px] text-[#7A90A4] mt-1">{flight.source}</p>
        </div>

        <div className="flex-1 flex flex-col items-center px-4 gap-1">
          <p className="text-[10px] font-semibold text-[#7A90A4] uppercase tracking-widest">
            {flight.flightNumber}
          </p>

          <Badge label={statusBadgeMap[status] || status} />

          {status === "in-flight" && (
            <p className="text-[10px] text-[#1565C0] font-semibold">
              {progressPct}% complete
            </p>
          )}
        </div>

        <div className="text-center">
          <p className="text-[28px] font-bold text-[#0D1B2A] leading-none">
            {displayStops[displayStops.length - 1] || flight.destination}
          </p>

          <p className="text-[11px] text-[#7A90A4] mt-1">
            {flight.destination}
          </p>
        </div>
      </div>

      {/* Progress Track */}
      <div className="relative mb-5 mx-1">
        <div className="h-1.5 bg-white rounded-full overflow-hidden">
          {status !== "scheduled" &&
            status !== "cancelled" &&
            status !== "delayed" && (
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${progressPct}%`,
                  backgroundColor: statusColor,
                }}
              />
            )}
        </div>

        {/* Plane */}
        {showPlane && (
          <div
            className="absolute -top-3.5 transition-all duration-700"
            style={{
              left: `calc(${planePct}% - 10px)`,
            }}
          >
            <i className="ti ti-plane text-[#1565C0] text-[20px]" />
          </div>
        )}

        {/* Completed icon */}
        {status === "completed" && (
          <div className="absolute -top-3 right-0">
            <i className="ti ti-circle-check text-[#2E7D32] text-[18px]" />
          </div>
        )}
      </div>

      {/* Stops */}
      {displayStops.length > 0 && (
        <div className="relative mt-2">
          <div className="flex items-start justify-between gap-2">
            {displayStops.map((stop, i) => {
              const isPast = activeIdx >= 0 && i < activeIdx;

              const isCurrent = activeIdx >= 0 && i === activeIdx;

              const isFirst = i === 0;

              const isLast = i === displayStops.length - 1;

              const dotFilled =
                isPast ||
                isCurrent ||
                status === "completed" ||
                (status === "boarding" && isFirst);

              const stopLabel =
                stops.length === 0
                  ? isFirst
                    ? "Origin"
                    : "Dest."
                  : isFirst
                    ? "Origin"
                    : isLast
                      ? "Dest."
                      : `Stop ${i}`;

              return (
                <div
                  key={i}
                  className="flex flex-col items-center gap-1.5 flex-1"
                >
                  <div className="relative flex items-center justify-center">
                    {isCurrent && (
                      <div
                        className="absolute w-5 h-5 rounded-full animate-ping"
                        style={{
                          backgroundColor: statusColor,
                          opacity: 0.25,
                        }}
                      />
                    )}

                    <div
                      className="w-3 h-3 rounded-full border-2 relative z-10 transition-all duration-500"
                      style={{
                        borderColor: statusColor,
                        backgroundColor: dotFilled ? statusColor : "white",
                        transform: isCurrent ? "scale(1.3)" : "scale(1)",
                      }}
                    />
                  </div>

                  <p
                    className="text-[12px] font-bold text-center"
                    style={{
                      color: isCurrent
                        ? statusColor
                        : isPast
                          ? "#0D1B2A"
                          : "#7A90A4",
                    }}
                  >
                    {stop}
                  </p>

                  <p className="text-[9px] text-[#B0C4D8] text-center">
                    {stopLabel}
                  </p>

                  {isCurrent && status !== "cancelled" && (
                    <span
                      className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                      style={{
                        backgroundColor: `${statusColor}20`,
                        color: statusColor,
                      }}
                    >
                      Here
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Connector Lines */}
          <div className="absolute top-[5px] left-0 right-0 flex pointer-events-none px-[6px]">
            {displayStops.slice(0, -1).map((_, i) => {
              const segFilled =
                status === "completed" || (activeIdx >= 0 && i < activeIdx);

              return (
                <div
                  key={i}
                  className="h-0.5 flex-1 mx-1 rounded-full transition-all duration-500"
                  style={{
                    backgroundColor: segFilled ? statusColor : "#D0E6F7",
                  }}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Times */}
      <div className="flex justify-between mt-4 pt-3 border-t border-white/60">
        <div>
          <p className="text-[10px] text-[#7A90A4] uppercase tracking-wider mb-0.5">
            Departure
          </p>

          <p className="text-[12px] font-semibold text-[#0D1B2A]">
            {fmt(flight.departureTime)}
          </p>
        </div>

        <div className="text-right">
          <p className="text-[10px] text-[#7A90A4] uppercase tracking-wider mb-0.5">
            Arrival
          </p>

          <p className="text-[12px] font-semibold text-[#0D1B2A]">
            {fmt(flight.arrivalTime)}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────
export default function FlightsPage() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [viewItem, setViewItem] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});

  const navigate = useNavigate();

  const {
    data: listData,
    isLoading: listLoading,
    isError: listError,
  } = useGetAllFlightsQuery({ status: filterStatus, search, page, limit: 10 });
  const { data: statsData, isLoading: statsLoading } = useGetFlightStatsQuery();

  const [createFlight, { isLoading: creating }] = useCreateFlightMutation();
  const [updateFlight, { isLoading: updating }] = useUpdateFlightMutation();
  const [deleteFlight, { isLoading: deleting }] = useDeleteFlightMutation();

  const flights = listData?.data ?? [];
  const totalCount = listData?.total ?? 0;
  const totalPages = listData?.totalPages ?? 1;
  const sv = statsData?.data;

  const stats = [
    {
      label: "Total Flights",
      value: statsLoading ? "—" : (sv?.total ?? "—"),
      icon: "ti-plane",
      color: "bg-blue-50 text-blue-700",
    },
    {
      label: "Scheduled",
      value: statsLoading ? "—" : (sv?.scheduled ?? "—"),
      icon: "ti-calendar",
      color: "bg-green-50 text-green-700",
    },
    {
      label: "In Flight",
      value: statsLoading ? "—" : (sv?.inFlight ?? "—"),
      icon: "ti-plane-departure",
      color: "bg-violet-50 text-violet-700",
    },
    {
      label: "Delayed/Cancelled",
      value: statsLoading ? "—" : (sv?.delayed ?? 0) + (sv?.cancelled ?? 0),
      icon: "ti-alert-triangle",
      color: "bg-red-50 text-red-700",
    },
  ];

  const updateForm = useCallback((k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    setFormErrors((p) => ({ ...p, [k]: undefined }));
  }, []);

  const updateMultiple = useCallback((fields) => {
    setForm((p) => ({ ...p, ...fields }));
    setFormErrors((p) => {
      const cleared = { ...p };
      Object.keys(fields).forEach((k) => delete cleared[k]);
      return cleared;
    });
  }, []);

  const validateForm = () => {
    const e = {};
    if (!form.flightNumber.trim()) e.flightNumber = "Flight number is required";
    if (!form.aircraftId) e.aircraftId = "Please select an aircraft";
    if (!form.source.trim()) e.source = "Source is required";
    if (!form.destination.trim()) e.destination = "Destination is required";
    if (!form.departureTime) e.departureTime = "Departure time is required";
    if (!form.arrivalTime) e.arrivalTime = "Arrival time is required";
    if (!form.totalSeats) e.totalSeats = "Available seats is required";
    if (!form.price) e.price = "Price is required";
    if (
      form.departureTime &&
      form.arrivalTime &&
      new Date(form.arrivalTime) <= new Date(form.departureTime)
    ) {
      e.arrivalTime = "Arrival must be after departure";
    }
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  const buildPayload = () => ({
    flightNumber: form.flightNumber,
    source: form.source,
    destination: form.destination,
    routes: form.routes ? form.routes.split(",").map((r) => r.trim()) : [],
    departureTime: form.departureTime,
    arrivalTime: form.arrivalTime,
    status: form.status,
    aircraftId: form.aircraftId || null,
    totalSeats: Number(form.totalSeats),
    price: Number(form.price),
    crewIds: form.crewIds,
    ...(form.currentStop ? { currentStop: form.currentStop } : {}),
  });

  const handleAdd = async () => {
    if (!validateForm()) return;
    try {
      await createFlight(buildPayload()).unwrap();
      setShowAdd(false);
      setForm(emptyForm);
      setFormErrors({});
    } catch (err) {
      setFormErrors({ api: err?.data?.message ?? "Failed to schedule flight" });
    }
  };

  const handleEdit = async () => {
    if (!validateForm()) return;
    try {
      await updateFlight({ id: editItem._id, ...buildPayload() }).unwrap();
      setEditItem(null);
      setForm(emptyForm);
      setFormErrors({});
    } catch (err) {
      setFormErrors({ api: err?.data?.message ?? "Failed to update flight" });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteFlight(deleteItem._id).unwrap();
      setDeleteItem(null);
    } catch (err) {
      setFormErrors({
        deleteApi: err?.data?.message ?? "Failed to delete flight",
      });
    }
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      flightNumber: item.flightNumber,
      source: item.source,
      destination: item.destination,
      routes: Array.isArray(item.routes) ? item.routes.join(", ") : "",
      departureTime: fmtInput(item.departureTime),
      arrivalTime: fmtInput(item.arrivalTime),
      currentStop: item.currentStop || "",
      status: item.status,
      aircraftId: item.aircraftId?._id || "",
      totalSeats: item.totalSeats,
      price: item.price,
      crewIds: item.crewIds?.map((c) => c._id ?? c) ?? [],
    });
    setFormErrors({});
  };

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-7">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-[#D0E6F7] rounded-2xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <p className="text-[11px] font-semibold text-[#5A7089] uppercase tracking-[0.8px]">
            All flights
          </p>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="relative">
              <i className="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-[#B0C4D8] text-[14px]" />
              <input
                className="h-9 pl-8 pr-3 text-[12px] bg-[#F0F7FF] border border-[#D0E6F7] rounded-lg outline-none focus:border-[#1565C0] transition w-44 placeholder:text-[#B0C4D8] text-[#0D1B2A]"
                placeholder="Search flights..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <select
              className="h-9 px-3 text-[12px] bg-[#F0F7FF] border border-[#D0E6F7] rounded-lg outline-none focus:border-[#1565C0] transition text-[#0D1B2A]"
              value={filterStatus}
              onChange={(e) => {
                setFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All status</option>
              {statusEnum.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                setForm(emptyForm);
                setFormErrors({});
                setShowAdd(true);
              }}
              className="h-9 px-4 bg-[#1565C0] hover:bg-[#1251A3] text-white text-[12px] font-semibold rounded-lg flex items-center gap-1.5 transition active:scale-[0.98] border-none cursor-pointer"
            >
              <i className="ti ti-plus text-[14px]" />
              Add Flight
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr>
                <Th>Flight No.</Th>
                <Th>Source</Th>
                <Th>Destination</Th>
                <Th>Aircraft</Th>
                <Th>Departure</Th>
                <Th>Arrival</Th>
                <Th>Seats</Th>
                <Th>Price</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {listLoading ? (
                <tr>
                  <td
                    colSpan={10}
                    className="text-center py-10 text-[13px] text-[#7A90A4]"
                  >
                    Loading...
                  </td>
                </tr>
              ) : listError ? (
                <tr>
                  <td
                    colSpan={10}
                    className="text-center py-10 text-[13px] text-red-400"
                  >
                    Failed to load flights.
                  </td>
                </tr>
              ) : flights.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="text-center py-10 text-[13px] text-[#7A90A4]"
                  >
                    No flights found
                  </td>
                </tr>
              ) : (
                flights.map((f) => (
                  <tr key={f._id}>
                    <Td>
                      <span className="font-semibold text-[#1565C0]">
                        {f.flightNumber}
                      </span>
                    </Td>
                    <Td>{f.source}</Td>
                    <Td>{f.destination}</Td>
                    <Td className="text-[#7A90A4]">
                      {f.aircraftId?.registrationNumber || "—"}
                    </Td>
                    <Td className="text-[#7A90A4]">{fmt(f.departureTime)}</Td>
                    <Td className="text-[#7A90A4]">{fmt(f.arrivalTime)}</Td>
                    <Td>
                      <span
                        className={`text-[12px] font-semibold ${f.totalSeats === 0 ? "text-red-500" : "text-green-700"}`}
                      >
                        {`${f.availableSeats} / ${f.totalSeats}`}
                      </span>
                    </Td>
                    <Td className="text-[#7A90A4]">
                      ₹{f.price?.toLocaleString()}
                    </Td>
                    <Td>
                      <Badge label={statusBadgeMap[f.status] || f.status} />
                    </Td>
                    <Td>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => navigate(`/flights/${f._id}`)}
                          className="w-7 h-7 rounded-md border border-[#D0E6F7] bg-[#F0F7FF] flex items-center justify-center text-[#1565C0] hover:bg-[#E1EFFE] transition"
                          title="View details"
                        >
                          <i className="ti ti-eye text-[13px]" />
                        </button>
                        {/* <button
                          onClick={() => setViewItem(f)}
                          className="w-7 h-7 rounded-md border border-[#D0E6F7] bg-[#F0F7FF] flex items-center justify-center text-[#1565C0] hover:bg-[#E1EFFE] transition"
                          title="View"
                        >
                          <i className="ti ti-eye text-[13px]" />
                        </button> */}
                        <button
                          onClick={() => openEdit(f)}
                          className="w-7 h-7 rounded-md border border-[#D0E6F7] bg-[#F0F7FF] flex items-center justify-center text-[#1565C0] hover:bg-[#E1EFFE] transition"
                          title="Edit"
                        >
                          <i className="ti ti-edit text-[13px]" />
                        </button>
                        <button
                          onClick={() => setDeleteItem(f)}
                          className="w-7 h-7 rounded-md border border-red-100 bg-red-50 flex items-center justify-center text-red-500 hover:bg-red-100 transition"
                          title="Delete"
                        >
                          <i className="ti ti-trash text-[13px]" />
                        </button>
                      </div>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-4">
          <p className="text-[11px] text-[#B0C4D8]">
            Showing {flights.length} of {totalCount} flights
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="w-7 h-7 rounded-md border border-[#D0E6F7] bg-[#F0F7FF] flex items-center justify-center text-[#1565C0] hover:bg-[#E1EFFE] transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <i className="ti ti-chevron-left text-[13px]" />
              </button>
              <span className="text-[12px] text-[#7A90A4] px-1">
                {page} / {totalPages}
              </span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="w-7 h-7 rounded-md border border-[#D0E6F7] bg-[#F0F7FF] flex items-center justify-center text-[#1565C0] hover:bg-[#E1EFFE] transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <i className="ti ti-chevron-right text-[13px]" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Add Modal ── */}
      {showAdd && (
        <Modal title="Schedule new flight" onClose={() => setShowAdd(false)}>
          <FlightForm
            form={form}
            formErrors={formErrors}
            updateForm={updateForm}
            updateMultiple={updateMultiple}
            editItem={null}
          />
          <div className="flex gap-3 mt-2">
            <button
              onClick={() => setShowAdd(false)}
              className="flex-1 h-10 border border-[#D0E6F7] bg-[#F0F7FF] text-[#1565C0] text-[13px] font-medium rounded-[10px] hover:bg-[#E1EFFE] transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={creating}
              className="flex-1 h-10 bg-[#1565C0] hover:bg-[#1251A3] text-white text-[13px] font-semibold rounded-[10px] shadow-[0_4px_16px_rgba(21,101,192,0.25)] transition cursor-pointer border-none disabled:opacity-60"
            >
              {creating ? "Scheduling..." : "Schedule Flight"}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Edit Modal ── */}
      {editItem && (
        <Modal
          title={`Edit — ${editItem.flightNumber}`}
          onClose={() => setEditItem(null)}
        >
          <FlightForm
            form={form}
            formErrors={formErrors}
            updateForm={updateForm}
            updateMultiple={updateMultiple}
            editItem={editItem}
          />
          <div className="flex gap-3 mt-2">
            <button
              onClick={() => setEditItem(null)}
              className="flex-1 h-10 border border-[#D0E6F7] bg-[#F0F7FF] text-[#1565C0] text-[13px] font-medium rounded-[10px] hover:bg-[#E1EFFE] transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleEdit}
              disabled={updating}
              className="flex-1 h-10 bg-[#1565C0] hover:bg-[#1251A3] text-white text-[13px] font-semibold rounded-[10px] shadow-[0_4px_16px_rgba(21,101,192,0.25)] transition cursor-pointer border-none disabled:opacity-60"
            >
              {updating ? "Saving..." : "Save changes"}
            </button>
          </div>
        </Modal>
      )}

      {/* ── View Modal ── */}
      {viewItem && (
        <Modal
          title={`Flight details — ${viewItem.flightNumber}`}
          onClose={() => setViewItem(null)}
        >
          <RouteVisualiser flight={viewItem} />
          <div className="flex flex-col">
            {[
              ["Aircraft", viewItem.aircraftId?.registrationNumber || "—"],
              ["Aircraft model", viewItem.aircraftId?.model || "—"],
              [
                "Available seats",
                viewItem.availableSeats === 0
                  ? "Full"
                  : viewItem.availableSeats,
              ],
              ["Price", `₹${viewItem.price?.toLocaleString()}`],
              ["Current stop", viewItem.currentStop || "—"],
              [
                "Crew assigned",
                viewItem.crewIds?.length > 0
                  ? viewItem.crewIds
                      .map((c) => c.userId?.name ?? c.name ?? c)
                      .join(", ")
                  : "Not assigned",
              ],
              [
                "Total stops",
                viewItem.routes?.length > 2
                  ? `${viewItem.routes.length - 2} stop${viewItem.routes.length - 2 > 1 ? "s" : ""}`
                  : "Non-stop",
              ],
            ].map(([label, value], i) => (
              <div
                key={label}
                className={`flex justify-between items-center py-2.5 ${i > 0 ? "border-t border-[#EAF4FB]" : ""}`}
              >
                <span className="text-[12px] font-medium text-[#5A7089]">
                  {label}
                </span>
                <span className="text-[12px] font-semibold text-[#0D1B2A] text-right max-w-[60%]">
                  {value}
                </span>
              </div>
            ))}
          </div>
          <button
            onClick={() => setViewItem(null)}
            className="mt-5 w-full h-10 bg-[#F0F7FF] border border-[#D0E6F7] text-[#1565C0] text-[13px] font-medium rounded-[10px] hover:bg-[#E1EFFE] transition cursor-pointer"
          >
            Close
          </button>
        </Modal>
      )}

      {/* ── Delete Modal ── */}
      {deleteItem && (
        <Modal title="Confirm deletion" onClose={() => setDeleteItem(null)}>
          <div className="flex flex-col items-center text-center py-2">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
              <i className="ti ti-plane-off text-red-500 text-[22px]" />
            </div>
            <p className="text-[14px] font-semibold text-[#0D1B2A] mb-1">
              Remove flight {deleteItem.flightNumber}?
            </p>
            <p className="text-[12px] text-[#7A90A4] mb-6">
              This will permanently remove{" "}
              <span className="font-medium text-[#0D1B2A]">
                {deleteItem.source} → {deleteItem.destination}
              </span>{" "}
              from the schedule.
            </p>
            {formErrors.deleteApi && (
              <div className="w-full mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-[12px] text-red-600">
                {formErrors.deleteApi}
              </div>
            )}
            <div className="flex gap-3 w-full">
              <button
                onClick={() => {
                  setDeleteItem(null);
                  setFormErrors({});
                }}
                className="flex-1 h-10 border border-[#D0E6F7] bg-[#F0F7FF] text-[#1565C0] text-[13px] font-medium rounded-[10px] hover:bg-[#E1EFFE] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 h-10 bg-red-500 hover:bg-red-600 text-white text-[13px] font-semibold rounded-[10px] transition cursor-pointer border-none disabled:opacity-60"
              >
                {deleting ? "Removing..." : "Yes, remove"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
