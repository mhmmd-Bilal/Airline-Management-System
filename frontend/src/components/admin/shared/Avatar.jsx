export default function Avatar({ name = "", size = "md" }) {
  const initials = name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const sizes = {
    sm: "w-7 h-7 text-[10px]",
    md: "w-9 h-9 text-[12px]",
    lg: "w-11 h-11 text-[14px]",
  };
  return (
    <div className={`${sizes[size]} rounded-full bg-[#E3F2FD] text-[#1565C0] flex items-center justify-center font-semibold shrink-0`}>
      {initials || "?"}
    </div>
  );
}