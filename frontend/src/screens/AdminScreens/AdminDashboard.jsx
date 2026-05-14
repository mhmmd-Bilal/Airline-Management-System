// src/pages/admin/AdminDashboard.jsx
import { SectionTitle, Card, CardTitle } from "../../components/admin/shared/Card";
import { Th, Td } from "../../components/admin/shared/AdminTable";
import Badge from "../../components/admin/shared/Badge";
import Avatar from "../../components/admin/shared/Avatar";

const stats = [
  { label: "Total Flights", value: "1,284", change: "+12%", up: true,  icon: "ti-plane" },
  { label: "Active Crew",   value: "342",   change: "+5%",  up: true,  icon: "ti-users" },
  { label: "Revenue",       value: "₹84.2L",change: "+18%", up: true,  icon: "ti-coin-rupee" },
  { label: "Delays",        value: "23",    change: "-8%",  up: false, icon: "ti-clock-exclamation" },
];
const recentFlights = [
  { id: "AI-202", route: "DEL → BOM", status: "On Time",   crew: "Capt. Mehta",  time: "06:30", aircraft: "A320" },
  { id: "AI-315", route: "BOM → DXB", status: "Delayed",   crew: "Capt. Sharma", time: "09:15", aircraft: "B777" },
  { id: "AI-441", route: "CCU → DEL", status: "Boarding",  crew: "Capt. Nair",   time: "11:00", aircraft: "A321" },
  { id: "AI-589", route: "DEL → LHR", status: "In Flight", crew: "Capt. Singh",  time: "13:45", aircraft: "B787" },
  { id: "AI-102", route: "MAA → BOM", status: "On Time",   crew: "Capt. Pillai", time: "15:20", aircraft: "A320" },
  { id: "AI-776", route: "BOM → SIN", status: "Cancelled", crew: "Capt. Roy",    time: "17:00", aircraft: "B737" },
];
const crewList = [
  { name: "Capt. Arjun Mehta", role: "Pilot",      status: "On Duty", flights: 3 },
  { name: "Priya Sharma",      role: "Cabin Crew",  status: "Rest",    flights: 2 },
  { name: "Capt. Ravi Nair",   role: "Co-Pilot",   status: "On Duty", flights: 4 },
  { name: "Anita Das",         role: "Cabin Crew",  status: "On Duty", flights: 1 },
  { name: "Capt. Jeet Singh",  role: "Pilot",      status: "Leave",   flights: 0 },
];
const tickets = [
  { id: "#4821", user: "Rahul Verma",  issue: "Refund not processed",  priority: "High",   time: "2h ago" },
  { id: "#4819", user: "Sneha Patel",  issue: "Seat upgrade request",  priority: "Low",    time: "4h ago" },
  { id: "#4815", user: "Amir Khan",    issue: "Baggage claim delayed", priority: "Medium", time: "6h ago" },
  { id: "#4810", user: "Divya Menon",  issue: "Flight rescheduled",    priority: "High",   time: "1d ago" },
];
const revenueData = [42,58,51,73,64,88,72,95,84,110,98,120];
const months      = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const maxRev      = Math.max(...revenueData);

export default function AdminDashboard() {
  return (
    <>
      <SectionTitle>At a glance</SectionTitle>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-7">
        {stats.map((s) => (
          <Card key={s.label}>
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#7A90A4] uppercase tracking-[0.6px] mb-2">
              <i className={`ti ${s.icon} text-[14px]`} />
              {s.label}
            </div>
            <p className="text-[26px] font-semibold text-[#0D1B2A] leading-none">{s.value}</p>
            <p className={`text-[11px] font-semibold mt-1.5 flex items-center gap-1 ${s.up ? "text-green-700" : "text-red-700"}`}>
              <i className={`ti ${s.up ? "ti-trending-up" : "ti-trending-down"} text-[12px]`} />
              {s.change} this month
            </p>
          </Card>
        ))}
      </div>

      {/* Revenue chart + Crew */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 mb-7">
        <Card>
          <CardTitle right="₹ Lakhs · 2026">Revenue overview</CardTitle>
          <div className="flex items-end gap-1.5 h-24">
            {revenueData.map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-[#1565C0] rounded-t opacity-80 hover:opacity-100 transition-opacity"
                  style={{ height: `${(v / maxRev) * 88}px` }}
                  title={`${months[i]}: ₹${v}L`}
                />
                <span className="text-[8px] text-[#7A90A4]">{months[i]}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle>Crew status</CardTitle>
          {crewList.map((c, i) => (
            <div key={c.name} className={`flex items-center gap-3 py-2.5 ${i > 0 ? "border-t border-[#EAF4FB]" : ""}`}>
              <Avatar name={c.name} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-[#0D1B2A] truncate">{c.name}</p>
                <p className="text-[10px] text-[#7A90A4]">{c.role} · {c.flights} flight{c.flights !== 1 ? "s" : ""} today</p>
              </div>
              <Badge label={c.status} />
            </div>
          ))}
        </Card>
      </div>

      {/* Recent flights */}
      <SectionTitle>Recent flights</SectionTitle>
      <Card className="mb-7 overflow-x-auto">
        <table className="w-full min-w-[560px]">
          <thead><tr><Th>Flight</Th><Th>Route</Th><Th>Aircraft</Th><Th>Crew</Th><Th>Time</Th><Th>Status</Th></tr></thead>
          <tbody>
            {recentFlights.map((f) => (
              <tr key={f.id}>
                <Td><span className="font-semibold text-[#1565C0]">{f.id}</span></Td>
                <Td>{f.route}</Td>
                <Td className="text-[#7A90A4]">{f.aircraft}</Td>
                <Td>{f.crew}</Td>
                <Td className="text-[#7A90A4]">{f.time}</Td>
                <Td><Badge label={f.status} /></Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Support tickets */}
      <SectionTitle>Open support tickets</SectionTitle>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[480px]">
          <thead><tr><Th>ID</Th><Th>User</Th><Th>Issue</Th><Th>Priority</Th><Th>Time</Th></tr></thead>
          <tbody>
            {tickets.map((t) => (
              <tr key={t.id}>
                <Td><span className="font-semibold text-[#1565C0]">{t.id}</span></Td>
                <Td>{t.user}</Td>
                <Td className="text-[#7A90A4]">{t.issue}</Td>
                <Td><Badge label={t.priority} /></Td>
                <Td className="text-[#7A90A4]">{t.time}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}