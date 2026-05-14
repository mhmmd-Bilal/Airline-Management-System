export function Th({ children }) {
  return (
    <th className="text-[10px] font-semibold text-[#7A90A4] uppercase tracking-[0.5px] pb-2.5 text-left whitespace-nowrap pr-4">
      {children}
    </th>
  );
}

export function Td({ children, className = "" }) {
  return (
    <td className={`text-[12px] text-[#0D1B2A] py-2.5 border-t border-[#EAF4FB] pr-4 align-middle ${className}`}>
      {children}
    </td>
  );
}