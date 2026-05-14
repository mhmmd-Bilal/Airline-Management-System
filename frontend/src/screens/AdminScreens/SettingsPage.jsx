// src/pages/admin/SettingsPage.jsx
import { SectionTitle, Card } from "../../components/admin/shared/Card";

export default function SettingsPage() {
  return (
    <>
      <SectionTitle>System settings</SectionTitle>
      <Card className="max-w-lg">
        {[
          ["System name",      "AirlineMS"],
          ["Admin email",      "admin@airline.com"],
          ["Default currency", "INR (₹)"],
          ["Timezone",         "Asia/Kolkata (IST)"],
          ["Maintenance mode", "Off"],
        ].map(([label, val], i) => (
          <div key={label} className={`flex justify-between items-center py-3 ${i > 0 ? "border-t border-[#EAF4FB]" : ""}`}>
            <span className="text-[13px] font-medium text-[#5A7089]">{label}</span>
            <span className="text-[13px] font-semibold text-[#0D1B2A]">{val}</span>
          </div>
        ))}
        <button className="mt-5 w-full h-11 bg-[#1565C0] hover:bg-[#1251A3] active:scale-[0.99] text-white text-[13px] font-semibold rounded-[10px] shadow-[0_4px_16px_rgba(21,101,192,0.25)] transition-all duration-200 border-none cursor-pointer">
          Save changes
        </button>
      </Card>
    </>
  );
}