function Loader() {
  return (
    <div className="fixed inset-0 z-[9999] bg-[#EAF4FB] flex items-center justify-center">
      <div className="flex flex-col items-center">
        
        {/* Plane Loader */}
        <div className="relative w-28 h-28 flex items-center justify-center">
          
          {/* Rotating Circle */}
          <div className="absolute inset-0 rounded-full border-[3px] border-[#90CAF9]/30 border-t-[#1565C0] animate-spin" />

          {/* Inner Circle */}
          <div className="w-20 h-20 rounded-full bg-white shadow-lg flex items-center justify-center border border-[#D0E6F7]">
            <i className="ti ti-plane text-[30px] text-[#1565C0] rotate-45" />
          </div>
        </div>

        {/* Text */}
        <h2 className="mt-6 text-[18px] font-bold text-[#0D2540] tracking-wide">
          AirlineMS
        </h2>

        <p className="text-[13px] text-[#5B7A99] mt-1">
          Preparing flight operations...
        </p>

        {/* Loading dots */}
        <div className="flex items-center gap-1 mt-5">
          <span className="w-2 h-2 rounded-full bg-[#1565C0] animate-bounce" />
          <span
            className="w-2 h-2 rounded-full bg-[#1565C0] animate-bounce"
            style={{ animationDelay: "0.15s" }}
          />
          <span
            className="w-2 h-2 rounded-full bg-[#1565C0] animate-bounce"
            style={{ animationDelay: "0.3s" }}
          />
        </div>
      </div>
    </div>
  );
}

export default Loader;