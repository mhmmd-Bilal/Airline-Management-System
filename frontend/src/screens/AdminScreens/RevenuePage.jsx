// src/pages/admin/RevenuePage.jsx
import { SectionTitle, Card, CardTitle } from "../../components/admin/shared/Card";

const revenueData = [42,58,51,73,64,88,72,95,84,110,98,120];
const months      = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const maxRev      = Math.max(...revenueData);

export default function RevenuePage() {
  return (
    <>
      <SectionTitle>Revenue overview</SectionTitle>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-7">
        {[["Total 2026","₹84.2L"],["Best Month","₹12.0L"],["Avg Monthly","₹7.0L"],["Growth","+18%"]].map(([l,v]) => (
          <Card key={l}>
            <p className="text-[11px] font-medium text-[#7A90A4] uppercase tracking-[0.6px] mb-2">{l}</p>
            <p className="text-[26px] font-semibold text-[#0D1B2A] leading-none">{v}</p>
          </Card>
        ))}
      </div>
      <Card>
        <CardTitle right="₹ Lakhs · 2026">Monthly revenue</CardTitle>
        <div className="flex items-end gap-1.5 h-36">
          {revenueData.map((v, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[9px] font-semibold text-[#1565C0]">{v}</span>
              <div
                className="w-full bg-[#1565C0] rounded-t opacity-80 hover:opacity-100 transition-opacity"
                style={{ height: `${(v / maxRev) * 120}px` }}
              />
              <span className="text-[8px] text-[#7A90A4]">{months[i]}</span>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}