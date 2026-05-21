// src/pages/admin/UserDetailsPage.jsx

import { useNavigate, useParams } from "react-router-dom";
import { useGetUserByIdQuery } from "../../slices/userApiSlice";

const tierColors = {
  silver: {
    bg: "bg-slate-100",
    text: "text-slate-700",
    border: "border-slate-200",
  },
  gold: {
    bg: "bg-yellow-100",
    text: "text-yellow-700",
    border: "border-yellow-200",
  },
  platinum: {
    bg: "bg-cyan-100",
    text: "text-cyan-700",
    border: "border-cyan-200",
  },
};

function StatCard({ icon, label, value, color }) {
  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm">
      <div
        className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color}`}
      >
        <i className={`ti ${icon} text-[22px] text-white`} />
      </div>

      <p className="mt-4 text-[12px] text-slate-400 font-semibold uppercase tracking-wider">
        {label}
      </p>

      <h2 className="mt-1 text-[28px] font-black text-[#0D1B2A] leading-none">
        {value}
      </h2>
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div>
      <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold mb-1">
        {label}
      </p>

      <h4 className="text-[14px] font-bold text-[#0D1B2A] break-all">
        {value || "—"}
      </h4>
    </div>
  );
}

export default function UserDetailsPage() {
  const { id } = useParams();

  const { data, isLoading, isError } = useGetUserByIdQuery(id);

  const details = data?.data; 

  const user = details?.user;

  const stats = details?.stats;

  const bookings = details?.bookings || [];

  const loyalty = details?.loyalty;

  const tierStyle = tierColors[loyalty?.tier] || tierColors.silver;

  const navigate = useNavigate()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F4F7FB] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#0C3060]/20 border-t-[#0C3060] rounded-full animate-spin" />
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className="min-h-screen bg-[#F4F7FB] flex items-center justify-center p-5">
        <div className="bg-white rounded-3xl p-10 border border-red-100 text-center max-w-md w-full">
          <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5">
            <i className="ti ti-user-off text-red-500 text-[34px]" />
          </div>

          <h2 className="text-[26px] font-black text-[#0D1B2A]">
            User not found
          </h2>

          <p className="text-slate-500 text-[14px] mt-2">
            Unable to load passenger details.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F7FB] p-5 md:p-7">

         <button onClick={() => navigate(-1)} className="text-sm text-slate-400 hover:text-[#0C3060] cursor-pointer mb-2">
              ← Back
            </button>
      {/* HERO */}
      <div className="bg-gradient-to-br from-[#0C3060] via-[#11457F] to-[#1565C0] rounded-[36px] p-7 md:p-10 overflow-hidden relative shadow-[0_20px_60px_rgba(12,48,96,0.15)]">
        <div className="absolute top-[-80px] right-[-80px] w-[240px] h-[240px] rounded-full bg-white/10 blur-3xl" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
          {/* LEFT */}
          <div className="flex items-center gap-5 flex-wrap">
            <div className="w-24 h-24 rounded-[28px] bg-white/15 backdrop-blur-md flex items-center justify-center text-white text-[40px] font-black shadow-lg">
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>

            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-white text-[34px] md:text-[42px] font-black leading-none">
                  {user.name}
                </h1>

                <div
                  className={`px-3 py-1 rounded-full border text-[11px] font-bold uppercase tracking-wider ${tierStyle.bg} ${tierStyle.text} ${tierStyle.border}`}
                >
                  {loyalty?.tier}
                </div>
              </div>

              <p className="text-blue-100 text-[14px] mt-2">{user.email}</p>

              <div className="flex flex-wrap items-center gap-5 mt-5 text-white/80 text-[13px] font-medium">
                <div className="flex items-center gap-2">
                  <i className="ti ti-phone text-[16px]" />
                  {user.phone}
                </div>

                <div className="flex items-center gap-2">
                  <i className="ti ti-user text-[16px]" />
                  {user.role}
                </div>

                <div className="flex items-center gap-2">
                  <i className="ti ti-calendar text-[16px]" />
                  Joined {new Date(user.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>

          {/* LOYALTY */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-[28px] p-6 min-w-[260px]">
            <p className="text-white/70 text-[11px] uppercase tracking-[2px] font-bold">
              Loyalty Points
            </p>

            <h2 className="text-white text-[52px] font-black leading-none mt-3">
              {loyalty?.points || 0}
            </h2>

            <div className="mt-5 flex items-center justify-between text-white/80 text-[12px]">
              <div>
                <p className="opacity-70">Earned</p>
                <h4 className="font-bold text-[15px]">
                  {loyalty?.totalEarned || 0}
                </h4>
              </div>

              <div>
                <p className="opacity-70">Redeemed</p>
                <h4 className="font-bold text-[15px]">
                  {loyalty?.totalRedeemed || 0}
                </h4>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mt-7">
        <StatCard
          icon="ti-ticket"
          label="Bookings"
          value={stats?.totalBookings || 0}
          color="bg-[#1565C0]"
        />

        <StatCard
          icon="ti-plane"
          label="Completed Trips"
          value={stats?.completedTrips || 0}
          color="bg-green-500"
        />

        <StatCard
          icon="ti-clock"
          label="Upcoming"
          value={stats?.upcomingTrips || 0}
          color="bg-orange-500"
        />

        <StatCard
          icon="ti-currency-rupee"
          label="Total Spent"
          value={`₹${(stats?.totalSpent || 0).toLocaleString()}`}
          color="bg-[#0C3060]"
        />
      </div>

      {/* USER DETAILS */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-6 mt-7">
        {/* ACCOUNT */}
        <div className="bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-[24px] font-black text-[#0D1B2A]">
                Account Details
              </h2>

              <p className="text-[12px] text-slate-400 mt-1">
                Passenger information
              </p>
            </div>

            <div className="w-12 h-12 rounded-2xl bg-[#EEF5FD] flex items-center justify-center">
              <i className="ti ti-user text-[#1565C0] text-[22px]" />
            </div>
          </div>

          <div className="space-y-5">
            <InfoItem label="Full Name" value={user.name} />
            <InfoItem label="Email Address" value={user.email} />
            <InfoItem label="Phone Number" value={user.phone} />
            <InfoItem label="Role" value={user.role} />
            <InfoItem
              label="Created"
              value={new Date(user.createdAt).toLocaleString()}
            />
          </div>
        </div>

        {/* BOOKINGS */}
        <div className="bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-[24px] font-black text-[#0D1B2A]">
                Booking History
              </h2>

              <p className="text-[12px] text-slate-400 mt-1">
                Passenger bookings and flights
              </p>
            </div>

            <div className="w-12 h-12 rounded-2xl bg-[#EEF5FD] flex items-center justify-center">
              <i className="ti ti-plane text-[#1565C0] text-[22px]" />
            </div>
          </div>

          <div className="space-y-4 max-h-[650px] overflow-y-auto pr-1">
            {bookings.length === 0 ? (
              <div className="text-center py-14">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <i className="ti ti-ticket-off text-slate-400 text-[28px]" />
                </div>

                <p className="text-slate-500 font-medium text-[14px]">
                  No bookings found
                </p>
              </div>
            ) : (
              bookings.map((booking) => (
                <div
                  key={booking._id}
                  className="border border-slate-100 rounded-3xl p-5 hover:border-[#1565C0]/20 transition"
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-[18px] font-black text-[#0D1B2A]">
                          {booking.flightId?.flightNumber || "N/A"}
                        </h3>

                        <div
                          className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            booking.status === "completed"
                              ? "bg-green-100 text-green-700"
                              : booking.status === "cancelled"
                                ? "bg-red-100 text-red-700"
                                : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {booking.status}
                        </div>
                      </div>

                      <p className="text-[14px] font-semibold text-slate-600 mt-2">
                        {booking.flightId?.source} →{" "}
                        {booking.flightId?.destination}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 mt-4 text-[12px] text-slate-500">
                        <span>Seats: {booking.seats?.join(", ")}</span>

                        <span>Class: {booking.seatClass}</span>

                        <span>₹{booking.totalAmount?.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-[11px] text-slate-400 font-medium">
                        Departure
                      </p>

                      <h4 className="text-[14px] font-bold text-[#0D1B2A] mt-1">
                        {booking.flightId?.departureTime
                          ? new Date(
                              booking.flightId.departureTime,
                            ).toLocaleString()
                          : "N/A"}
                      </h4>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* LOYALTY HISTORY */}
      <div className="bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm mt-7">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-[24px] font-black text-[#0D1B2A]">
              Loyalty History
            </h2>

            <p className="text-[12px] text-slate-400 mt-1">
              Points earned and redeemed
            </p>
          </div>

          <div className="w-12 h-12 rounded-2xl bg-[#EEF5FD] flex items-center justify-center">
            <i className="ti ti-gift text-[#1565C0] text-[22px]" />
          </div>
        </div>

        <div className="space-y-4">
          {loyalty?.history?.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-slate-500 text-[14px]">
                No loyalty transactions found
              </p>
            </div>
          ) : (
            loyalty?.history?.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between border border-slate-100 rounded-2xl p-4"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                      item.type === "redeemed" ? "bg-red-100" : "bg-green-100"
                    }`}
                  >
                    <i
                      className={`ti ${
                        item.type === "redeemed"
                          ? "ti-arrow-down"
                          : "ti-arrow-up"
                      } text-[20px] ${
                        item.type === "redeemed"
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    />
                  </div>

                  <div>
                    <h4 className="text-[14px] font-bold text-[#0D1B2A]">
                      {item.description}
                    </h4>

                    <p className="text-[11px] text-slate-400 mt-1">
                      {new Date(item.date).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div
                  className={`text-[18px] font-black ${
                    item.type === "redeemed" ? "text-red-600" : "text-green-600"
                  }`}
                >
                  {item.type === "redeemed" ? "-" : "+"}
                  {item.points}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
