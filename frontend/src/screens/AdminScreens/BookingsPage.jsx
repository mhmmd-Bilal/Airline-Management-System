// src/pages/admin/BookingsPage.jsx
import { useState } from "react";
import { Th, Td } from "../../components/admin/shared/AdminTable";
import Badge from "../../components/admin/shared/Badge";
import {
  useGetBookingStatsQuery,
  useGetAllBookingsQuery,
} from "../../slices/bookingApiSlice";

const fmt = (dt) =>
  dt
    ? new Date(dt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const fmtMoney = (n) =>
  n === undefined
    ? "—"
    : n >= 100000
      ? `₹${(n / 100000).toFixed(2)}L`
      : `₹${n.toLocaleString()}`;

const STATUS_CFG = {
  confirmed: { cls: "bg-green-50 text-green-700" },
  pending: { cls: "bg-amber-50 text-amber-700" },
  cancelled: { cls: "bg-red-50 text-red-600" },
  completed: { cls: "bg-blue-50 text-blue-700" },
};

const CLASS_CFG = {
  economy: "bg-slate-100 text-slate-600",
  business: "bg-violet-50 text-violet-700",
  first: "bg-amber-50 text-amber-700",
};

function StatCard({ label, value, icon, color, sub, loading }) {
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
      {loading ? (
        <div className="h-8 bg-[#EAF4FB] rounded-lg animate-pulse w-20" />
      ) : (
        <>
          <p className="text-[26px] font-semibold text-[#0D1B2A] leading-none">
            {value ?? "—"}
          </p>
          {sub && <p className="text-[11px] text-[#7A90A4] mt-1">{sub}</p>}
        </>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#D0E6F7]">
          <p className="text-[14px] font-semibold text-[#0D1B2A]">{title}</p>
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

export default function BookingsPage() {
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [viewItem, setViewItem] = useState(null);
  const [cancelItem, setCancelItem] = useState(null);

  const { data: statsData, isLoading: stLoading } = useGetBookingStatsQuery();
  const { data, isLoading } = useGetAllBookingsQuery({
    status,
    search,
    page,
    limit: 15,
  });

  const bookings = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const stats = statsData?.data;

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
        <StatCard
          label="Total Bookings"
          value={stats?.total}
          icon="ti-ticket"
          color="bg-blue-50 text-blue-700"
          sub={`${stats?.today ?? 0} today`}
          loading={stLoading}
        />
        <StatCard
          label="Completed"
          value={stats?.completed}
          icon="ti-check"
          color="bg-amber-50 text-amber-700"
          sub={fmtMoney(stats?.completedRevenue)}
          loading={stLoading}
        />
        <StatCard
          label="Confirmed"
          value={stats?.confirmed}
          icon="ti-circle-check"
          color="bg-green-50 text-green-700"
          sub={fmtMoney(stats?.confirmedRevenue)}
          loading={stLoading}
        />
        <StatCard
          label="Cancelled"
          value={stats?.cancelled}
          icon="ti-ban"
          color="bg-red-50 text-red-700"
          sub={fmtMoney(stats?.cancelledRevenue)}
          loading={stLoading}
        />
      </div>

      <div className="bg-white border border-[#D0E6F7] rounded-2xl p-5">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <p className="text-[11px] font-semibold text-[#5A7089] uppercase tracking-[0.8px]">
            All bookings{" "}
            <span className="text-[#B0C4D8] font-normal">({total})</span>
          </p>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="relative">
              <i className="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-[#B0C4D8] text-[13px]" />
              <input
                className="h-9 pl-8 pr-3 text-[12px] bg-[#F0F7FF] border border-[#D0E6F7] rounded-lg outline-none focus:border-[#1565C0] transition w-44 placeholder:text-[#B0C4D8] text-[#0D1B2A]"
                placeholder="Search reference…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <select
              className="h-9 px-3 text-[12px] bg-[#F0F7FF] border border-[#D0E6F7] rounded-lg outline-none focus:border-[#1565C0] text-[#0D1B2A] cursor-pointer"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              {["all", "confirmed", "pending", "cancelled", "completed"].map(
                (s) => (
                  <option key={s} value={s}>
                    {s === "all"
                      ? "All status"
                      : s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ),
              )}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr>
                <Th>Reference</Th>
                <Th>Passenger</Th>
                <Th>Flight</Th>
                <Th>Class</Th>
                <Th>Amount</Th>
                <Th>Date</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-[#EAF4FB] rounded animate-pulse w-16" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10">
                    <i className="ti ti-ticket-off text-[32px] text-[#D0E6F7] block mb-2" />
                    <p className="text-[13px] text-[#7A90A4]">
                      No bookings found
                    </p>
                  </td>
                </tr>
              ) : (
                bookings.map((b) => {
                  const stCfg = STATUS_CFG[b.status] || {};
                  const clCfg = CLASS_CFG[b.seatClass] || CLASS_CFG.economy;
                  const canCancel = ["confirmed", "pending"].includes(b.status);
                  return (
                    <tr key={b._id} className="hover:bg-[#F8FBFF] transition">
                      <Td>
                        <span className="font-bold text-[#1565C0] text-[12px]">
                          {b.bookingReference}
                        </span>
                      </Td>
                      <Td>
                        <div>
                          <p className="text-[12px] font-semibold text-[#0D1B2A] truncate max-w-[120px]">
                            {b.passengerId?.name ?? "—"}
                          </p>
                          <p className="text-[10px] text-[#B0C4D8] truncate max-w-[120px]">
                            {b.passengerId?.email}
                          </p>
                        </div>
                      </Td>
                      <Td>
                        <div>
                          <p className="text-[12px] font-semibold text-[#0D1B2A]">
                            {b.flightId?.flightNumber ?? "—"}
                          </p>
                          <p className="text-[10px] text-[#B0C4D8]">
                            {b.flightId
                              ? `${b.flightId.source} → ${b.flightId.destination}`
                              : ""}
                          </p>
                        </div>
                      </Td>
                      <Td>
                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${clCfg}`}
                        >
                          {b.seatClass || "Economy"}
                        </span>
                      </Td>
                      <Td>
                        <span className="text-[12px] font-semibold text-[#0D1B2A]">
                          {fmtMoney(b.totalAmount)}
                        </span>
                      </Td>
                      <Td>
                        <span className="text-[12px] text-[#7A90A4]">
                          {fmt(b.createdAt)}
                        </span>
                      </Td>
                      <Td>
                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${stCfg.cls}`}
                        >
                          {b.status}
                        </span>
                      </Td>
                      <Td>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setViewItem(b)}
                            className="w-7 h-7 rounded-md border border-[#D0E6F7] bg-[#F0F7FF] flex items-center justify-center text-[#1565C0] hover:bg-[#E1EFFE] transition cursor-pointer"
                            title="View"
                          >
                            <i className="ti ti-eye text-[12px]" />
                          </button>
                          {canCancel && (
                            <button
                              onClick={() => setCancelItem(b)}
                              className="w-7 h-7 rounded-md border border-red-100 bg-red-50 flex items-center justify-center text-red-500 hover:bg-red-100 transition cursor-pointer"
                              title="Cancel booking"
                            >
                              <i className="ti ti-ban text-[12px]" />
                            </button>
                          )}
                        </div>
                      </Td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#EAF4FB]">
            <p className="text-[11px] text-[#B0C4D8]">
              Showing {bookings.length} of {total}
            </p>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="w-7 h-7 rounded-md border border-[#D0E6F7] bg-[#F0F7FF] flex items-center justify-center text-[#1565C0] hover:bg-[#E1EFFE] transition disabled:opacity-40 cursor-pointer"
              >
                <i className="ti ti-chevron-left text-[13px]" />
              </button>
              <span className="text-[12px] text-[#7A90A4] px-1">
                {page} / {totalPages}
              </span>
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

      {/* View modal */}
      {viewItem && (
        <Modal
          title={`Booking — ${viewItem.bookingReference}`}
          onClose={() => setViewItem(null)}
        >
          <div className="space-y-0">
            {[
              ["Reference", viewItem.bookingReference],
              ["Passenger", viewItem.passengerId?.name],
              ["Email", viewItem.passengerId?.email],
              ["Flight", viewItem.flightId?.flightNumber],
              [
                "Route",
                viewItem.flightId
                  ? `${viewItem.flightId.source} → ${viewItem.flightId.destination}`
                  : "—",
              ],
              [
                "Departure",
                viewItem.flightId?.departureTime
                  ? new Date(viewItem.flightId.departureTime).toLocaleString(
                      "en-IN",
                    )
                  : "—",
              ],
              ["Seat class", viewItem.seatClass || "Economy"],
              ["Seats", viewItem.seats ?? 1],
              ["Total amount", fmtMoney(viewItem.totalAmount)],
              ["Status", viewItem.status],
              ["Booked on", fmt(viewItem.createdAt)],
            ].map(([label, value], i) => (
              <div
                key={label}
                className={`flex justify-between items-center py-2.5 ${i > 0 ? "border-t border-[#EAF4FB]" : ""}`}
              >
                <span className="text-[12px] font-medium text-[#7A90A4]">
                  {label}
                </span>
                <span className="text-[12px] font-semibold text-[#0D1B2A] text-right max-w-[55%] truncate capitalize">
                  {value ?? "—"}
                </span>
              </div>
            ))}
          </div>
          <button
            onClick={() => setViewItem(null)}
            className="mt-4 w-full h-10 bg-[#F0F7FF] border border-[#D0E6F7] text-[#1565C0] text-[13px] font-medium rounded-[10px] hover:bg-[#E1EFFE] transition cursor-pointer"
          >
            Close
          </button>
        </Modal>
      )}

      {/* Cancel confirm */}
      {cancelItem && (
        <Modal title="Cancel booking" onClose={() => setCancelItem(null)}>
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <i className="ti ti-ban text-red-500 text-[22px]" />
            </div>
            <p className="text-[14px] font-semibold text-[#0D1B2A] mb-1">
              Cancel {cancelItem.bookingReference}?
            </p>
            <p className="text-[12px] text-[#7A90A4] mb-5">
              This will cancel the booking and trigger a refund if applicable.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setCancelItem(null)}
                className="flex-1 h-10 border border-[#D0E6F7] bg-[#F0F7FF] text-[#1565C0] text-[13px] font-medium rounded-[10px] cursor-pointer hover:bg-[#E1EFFE] transition"
              >
                Keep booking
              </button>
              <button className="flex-1 h-10 bg-red-500 hover:bg-red-600 text-white text-[13px] font-bold rounded-[10px] border-none cursor-pointer disabled:opacity-60 transition">
                Yes, cancel
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
