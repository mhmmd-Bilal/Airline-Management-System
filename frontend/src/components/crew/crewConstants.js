export const statusBadgeMap = {
  scheduled: { label: "Scheduled", cls: "bg-blue-100 text-blue-800" },
  delayed: { label: "Delayed", cls: "bg-orange-100 text-orange-800" },
  boarding: { label: "Boarding", cls: "bg-violet-100 text-violet-800" },
  "in-flight": { label: "In Flight", cls: "bg-indigo-100 text-indigo-800" },
  completed: { label: "Completed", cls: "bg-green-100 text-green-800" },
  cancelled: { label: "Cancelled", cls: "bg-red-100 text-red-800" },
};

export const statusDotColor = {
  scheduled: "#1565C0",
  delayed: "#E65100",
  boarding: "#4527A0",
  "in-flight": "#1565C0",
  completed: "#2E7D32",
  cancelled: "#B71C1C",
};

export const medicalCls = {
  Fit: "bg-green-100 text-green-700",
  "Under Treatment": "bg-orange-100 text-orange-700",
};

export const fmt = (dt) =>
  dt
    ? new Date(dt).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

export const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

export const fmtTime = (dt) =>
  dt
    ? new Date(dt).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : "—";

export const inputCls =
  "w-full h-[42px] px-3 text-[13px] text-[#0D1B2A] bg-[#F0F7FF] border border-[#D0E6F7] rounded-[10px] outline-none focus:border-[#1565C0] focus:shadow-[0_0_0_3px_rgba(21,101,192,0.1)] transition placeholder:text-[#B0C4D8]";
