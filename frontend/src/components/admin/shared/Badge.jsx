const statusCls = {
  "On Time":    "bg-green-100 text-green-800",
  "Delayed":    "bg-orange-100 text-orange-800",
  "Boarding":   "bg-blue-100 text-blue-800",
  "In Flight":  "bg-violet-100 text-violet-800",
  "Cancelled":  "bg-red-100 text-red-800",
  "Active":     "bg-green-100 text-green-800",
  "Maintenance":"bg-orange-100 text-orange-800",
  "Grounded":   "bg-red-100 text-red-800",
  "On Duty":    "bg-blue-100 text-blue-800",
  "Rest":       "bg-purple-100 text-purple-800",
  "Leave":      "bg-gray-100 text-gray-600",
  "High":       "bg-red-100 text-red-800",
  "Medium":     "bg-orange-100 text-orange-800",
  "Low":        "bg-green-100 text-green-800",
};

export default function Badge({ label }) {
  return (
    <span className={`text-[11px] font-semibold px-2.5 py-0.75 rounded-full whitespace-nowrap ${statusCls[label] || "bg-gray-100 text-gray-600"}`}>
      {label}
    </span>
  );
}