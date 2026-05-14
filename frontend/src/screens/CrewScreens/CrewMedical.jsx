import { useSelector } from "react-redux";
import { Card, SectionLabel, InfoRow } from "../../components/crew/CrewShared";
import { fmtDate } from "../../components/crew/crewConstants";
import { useGetCrewByIdQuery } from "../../slices/crewApiSlice";

export default function CrewMedical() {
  const { userData } = useSelector((state) => state.auth);

  let crew;

  const { data,isLoading } = useGetCrewByIdQuery(userData?._id);

  crew = data?.data;

  const medicalDueSoon =
    crew?.medicalNextDue &&
    new Date(crew?.medicalNextDue) <
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  return (
    <div className="p-5 md:p-7">
      {/* Status banner */}
      <div
        className={`rounded-2xl p-6 mb-5 flex items-center gap-5 relative overflow-hidden
        ${crew?.medicalStatus === "Fit" ? "bg-green-600" : "bg-orange-500"}`}
      >
        <div className="absolute right-0 top-0 w-48 h-full bg-white/[0.06] skew-x-[-15deg] translate-x-8" />
        <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
          <i className="ti ti-heart-rate-monitor text-white text-[26px]" />
        </div>
        <div className="relative z-10">
          <p className="text-white/80 text-[11px] font-semibold uppercase tracking-widest mb-1">
            Medical Status
          </p>
          <p className="text-white text-[24px] font-bold leading-none">
            {crew?.medicalStatus}
          </p>
          <p className="text-white/70 text-[12px] mt-1.5">
            {crew?.medicalStatus === "Fit"
              ? "Cleared for all flight operations"
              : "Please contact admin for medical clearance"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <Card className="p-5">
          <SectionLabel>Medical record</SectionLabel>
          {[
            ["Status", crew?.medicalStatus],
            ["Last checked", fmtDate(crew?.medicalLastChecked)],
            ["Next due", fmtDate(crew?.medicalNextDue)],
          ].map(([l, v], i) => (
            <InfoRow key={l} label={l} value={v} i={i} />
          ))}
        </Card>

        <Card className="p-5">
          <SectionLabel>Clearance status</SectionLabel>
          <div className="flex flex-col gap-3 mt-1">
            {[
              ["Flight operations", crew?.medicalStatus === "Fit"],
              ["International routes", crew?.medicalStatus === "Fit"],
              ["Long-haul flights", crew?.medicalStatus === "Fit"],
            ].map(([label, cleared]) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-[12px] font-medium text-[#5A7089]">
                  {label}
                </span>
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold
                  ${cleared ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}
                >
                  <i
                    className={`ti ${cleared ? "ti-check" : "ti-x"} text-[11px]`}
                  />
                  {cleared ? "Cleared" : "Restricted"}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {medicalDueSoon && (
        <div className="mt-3.5 bg-orange-50 border border-orange-200 rounded-2xl p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
            <i className="ti ti-alert-triangle text-orange-600 text-[18px]" />
          </div>
          <div>
            <p className="text-[13px] font-bold text-orange-800">
              Medical renewal due soon
            </p>
            <p className="text-[12px] text-orange-600 mt-1 leading-relaxed">
              Your medical certificate expires on{" "}
              <span className="font-semibold">
                {fmtDate(crew?.medicalNextDue)}
              </span>
              . Please schedule an appointment at least 2 weeks before the due
              date.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
