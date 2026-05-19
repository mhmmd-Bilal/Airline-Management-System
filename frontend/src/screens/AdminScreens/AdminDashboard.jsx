// src/pages/admin/AdminDashboard.jsx
import { useNavigate } from "react-router-dom";
import {
  SectionTitle,
  Card,
  CardTitle,
} from "../../components/admin/shared/Card";
import { Th, Td } from "../../components/admin/shared/AdminTable";
import Badge from "../../components/admin/shared/Badge";
import Avatar from "../../components/admin/shared/Avatar";

import {
  useGetFlightStatsQuery,
  useGetAllFlightsQuery,
} from "../../slices/flightApiSlice";
import {
  useGetCrewStatsQuery,
  useGetAllCrewQuery,
} from "../../slices/crewApiSlice";
import { useGetAllTicketsQuery } from "../../slices/supportApiSlice";
import {
  useGetRevenueStatsQuery,
  useGetRevenueOverviewQuery,
} from "../../slices/revenueApiSlice";

// ── Helpers ────────────────────────────────────────────
const fmt = (n) =>
  n === undefined || n === null
    ? "—"
    : n >= 10000000
      ? `₹${(n / 10000000).toFixed(2)}Cr`
      : n >= 100000
        ? `₹${(n / 100000).toFixed(2)}L`
        : n >= 1000
          ? `₹${(n / 1000).toFixed(1)}K`
          : `₹${Math.round(n).toLocaleString()}`;

const timeAgo = (dt) => {
  if (!dt) return "—";
  const diff = Math.floor((Date.now() - new Date(dt)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const fmtTime = (dt) =>
  dt
    ? new Date(dt).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : "—";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const FLIGHT_STATUS_MAP = {
  scheduled: "Scheduled",
  delayed: "Delayed",
  boarding: "Boarding",
  "in-flight": "In Flight",
  completed: "Arrived",
  cancelled: "Cancelled",
};

const PRIORITY_CFG = {
  low: "bg-slate-100 text-slate-500",
  medium: "bg-blue-50 text-blue-600",
  high: "bg-orange-50 text-orange-600",
  urgent: "bg-red-50 text-red-600",
};

const CREW_STATUS_CFG = {
  Available: "bg-green-50 text-green-700",
  "On Duty": "bg-blue-50 text-blue-700",
  "Off Duty": "bg-slate-100 text-slate-500",
  "On Leave": "bg-orange-50 text-orange-700",
};

// ── Shared primitives ──────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white border border-[#D0E6F7] rounded-2xl p-5 animate-pulse">
      <div className="h-3 bg-[#EAF4FB] rounded w-24 mb-3" />
      <div className="h-7 bg-[#EAF4FB] rounded w-20 mb-2" />
      <div className="h-3 bg-[#EAF4FB] rounded w-16" />
    </div>
  );
}

function StatCard({ label, value, change, up, icon, loading }) {
  return loading ? (
    <SkeletonCard />
  ) : (
    <Card>
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#7A90A4] uppercase tracking-[0.6px] mb-2">
        <i className={`ti ${icon} text-[14px]`} />
        {label}
      </div>
      <p className="text-[26px] font-semibold text-[#0D1B2A] leading-none">
        {value}
      </p>
      {change !== undefined && (
        <p
          className={`text-[11px] font-semibold mt-1.5 flex items-center gap-1 ${up ? "text-green-700" : "text-red-700"}`}
        >
          <i
            className={`ti ${up ? "ti-trending-up" : "ti-trending-down"} text-[12px]`}
          />
          {change}
        </p>
      )}
    </Card>
  );
}

// ── Revenue mini bar chart ─────────────────────────────
function MiniBarChart({ monthly }) {
  const maxRev = Math.max(...monthly.map((m) => m.revenue), 1);
  return (
    <div className="flex items-end gap-1 h-24">
      {monthly.map((m, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
          <div
            className="w-full bg-[#1565C0] rounded-t opacity-75 hover:opacity-100 transition-opacity cursor-default"
            style={{ height: `${(m.revenue / maxRev) * 88}px` }}
            title={`${MONTHS[m.month - 1]}: ${fmt(m.revenue)}`}
          />
          <span className="text-[8px] text-[#7A90A4]">
            {MONTHS[m.month - 1]}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Main dashboard ─────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate();
  const year = new Date().getFullYear();

  // ── Data fetching ──────────────────────────────────
  const { data: flightStats, isLoading: fsLoading } = useGetFlightStatsQuery();
  const { data: crewStats, isLoading: csLoading } = useGetCrewStatsQuery();
  const { data: revenueStats, isLoading: rsLoading } =
    useGetRevenueStatsQuery();
  const { data: revenueYearly, isLoading: ryLoading } =
    useGetRevenueOverviewQuery({ year });

  // Recent active flights — sorted by departure, latest first
  const { data: activeFlightsData, isLoading: afLoading } =
    useGetAllFlightsQuery({
      status: "all",
      page: 1,
      limit: 6,
    });

  // On-duty crew
  const { data: onDutyData, isLoading: odLoading } = useGetAllCrewQuery({
    currentStatus: "On Duty",
    limit: 5,
  });
  const { data: availableData } = useGetAllCrewQuery({
    currentStatus: "Available",
    limit: 3,
  });

  // Open support tickets (unresolved)
  const { data: ticketsData, isLoading: tkLoading } = useGetAllTicketsQuery({
    status: "open",
    limit: 5,
  });
  const { data: ipTicketsData } = useGetAllTicketsQuery({
    status: "in-progress",
    limit: 3,
  });

  // Derived values
  const fs = flightStats?.data;
  const cs = crewStats?.data;
  const rv = revenueStats?.stats;
  const monthly = revenueYearly?.monthly ?? [];

  const recentFlights = activeFlightsData?.data ?? [];

  // merge on-duty + available crew for the panel
  const crewPanel = [
    ...(onDutyData?.data ?? []),
    ...(availableData?.data ?? []),
  ].slice(0, 5);

  // merge open + in-progress tickets
  const openTickets = [
    ...(ticketsData?.data ?? []),
    ...(ipTicketsData?.data ?? []),
  ]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  const totalTickets = (ticketsData?.total ?? 0) + (ipTicketsData?.total ?? 0);

  const momGrowth = rv?.momGrowth;
  const momGrowthStr =
    momGrowth !== null && momGrowth !== undefined
      ? `${momGrowth >= 0 ? "+" : ""}${momGrowth}% vs last month`
      : "No prior data";

  return (
    <>
      <SectionTitle>At a glance</SectionTitle>

      {/* ── Primary KPI stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-7">
        <StatCard
          label="Total Flights"
          value={fsLoading ? "—" : (fs?.total ?? 0).toLocaleString()}
          change={
            fs
              ? `${fs.inFlight} in-flight · ${fs.boarding} boarding`
              : undefined
          }
          up
          icon="ti-plane"
          loading={fsLoading}
        />
        <StatCard
          label="Active Crew"
          value={csLoading ? "—" : (cs?.onDuty ?? 0).toLocaleString()}
          change={
            cs
              ? `${cs.available} available · ${cs.onLeave} on leave`
              : undefined
          }
          up
          icon="ti-users"
          loading={csLoading}
        />
        <StatCard
          label="Revenue this month"
          value={rsLoading ? "—" : fmt(rv?.thisMonth.revenue)}
          change={momGrowthStr}
          up={(momGrowth ?? 0) >= 0}
          icon="ti-coin-rupee"
          loading={rsLoading}
        />
        <StatCard
          label="Open tickets"
          value={tkLoading ? "—" : totalTickets.toLocaleString()}
          change={`${ticketsData?.stats?.urgent ?? 0} urgent`}
          up={false}
          icon="ti-ticket"
          loading={tkLoading}
        />
      </div>

      {/* ── Secondary stats row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-7">
        {[
          {
            label: "Scheduled",
            value: fs?.scheduled ?? "—",
            icon: "ti-calendar",
            color: "text-blue-700",
            bg: "bg-blue-50",
          },
          {
            label: "Delayed",
            value: fs?.delayed ?? "—",
            icon: "ti-clock-exclamation",
            color: "text-orange-700",
            bg: "bg-orange-50",
          },
          {
            label: "Completed today",
            value: fs?.completed ?? "—",
            icon: "ti-circle-check",
            color: "text-green-700",
            bg: "bg-green-50",
          },
          {
            label: "Today's revenue",
            value: fmt(rv?.today.revenue),
            icon: "ti-trending-up",
            color: "text-violet-700",
            bg: "bg-violet-50",
          },
        ].map(({ label, value, icon, color, bg }) => (
          <div
            key={label}
            className="bg-white border border-[#D0E6F7] rounded-2xl p-4 flex items-center gap-3"
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}
            >
              <i className={`ti ${icon} text-[18px] ${color}`} />
            </div>
            <div>
              <p className="text-[11px] font-medium text-[#7A90A4] uppercase tracking-[0.6px]">
                {label}
              </p>
              <p className="text-[20px] font-bold text-[#0D1B2A] leading-tight">
                {value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Revenue chart + Crew panel ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 mb-7">
        {/* Revenue chart */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <CardTitle>Revenue overview</CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#7A90A4]">₹ · {year}</span>
              <button
                onClick={() => navigate("/revenue")}
                className="text-[11px] font-semibold text-[#1565C0] hover:underline bg-transparent border-none cursor-pointer"
              >
                View full →
              </button>
            </div>
          </div>
          {ryLoading ? (
            <div className="h-24 bg-[#EAF4FB] rounded-xl animate-pulse" />
          ) : monthly.length > 0 ? (
            <>
              <MiniBarChart monthly={monthly} />
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#EAF4FB]">
                <div>
                  <p className="text-[10px] text-[#7A90A4] uppercase tracking-wider">
                    YTD Revenue
                  </p>
                  <p className="text-[14px] font-bold text-[#0D1B2A]">
                    {fmt(revenueYearly?.summary?.totalRevenue)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-[#7A90A4] uppercase tracking-wider">
                    Best month
                  </p>
                  <p className="text-[14px] font-bold text-[#0D1B2A]">
                    {revenueYearly?.summary?.bestMonth
                      ? `${MONTHS[(revenueYearly.summary.bestMonth.month ?? 1) - 1]} · ${fmt(revenueYearly.summary.bestMonth.revenue)}`
                      : "—"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-[#7A90A4] uppercase tracking-wider">
                    Total refunds
                  </p>
                  <p className="text-[14px] font-bold text-red-500">
                    {fmt(revenueYearly?.summary?.totalRefunds)}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="h-24 flex items-center justify-center text-[12px] text-[#B0C4D8]">
              <i className="ti ti-chart-bar-off text-[24px] mr-2" /> No revenue
              data yet
            </div>
          )}
        </Card>

        {/* Crew panel */}
        <Card>
          <div className="flex items-center justify-between mb-1">
            <CardTitle>Crew status</CardTitle>
            <button
              onClick={() => navigate("/crew")}
              className="text-[11px] font-semibold text-[#1565C0] hover:underline bg-transparent border-none cursor-pointer"
            >
              View all →
            </button>
          </div>

          {/* Mini crew stats */}
          <div className="flex gap-2 mb-3">
            {[
              {
                label: "On Duty",
                value: cs?.onDuty,
                color: "bg-blue-50 text-blue-700",
              },
              {
                label: "Available",
                value: cs?.available,
                color: "bg-green-50 text-green-700",
              },
              {
                label: "On Leave",
                value: cs?.onLeave,
                color: "bg-orange-50 text-orange-700",
              },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                className={`flex-1 rounded-xl px-2 py-1.5 text-center ${color}`}
              >
                <p className="text-[16px] font-black leading-none">
                  {csLoading ? "—" : (value ?? 0)}
                </p>
                <p className="text-[9px] font-semibold mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {odLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 py-2.5 border-t border-[#EAF4FB] animate-pulse"
              >
                <div className="w-8 h-8 bg-[#EAF4FB] rounded-full flex-shrink-0" />
                <div className="flex-1">
                  <div className="h-3 bg-[#EAF4FB] rounded w-32 mb-1" />
                  <div className="h-2.5 bg-[#EAF4FB] rounded w-20" />
                </div>
              </div>
            ))
          ) : crewPanel.length === 0 ? (
            <div className="text-center py-6 text-[#B0C4D8]">
              <i className="ti ti-users-off text-[24px] block mb-1" />
              <p className="text-[12px]">No active crew</p>
            </div>
          ) : (
            crewPanel.map((c, i) => {
              const name = c.userId?.name ?? "—";
              const stsCls =
                CREW_STATUS_CFG[c.currentStatus] ||
                "bg-slate-100 text-slate-500";
              return (
                <div
                  key={c._id}
                  className={`flex items-center gap-3 py-2.5 cursor-pointer hover:bg-[#F8FBFF] rounded-xl px-1 transition ${i > 0 ? "border-t border-[#EAF4FB]" : ""}`}
                  onClick={() => navigate("/crew")}
                >
                  <Avatar name={name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-[#0D1B2A] truncate">
                      {name}
                    </p>
                    <p className="text-[10px] text-[#7A90A4]">
                      {c.role} · {c.employeeId}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${stsCls}`}
                  >
                    {c.currentStatus}
                  </span>
                </div>
              );
            })
          )}
        </Card>
      </div>

      {/* ── Flight status overview pills ── */}
      {!fsLoading && fs && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 mb-7">
          {[
            {
              label: "Scheduled",
              value: fs.scheduled,
              color: "bg-blue-50 text-blue-700 border-blue-100",
            },
            {
              label: "Boarding",
              value: fs.boarding,
              color: "bg-violet-50 text-violet-700 border-violet-100",
            },
            {
              label: "In Flight",
              value: fs.inFlight,
              color: "bg-indigo-50 text-indigo-700 border-indigo-100",
            },
            {
              label: "Delayed",
              value: fs.delayed,
              color: "bg-orange-50 text-orange-700 border-orange-100",
            },
            {
              label: "Completed",
              value: fs.completed,
              color: "bg-green-50 text-green-700 border-green-100",
            },
            {
              label: "Cancelled",
              value: fs.cancelled,
              color: "bg-red-50 text-red-700 border-red-100",
            },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className={`border rounded-2xl p-3.5 text-center cursor-pointer hover:shadow-sm transition ${color}`}
              onClick={() => navigate("/flights")}
            >
              <p className="text-[22px] font-black leading-none">
                {value ?? 0}
              </p>
              <p className="text-[10px] font-semibold mt-1 opacity-80">
                {label}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ── Recent flights ── */}
      <div className="flex items-center justify-between mb-3">
        <SectionTitle>Recent flights</SectionTitle>
        <button
          onClick={() => navigate("/flights")}
          className="text-[11px] font-semibold text-[#1565C0] hover:underline bg-transparent border-none cursor-pointer mb-3"
        >
          View all →
        </button>
      </div>

      <Card className="mb-7 overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr>
              <Th>Flight</Th>
              <Th>Route</Th>
              <Th>Aircraft</Th>
              <Th>Departure</Th>
              <Th>Seats</Th>
              <Th>Status</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {afLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-[#EAF4FB] rounded animate-pulse w-16" />
                    </td>
                  ))}
                </tr>
              ))
            ) : recentFlights.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="text-center py-10 text-[13px] text-[#7A90A4]"
                >
                  <i className="ti ti-plane-off text-[24px] block mb-1 text-[#D0E6F7]" />
                  No flights found
                </td>
              </tr>
            ) : (
              recentFlights.map((f) => (
                <tr
                  key={f._id}
                  className="cursor-pointer hover:bg-[#F8FBFF] transition"
                  onClick={() => navigate(`/flights/${f._id}`)}
                >
                  <Td>
                    <span className="font-bold text-[#1565C0]">
                      {f.flightNumber}
                    </span>
                  </Td>
                  <Td>
                    <span className="font-medium text-[#0D1B2A]">
                      {f.source} → {f.destination}
                    </span>
                  </Td>
                  <Td className="text-[#7A90A4]">
                    {f.aircraftId?.registrationNumber || "—"}
                  </Td>
                  <Td className="text-[#7A90A4]">{fmtTime(f.departureTime)}</Td>
                  <Td>
                    <span
                      className={`text-[12px] font-semibold ${
                        f.availableSeats === 0
                          ? "text-red-500"
                          : "text-green-700"
                      }`}
                    >
                      {f.availableSeats} / {f.totalSeats}
                    </span>
                  </Td>
                  <Td>
                    <Badge label={FLIGHT_STATUS_MAP[f.status] || f.status} />
                  </Td>
                  <Td>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/flights/${f._id}`);
                      }}
                      className="w-7 h-7 rounded-md border border-[#D0E6F7] bg-[#F0F7FF] flex items-center justify-center text-[#1565C0] hover:bg-[#E1EFFE] transition cursor-pointer"
                    >
                      <i className="ti ti-eye text-[12px]" />
                    </button>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      {/* ── Open support tickets ── */}
      <div className="flex items-center justify-between mb-3">
        <SectionTitle>Open support tickets</SectionTitle>
        <button
          onClick={() => navigate("/support")}
          className="text-[11px] font-semibold text-[#1565C0] hover:underline bg-transparent border-none cursor-pointer mb-3"
        >
          View all →
        </button>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[500px]">
          <thead>
            <tr>
              <Th>Ticket</Th>
              <Th>User</Th>
              <Th>Subject</Th>
              <Th>Category</Th>
              <Th>Priority</Th>
              <Th>Opened</Th>
            </tr>
          </thead>
          <tbody>
            {tkLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-[#EAF4FB] rounded animate-pulse w-16" />
                    </td>
                  ))}
                </tr>
              ))
            ) : openTickets.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="text-center py-10 text-[13px] text-[#7A90A4]"
                >
                  <i className="ti ti-circle-check text-[24px] block mb-1 text-[#D0E6F7]" />
                  No open tickets — all clear!
                </td>
              </tr>
            ) : (
              openTickets.map((t) => (
                <tr
                  key={t._id}
                  className="cursor-pointer hover:bg-[#F8FBFF] transition"
                  onClick={() => navigate("/support")}
                >
                  <Td>
                    <span className="font-bold text-[#1565C0] text-[12px]">
                      {t.ticketNumber}
                    </span>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#EAF4FB] text-[#1565C0] flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                        {t.raisedBy?.name?.charAt(0).toUpperCase() || "?"}
                      </div>
                      <span className="text-[12px] font-medium text-[#0D1B2A] truncate max-w-[100px]">
                        {t.raisedBy?.name ?? "—"}
                      </span>
                    </div>
                  </Td>
                  <Td>
                    <p className="text-[12px] text-[#0D1B2A] font-medium max-w-[160px] truncate">
                      {t.subject}
                    </p>
                  </Td>
                  <Td>
                    <span className="text-[11px] text-[#7A90A4] capitalize">
                      {t.category}
                    </span>
                  </Td>
                  <Td>
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${PRIORITY_CFG[t.priority] || "bg-slate-100 text-slate-500"}`}
                    >
                      {t.priority}
                    </span>
                  </Td>
                  <Td>
                    <span className="text-[11px] text-[#7A90A4]">
                      {timeAgo(t.createdAt)}
                    </span>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {totalTickets > 5 && (
          <div className="mt-3 pt-3 border-t border-[#EAF4FB] text-center">
            <button
              onClick={() => navigate("/support")}
              className="text-[12px] font-semibold text-[#1565C0] hover:underline bg-transparent border-none cursor-pointer"
            >
              View all {totalTickets} open tickets →
            </button>
          </div>
        )}
      </Card>
    </>
  );
}
