// src/pages/admin/RefundsPage.jsx
import { useState } from "react";
import { Th, Td } from "../../components/admin/shared/AdminTable";
import {
  useGetAllRefundsQuery,
  useGetRefundStatsQuery,
  useProcessRefundMutation,
} from "../../slices/refundApiSlice";

const fmt = (dt) =>
  dt ? new Date(dt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const fmtMoney = (n) =>
  n === undefined || n === null ? "—"
    : n >= 100000 ? `₹${(n / 100000).toFixed(2)}L`
    : `₹${Number(n).toLocaleString("en-IN")}`;

const REFUND_STATUS = {
  pending:   { cls: "bg-amber-50 text-amber-700",  label: "Pending"   },
  approved:  { cls: "bg-blue-50 text-blue-700",    label: "Approved"  },
  processed: { cls: "bg-green-50 text-green-700",  label: "Processed" },
  rejected:  { cls: "bg-red-50 text-red-600",      label: "Rejected"  },
};

/* ── helpers to read populated Refund doc ─────────────
   Refund shape from backend:
   {
     _id, status, amount, reason, createdAt, processedAt,
     passengerId: { name, email, phone },
     bookingId: {
       bookingReference, seats, seatClass, totalAmount, status,
       cancelledAt,
       flightId: { flightNumber, source, destination, departureTime }
     }
   }
─────────────────────────────────────────────────────── */
const getBookingRef  = (r) => r.bookingId?.bookingReference ?? "—";
const getFlightNum   = (r) => r.bookingId?.flightId?.flightNumber ?? "—";
const getFlightRoute = (r) => {
  const f = r.bookingId?.flightId;
  return f ? `${f.source} → ${f.destination}` : "—";
};

/* ─────────────────────────────────────────────────── */

function StatCard({ label, value, icon, color, sub, loading }) {
  return (
    <div className="bg-white border border-[#D0E6F7] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-medium text-[#7A90A4] uppercase tracking-[0.6px]">{label}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <i className={`ti ${icon} text-[15px]`} />
        </div>
      </div>
      {loading
        ? <div className="h-8 bg-[#EAF4FB] rounded-lg animate-pulse w-20" />
        : <>
            <p className="text-[26px] font-semibold text-[#0D1B2A] leading-none">{value ?? "—"}</p>
            {sub && <p className="text-[11px] text-[#7A90A4] mt-1">{sub}</p>}
          </>}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div
      className="fixed inset-0 bg-black/40 z-[200] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[14px] font-semibold text-[#0D1B2A]">{title}</p>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-[#D0E6F7] bg-[#F0F7FF] flex items-center justify-center text-[#1565C0] hover:bg-[#E1EFFE] transition cursor-pointer"
          >
            <i className="ti ti-x text-[14px]" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function RefundsPage() {
  const [status,      setStatus]      = useState("all");
  const [page,        setPage]        = useState(1);
  const [processItem, setProcessItem] = useState(null);
  const [note,        setNote]        = useState("");
  const [action,      setAction]      = useState("approve");

  const { data: statsData, isLoading: stLoading } = useGetRefundStatsQuery();
  const { data, isLoading }                        = useGetAllRefundsQuery({ status, page, limit: 15 });
  const [processRefund, { isLoading: processing }] = useProcessRefundMutation();

  const refunds    = data?.data       ?? [];
  const total      = data?.total      ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const stats      = statsData?.data;

  const handleProcess = async () => {
    try {
      await processRefund({ id: processItem._id, action, note: note.trim() }).unwrap();
      setProcessItem(null);
      setNote("");
    } catch (err) { console.error(err); }
  };

  return (
    <>
      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
        <StatCard
          label="Total Refunds" value={stats?.total}
          icon="ti-receipt-refund" color="bg-blue-50 text-blue-700"
          sub={fmtMoney(stats?.totalAmount)} loading={stLoading}
        />
        <StatCard
          label="Pending" value={stats?.pending}
          icon="ti-clock" color="bg-amber-50 text-amber-700"
          sub="Awaiting review" loading={stLoading}
        />
        <StatCard
          label="Processed" value={stats?.processed}
          icon="ti-circle-check" color="bg-green-50 text-green-700"
          sub={fmtMoney(stats?.processedAmount)} loading={stLoading}
        />
        <StatCard
          label="Rejected" value={stats?.rejected}
          icon="ti-circle-x" color="bg-red-50 text-red-700"
          sub={fmtMoney(stats?.rejectedAmount)} loading={stLoading}
        />
      </div>

      {/* ── Table ── */}
      <div className="bg-white border border-[#D0E6F7] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <p className="text-[11px] font-semibold text-[#5A7089] uppercase tracking-[0.8px]">
            Refund requests <span className="text-[#B0C4D8] font-normal">({total})</span>
          </p>
          <select
            className="h-9 px-3 text-[12px] bg-[#F0F7FF] border border-[#D0E6F7] rounded-lg outline-none focus:border-[#1565C0] text-[#0D1B2A] cursor-pointer"
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          >
            {["all","pending","approved","processed","rejected"].map((s) => (
              <option key={s} value={s}>
                {s === "all" ? "All status" : REFUND_STATUS[s]?.label}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr>
                <Th>Booking Ref</Th>
                <Th>Passenger</Th>
                <Th>Flight</Th>
                <Th>Amount</Th>
                <Th>Reason</Th>
                <Th>Requested</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-[#EAF4FB] rounded animate-pulse w-16" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : refunds.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-14">
                    <i className="ti ti-receipt-off text-[36px] text-[#D0E6F7] block mb-2" />
                    <p className="text-[13px] text-[#7A90A4]">No refund requests found</p>
                  </td>
                </tr>
              ) : refunds.map((r) => {
                // ── use the Refund doc's own status field ──
                const stCfg     = REFUND_STATUS[r.status] ?? REFUND_STATUS.pending;
                const isPending = r.status === "pending";

                return (
                  <tr key={r._id} className="border-t border-[#F0F7FF] hover:bg-[#F8FBFF] transition">

                    {/* Booking ref */}
                    <Td>
                      <div>
                        <p className="font-bold text-[#1565C0] text-[12px]">
                          {getBookingRef(r)}
                        </p>
                        <p className="text-[10px] text-[#B0C4D8] capitalize">
                          {r.bookingId?.seatClass ?? "—"}
                        </p>
                      </div>
                    </Td>

                    {/* Passenger */}
                    <Td>
                      <div>
                        <p className="text-[12px] font-semibold text-[#0D1B2A] truncate max-w-[110px]">
                          {r.passengerId?.name ?? "—"}
                        </p>
                        <p className="text-[10px] text-[#B0C4D8] truncate max-w-[110px]">
                          {r.passengerId?.email}
                        </p>
                      </div>
                    </Td>

                    {/* Flight */}
                    <Td>
                      <div>
                        <p className="text-[12px] font-semibold text-[#0D1B2A]">
                          {getFlightNum(r)}
                        </p>
                        <p className="text-[10px] text-[#B0C4D8]">
                          {getFlightRoute(r)}
                        </p>
                      </div>
                    </Td>

                    {/* Amount — from Refund.amount */}
                    <Td>
                      <span className="text-[12px] font-bold text-[#0D1B2A]">
                        {fmtMoney(r.amount)}
                      </span>
                    </Td>

                    {/* Reason — from Refund.reason */}
                    <Td>
                      <p className="text-[12px] text-[#7A90A4] max-w-[130px] truncate">
                        {r.reason || "—"}
                      </p>
                    </Td>

                    {/* Requested at — Refund.createdAt */}
                    <Td>
                      <span className="text-[12px] text-[#7A90A4]">
                        {fmt(r.createdAt)}
                      </span>
                    </Td>

                    {/* Status — Refund.status */}
                    <Td>
                      <span className={`text-[11px] font-semibold px-2.5 py-[3px] rounded-full ${stCfg.cls}`}>
                        {stCfg.label}
                      </span>
                    </Td>

                    {/* Actions */}
                    <Td>
                      {isPending ? (
                        <button
                          onClick={() => {
                            setProcessItem(r);
                            setAction("approve");
                            setNote("");
                          }}
                          className="h-7 px-3 bg-[#1565C0] hover:bg-[#1251A3] text-white text-[11px] font-bold rounded-lg border-none cursor-pointer transition"
                        >
                          Review
                        </button>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${stCfg.cls}`}>
                            {stCfg.label}
                          </span>
                          {r.processedAt && (
                            <span className="text-[10px] text-[#B0C4D8]">
                              {fmt(r.processedAt)}
                            </span>
                          )}
                        </div>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#EAF4FB]">
            <p className="text-[11px] text-[#B0C4D8]">Showing {refunds.length} of {total}</p>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="w-7 h-7 rounded-md border border-[#D0E6F7] bg-[#F0F7FF] flex items-center justify-center text-[#1565C0] hover:bg-[#E1EFFE] transition disabled:opacity-40 cursor-pointer"
              >
                <i className="ti ti-chevron-left text-[13px]" />
              </button>
              <span className="text-[12px] text-[#7A90A4] px-1">{page} / {totalPages}</span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="w-7 h-7 rounded-md border border-[#D0E6F7] bg-[#F0F7FF] flex items-center justify-center text-[#1565C0] hover:bg-[#E1EFFE] transition disabled:opacity-40 cursor-pointer"
              >
                <i className="ti ti-chevron-right text-[13px]" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Review modal ── */}
      {processItem && (
        <Modal
          title={`Review refund — ${getBookingRef(processItem)}`}
          onClose={() => setProcessItem(null)}
        >
          {/* Summary */}
          <div className="mb-4 bg-[#F0F7FF] rounded-xl p-3.5 space-y-2">
            {[
              ["Passenger",   processItem.passengerId?.name],
              ["Email",       processItem.passengerId?.email],
              ["Amount",      fmtMoney(processItem.amount)],
              ["Flight",      `${getFlightNum(processItem)} · ${getFlightRoute(processItem)}`],
              ["Seat class",  processItem.bookingId?.seatClass],
              ["Reason",      processItem.reason || "Not specified"],
              ["Requested",   fmt(processItem.createdAt)],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between gap-3 text-[12px]">
                <span className="text-[#7A90A4] flex-shrink-0">{l}</span>
                <span className="font-semibold text-[#0D1B2A] text-right truncate">{v ?? "—"}</span>
              </div>
            ))}
          </div>

          {/* Decision */}
          <div className="mb-4">
            <label className="block text-[11px] font-bold text-[#7A90A4] uppercase tracking-wider mb-2">
              Decision
            </label>
            <div className="flex gap-2">
              {[
                ["approve", "Approve", "bg-green-50 text-green-700 border-green-200"],
                ["reject",  "Reject",  "bg-red-50 text-red-600 border-red-200"],
              ].map(([val, label, cls]) => (
                <button
                  key={val}
                  onClick={() => setAction(val)}
                  className={`flex-1 h-9 rounded-lg border text-[12px] font-bold transition cursor-pointer
                    ${action === val
                      ? cls
                      : "border-[#D0E6F7] bg-[#F0F7FF] text-[#7A90A4] hover:bg-[#E1EFFE]"
                    }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div className="mb-5">
            <label className="block text-[11px] font-bold text-[#7A90A4] uppercase tracking-wider mb-2">
              Note <span className="normal-case font-normal text-[#B0C4D8]">(optional — shown to passenger)</span>
            </label>
            <textarea
              className="w-full px-3 py-2.5 text-[12px] text-[#0D1B2A] bg-[#F0F7FF] border border-[#D0E6F7] rounded-xl outline-none focus:border-[#1565C0] transition resize-none placeholder:text-[#B0C4D8]"
              rows={3}
              placeholder={
                action === "approve"
                  ? "e.g. Refund approved. Credit within 5–7 business days."
                  : "e.g. Refund rejected due to policy violation."
              }
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => setProcessItem(null)}
              className="flex-1 h-10 border border-[#D0E6F7] bg-[#F0F7FF] text-[#1565C0] text-[13px] font-medium rounded-[10px] cursor-pointer hover:bg-[#E1EFFE] transition"
            >
              Cancel
            </button>
            <button
              onClick={handleProcess}
              disabled={processing}
              className={`flex-1 h-10 text-white text-[13px] font-bold rounded-[10px] border-none cursor-pointer disabled:opacity-60 transition
                ${action === "approve" ? "bg-green-600 hover:bg-green-700" : "bg-red-500 hover:bg-red-600"}`}
            >
              {processing
                ? "Processing…"
                : action === "approve" ? "Approve refund" : "Reject refund"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}