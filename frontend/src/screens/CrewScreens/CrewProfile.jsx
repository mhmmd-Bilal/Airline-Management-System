import { useState } from "react";
import { useSelector } from "react-redux";
import {
  Avatar,
  Card,
  SectionLabel,
  InfoRow,
  StatCard,
  Badge,
} from "../../components/crew/crewShared";
import {
  medicalCls,
  fmtDate,
  inputCls,
} from "../../components/crew/crewConstants";
import { useGetAllFlightsQuery } from "../../slices/flightApiSlice";
import { useGetCrewByUserIdQuery } from "../../slices/crewApiSlice";

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#D0E6F7]">
          <p className="text-[14px] font-bold text-[#0D1B2A]">{title}</p>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-[#D0E6F7] bg-[#F0F7FF] flex items-center justify-center text-[#1565C0] hover:bg-[#E1EFFE] transition cursor-pointer"
          >
            <i className="ti ti-x text-[15px]" />
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export default function CrewProfile() {
  const { userData } = useSelector((s) => s.auth);
  const [showPwModal, setShowPwModal] = useState(false);
  const [pw, setPw] = useState({ current: "", new: "", confirm: "" });
  const [pwErrors, setPwErrors] = useState({});

  const name = userData?.name ?? "Crew Member";

  const { data: crewData, isLoading: crewLoading } = useGetCrewByUserIdQuery(
    userData?._id,
    { skip: !userData?._id },
  );

  const crew = crewData?.data;

  const { data: flightData } = useGetAllFlightsQuery({
    status: "all",
    search: "",
    page: 1,
    limit: 50,
  });
  const allFlights = (flightData?.data ?? []).filter((f) =>
    f.crewIds?.some((c) => String(c?._id ?? c) === String(crew._id)),
  );
  const completedFlights = allFlights.filter((f) => f.status === "completed");
  const upcomingFlights = allFlights.filter((f) =>
    ["scheduled", "delayed", "boarding"].includes(f.status),
  );

  const validatePw = () => {
    const e = {};
    if (!pw.current.trim()) e.current = "Current password is required";
    if (!pw.new.trim()) e.new = "New password is required";
    else if (pw.new.length < 6) e.new = "Min. 6 characters";
    if (pw.new !== pw.confirm) e.confirm = "Passwords do not match";
    setPwErrors(e);
    return Object.keys(e).length === 0;
  };

  const handlePwChange = () => {
    if (!validatePw()) return;
    // TODO: call password change API
    setShowPwModal(false);
    setPw({ current: "", new: "", confirm: "" });
    setPwErrors({});
  };

  return (
    <div className="p-5 md:p-7">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        {/* Identity card */}
        <Card className="p-6 flex flex-col items-center text-center">
          <div className="relative mb-4">
            <Avatar name={name} size="xl" />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-green-500 border-2 border-white flex items-center justify-center">
              <i className="ti ti-check text-white text-[10px]" />
            </div>
          </div>
          <p className="text-[16px] font-bold text-[#0D1B2A]">{name}</p>
          <p className="text-[12px] text-[#7A90A4] mt-0.5">
            {crew.role} · {crew.employeeId}
          </p>
          <div className="flex items-center gap-2 mt-3 flex-wrap justify-center">
            <Badge label={crew.currentStatus} cls="bg-blue-100 text-blue-800" />
            <Badge
              label={crew.medicalStatus}
              cls={
                medicalCls[crew.medicalStatus] || "bg-gray-100 text-gray-600"
              }
            />
          </div>
          <div className="w-full mt-5 pt-5 border-t border-[#F0F7FF]">
            {[
              ["ti-mail", crew.userId?.email || "—"],
              ["ti-phone", crew.userId?.phone || "—"],
              ["ti-map-pin", crew.nationality || "—"],
              ["ti-cake", fmtDate(crew.dateOfBirth)],
            ].map(([icon, value]) => (
              <div key={icon} className="flex items-center gap-2.5 py-2">
                <i
                  className={`ti ${icon} text-[#B0C4D8] text-[14px] flex-shrink-0`}
                />
                <span className="text-[12px] text-[#5A7089] truncate">
                  {value}
                </span>
              </div>
            ))}
          </div>
          <button
            onClick={() => setShowPwModal(true)}
            className="mt-5 w-full h-10 border border-[#D0E6F7] bg-[#F0F7FF] hover:bg-[#E1EFFE] text-[#1565C0] text-[12px] font-semibold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <i className="ti ti-lock text-[14px]" />
            Change Password
          </button>
        </Card>

        {/* Details */}
        <div className="lg:col-span-2 flex flex-col gap-3.5">
          <Card className="p-5">
            <SectionLabel>Professional information</SectionLabel>
            {[
              ["Employee ID", crew.employeeId],
              ["Role", crew.role],
              ["Experience", `${crew.experience} years`],
              ["Salary", `₹${Number(crew.salary).toLocaleString()} / month`],
              ["Current Status", crew.currentStatus],
            ].map(([l, v], i) => (
              <InfoRow key={l} label={l} value={v} i={i} />
            ))}
          </Card>

          <Card className="p-5">
            <SectionLabel>License information</SectionLabel>
            {[
              ["License Number", crew.licenseNumber || "—"],
              ["Expiry Date", fmtDate(crew.licenseExpiry)],
              ["Nationality", crew.nationality || "—"],
            ].map(([l, v], i) => (
              <InfoRow key={l} label={l} value={v} i={i} />
            ))}
          </Card>

          <div className="grid grid-cols-3 gap-3.5">
            <StatCard
              label="Total Flights"
              value={allFlights.length}
              icon="ti-plane"
              color="bg-blue-50 text-blue-700"
            />
            <StatCard
              label="Completed"
              value={completedFlights.length}
              icon="ti-circle-check"
              color="bg-green-50 text-green-700"
            />
            <StatCard
              label="Upcoming"
              value={upcomingFlights.length}
              icon="ti-calendar"
              color="bg-violet-50 text-violet-700"
            />
          </div>
        </div>
      </div>

      {showPwModal && (
        <Modal title="Change password" onClose={() => setShowPwModal(false)}>
          {[
            {
              field: "current",
              label: "Current password",
              ph: "Enter current password",
            },
            { field: "new", label: "New password", ph: "Min. 6 characters" },
            {
              field: "confirm",
              label: "Confirm new password",
              ph: "Re-enter new password",
            },
          ].map(({ field, label, ph }) => (
            <div key={field} className="mb-4">
              <label className="block text-[11px] font-semibold uppercase tracking-[0.6px] text-[#5A7089] mb-1.5">
                {label}
              </label>
              <input
                type="password"
                className={inputCls}
                placeholder={ph}
                value={pw[field]}
                onChange={(e) =>
                  setPw((p) => ({ ...p, [field]: e.target.value }))
                }
              />
              {pwErrors[field] && (
                <p className="text-[11px] text-red-500 mt-1">
                  {pwErrors[field]}
                </p>
              )}
            </div>
          ))}
          <div className="flex gap-3 mt-2">
            <button
              onClick={() => setShowPwModal(false)}
              className="flex-1 h-10 border border-[#D0E6F7] bg-[#F0F7FF] text-[#1565C0] text-[13px] font-semibold rounded-[10px] hover:bg-[#E1EFFE] transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handlePwChange}
              className="flex-1 h-10 bg-[#1565C0] hover:bg-[#1251A3] text-white text-[13px] font-semibold rounded-[10px] shadow-[0_4px_16px_rgba(21,101,192,0.25)] transition cursor-pointer border-none"
            >
              Update Password
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
