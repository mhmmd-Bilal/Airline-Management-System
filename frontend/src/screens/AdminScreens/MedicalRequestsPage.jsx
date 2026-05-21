// src/pages/admin/MedicalRequestsPage.jsx
import { useState } from "react";
import { Th, Td } from "../../components/admin/shared/AdminTable";
import {
  useGetAllMedicalRecordsQuery,
  useUpdateMedicalRecordStatusMutation,
} from "../../slices/medicalApiSlice";

/* ─────────────────────────────────────────────── constants ── */

const STATUS_CFG = {
  open:     { label: "Open",     cls: "bg-red-50 text-red-600",     dot: "bg-red-500"    },
  reviewed: { label: "Reviewed", cls: "bg-amber-50 text-amber-700", dot: "bg-amber-500"  },
  resolved: { label: "Resolved", cls: "bg-green-50 text-green-700", dot: "bg-green-500"  },
};

const USER_TYPE_CFG = {
  passenger: { cls: "bg-blue-50 text-blue-700",   icon: "ti-user"         },
  crew:      { cls: "bg-violet-50 text-violet-700",icon: "ti-user-star"    },
};

const fmt = (dt) =>
  dt ? new Date(dt).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  }) : "—";

const fmtShort = (dt) =>
  dt ? new Date(dt).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  }) : "—";

const inputCls = "w-full h-[42px] px-3 text-[13px] text-[#0D1B2A] bg-[#F0F7FF] border border-[#D0E6F7] rounded-[10px] outline-none focus:border-[#1565C0] transition placeholder:text-[#B0C4D8]";

/* ─────────────────────────────────────────────── components ── */

function StatCard({ label, value, icon, color, loading }) {
  return (
    <div className="bg-white border border-[#D0E6F7] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-medium text-[#7A90A4] uppercase tracking-[0.6px]">{label}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <i className={`ti ${icon} text-[15px]`} />
        </div>
      </div>
      {loading
        ? <div className="h-8 bg-[#EAF4FB] rounded-lg animate-pulse w-16" />
        : <p className="text-[26px] font-bold text-[#0D1B2A] leading-none">{value ?? "—"}</p>}
    </div>
  );
}

function Avatar({ name = "" }) {
  const initials = name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return (
    <div className="w-8 h-8 rounded-full bg-[#EAF4FB] text-[#1565C0] flex items-center justify-center font-bold text-[11px] flex-shrink-0">
      {initials || "?"}
    </div>
  );
}

/* ── Detail / update modal ── */
function RecordModal({ record, onClose }) {
  const [form, setForm] = useState({
    status:       record.status,
    adminMessage: record.adminMessage || "",
    attendedAt:   record.attendedAt
      ? new Date(record.attendedAt).toISOString().slice(0, 16)
      : "",
  });
  const [success, setSuccess] = useState(false);

  const [updateMedicalRecordStatus, { isLoading: updating }] =
    useUpdateMedicalRecordStatusMutation();

  const handleUpdate = async () => {
    try {
      await updateMedicalRecordStatus({ id: record._id, ...form }).unwrap();
      setSuccess(true);
      setTimeout(() => { setSuccess(false); onClose(); }, 1200);
    } catch (err) { console.error(err); }
  };

  const scfg = STATUS_CFG[record.status];
  const utcfg = USER_TYPE_CFG[record.userType] ?? USER_TYPE_CFG.passenger;

  return (
    <div
      className="fixed inset-0 bg-black/45 z-[200] flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EAF4FB]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
              <i className="ti ti-heart-rate-monitor text-red-500 text-[15px]" />
            </div>
            <div>
              <p className="text-[14px] font-bold text-[#0D1B2A]">Medical Record</p>
              <p className="text-[10px] text-[#B0C4D8]">{fmt(record.createdAt)}</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg border border-[#D0E6F7] bg-[#F0F7FF] flex items-center justify-center text-[#1565C0] hover:bg-[#E1EFFE] transition cursor-pointer">
            <i className="ti ti-x text-[13px]" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-4">

          {/* Patient + reporter */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#F7FAFD] border border-[#EAF4FB] rounded-xl p-3.5">
              <p className="text-[10px] font-bold text-[#B0C4D8] uppercase tracking-wider mb-2">Patient</p>
              <div className="flex items-center gap-2 mb-1.5">
                <Avatar name={record.userId?.name || ""} />
                <div className="min-w-0">
                  <p className="text-[12px] font-bold text-[#0D1B2A] truncate">{record.userId?.name ?? "—"}</p>
                  <p className="text-[10px] text-[#B0C4D8] truncate">{record.userId?.email}</p>
                </div>
              </div>
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${utcfg.cls}`}>
                <i className={`ti ${utcfg.icon} text-[10px]`} />
                {record.userType}
              </span>
            </div>

            <div className="bg-[#F7FAFD] border border-[#EAF4FB] rounded-xl p-3.5">
              <p className="text-[10px] font-bold text-[#B0C4D8] uppercase tracking-wider mb-2">Reported by</p>
              <div className="flex items-center gap-2 mb-1.5">
                <Avatar name={record.reportedBy?.name || ""} />
                <div className="min-w-0">
                  <p className="text-[12px] font-bold text-[#0D1B2A] truncate">{record.reportedBy?.name ?? "—"}</p>
                  <p className="text-[10px] text-[#B0C4D8] capitalize">{record.reportedBy?.role}</p>
                </div>
              </div>
              {record.flightId && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#1565C0] bg-blue-50 px-2 py-0.5 rounded-full">
                  <i className="ti ti-plane text-[10px]" />
                  {record.flightId.flightNumber} · {record.flightId.source} → {record.flightId.destination}
                </span>
              )}
            </div>
          </div>

          {/* Medical details */}
          <div className="flex flex-col gap-3">
            {[
              { label: "Symptoms",  value: record.symptoms,  icon: "ti-stethoscope", color: "text-red-500"    },
              { label: "Diagnosis", value: record.diagnosis, icon: "ti-microscope",  color: "text-amber-600"  },
              { label: "Treatment", value: record.treatment, icon: "ti-pill",        color: "text-green-600"  },
            ].map(({ label, value, icon, color }) => value ? (
              <div key={label} className="bg-[#F7FAFD] border border-[#EAF4FB] rounded-xl p-3.5">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <i className={`ti ${icon} text-[13px] ${color}`} />
                  <p className="text-[10px] font-bold text-[#B0C4D8] uppercase tracking-wider">{label}</p>
                </div>
                <p className="text-[13px] text-[#0D1B2A] leading-relaxed">{value}</p>
              </div>
            ) : null)}
          </div>

          {/* Existing admin message */}
          {record.adminMessage && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3.5">
              <div className="flex items-center gap-1.5 mb-1.5">
                <i className="ti ti-message-circle text-[#1565C0] text-[13px]" />
                <p className="text-[10px] font-bold text-[#1565C0] uppercase tracking-wider">Previous admin note</p>
              </div>
              <p className="text-[12px] text-[#0D1B2A] leading-relaxed">{record.adminMessage}</p>
              {record.attendedAt && (
                <p className="text-[10px] text-[#B0C4D8] mt-1.5">Attended: {fmt(record.attendedAt)}</p>
              )}
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-[#EAF4FB] pt-4">
            <p className="text-[11px] font-bold text-[#5A7089] uppercase tracking-[0.8px] mb-3">Update record</p>

            {/* Status */}
            <div className="mb-3">
              <label className="block text-[10px] font-semibold text-[#7A90A4] uppercase tracking-wider mb-1.5">Status</label>
              <div className="flex gap-2">
                {Object.entries(STATUS_CFG).map(([val, cfg]) => (
                  <button key={val}
                    onClick={() => setForm((p) => ({ ...p, status: val }))}
                    className={`flex-1 h-9 rounded-lg border text-[11px] font-bold transition cursor-pointer
                      ${form.status === val
                        ? `${cfg.cls} border-current`
                        : "border-[#D0E6F7] bg-[#F0F7FF] text-[#7A90A4] hover:bg-[#E1EFFE]"
                      }`}
                  >
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Attended at */}
            <div className="mb-3">
              <label className="block text-[10px] font-semibold text-[#7A90A4] uppercase tracking-wider mb-1.5">
                Attended at <span className="normal-case font-normal text-[#B0C4D8]">(optional)</span>
              </label>
              <input
                type="datetime-local"
                className={inputCls}
                value={form.attendedAt}
                onChange={(e) => setForm((p) => ({ ...p, attendedAt: e.target.value }))}
              />
            </div>

            {/* Admin message */}
            <div className="mb-4">
              <label className="block text-[10px] font-semibold text-[#7A90A4] uppercase tracking-wider mb-1.5">
                Admin note <span className="normal-case font-normal text-[#B0C4D8]">(shown to crew)</span>
              </label>
              <textarea
                className="w-full px-3 py-2.5 text-[13px] text-[#0D1B2A] bg-[#F0F7FF] border border-[#D0E6F7] rounded-[10px] outline-none focus:border-[#1565C0] transition placeholder:text-[#B0C4D8] resize-none"
                rows={3}
                placeholder="e.g. Medical team dispatched to gate B3…"
                value={form.adminMessage}
                onChange={(e) => setForm((p) => ({ ...p, adminMessage: e.target.value }))}
              />
            </div>

            {success && (
              <div className="mb-3 px-3 py-2.5 bg-green-50 border border-green-200 rounded-[10px] text-[12px] text-green-700 flex items-center gap-2">
                <i className="ti ti-circle-check text-green-600 text-[14px]" /> Record updated successfully
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={onClose}
                className="flex-1 h-10 border border-[#D0E6F7] bg-[#F0F7FF] text-[#1565C0] text-[13px] font-medium rounded-[10px] cursor-pointer hover:bg-[#E1EFFE] transition">
                Close
              </button>
              <button onClick={handleUpdate} disabled={updating}
                className="flex-1 h-10 bg-[#1565C0] hover:bg-[#1251A3] text-white text-[13px] font-bold rounded-[10px] border-none cursor-pointer disabled:opacity-60 transition">
                {updating ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────── main page ── */

export default function MedicalRequestsPage() {
  const [filters, setFilters] = useState({ status: "all", userType: "all" });
  const [page,    setPage]    = useState(1);
  const [active,  setActive]  = useState(null);   // record being viewed/edited

  const { data, isLoading } = useGetAllMedicalRecordsQuery({
    ...filters, page, limit: 15,
  });

  const records    = data?.data       ?? [];
  const stats      = data?.stats      ?? {};
  const total      = data?.total      ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const setFilter = (k, v) => { setFilters((p) => ({ ...p, [k]: v })); setPage(1); };

  return (
    <>
      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-3.5 mb-6">
        <StatCard
          label="Open"     value={stats.open}
          icon="ti-alert-circle" color="bg-red-50 text-red-600"
          loading={isLoading}
        />
        <StatCard
          label="Reviewed" value={stats.reviewed}
          icon="ti-eye"         color="bg-amber-50 text-amber-700"
          loading={isLoading}
        />
        <StatCard
          label="Resolved" value={stats.resolved}
          icon="ti-circle-check" color="bg-green-50 text-green-700"
          loading={isLoading}
        />
      </div>

      {/* ── Filters ── */}
      <div className="bg-white border border-[#D0E6F7] rounded-2xl p-4 mb-4 flex flex-wrap gap-2.5 items-center">
        {/* Status filter */}
        <div className="flex gap-1 bg-[#F0F7FF] border border-[#D0E6F7] rounded-lg p-0.5">
          {["all", "open", "reviewed", "resolved"].map((s) => (
            <button key={s} onClick={() => setFilter("status", s)}
              className={`px-3 py-1.5 rounded-md text-[11px] font-semibold capitalize transition border-none cursor-pointer
                ${filters.status === s ? "bg-[#1565C0] text-white" : "text-[#7A90A4] hover:text-[#0D1B2A] bg-transparent"}`}
            >
              {s === "all" ? "All status" : STATUS_CFG[s]?.label}
            </button>
          ))}
        </div>

        {/* User type filter */}
        <div className="flex gap-1 bg-[#F0F7FF] border border-[#D0E6F7] rounded-lg p-0.5">
          {["all", "passenger", "crew"].map((t) => (
            <button key={t} onClick={() => setFilter("userType", t)}
              className={`px-3 py-1.5 rounded-md text-[11px] font-semibold capitalize transition border-none cursor-pointer
                ${filters.userType === t ? "bg-[#1565C0] text-white" : "text-[#7A90A4] hover:text-[#0D1B2A] bg-transparent"}`}
            >
              {t === "all" ? "All types" : t}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white border border-[#D0E6F7] rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#D0E6F7] flex items-center justify-between">
          <p className="text-[11px] font-semibold text-[#5A7089] uppercase tracking-[0.8px]">
            Medical records <span className="text-[#B0C4D8] font-normal normal-case">({total})</span>
          </p>
          {totalPages > 1 && (
            <p className="text-[11px] text-[#B0C4D8]">Page {page} of {totalPages}</p>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="border-b border-[#EAF4FB]">
                {["Patient","Type","Reported by","Flight","Symptoms","Attended","Status","Actions"].map((h) => (
                  <th key={h} className="text-[10px] font-semibold text-[#7A90A4] uppercase tracking-[0.5px] px-4 py-3 text-left whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#F0F7FF]">
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-[#EAF4FB] rounded animate-pulse w-16" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-14">
                    <i className="ti ti-heart-off text-[36px] text-[#D0E6F7] block mb-2" />
                    <p className="text-[13px] text-[#7A90A4]">No medical records found</p>
                  </td>
                </tr>
              ) : records.map((r) => {
                const scfg  = STATUS_CFG[r.status]   ?? STATUS_CFG.open;
                const utcfg = USER_TYPE_CFG[r.userType] ?? USER_TYPE_CFG.passenger;
                return (
                  <tr key={r._id}
                    className="border-b border-[#F0F7FF] hover:bg-[#FAFCFF] transition cursor-pointer"
                    onClick={() => setActive(r)}
                  >
                    {/* Patient */}
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center gap-2">
                        <Avatar name={r.userId?.name || ""} />
                        <div className="min-w-0">
                          <p className="text-[12px] font-semibold text-[#0D1B2A] truncate max-w-[100px]">
                            {r.userId?.name ?? "—"}
                          </p>
                          <p className="text-[10px] text-[#B0C4D8] truncate max-w-[100px]">
                            {r.userId?.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Type */}
                    <td className="px-4 py-3 align-middle">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${utcfg.cls}`}>
                        <i className={`ti ${utcfg.icon} text-[10px]`} />
                        {r.userType}
                      </span>
                    </td>

                    {/* Reported by */}
                    <td className="px-4 py-3 align-middle">
                      <p className="text-[12px] font-medium text-[#0D1B2A] truncate max-w-[90px]">
                        {r.reportedBy?.name ?? "—"}
                      </p>
                      <p className="text-[10px] text-[#B0C4D8] capitalize">{r.reportedBy?.role}</p>
                    </td>

                    {/* Flight */}
                    <td className="px-4 py-3 align-middle">
                      {r.flightId ? (
                        <div>
                          <p className="text-[12px] font-bold text-[#1565C0]">{r.flightId.flightNumber}</p>
                          <p className="text-[10px] text-[#B0C4D8]">{r.flightId.source} → {r.flightId.destination}</p>
                        </div>
                      ) : (
                        <span className="text-[11px] text-[#B0C4D8]">—</span>
                      )}
                    </td>

                    {/* Symptoms */}
                    <td className="px-4 py-3 align-middle">
                      <p className="text-[12px] text-[#0D1B2A] max-w-[140px] truncate">{r.symptoms || "—"}</p>
                    </td>

                    {/* Attended */}
                    <td className="px-4 py-3 align-middle">
                      <span className="text-[11px] text-[#7A90A4]">
                        {r.attendedAt ? fmtShort(r.attendedAt) : "—"}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${scfg.dot}`} />
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${scfg.cls}`}>
                          {scfg.label}
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 align-middle" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setActive(r)}
                        className={`w-7 h-7 rounded-md border flex items-center justify-center transition cursor-pointer
                          ${active?._id === r._id
                            ? "bg-[#1565C0] border-[#1565C0] text-white"
                            : "border-[#D0E6F7] bg-[#F0F7FF] text-[#1565C0] hover:bg-[#E1EFFE]"
                          }`}
                        title="View & update"
                      >
                        <i className="ti ti-eye text-[12px]" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-[#D0E6F7]">
            <p className="text-[11px] text-[#B0C4D8]">Showing {records.length} of {total} records</p>
            <div className="flex items-center gap-1.5">
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
                className="w-7 h-7 rounded-md border border-[#D0E6F7] bg-[#F0F7FF] flex items-center justify-center text-[#1565C0] hover:bg-[#E1EFFE] disabled:opacity-40 cursor-pointer transition">
                <i className="ti ti-chevron-left text-[13px]" />
              </button>
              <span className="text-[12px] text-[#7A90A4] px-1">{page} / {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}
                className="w-7 h-7 rounded-md border border-[#D0E6F7] bg-[#F0F7FF] flex items-center justify-center text-[#1565C0] hover:bg-[#E1EFFE] disabled:opacity-40 cursor-pointer transition">
                <i className="ti ti-chevron-right text-[13px]" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Record detail / update modal ── */}
      {active && (
        <RecordModal record={active} onClose={() => setActive(null)} />
      )}
    </>
  );
}