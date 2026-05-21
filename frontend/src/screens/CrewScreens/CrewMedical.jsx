import { useState } from "react";
import { useSelector } from "react-redux";
import { Card, SectionLabel, InfoRow } from "../../components/crew/CrewShared";
import { fmtDate } from "../../components/crew/crewConstants";
import { useGetCrewByUserIdQuery } from "../../slices/crewApiSlice";
import { useGetFlightsByCrewIdQuery } from "../../slices/flightApiSlice";
import {
  useCreateMedicalRecordMutation,
  useGetMyMedicalRecordsQuery,
} from "../../slices/medicalApiSlice";
import Loader from "../../components/Loader";

// ── Helpers ────────────────────────────────────────────
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

const fmtShortDate = (dt) =>
  dt
    ? new Date(dt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const RECORD_STATUS = {
  open: {
    label: "Open",
    cls: "bg-blue-100 text-blue-700",
    icon: "ti-circle-dot",
  },
  reviewed: {
    label: "Reviewed",
    cls: "bg-amber-100 text-amber-700",
    icon: "ti-eye",
  },
  resolved: {
    label: "Resolved",
    cls: "bg-green-100 text-green-700",
    icon: "ti-circle-check",
  },
};

const USER_TYPE_CFG = {
  passenger: {
    label: "Passenger",
    cls: "bg-slate-100 text-slate-600",
    icon: "ti-armchair",
  },
  crew: {
    label: "Crew",
    cls: "bg-blue-100 text-blue-700",
    icon: "ti-id-badge",
  },
};

const inputCls =
  "w-full h-11 px-3 text-[13px] text-[#0D1B2A] bg-[#EAF4FB] border border-[#D0E6F7] rounded-xl outline-none focus:border-[#1565C0] focus:ring-2 focus:ring-blue-100 transition placeholder:text-[#B0C4D8]";

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#D0E6F7] flex-shrink-0">
          <p className="text-[14px] font-bold text-[#0D1B2A]">{title}</p>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-[#D0E6F7] bg-[#F0F7FF] flex items-center justify-center text-[#1565C0] hover:bg-[#E1EFFE] transition cursor-pointer"
          >
            <i className="ti ti-x text-[14px]" />
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, required, hint, error, children }) {
  return (
    <div className="mb-4">
      <label className="block text-[11px] font-bold text-[#5A7089] uppercase tracking-[0.6px] mb-1.5">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-[10px] text-[#B0C4D8] mt-1">{hint}</p>}
      {error && (
        <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
          <i className="ti ti-alert-circle text-[12px]" />
          {error}
        </p>
      )}
    </div>
  );
}

// ── New incident form ──────────────────────────────────
function NewIncidentForm({ crewId, preselectedFlight, onSuccess, onCancel }) {
  const [form, setForm] = useState({
    userType: "passenger",
    symptoms: "",
    diagnosis: "",
    treatment: "",
    flightId: preselectedFlight?._id || "",
  });
  const [errors, setErrors] = useState({});

  const [createRecord, { isLoading }] = useCreateMedicalRecordMutation();

  // ── Fetch ALL assigned flights for selection ──────────
  // all statuses so crew can also report on completed flights
  const { data: allFlightsData, isLoading: flightsLoading } =
    useGetFlightsByCrewIdQuery(
      { crewId, status: "all", limit: 50, page: 1 },
      { skip: !crewId },
    );

  const allFlights = allFlightsData?.data ?? [];

  // ── Group flights for the dropdown ───────────────────
  const FLIGHT_STATUS_ORDER = [
    "boarding",
    "in-flight",
    "scheduled",
    "delayed",
    "completed",
    "cancelled",
  ];
  const STATUS_LABEL = {
    "in-flight": "In Flight",
    boarding: "Boarding",
    scheduled: "Scheduled",
    delayed: "Delayed",
    completed: "Completed",
    cancelled: "Cancelled",
  };

  const flightsByStatus = FLIGHT_STATUS_ORDER.reduce((acc, s) => {
    const group = allFlights.filter((f) => f.status === s);
    if (group.length > 0) acc[s] = group;
    return acc;
  }, {});

  const selectedFlight =
    allFlights.find((f) => f._id === form.flightId) || null;

  const set = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!form.symptoms.trim()) e.symptoms = "Symptoms are required";
    if (!form.treatment.trim()) e.treatment = "Treatment given is required";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      await createRecord({
        userType: form.userType,
        symptoms: form.symptoms.trim(),
        diagnosis: form.diagnosis.trim(),
        treatment: form.treatment.trim(),
        flightId: form.flightId || undefined,
      }).unwrap();
      onSuccess();
    } catch (err) {
      setErrors({
        api: err?.data?.message ?? "Failed to submit incident report",
      });
    }
  };

  return (
    <div>
      {/* Urgency notice */}
      <div className="mb-5 bg-red-50 border border-red-200 rounded-xl p-3.5 flex items-start gap-3">
        <i className="ti ti-alert-triangle text-red-500 text-[17px] flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-[12px] font-bold text-red-700">
            Medical incident report
          </p>
          <p className="text-[11px] text-red-500 mt-0.5 leading-relaxed">
            For life-threatening emergencies, contact the captain immediately
            and request priority landing.
          </p>
        </div>
      </div>

      {/* Patient type */}
      <Field label="Patient type" required>
        <div className="flex gap-2">
          {[
            { v: "passenger", label: "Passenger", icon: "ti-armchair" },
            { v: "crew", label: "Crew", icon: "ti-id-badge" },
          ].map(({ v, label, icon }) => (
            <button
              key={v}
              onClick={() => set("userType", v)}
              className={`flex-1 flex items-center justify-center gap-2 h-11 rounded-xl text-[13px] font-semibold border transition cursor-pointer
                ${
                  form.userType === v
                    ? "bg-[#1565C0] text-white border-[#1565C0]"
                    : "bg-[#EAF4FB] text-[#5A7089] border-[#D0E6F7] hover:border-[#1565C0] hover:text-[#1565C0]"
                }`}
            >
              <i className={`ti ${icon} text-[14px]`} />
              {label}
            </button>
          ))}
        </div>
      </Field>

      {/* Flight selector */}
      <Field
        label="Linked flight"
        hint="Select the flight on which this incident occurred"
      >
        {flightsLoading ? (
          <div className="h-11 bg-[#EAF4FB] border border-[#D0E6F7] rounded-xl flex items-center px-3 gap-2 text-[12px] text-[#B0C4D8]">
            <div className="w-3.5 h-3.5 border-2 border-[#B0C4D8] border-t-[#1565C0] rounded-full animate-spin" />
            Loading flights…
          </div>
        ) : allFlights.length === 0 ? (
          <div className="h-11 bg-[#EAF4FB] border border-[#D0E6F7] rounded-xl flex items-center px-3 text-[12px] text-[#B0C4D8]">
            <i className="ti ti-plane-off text-[14px] mr-2" /> No assigned
            flights found
          </div>
        ) : (
          <select
            className={inputCls + " cursor-pointer"}
            value={form.flightId}
            onChange={(e) => set("flightId", e.target.value)}
          >
            <option value="">— Not linked to a flight —</option>
            {Object.entries(flightsByStatus).map(([status, flights]) => (
              <optgroup
                key={status}
                label={`── ${STATUS_LABEL[status] || status} ──`}
              >
                {flights.map((f) => (
                  <option key={f._id} value={f._id}>
                    {f.flightNumber} · {f.source} → {f.destination}
                    {" · "}
                    {fmtShortDate(f.departureTime)}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        )}

        {/* Selected flight preview pill */}
        {selectedFlight && (
          <div className="mt-2 flex items-center gap-2.5 bg-[#EAF4FB] border border-[#D0E6F7] rounded-xl px-3 py-2.5">
            <div
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0
              ${
                {
                  "in-flight": "bg-blue-100 text-blue-700",
                  boarding: "bg-violet-100 text-violet-700",
                  scheduled: "bg-slate-100 text-slate-600",
                  delayed: "bg-orange-100 text-orange-700",
                  completed: "bg-green-100 text-green-700",
                  cancelled: "bg-red-100 text-red-600",
                }[selectedFlight.status] || "bg-slate-100 text-slate-600"
              }`}
            >
              {STATUS_LABEL[selectedFlight.status] || selectedFlight.status}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-bold text-[#0D1B2A]">
                {selectedFlight.flightNumber}
                <span className="font-normal text-[#7A90A4] ml-1.5">
                  {selectedFlight.source} → {selectedFlight.destination}
                </span>
              </p>
              <p className="text-[10px] text-[#B0C4D8]">
                {fmt(selectedFlight.departureTime)}
              </p>
            </div>
            <button
              onClick={() => set("flightId", "")}
              className="text-[#B0C4D8] hover:text-red-400 transition cursor-pointer bg-transparent border-none flex-shrink-0"
              title="Clear selection"
            >
              <i className="ti ti-x text-[13px]" />
            </button>
          </div>
        )}
      </Field>

      {/* Symptoms */}
      <Field
        label="Symptoms / Observations"
        required
        error={errors.symptoms}
        hint="Describe what you observed — pain, breathing difficulty, unconsciousness, etc."
      >
        <textarea
          className="w-full px-3 py-3 text-[13px] text-[#0D1B2A] bg-[#EAF4FB] border border-[#D0E6F7] rounded-xl outline-none focus:border-[#1565C0] focus:ring-2 focus:ring-blue-100 transition placeholder:text-[#B0C4D8] resize-none leading-relaxed"
          rows={3}
          placeholder="e.g. Passenger complaining of chest pain and shortness of breath…"
          value={form.symptoms}
          onChange={(e) => set("symptoms", e.target.value)}
        />
      </Field>

      {/* Diagnosis */}
      <Field
        label="Preliminary diagnosis"
        hint="Optional — leave blank if uncertain"
      >
        <input
          className={inputCls}
          placeholder="e.g. Suspected cardiac event, hypoglycaemia…"
          value={form.diagnosis}
          onChange={(e) => set("diagnosis", e.target.value)}
        />
      </Field>

      {/* Treatment */}
      <Field
        label="Treatment provided"
        required
        error={errors.treatment}
        hint="First aid given, oxygen administered, medication used, etc."
      >
        <textarea
          className="w-full px-3 py-3 text-[13px] text-[#0D1B2A] bg-[#EAF4FB] border border-[#D0E6F7] rounded-xl outline-none focus:border-[#1565C0] focus:ring-2 focus:ring-blue-100 transition placeholder:text-[#B0C4D8] resize-none leading-relaxed"
          rows={3}
          placeholder="e.g. Administered oxygen, seated upright, ground medical team alerted…"
          value={form.treatment}
          onChange={(e) => set("treatment", e.target.value)}
        />
      </Field>

      {errors.api && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-[12px] text-red-600 flex items-center gap-2">
          <i className="ti ti-alert-circle text-[14px] flex-shrink-0" />{" "}
          {errors.api}
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button
          onClick={onCancel}
          className="flex-1 h-11 border border-[#D0E6F7] bg-[#F0F7FF] text-[#1565C0] text-[13px] font-semibold rounded-xl cursor-pointer hover:bg-[#E1EFFE] transition"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className="flex-1 h-11 bg-[#1565C0] hover:bg-[#1251A3] text-white text-[13px] font-bold rounded-xl border-none cursor-pointer disabled:opacity-60 transition flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Submitting…
            </>
          ) : (
            <>
              <i className="ti ti-send text-[14px]" />
              Submit report
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ── Incident record card ───────────────────────────────
function IncidentCard({ record }) {
  const [expanded, setExpanded] = useState(false);
  const stCfg = RECORD_STATUS[record.status] || RECORD_STATUS.open;
  const typeCfg = USER_TYPE_CFG[record.userType] || USER_TYPE_CFG.passenger;

  return (
    <div
      className={`bg-white border rounded-2xl overflow-hidden transition-all
      ${record.status === "open" ? "border-blue-200" : "border-[#D0E6F7]"}`}
    >
      {/* ── Collapsed header ── */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-[#F8FBFF] transition"
        onClick={() => setExpanded((e) => !e)}
      >
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${typeCfg.cls}`}
        >
          <i className={`ti ${typeCfg.icon} text-[16px]`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${stCfg.cls}`}
            >
              <i className={`ti ${stCfg.icon} text-[10px]`} />
              {stCfg.label}
            </span>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${typeCfg.cls}`}
            >
              {typeCfg.label}
            </span>
            {record.flightId && (
              <span className="text-[10px] font-semibold text-[#1565C0] bg-blue-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                <i className="ti ti-plane text-[10px]" />
                {record.flightId.flightNumber}
              </span>
            )}
            {/* Admin has responded indicator */}
            {record.adminMessage && (
              <span className="text-[10px] font-bold text-[#1565C0] bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                <i className="ti ti-message-circle text-[10px]" />
                Admin replied
              </span>
            )}
          </div>
          <p className="text-[13px] font-semibold text-[#0D1B2A] truncate">
            {record.symptoms?.slice(0, 60)}
            {record.symptoms?.length > 60 ? "…" : ""}
          </p>
          <p className="text-[10px] text-[#B0C4D8] mt-0.5">
            {fmt(record.createdAt)}
          </p>
        </div>
        <i
          className={`ti ti-chevron-down text-[#B0C4D8] text-[14px] flex-shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </div>

      {/* ── Expanded body ── */}
      {expanded && (
        <div className="border-t border-[#EAF4FB] bg-[#F8FBFF]">
          {/* Medical details */}
          <div className="px-4 pt-4 pb-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                label: "Symptoms",
                value: record.symptoms,
                icon: "ti-stethoscope",
                color: "text-red-500",
              },
              {
                label: "Diagnosis",
                value: record.diagnosis || "—",
                icon: "ti-clipboard-list",
                color: "text-amber-500",
              },
              {
                label: "Treatment given",
                value: record.treatment,
                icon: "ti-pill",
                color: "text-green-600",
              },
            ].map(({ label, value, icon, color }) => (
              <div
                key={label}
                className="bg-white border border-[#D0E6F7] rounded-xl p-3"
              >
                <p className="flex items-center gap-1.5 text-[10px] font-bold text-[#7A90A4] uppercase tracking-wider mb-1.5">
                  <i className={`ti ${icon} text-[12px] ${color}`} />
                  {label}
                </p>
                <p className="text-[12px] text-[#0D1B2A] leading-relaxed">
                  {value || "—"}
                </p>
              </div>
            ))}
          </div>

          {/* ── Admin message — visually distinct block ── */}
          {record.adminMessage ? (
            <div className="mx-4 mb-4 bg-[#0D2540] rounded-xl overflow-hidden">
              {/* Header strip */}
              <div className="flex items-center gap-2 px-4 py-2.5 bg-[#1565C0]">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <i className="ti ti-headset text-white text-[11px]" />
                </div>
                <p className="text-[11px] font-bold text-white uppercase tracking-wider">
                  Admin response
                </p>
                {record.attendedAt && (
                  <span className="ml-auto text-[10px] text-blue-200 flex items-center gap-1">
                    <i className="ti ti-clock text-[10px]" />
                    Attended {fmt(record.attendedAt)}
                  </span>
                )}
              </div>
              {/* Message body */}
              <div className="px-4 py-3.5">
                <p className="text-[13px] text-white/90 leading-relaxed">
                  {record.adminMessage}
                </p>
              </div>
            </div>
          ) : (
            /* No admin response yet */
            <div className="mx-4 mb-4 bg-white border border-dashed border-[#D0E6F7] rounded-xl px-4 py-3 flex items-center gap-2.5 text-[12px] text-[#B0C4D8]">
              <i className="ti ti-clock-pause text-[15px]" />
              <span>Awaiting admin response</span>
              {record.status === "open" && (
                <span className="ml-auto flex items-center gap-1 text-[10px] font-semibold text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                  Under review
                </span>
              )}
            </div>
          )}

          {/* Flight info strip */}
          {record.flightId && (
            <div className="mx-4 mb-4 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5 flex items-center gap-2 text-[12px]">
              <i className="ti ti-plane text-[#1565C0] text-[14px]" />
              <span className="font-bold text-[#1565C0]">
                {record.flightId.flightNumber}
              </span>
              <span className="text-[#7A90A4]">—</span>
              <span className="text-[#7A90A4]">
                {record.flightId.source} → {record.flightId.destination}
              </span>
              {record.flightId.departureTime && (
                <span className="text-[#B0C4D8] ml-1">
                  {fmtShortDate(record.flightId.departureTime)}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────
export default function CrewMedical() {
  const { userData } = useSelector((s) => s.auth);

  const [tab, setTab] = useState("status");
  const [showForm, setShowForm] = useState(false);
  const [recordFilter, setRecordFilter] = useState("all");
  const [page, setPage] = useState(1);

  // Crew profile
  const { data: crewData, isLoading: crewLoading } = useGetCrewByUserIdQuery(
    userData?._id,
    { skip: !userData?._id },
  );
  const crew = crewData?.data;
  const crewId = crew?._id;

  // Active in-flight flight (for the emergency CTA)
  const { data: activeFlightsData } = useGetFlightsByCrewIdQuery(
    { crewId, status: "in-flight", limit: 5 },
    { skip: !crewId },
  );
  const currentFlight = activeFlightsData?.data?.[0] ?? null;

  // Medical records
  const { data: recordsData, isLoading: recordsLoading } =
    useGetMyMedicalRecordsQuery({
      page,
      limit: 8,
      status: recordFilter,
    });
  const records = recordsData?.data ?? [];
  const total = recordsData?.total ?? 0;
  const totalPages = recordsData?.totalPages ?? 1;

  const medicalDueSoon =
    crew?.medicalNextDue &&
    new Date(crew.medicalNextDue) <
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const TABS = [
    { key: "status", label: "My status", icon: "ti-heart-rate-monitor" },
    {
      key: "incidents",
      label: "Incidents",
      icon: "ti-first-aid-kit",
      badge: total > 0 ? total : null,
    },
    { key: "guidelines", label: "Guidelines", icon: "ti-clipboard-list" },
  ];

  return (
    <div className="p-5 md:p-7">
      {/* ── Emergency CTA (in-flight only) ── */}
      {currentFlight && (
        <div className="mb-5 bg-red-600 rounded-2xl p-4 flex items-center gap-4 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-40 h-full bg-white/[0.06] skew-x-[-15deg] translate-x-6" />
          <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <i className="ti ti-first-aid-kit text-white text-[20px]" />
          </div>
          <div className="flex-1 relative z-10 min-w-0">
            <p className="text-white font-bold text-[13px] truncate">
              In-flight: {currentFlight.flightNumber}
            </p>
            <p className="text-red-200 text-[11px] mt-0.5">
              {currentFlight.source} → {currentFlight.destination}
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex-shrink-0 h-9 px-4 bg-white text-red-600 text-[12px] font-bold rounded-xl border-none cursor-pointer hover:bg-red-50 transition relative z-10"
          >
            Report incident
          </button>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-white border border-[#D0E6F7] rounded-xl p-1 mb-5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-[12px] font-semibold transition border-none cursor-pointer relative
              ${
                tab === t.key
                  ? "bg-[#1565C0] text-white shadow-[0_2px_8px_rgba(21,101,192,0.25)]"
                  : "text-[#7A90A4] hover:text-[#0D1B2A] hover:bg-[#F0F7FF] bg-transparent"
              }`}
          >
            <i className={`ti ${t.icon} text-[14px]`} />
            <span className="hidden sm:block">{t.label}</span>
            {t.badge && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {t.badge > 9 ? "9+" : t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── TAB: MY STATUS ── */}
      {tab === "status" &&
        (crewLoading ? (
          <Loader />
        ) : (
          <>
            <div
              className={`rounded-2xl p-6 mb-5 flex items-center gap-5 relative overflow-hidden
              ${crew?.medicalStatus === "Fit" ? "bg-green-600" : "bg-orange-500"}`}
            >
              <div className="absolute right-0 top-0 w-48 h-full bg-white/[0.06] skew-x-[-15deg] translate-x-8" />
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <i className="ti ti-heart-rate-monitor text-white text-[26px]" />
              </div>
              <div className="relative z-10 flex-1">
                <p className="text-white/80 text-[11px] font-semibold uppercase tracking-widest mb-1">
                  Medical status
                </p>
                <p className="text-white text-[28px] font-black leading-none">
                  {crew?.medicalStatus ?? "—"}
                </p>
                <p className="text-white/70 text-[12px] mt-1.5">
                  {crew?.medicalStatus === "Fit"
                    ? "Cleared for all flight operations"
                    : "Please contact admin for medical clearance"}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 relative z-10">
                <i
                  className={`ti ${crew?.medicalStatus === "Fit" ? "ti-circle-check" : "ti-alert-circle"} text-white text-[24px]`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-4">
              <Card className="p-5">
                <SectionLabel>Medical record</SectionLabel>
                {[
                  ["Status", crew?.medicalStatus],
                  ["Last checked", fmtDate(crew?.medicalLastChecked)],
                  ["Next due", fmtDate(crew?.medicalNextDue)],
                ].map(([l, v], i) => (
                  <InfoRow key={l} label={l} value={v} i={i} />
                ))}
              </Card>

              <Card className="p-5">
                <SectionLabel>Clearance status</SectionLabel>
                <div className="flex flex-col gap-3 mt-1">
                  {[
                    ["Flight operations", crew?.medicalStatus === "Fit"],
                    ["International routes", crew?.medicalStatus === "Fit"],
                    ["Long-haul flights", crew?.medicalStatus === "Fit"],
                  ].map(([label, cleared]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between"
                    >
                      <span className="text-[12px] font-medium text-[#5A7089]">
                        {label}
                      </span>
                      <div
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold
                        ${cleared ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}
                      >
                        <i
                          className={`ti ${cleared ? "ti-check" : "ti-x"} text-[11px]`}
                        />
                        {cleared ? "Cleared" : "Restricted"}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {medicalDueSoon && (
              <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <i className="ti ti-alert-triangle text-orange-600 text-[18px]" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-orange-800">
                    Medical renewal due soon
                  </p>
                  <p className="text-[12px] text-orange-600 mt-1 leading-relaxed">
                    Your medical certificate expires on{" "}
                    <span className="font-semibold">
                      {fmtDate(crew?.medicalNextDue)}
                    </span>
                    . Please schedule an appointment at least 2 weeks before the
                    due date.
                  </p>
                </div>
              </div>
            )}
          </>
        ))}

      {/* ── TAB: INCIDENTS ── */}
      {tab === "incidents" && (
        <>
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div className="flex gap-1 bg-white border border-[#D0E6F7] rounded-xl p-1">
              {["all", "open", "reviewed", "resolved"].map((f) => (
                <button
                  key={f}
                  onClick={() => {
                    setRecordFilter(f);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold capitalize transition border-none cursor-pointer
                    ${
                      recordFilter === f
                        ? "bg-[#1565C0] text-white"
                        : "text-[#7A90A4] hover:text-[#0D1B2A] hover:bg-[#F0F7FF] bg-transparent"
                    }`}
                >
                  {f === "all" ? "All" : RECORD_STATUS[f]?.label || f}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="h-9 px-4 bg-[#1565C0] hover:bg-[#1251A3] text-white text-[12px] font-bold rounded-xl border-none cursor-pointer transition flex items-center gap-1.5"
            >
              <i className="ti ti-plus text-[13px]" />
              Report incident
            </button>
          </div>

          {recordsLoading ? (
            <Loader />
          ) : records.length === 0 ? (
            <div className="bg-white border border-[#D0E6F7] rounded-2xl p-12 text-center">
              <i className="ti ti-first-aid-kit text-[40px] text-[#D0E6F7] block mb-3" />
              <p className="text-[14px] font-semibold text-[#7A90A4]">
                No incident reports
              </p>
              <p className="text-[12px] text-[#B0C4D8] mt-1">
                {recordFilter !== "all"
                  ? `No ${RECORD_STATUS[recordFilter]?.label.toLowerCase()} incidents`
                  : "Reports you file will appear here"}
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3 mb-4">
                {records.map((r) => (
                  <IncidentCard key={r._id} record={r} />
                ))}
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-[#B0C4D8]">
                    Showing {records.length} of {total}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={page === 1}
                      onClick={() => setPage((p) => p - 1)}
                      className="w-7 h-7 rounded-md border border-[#D0E6F7] bg-[#F0F7FF] flex items-center justify-center text-[#1565C0] hover:bg-[#E1EFFE] transition disabled:opacity-40 cursor-pointer"
                    >
                      <i className="ti ti-chevron-left text-[12px]" />
                    </button>
                    <span className="text-[12px] text-[#7A90A4] px-1">
                      {page} / {totalPages}
                    </span>
                    <button
                      disabled={page === totalPages}
                      onClick={() => setPage((p) => p + 1)}
                      className="w-7 h-7 rounded-md border border-[#D0E6F7] bg-[#F0F7FF] flex items-center justify-center text-[#1565C0] hover:bg-[#E1EFFE] transition disabled:opacity-40 cursor-pointer"
                    >
                      <i className="ti ti-chevron-right text-[12px]" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── TAB: GUIDELINES ── */}
      {tab === "guidelines" && (
        <div className="space-y-3.5">
          {[
            {
              level: "Critical",
              color: "border-red-300 bg-red-50",
              hdr: "bg-red-100 text-red-800",
              icon: "ti-alert-triangle",
              title: "Life-threatening emergencies",
              steps: [
                "Immediately inform the captain via interphone",
                "Request priority landing / medical diversion if needed",
                "Use the AED if cardiac arrest is suspected — begin CPR",
                "Locate the medical emergency kit (overhead bins, galley)",
                "Ask passengers if any doctor or medical professional is on board",
                "Document the incident in writing as soon as possible",
              ],
            },
            {
              level: "High",
              color: "border-orange-300 bg-orange-50",
              hdr: "bg-orange-100 text-orange-800",
              icon: "ti-heart-rate-monitor",
              title: "Severe illness or injury",
              steps: [
                "Seat the passenger / crew member and keep them calm",
                "Check vitals — pulse, breathing, responsiveness",
                "Administer first aid from the onboard kit",
                "Notify the captain and ground medical team",
                "Complete an in-flight medical incident report",
                "Hand over to airport medical staff on arrival",
              ],
            },
            {
              level: "Medium",
              color: "border-amber-200 bg-amber-50",
              hdr: "bg-amber-100 text-amber-800",
              icon: "ti-stethoscope",
              title: "Moderate medical complaints",
              steps: [
                "Move passenger to an unoccupied row for space",
                "Offer water, oxygen if available, and reassurance",
                "Administer permitted OTC medications from kit",
                "Monitor symptoms throughout the flight",
                "File a medical incident report before landing",
                "Inform ground crew if passenger needs assistance on arrival",
              ],
            },
            {
              level: "Low",
              color: "border-blue-200 bg-blue-50",
              hdr: "bg-blue-100 text-blue-800",
              icon: "ti-bandage",
              title: "Minor ailments & first aid",
              steps: [
                "Provide basic first aid — bandages, antiseptic, cold pack",
                "Offer paracetamol, antacid, or antihistamine as appropriate",
                "Ensure the passenger is comfortable and hydrated",
                "Log the incident if any medication was dispensed",
              ],
            },
          ].map(({ level, color, hdr, icon, title, steps }) => (
            <div
              key={level}
              className={`border rounded-2xl overflow-hidden ${color}`}
            >
              <div className={`flex items-center gap-2.5 px-5 py-3.5 ${hdr}`}>
                <i className={`ti ${icon} text-[16px]`} />
                <span className="text-[11px] font-black uppercase tracking-wider">
                  {level}
                </span>
                <span className="text-[13px] font-bold ml-1">— {title}</span>
              </div>
              <ul className="px-5 py-3 space-y-2">
                {steps.map((s, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2.5 text-[12px] text-[#0D1B2A]"
                  >
                    <span className="w-5 h-5 rounded-full bg-white/70 text-[10px] font-black flex items-center justify-center flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="bg-[#0D2540] rounded-2xl p-5">
            <p className="text-white font-bold text-[13px] mb-3">
              <i className="ti ti-phone text-[14px] mr-2" />
              Quick contacts
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                ["Captain (interphone)", "Press ✱21"],
                ["Ground medical", "Press ✱88"],
                ["Emergency services", "112 / 911"],
                ["Airline ops centre", "Check bulletin"],
              ].map(([label, value]) => (
                <div key={label} className="bg-white/10 rounded-xl px-3 py-2.5">
                  <p className="text-[10px] text-white/60 font-medium">
                    {label}
                  </p>
                  <p className="text-[12px] font-bold text-white mt-0.5">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── New incident modal ── */}
      {showForm && (
        <Modal
          title="Medical incident report"
          onClose={() => setShowForm(false)}
        >
          <NewIncidentForm
            crewId={crewId}
            preselectedFlight={currentFlight}
            onSuccess={() => {
              setShowForm(false);
              setTab("incidents");
            }}
            onCancel={() => setShowForm(false)}
          />
        </Modal>
      )}
    </div>
  );
}
