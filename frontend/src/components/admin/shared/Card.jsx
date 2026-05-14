export function Card({ children, className = "" }) {
  return (
    <div className={`bg-white border border-[#D0E6F7] rounded-2xl p-5 ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({ children, right }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <p className="text-[13px] font-semibold text-[#0D1B2A]">{children}</p>
      {right && <span className="text-[11px] text-[#7A90A4]">{right}</span>}
    </div>
  );
}

export function SectionTitle({ children }) {
  return (
    <p className="text-[11px] font-semibold text-[#5A7089] uppercase tracking-[0.8px] mb-3.5">
      {children}
    </p>
  );
}