import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useLazyGetFlightsByCrewIdQuery } from "../../slices/flightApiSlice";
import {
  useGetTodayAttendanceQuery,
  usePunchInMutation,
  usePunchOutMutation,
} from "../../slices/attendanceApiSlice";
import {
  Badge,
  Avatar,
  Card,
  SectionLabel,
  StatCard,
  FlightCard,
  PunchCard,
} from "../../components/crew/CrewShared";
import { useGetCrewByUserIdQuery } from "../../slices/crewApiSlice";

// ── Roles that are airborne ────────────────────────────
const AIRBORNE_ROLES = [
  "Pilot",
  "Co-Pilot",
  "Cabin Crew",
  "Flight Engineer",
  "Purser",
];

const isAirborneRole = (role) =>
  AIRBORNE_ROLES.some((r) => r.toLowerCase() === role?.toLowerCase());

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

export default function CrewDashboard() {
  const { userData } = useSelector((s) => s.auth);
  const navigate = useNavigate();
  const [viewFlight, setViewFlight] = useState(null);
  const [punchError, setPunchError] = useState("");

  const name = userData?.name ?? "Crew Member";
  const firstName =
    name.split(" ").find((w) => !w.includes(".")) || name.split(" ")[0];

  const { data: crewData, isLoading: crewLoading } = useGetCrewByUserIdQuery(
    userData?._id,
    { skip: !userData?._id },
  );

  const crew = crewData?.data;
  const crewId = crew?._id;

  // ── Role flags ─────────────────────────────────────
  const airborne = isAirborneRole(crew?.role); // pilots, cabin crew etc.
  const isGroundStaff = !airborne; // ground staff, ops, etc.

  const [getFlightsByCrewId, { data: flightData, isLoading: flightLoading }] =
    useLazyGetFlightsByCrewIdQuery();

  const { data: attendanceData, isLoading: attendanceLoading } =
    useGetTodayAttendanceQuery();
  const [punchIn, { isLoading: punchingIn }] = usePunchInMutation();
  const [punchOut, { isLoading: punchingOut }] = usePunchOutMutation();

  const todayAttendance = attendanceData?.data ?? null;
  const allFlights = flightData?.data ?? [];

  // Ground staff see all assigned flights; airborne crew filter by crewIds
  const myFlights = isGroundStaff
    ? allFlights
    : allFlights.filter((f) =>
        f.crewIds?.some((c) => String(c?._id ?? c) === String(crew?._id)),
      );

  const upcomingFlights = myFlights.filter((f) =>
    ["scheduled", "delayed", "boarding"].includes(f.status),
  );
  const activeFlights = myFlights.filter((f) => f.status === "in-flight"); // always empty for ground staff
  const completedFlights = myFlights.filter((f) => f.status === "completed");

  const medicalDueSoon =
    crew?.medicalNextDue &&
    new Date(crew.medicalNextDue) <
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  useEffect(() => {
    if (crew?._id) getFlightsByCrewId({ crewId: crew._id });
  }, [crew?._id]);

  const handlePunchIn = async () => {
    setPunchError("");
    try {
      await punchIn({ flightId: activeFlights[0]?._id || undefined }).unwrap();
    } catch (err) {
      setPunchError(err?.data?.message ?? "Failed to punch in");
    }
  };

  const handlePunchOut = async () => {
    setPunchError("");
    try {
      await punchOut().unwrap();
    } catch (err) {
      setPunchError(err?.data?.message ?? "Failed to punch out");
    }
  };

  // ── Stat cards — differ by role ───────────────────
  const statCards = isGroundStaff
    ? [
        // Ground staff: no in-flight stat
        {
          label: "Total Flights",
          value: myFlights.length,
          icon: "ti-plane",
          color: "bg-blue-50 text-blue-700",
          sub: "assigned",
        },
        {
          label: "Upcoming",
          value: upcomingFlights.length,
          icon: "ti-calendar",
          color: "bg-violet-50 text-violet-700",
          sub: "scheduled",
        },
        {
          label: "Completed",
          value: completedFlights.length,
          icon: "ti-circle-check",
          color: "bg-green-50 text-green-700",
          sub: "done",
        },
        {
          label: "Delayed",
          value: myFlights.filter((f) => f.status === "delayed").length,
          icon: "ti-clock-pause",
          color: "bg-orange-50 text-orange-700",
          sub: "watch",
        },
      ]
    : [
        // Airborne crew: include in-flight
        {
          label: "Total Flights",
          value: myFlights.length,
          icon: "ti-plane",
          color: "bg-blue-50 text-blue-700",
          sub: "assigned",
        },
        {
          label: "Upcoming",
          value: upcomingFlights.length,
          icon: "ti-calendar",
          color: "bg-violet-50 text-violet-700",
          sub: "scheduled",
        },
        {
          label: "In Flight",
          value: activeFlights.length,
          icon: "ti-plane-departure",
          color: "bg-green-50 text-green-700",
          sub: "live",
        },
        {
          label: "Completed",
          value: completedFlights.length,
          icon: "ti-circle-check",
          color: "bg-orange-50 text-orange-700",
          sub: "done",
        },
      ];

  return (
    <>
      {/* ── Hero banner ── */}
      <div className="bg-[#1565C0] px-5 md:px-7 py-6 relative overflow-hidden">
        <div className="absolute w-72 h-72 rounded-full bg-white/[0.05] -top-20 -right-20" />
        <div className="absolute w-44 h-44 rounded-full bg-white/[0.04] bottom-0 right-48" />
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Avatar name={name} size="lg" />
            <div>
              <p className="text-blue-200/80 text-[11px] font-semibold uppercase tracking-widest mb-1">
                Welcome back
              </p>
              <h1 className="text-white text-[22px] font-bold leading-tight">
                {greeting}, {firstName} 👋
              </h1>
              <p className="text-blue-200/70 text-[13px] mt-1">
                {crew?.role}
                {isGroundStaff
                  ? ` · ${upcomingFlights.length} flight${upcomingFlights.length !== 1 ? "s" : ""} to handle`
                  : ` · ${upcomingFlights.length} flight${upcomingFlights.length !== 1 ? "s" : ""} coming up`}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-white text-[20px] font-bold leading-none">
              {new Date().toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </p>
            <p className="text-blue-200/60 text-[11px] mt-1 uppercase tracking-wider">
              {new Date().toLocaleDateString("en-IN", { weekday: "long" })}
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 md:p-7">
        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-7">
          {statCards.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </div>

        {/* ── In-flight alert — airborne only ── */}
        {airborne && activeFlights.length > 0 && (
          <div className="bg-[#1565C0] rounded-2xl p-5 mb-7 flex items-center gap-4 relative overflow-hidden">
            <div className="absolute right-0 top-0 w-40 h-full bg-white/[0.04] skew-x-[-20deg] translate-x-8" />
            <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <i className="ti ti-plane-departure text-white text-[20px]" />
            </div>
            <div className="flex-1 min-w-0 relative z-10">
              <p className="text-white font-bold text-[14px]">
                Currently In Flight
              </p>
              <p className="text-blue-200 text-[12px] mt-0.5">
                {activeFlights[0].flightNumber} · {activeFlights[0].source} →{" "}
                {activeFlights[0].destination}
              </p>
            </div>
            <button
              onClick={() => setViewFlight(activeFlights[0])}
              className="relative z-10 h-9 px-5 bg-white text-[#1565C0] text-[12px] font-bold rounded-xl hover:bg-blue-50 transition border-none cursor-pointer flex-shrink-0"
            >
              View Details
            </button>
          </div>
        )}

        {/* ── Ground staff ops alert — shows delayed/boarding flights ── */}
        {isGroundStaff &&
          (() => {
            const urgent = myFlights.filter((f) =>
              ["boarding", "delayed"].includes(f.status),
            );
            if (!urgent.length) return null;
            return (
              <div className="bg-orange-500 rounded-2xl p-5 mb-7 flex items-center gap-4 relative overflow-hidden">
                <div className="absolute right-0 top-0 w-40 h-full bg-white/[0.04] skew-x-[-20deg] translate-x-8" />
                <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <i className="ti ti-alert-triangle text-white text-[20px]" />
                </div>
                <div className="flex-1 min-w-0 relative z-10">
                  <p className="text-white font-bold text-[14px]">
                    Action required
                  </p>
                  <p className="text-orange-100 text-[12px] mt-0.5">
                    {urgent.length} flight{urgent.length !== 1 ? "s" : ""} need
                    ground handling —{" "}
                    {urgent.map((f) => f.flightNumber).join(", ")}
                  </p>
                </div>
                <button
                  onClick={() => navigate("/crew/flights")}
                  className="relative z-10 h-9 px-5 bg-white text-orange-600 text-[12px] font-bold rounded-xl hover:bg-orange-50 transition border-none cursor-pointer flex-shrink-0"
                >
                  View Flights
                </button>
              </div>
            );
          })()}

        {/* ── Upcoming flights + punch card ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 mb-7">
          <div className="lg:col-span-2 flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-[#5A7089] uppercase tracking-[0.8px]">
                {isGroundStaff ? "Flights to handle" : "Upcoming flights"}
              </p>
              {upcomingFlights.length > 2 && (
                <button
                  onClick={() => navigate("/crew/flights")}
                  className="text-[11px] text-[#1565C0] font-semibold hover:opacity-70 transition bg-transparent border-none cursor-pointer"
                >
                  View all →
                </button>
              )}
            </div>

            {flightLoading ? (
              <Card className="p-8 text-center text-[13px] text-[#7A90A4]">
                Loading...
              </Card>
            ) : upcomingFlights.length === 0 ? (
              <Card className="p-10 text-center">
                <i className="ti ti-calendar-off text-[32px] text-[#D0E6F7] block mb-2" />
                <p className="text-[13px] text-[#7A90A4]">
                  {isGroundStaff
                    ? "No flights to handle right now"
                    : "No upcoming flights"}
                </p>
              </Card>
            ) : (
              upcomingFlights
                .slice(0, 2)
                .map((f) => (
                  <FlightCard
                    key={f._id}
                    flight={f}
                    onClick={() => setViewFlight(f)}
                  />
                ))
            )}
          </div>

          <div className="flex flex-col gap-3.5">
            {attendanceLoading ? (
              <Card className="p-5 text-center text-[13px] text-[#7A90A4]">
                Loading attendance...
              </Card>
            ) : (
              <PunchCard
                attendance={todayAttendance}
                onPunchIn={handlePunchIn}
                onPunchOut={handlePunchOut}
                punchingIn={punchingIn}
                punchingOut={punchingOut}
                error={punchError}
              />
            )}

            {/* Medical card */}
            <Card
              className={`p-5 ${crew?.medicalStatus === "Fit" ? "border-green-200" : "border-orange-200"}`}
            >
              <SectionLabel>Medical</SectionLabel>
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${crew?.medicalStatus === "Fit" ? "bg-green-50" : "bg-orange-50"}`}
                >
                  <i
                    className={`ti ti-heart-rate-monitor text-[18px] ${crew?.medicalStatus === "Fit" ? "text-green-700" : "text-orange-700"}`}
                  />
                </div>
                <div>
                  <p
                    className={`text-[13px] font-bold ${crew?.medicalStatus === "Fit" ? "text-green-700" : "text-orange-700"}`}
                  >
                    {crew?.medicalStatus}
                  </p>
                  <p className="text-[10px] text-[#B0C4D8]">
                    Next due: {fmtDate(crew?.medicalNextDue)}
                  </p>
                </div>
              </div>
              {medicalDueSoon && (
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 flex items-start gap-2">
                  <i className="ti ti-alert-triangle text-orange-500 text-[13px] mt-0.5 flex-shrink-0" />
                  <p className="text-[10px] text-orange-700 font-medium leading-relaxed">
                    Renewal due soon. Schedule before{" "}
                    {fmtDate(crew?.medicalNextDue)}.
                  </p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
