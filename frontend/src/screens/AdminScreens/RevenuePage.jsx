// src/pages/admin/RevenuePage.jsx
import { useState } from "react";
import {
  useGetRevenueOverviewQuery,
  useGetRevenueBreakdownQuery,
  useGetRevenueStatsQuery,
} from "../../slices/revenueApiSlice";

// ── Helpers ────────────────────────────────────────────
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

const fmt = (n) =>
  n === undefined || n === null
    ? "—"
    : n >= 10000000
      ? `₹${(n / 10000000).toFixed(2)}Cr`
      : n >= 100000
        ? `₹${(n / 100000).toFixed(2)}L`
        : n >= 1000
          ? `₹${(n / 1000).toFixed(1)}K`
          : `₹${Math.round(n)}`;

const pct = (v, total) => (total > 0 ? ((v / total) * 100).toFixed(1) : "0.0");

const growthCls = (g) =>
  g === null ? "text-[#7A90A4]" : g >= 0 ? "text-green-600" : "text-red-500";

const growthIcon = (g) =>
  g === null ? "ti-minus" : g >= 0 ? "ti-trending-up" : "ti-trending-down";

// ── Shared UI ──────────────────────────────────────────
function StatCard({ label, value, sub, subCls, icon, color, loading }) {
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
        <div className="h-8 bg-[#EAF4FB] rounded-lg animate-pulse w-28" />
      ) : (
        <>
          <p className="text-[26px] font-semibold text-[#0D1B2A] leading-none">
            {value}
          </p>
          {sub && (
            <p
              className={`text-[11px] mt-1.5 flex items-center gap-1 font-medium ${subCls || "text-[#7A90A4]"}`}
            >
              {sub}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function SectionHeader({ title, right }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <p className="text-[13px] font-bold text-[#0D1B2A]">{title}</p>
      {right && <p className="text-[11px] text-[#7A90A4]">{right}</p>}
    </div>
  );
}

function Card({ children, className = "" }) {
  return (
    <div
      className={`bg-white border border-[#D0E6F7] rounded-2xl p-5 ${className}`}
    >
      {children}
    </div>
  );
}

// ── Bar chart ──────────────────────────────────────────
function BarChart({ data, height = 140, showNet = false }) {
  const [hovered, setHovered] = useState(null);
  const maxVal = Math.max(
    ...data.map((d) => Math.max(d.revenue, d.net ?? 0)),
    1,
  );

  return (
    <div
      className="flex items-end gap-1 overflow-x-auto pb-1"
      style={{ height: height + 40 }}
    >
      {data.map((d, i) => {
        const revH = Math.round((d.revenue / maxVal) * height);
        const netH = showNet ? Math.round(((d.net ?? 0) / maxVal) * height) : 0;
        const isH = hovered === i;
        return (
          <div
            key={i}
            className="flex-1 flex flex-col items-center gap-1 cursor-default min-w-[28px]"
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            {/* Tooltip */}
            {isH && (
              <div
                className="absolute z-10 bg-[#0D1B2A] text-white text-[10px] font-semibold px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap -translate-y-1 pointer-events-none mb-1"
                style={{ position: "relative" }}
              >
                {MONTHS[i]}: {fmt(d.revenue)}
                {d.refunded > 0 && (
                  <span className="block text-red-300">
                    Refund: {fmt(d.refunded)}
                  </span>
                )}
                {showNet && (
                  <span className="block text-green-300">
                    Net: {fmt(d.net)}
                  </span>
                )}
              </div>
            )}
            <span className="text-[9px] font-semibold text-[#1565C0] h-3 leading-none">
              {isH ? fmt(d.revenue) : ""}
            </span>
            {/* Bars */}
            <div className="relative w-full flex items-end justify-center gap-0.5">
              {/* Revenue bar */}
              <div
                className="flex-1 rounded-t transition-all duration-300"
                style={{
                  height: `${revH}px`,
                  backgroundColor: isH ? "#1251A3" : "#1565C0",
                  opacity: isH ? 1 : 0.82,
                }}
              />
              {/* Net bar (if toggled) */}
              {showNet && (
                <div
                  className="flex-1 rounded-t transition-all duration-300"
                  style={{
                    height: `${netH}px`,
                    backgroundColor: (d.net ?? 0) >= 0 ? "#2E7D32" : "#C62828",
                    opacity: isH ? 1 : 0.7,
                  }}
                />
              )}
            </div>
            <span className="text-[8px] text-[#7A90A4] font-medium">
              {MONTHS[i]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Spark line ─────────────────────────────────────────
function SparkLine({ data, color = "#1565C0" }) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const w = 80;
  const h = 28;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  });
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
      <polyline
        points={pts.join(" ")}
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Progress bar ───────────────────────────────────────
function ProgressBar({ value, max, color = "bg-[#1565C0]" }) {
  const w = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="h-1.5 bg-[#EAF4FB] rounded-full overflow-hidden">
      <div
        className={`h-full ${color} rounded-full transition-all duration-500`}
        style={{ width: `${w}%` }}
      />
    </div>
  );
}

// ── Main page ──────────────────────────────────────────
export default function RevenuePage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [showNet, setShowNet] = useState(false);
  const [chartTab, setChartTab] = useState("bar"); // bar | daily

  const { data: overviewData, isLoading: ovLoading } =
    useGetRevenueOverviewQuery({ year });

  const { data: breakdownData, isLoading: bdLoading } =
    useGetRevenueBreakdownQuery({ year });

  const { data: statsData, isLoading: stLoading } = useGetRevenueStatsQuery();

  const ov = overviewData?.summary;
  const monthly = overviewData?.monthly ?? [];
  const bd = breakdownData;
  const stats = statsData?.stats;

  const topRouteMax = Math.max(
    ...(bd?.topRoutes?.map((r) => r.revenue) ?? [1]),
    1,
  );

  const STATUS_COLORS = {
    confirmed: "bg-green-500",
    completed: "bg-blue-500",
    cancelled: "bg-red-400",
    pending: "bg-amber-400",
  };

  return (
    <div className="space-y-5">
      {/* ── Year selector ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-[11px] font-semibold text-[#5A7089] uppercase tracking-[0.8px]">
          Revenue overview
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setYear((y) => y - 1)}
            className="w-8 h-8 rounded-lg border border-[#D0E6F7] bg-[#F0F7FF] flex items-center justify-center text-[#1565C0] hover:bg-[#E1EFFE] transition cursor-pointer"
          >
            <i className="ti ti-chevron-left text-[13px]" />
          </button>
          <span className="text-[13px] font-bold text-[#0D1B2A] w-10 text-center">
            {year}
          </span>
          <button
            onClick={() => setYear((y) => Math.min(y + 1, currentYear))}
            disabled={year >= currentYear}
            className="w-8 h-8 rounded-lg border border-[#D0E6F7] bg-[#F0F7FF] flex items-center justify-center text-[#1565C0] hover:bg-[#E1EFFE] transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <i className="ti ti-chevron-right text-[13px]" />
          </button>
        </div>
      </div>

      {/* ── KPI row 1 — live stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard
          label="Today's revenue"
          value={fmt(stats?.today.revenue)}
          sub={`${stats?.today.count ?? 0} bookings today`}
          icon="ti-calendar-today"
          color="bg-blue-50 text-blue-700"
          loading={stLoading}
        />
        <StatCard
          label="This month"
          value={fmt(stats?.thisMonth.revenue)}
          sub={
            stats?.momGrowth !== null
              ? `${stats?.momGrowth >= 0 ? "+" : ""}${stats?.momGrowth}% vs last month`
              : "No prior month data"
          }
          subCls={growthCls(stats?.momGrowth)}
          icon="ti-trending-up"
          color="bg-violet-50 text-violet-700"
          loading={stLoading}
        />
        <StatCard
          label="Pending"
          value={fmt(stats?.pending.revenue)}
          sub={`${stats?.pending.count ?? 0} pending bookings`}
          subCls="text-amber-600"
          icon="ti-clock"
          color="bg-amber-50 text-amber-700"
          loading={stLoading}
        />
        <StatCard
          label="Last month"
          value={fmt(stats?.lastMonth.revenue)}
          sub={`${stats?.lastMonth.count ?? 0} bookings`}
          icon="ti-history"
          color="bg-slate-50 text-slate-600"
          loading={stLoading}
        />
      </div>

      {/* ── KPI row 2 — year summary ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard
          label={`Total revenue ${year}`}
          value={fmt(ov?.totalRevenue)}
          sub={
            ov?.yoyGrowth !== null
              ? `${ov?.yoyGrowth >= 0 ? "+" : ""}${ov?.yoyGrowth}% YoY`
              : undefined
          }
          subCls={growthCls(ov?.yoyGrowth)}
          icon="ti-currency-rupee"
          color="bg-green-50 text-green-700"
          loading={ovLoading}
        />
        <StatCard
          label="Net revenue"
          value={fmt(ov?.totalNet)}
          sub={`After ₹${fmt(ov?.totalRefunds)} refunds`}
          icon="ti-report-money"
          color="bg-blue-50 text-blue-700"
          loading={ovLoading}
        />
        <StatCard
          label="Best month"
          value={ov ? MONTHS[(ov.bestMonth.month ?? 1) - 1] : "—"}
          sub={fmt(ov?.bestMonth.revenue)}
          icon="ti-star"
          color="bg-orange-50 text-orange-700"
          loading={ovLoading}
        />
        <StatCard
          label="Avg monthly"
          value={fmt(ov?.avgMonthly)}
          sub={`${ov?.totalBookings ?? "—"} total bookings`}
          icon="ti-chart-bar"
          color="bg-indigo-50 text-indigo-700"
          loading={ovLoading}
        />
      </div>

      {/* ── Monthly chart + Daily chart ── */}
      <Card>
        <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
          <div className="flex gap-1 bg-[#F0F7FF] border border-[#D0E6F7] rounded-xl p-1">
            {[
              ["bar", "Monthly"],
              ["daily", "Daily"],
            ].map(([k, l]) => (
              <button
                key={k}
                onClick={() => setChartTab(k)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition border-none cursor-pointer
                  ${chartTab === k ? "bg-[#1565C0] text-white" : "text-[#7A90A4] hover:text-[#0D1B2A] bg-transparent"}`}
              >
                {l}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer text-[12px] text-[#7A90A4] font-medium">
              <input
                type="checkbox"
                checked={showNet}
                onChange={(e) => setShowNet(e.target.checked)}
                className="w-3.5 h-3.5 accent-[#1565C0] cursor-pointer"
              />
              Show net revenue
            </label>
            <div className="flex items-center gap-3 text-[11px] text-[#7A90A4]">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#1565C0] inline-block" />{" "}
                Revenue
              </span>
              {showNet && (
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-green-600 inline-block" />{" "}
                  Net
                </span>
              )}
            </div>
          </div>
        </div>

        {ovLoading || bdLoading ? (
          <div className="h-40 bg-[#EAF4FB] rounded-xl animate-pulse" />
        ) : chartTab === "bar" ? (
          <BarChart data={monthly} height={140} showNet={showNet} />
        ) : (
          /* Daily mini bars for current month */
          <div>
            <p className="text-[11px] text-[#7A90A4] mb-3">
              Daily revenue —{" "}
              {new Date().toLocaleString("en-IN", {
                month: "long",
                year: "numeric",
              })}
            </p>
            <div className="flex items-end gap-0.5" style={{ height: 100 }}>
              {(bd?.daily ?? []).map((d, i) => {
                const maxD = Math.max(
                  ...(bd?.daily?.map((x) => x.revenue) ?? [1]),
                  1,
                );
                const h = Math.round((d.revenue / maxD) * 84);
                return (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center gap-0.5 group cursor-default"
                  >
                    <div
                      className="w-full rounded-t bg-[#1565C0] opacity-70 hover:opacity-100 transition-opacity"
                      style={{
                        height: `${Math.max(h, d.revenue > 0 ? 3 : 0)}px`,
                      }}
                      title={`Day ${d.day}: ${fmt(d.revenue)}`}
                    />
                    {i % 5 === 0 && (
                      <span className="text-[7px] text-[#B0C4D8]">{d.day}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      {/* ── Bottom grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Booking status split */}
        <Card>
          <SectionHeader title="Revenue by status" right={year} />
          {bdLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-8 bg-[#EAF4FB] rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {(bd?.byStatus ?? []).map((s) => (
                <div key={s._id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${STATUS_COLORS[s._id] || "bg-slate-400"}`}
                      />
                      <span className="text-[12px] font-semibold text-[#0D1B2A] capitalize">
                        {s._id}
                      </span>
                      <span className="text-[11px] text-[#7A90A4]">
                        ({s.count})
                      </span>
                    </div>
                    <span className="text-[12px] font-bold text-[#0D1B2A]">
                      {fmt(s.total)}
                    </span>
                  </div>
                  <ProgressBar
                    value={s.total}
                    max={bd?.byStatus?.reduce((a, x) => a + x.total, 0) || 1}
                    color={STATUS_COLORS[s._id] || "bg-slate-400"}
                  />
                  <p className="text-[10px] text-[#B0C4D8] mt-0.5">
                    {pct(
                      s.total,
                      bd?.byStatus?.reduce((a, x) => a + x.total, 0) || 1,
                    )}
                    %
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Seat class split */}
        <Card>
          <SectionHeader title="Revenue by class" right={year} />
          {bdLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-8 bg-[#EAF4FB] rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : (bd?.bySeatClass?.length ?? 0) === 0 ? (
            <div className="text-center py-8 text-[#B0C4D8]">
              <i className="ti ti-armchair text-[28px] block mb-1" />
              <p className="text-[12px]">No class data yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(bd?.bySeatClass ?? []).map((s, i) => {
                const colors = [
                  "bg-[#1565C0]",
                  "bg-violet-500",
                  "bg-amber-500",
                  "bg-green-500",
                ];
                const maxSC = Math.max(
                  ...(bd?.bySeatClass?.map((x) => x.total) ?? [1]),
                  1,
                );
                return (
                  <div key={s._id ?? i}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${colors[i % colors.length]}`}
                        />
                        <span className="text-[12px] font-semibold text-[#0D1B2A] capitalize">
                          {s._id || "Standard"}
                        </span>
                        <span className="text-[11px] text-[#7A90A4]">
                          ({s.count})
                        </span>
                      </div>
                      <span className="text-[12px] font-bold text-[#0D1B2A]">
                        {fmt(s.total)}
                      </span>
                    </div>
                    <ProgressBar
                      value={s.total}
                      max={maxSC}
                      color={colors[i % colors.length]}
                    />
                    <p className="text-[10px] text-[#B0C4D8] mt-0.5">
                      {pct(s.total, maxSC)}% of top class
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Top routes */}
        <Card>
          <SectionHeader title="Top routes" right={`by revenue · ${year}`} />
          {bdLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-8 bg-[#EAF4FB] rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : (bd?.topRoutes?.length ?? 0) === 0 ? (
            <div className="text-center py-8 text-[#B0C4D8]">
              <i className="ti ti-map-route text-[28px] block mb-1" />
              <p className="text-[12px]">No route data yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(bd?.topRoutes ?? []).map((r, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-[#EAF4FB] text-[#1565C0] text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-[12px] font-semibold text-[#0D1B2A]">
                        {r.source} → {r.destination}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-[12px] font-bold text-[#0D1B2A]">
                        {fmt(r.revenue)}
                      </p>
                      <p className="text-[10px] text-[#B0C4D8]">
                        {r.count} bookings
                      </p>
                    </div>
                  </div>
                  <ProgressBar value={r.revenue} max={topRouteMax} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ── Monthly table ── */}
      <Card>
        <SectionHeader
          title={`Monthly breakdown — ${year}`}
          right="All figures in ₹"
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-[#EAF4FB]">
                {[
                  "Month",
                  "Revenue",
                  "Refunds",
                  "Net",
                  "Bookings",
                  "Trend",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left py-2.5 px-3 text-[10px] font-bold text-[#7A90A4] uppercase tracking-[0.6px]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ovLoading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((__, j) => (
                        <td key={j} className="px-3 py-2.5">
                          <div className="h-4 bg-[#EAF4FB] rounded animate-pulse w-16" />
                        </td>
                      ))}
                    </tr>
                  ))
                : monthly.map((m, i) => {
                    const isCurrentMonth =
                      new Date().getFullYear() === year &&
                      new Date().getMonth() + 1 === m.month;
                    const netPositive = m.net >= 0;
                    return (
                      <tr
                        key={i}
                        className={`border-b border-[#F0F7FF] transition-colors
                        ${isCurrentMonth ? "bg-blue-50/60" : "hover:bg-[#F8FBFF]"}`}
                      >
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] font-semibold text-[#0D1B2A]">
                              {MONTHS[m.month - 1]}
                            </span>
                            {isCurrentMonth && (
                              <span className="text-[9px] font-bold bg-[#1565C0] text-white px-1.5 py-0.5 rounded-full">
                                NOW
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-[12px] font-semibold text-[#0D1B2A]">
                          {fmt(m.revenue)}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`text-[12px] font-medium ${m.refunded > 0 ? "text-red-500" : "text-[#B0C4D8]"}`}
                          >
                            {m.refunded > 0 ? `−${fmt(m.refunded)}` : "—"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`text-[12px] font-bold ${netPositive ? "text-green-700" : "text-red-600"}`}
                          >
                            {fmt(m.net)}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-[12px] text-[#7A90A4]">
                          {m.bookingCount || "—"}
                        </td>
                        <td className="py-2.5 px-3">
                          {i > 0 && monthly[i - 1].revenue > 0 ? (
                            <span
                              className={`flex items-center gap-1 text-[11px] font-semibold ${
                                m.revenue >= monthly[i - 1].revenue
                                  ? "text-green-600"
                                  : "text-red-500"
                              }`}
                            >
                              <i
                                className={`ti ${m.revenue >= monthly[i - 1].revenue ? "ti-trending-up" : "ti-trending-down"} text-[12px]`}
                              />
                              {Math.abs(
                                ((m.revenue - monthly[i - 1].revenue) /
                                  monthly[i - 1].revenue) *
                                  100,
                              ).toFixed(1)}
                              %
                            </span>
                          ) : (
                            <span className="text-[11px] text-[#B0C4D8]">
                              —
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
            {!ovLoading && monthly.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-[#D0E6F7] bg-[#F0F7FF]">
                  <td className="py-3 px-3 text-[12px] font-bold text-[#0D1B2A]">
                    Total
                  </td>
                  <td className="py-3 px-3 text-[12px] font-bold text-[#0D1B2A]">
                    {fmt(ov?.totalRevenue)}
                  </td>
                  <td className="py-3 px-3 text-[12px] font-bold text-red-500">
                    {ov?.totalRefunds > 0 ? `−${fmt(ov?.totalRefunds)}` : "—"}
                  </td>
                  <td className="py-3 px-3 text-[12px] font-bold text-green-700">
                    {fmt(ov?.totalNet)}
                  </td>
                  <td className="py-3 px-3 text-[12px] font-bold text-[#0D1B2A]">
                    {ov?.totalBookings ?? "—"}
                  </td>
                  <td className="py-3 px-3">
                    {ov?.yoyGrowth !== null && (
                      <span
                        className={`flex items-center gap-1 text-[11px] font-bold ${growthCls(ov?.yoyGrowth)}`}
                      >
                        <i
                          className={`ti ${growthIcon(ov?.yoyGrowth)} text-[12px]`}
                        />
                        {ov?.yoyGrowth >= 0 ? "+" : ""}
                        {ov?.yoyGrowth}% YoY
                      </span>
                    )}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>
    </div>
  );
}
