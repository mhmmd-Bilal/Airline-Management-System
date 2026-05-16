import { useState } from "react";
import UserNavbar from "../../components/UserNavbar";
import { useGetMyLoyaltyQuery } from "../../slices/loyaltyApiSlice";

// ── Constants ──────────────────────────────────────────
const TIER_CONFIG = {
  silver: {
    label: "Silver",
    color: "text-slate-600",
    bg: "bg-slate-100",
    border: "border-slate-300",
    gradient: "from-slate-400 to-slate-500",
    ring: "ring-slate-300",
    icon: "🥈",
    perks: [
      "10 pts per ₹1,000 spent",
      "Priority check-in",
      "Free seat selection",
    ],
  },
  gold: {
    label: "Gold",
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-300",
    gradient: "from-amber-400 to-yellow-500",
    ring: "ring-amber-300",
    icon: "🥇",
    perks: [
      "20 pts per ₹1,000 spent (2×)",
      "Lounge access",
      "Free meal selection",
      "Extra baggage allowance",
    ],
  },
  platinum: {
    label: "Platinum",
    color: "text-violet-700",
    bg: "bg-violet-50",
    border: "border-violet-300",
    gradient: "from-violet-500 to-purple-600",
    ring: "ring-violet-300",
    icon: "💎",
    perks: [
      "30 pts per ₹1,000 spent (3×)",
      "Unlimited lounge access",
      "Dedicated support line",
      "Complimentary upgrades",
      "Partner hotel discounts",
    ],
  },
};

const HISTORY_TYPE_CONFIG = {
  earned: { label: "Earned", cls: "bg-green-100 text-green-700", icon: "+" },
  redeemed: { label: "Redeemed", cls: "bg-red-100 text-red-600", icon: "−" },
  bonus: { label: "Bonus", cls: "bg-blue-100 text-blue-700", icon: "★" },
  expired: { label: "Expired", cls: "bg-gray-100 text-gray-500", icon: "×" },
};

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

// ── Tier card ──────────────────────────────────────────
function TierCard({ tier, current }) {
  const cfg = TIER_CONFIG[tier];
  const isCurrent = current === tier;
  return (
    <div
      className={`rounded-2xl border-2 p-5 transition-all
      ${isCurrent ? `${cfg.border} ${cfg.bg} shadow-md` : "border-slate-100 bg-white opacity-60"}`}
    >
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">{cfg.icon}</span>
        <div>
          <p
            className={`text-[14px] font-bold ${isCurrent ? cfg.color : "text-slate-400"}`}
          >
            {cfg.label}
            {isCurrent && (
              <span className="ml-2 text-[10px] font-bold bg-white px-2 py-0.5 rounded-full border">
                Current
              </span>
            )}
          </p>
        </div>
      </div>
      <ul className="flex flex-col gap-1.5">
        {cfg.perks.map((perk) => (
          <li key={perk} className="flex items-start gap-2">
            <span
              className={`text-[12px] mt-0.5 flex-shrink-0 ${isCurrent ? cfg.color : "text-slate-400"}`}
            >
              ✓
            </span>
            <span
              className={`text-[12px] ${isCurrent ? "text-slate-700" : "text-slate-400"}`}
            >
              {perk}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── History row ────────────────────────────────────────
function HistoryRow({ entry, i }) {
  const cfg = HISTORY_TYPE_CONFIG[entry.type] || HISTORY_TYPE_CONFIG.earned;
  const sign =
    entry.type === "redeemed" || entry.type === "expired" ? "−" : "+";
  return (
    <div
      className={`flex items-center gap-4 py-3.5 ${i > 0 ? "border-t border-slate-100" : ""}`}
    >
      <div
        className={`w-8 h-8 rounded-xl flex items-center justify-center text-[14px] font-bold flex-shrink-0 ${cfg.cls}`}
      >
        {cfg.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-[#0C3060] truncate">
          {entry.description || cfg.label}
        </p>
        <p className="text-[11px] text-slate-400 mt-0.5">
          {fmtDate(entry.date)}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p
          className={`text-[14px] font-bold ${entry.type === "redeemed" ? "text-red-500" : "text-green-600"}`}
        >
          {sign}
          {entry.points?.toLocaleString()} pts
        </p>
        <span
          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.cls}`}
        >
          {cfg.label}
        </span>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────
export default function LoyaltyScreen() {
  const [historyTab, setHistoryTab] = useState("all");

  const { data, isLoading, isError } = useGetMyLoyaltyQuery();
  const loyalty = data?.data;

  const filteredHistory = (loyalty?.history ?? []).filter((h) =>
    historyTab === "all" ? true : h.type === historyTab,
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <UserNavbar />
        <div className="flex items-center justify-center py-32">
          <div className="w-10 h-10 border-4 border-blue-100 border-t-[#0C3060] rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-slate-50">
        <UserNavbar />
        <div className="max-w-xl mx-auto px-4 py-20 text-center">
          <p className="text-[15px] font-semibold text-slate-500">
            Failed to load loyalty profile
          </p>
        </div>
      </div>
    );
  }

  const tier = loyalty?.tier || "silver";
  const cfg = TIER_CONFIG[tier];
  const next = loyalty?.nextTier;

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <UserNavbar />

      {/* ── Hero banner ── */}
      <div
        className={`bg-gradient-to-br ${cfg.gradient} px-6 py-10 relative overflow-hidden`}
      >
        <div className="absolute w-64 h-64 rounded-full bg-white/10 -top-16 -right-16" />
        <div className="absolute w-40 h-40 rounded-full bg-white/[0.07] bottom-0 left-24" />
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <p className="text-white/70 text-[11px] font-semibold uppercase tracking-[0.18em] mb-2">
                Loyalty rewards
              </p>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-4xl">{cfg.icon}</span>
                <h1 className="text-white text-3xl font-black">
                  {cfg.label} Member
                </h1>
              </div>
              <p className="text-white/70 text-[13px]">
                {loyalty?.totalEarned?.toLocaleString() || 0} lifetime points
                earned
              </p>
            </div>

            {/* Points balance */}
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-7 py-5 text-center border border-white/30">
              <p className="text-white/70 text-[11px] font-semibold uppercase tracking-widest mb-1">
                Available points
              </p>
              <p className="text-white text-[42px] font-black leading-none">
                {loyalty?.points?.toLocaleString() || 0}
              </p>
              <p className="text-white/70 text-[12px] mt-1">
                ≈ ₹{loyalty?.redemptionValue?.toLocaleString() || 0} value
              </p>
            </div>
          </div>

          {/* Progress to next tier */}
          {next?.nextTier && (
            <div className="mt-6 bg-white/20 backdrop-blur-sm rounded-2xl px-5 py-4 border border-white/30">
              <div className="flex items-center justify-between mb-2">
                <p className="text-white text-[12px] font-semibold">
                  Progress to {TIER_CONFIG[next.nextTier]?.label}
                </p>
                <p className="text-white/80 text-[12px] font-bold">
                  {next.pointsNeeded?.toLocaleString()} pts to go
                </p>
              </div>
              <div className="h-2.5 bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-700"
                  style={{ width: `${next.progress}%` }}
                />
              </div>
              <p className="text-white/60 text-[11px] mt-1.5">
                {next.progress}% complete
              </p>
            </div>
          )}

          {tier === "platinum" && (
            <div className="mt-4 bg-white/20 backdrop-blur-sm rounded-2xl px-5 py-3 border border-white/30">
              <p className="text-white text-[13px] font-semibold text-center">
                💎 You've reached the highest tier — Platinum Elite!
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Left col ── */}
          <div className="flex flex-col gap-5">
            {/* Quick stats */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                Your stats
              </p>
              {[
                {
                  label: "Current balance",
                  value: `${loyalty?.points?.toLocaleString() || 0} pts`,
                  icon: "⭐",
                },
                {
                  label: "Total earned",
                  value: `${loyalty?.totalEarned?.toLocaleString() || 0} pts`,
                  icon: "📈",
                },
                {
                  label: "Total redeemed",
                  value: `${loyalty?.totalRedeemed?.toLocaleString() || 0} pts`,
                  icon: "🎁",
                },
                {
                  label: "Cash value",
                  value: `₹${loyalty?.redemptionValue?.toLocaleString() || 0}`,
                  icon: "💰",
                },
                {
                  label: "Transactions",
                  value: loyalty?.history?.length || 0,
                  icon: "📋",
                },
              ].map(({ label, value, icon }, i) => (
                <div
                  key={label}
                  className={`flex items-center justify-between py-3 ${i > 0 ? "border-t border-slate-100" : ""}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[14px]">{icon}</span>
                    <span className="text-[12px] font-medium text-slate-500">
                      {label}
                    </span>
                  </div>
                  <span className="text-[13px] font-bold text-[#0C3060]">
                    {value}
                  </span>
                </div>
              ))}
            </div>

            {/* How to earn */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                How to earn
              </p>
              {[
                { action: "Book a flight", pts: "10 pts / ₹1,000", icon: "✈️" },
                { action: "Gold member", pts: "2× multiplier", icon: "🥇" },
                { action: "Platinum member", pts: "3× multiplier", icon: "💎" },
                { action: "Refer a friend", pts: "500 pts bonus", icon: "👥" },
                { action: "Birthday bonus", pts: "200 pts / year", icon: "🎂" },
              ].map(({ action, pts, icon }, i) => (
                <div
                  key={action}
                  className={`flex items-center justify-between py-3 ${i > 0 ? "border-t border-slate-100" : ""}`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-[15px]">{icon}</span>
                    <span className="text-[12px] font-medium text-slate-600">
                      {action}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    {pts}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right col ── */}
          <div className="lg:col-span-2 flex flex-col gap-5">
            {/* Tier cards */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                Membership tiers
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {["silver", "gold", "platinum"].map((t) => (
                  <TierCard key={t} tier={t} current={tier} />
                ))}
              </div>
            </div>

            {/* Redeem banner */}
            {(loyalty?.points || 0) >= 1000 && (
              <div className="bg-gradient-to-r from-[#0C3060] to-[#185FA5] rounded-2xl p-5 flex items-center gap-4 relative overflow-hidden">
                <div className="absolute right-0 top-0 w-32 h-full bg-white/[0.05] skew-x-[-20deg] translate-x-8" />
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl">
                  🎁
                </div>
                <div className="flex-1 relative z-10">
                  <p className="text-white font-bold text-[14px]">
                    Ready to redeem!
                  </p>
                  <p className="text-blue-200 text-[12px] mt-0.5">
                    Use your {loyalty.points.toLocaleString()} points for ₹
                    {loyalty.redemptionValue?.toLocaleString()} off your next
                    flight
                  </p>
                </div>
                <button
                  onClick={() => (window.location.href = "/deals")}
                  className="flex-shrink-0 h-9 px-4 bg-white text-[#0C3060] text-[12px] font-bold rounded-xl hover:bg-blue-50 transition border-none cursor-pointer relative z-10"
                >
                  Book now
                </button>
              </div>
            )}

            {/* Transaction history */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  Transaction history
                </p>
                <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
                  {["all", "earned", "redeemed", "bonus"].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setHistoryTab(tab)}
                      className={`px-3 py-1 rounded-md text-[11px] font-semibold capitalize transition border-none cursor-pointer
                        ${
                          historyTab === tab
                            ? "bg-white text-[#0C3060] shadow-sm"
                            : "text-slate-400 bg-transparent hover:text-slate-600"
                        }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {filteredHistory.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-[28px] mb-2">✈️</p>
                  <p className="text-[13px] text-slate-400 font-medium">
                    No transactions yet
                  </p>
                  <p className="text-[11px] text-slate-300 mt-1">
                    Book a flight to start earning points
                  </p>
                </div>
              ) : (
                <div>
                  {filteredHistory.slice(0, 15).map((entry, i) => (
                    <HistoryRow key={entry._id || i} entry={entry} i={i} />
                  ))}
                  {filteredHistory.length > 15 && (
                    <p className="text-center text-[11px] text-slate-400 mt-3 pt-3 border-t border-slate-100">
                      Showing 15 of {filteredHistory.length} transactions
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="bg-[#0C3060] text-blue-100 px-6 py-8 mt-8">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-[12px] text-blue-300">
            Points expire after 24 months of inactivity · 1 point = ₹0.50
            redemption value · Tier based on lifetime points earned
          </p>
          <p className="text-[11px] text-blue-400 mt-2">
            © 2026 AirlineMS Loyalty Programme · All rights reserved
          </p>
        </div>
      </footer>
    </div>
  );
}
